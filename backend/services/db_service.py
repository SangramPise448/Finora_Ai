import os
import sqlite3
import json
from datetime import datetime, timedelta
import uuid
import pymongo
from bson import ObjectId
from fastapi import HTTPException
from backend.config import settings

class DBService:
    def __init__(self):
        self.use_mongo = True if settings.DATABASE_MODE != "sqlite" and settings.MONGODB_URL else False
        self.mongo_client = None
        self.db = None
        self.sqlite_conn = None
        
        if settings.MONGODB_URL and settings.DATABASE_MODE != "sqlite":
            try:
                import certifi
                # Attempt MongoDB Atlas connection with certifi CA bundle and robust timeouts
                try:
                    self.mongo_client = pymongo.MongoClient(
                        settings.MONGODB_URL, 
                        tlsCAFile=certifi.where(),
                        tlsAllowInvalidCertificates=True,
                        serverSelectionTimeoutMS=10000,
                        connectTimeoutMS=10000
                    )
                    ping_res = self.mongo_client.admin.command("ping")
                except Exception as first_e:
                    # Fallback MongoClient attempt
                    self.mongo_client = pymongo.MongoClient(
                        settings.MONGODB_URL,
                        tls=True,
                        tlsAllowInvalidCertificates=True,
                        serverSelectionTimeoutMS=10000,
                        connectTimeoutMS=10000
                    )
                    ping_res = self.mongo_client.admin.command("ping")

                self.db = self.mongo_client[settings.DB_NAME]
                
                if self.db.name != "personal_finance_db":
                    print(f"[MONGO WARNING] Connected database is '{self.db.name}', expected 'personal_finance_db'.")

                # Verify / auto-create required core collections
                required_cols = [
                    "users", "feedback", "financial_profiles", "investments",
                    "login_history", "notifications", "otps", "predictions",
                    "recommendations", "reports", "transactions", "budgets",
                    "chat_history", "datasets", "activity_logs", "database_migrations"
                ]
                existing_cols = self.db.list_collection_names()
                for col in required_cols:
                    if col not in existing_cols:
                        self.db.create_collection(col)
                
                self.use_mongo = True
                print(f"[MONGO] Connected to MongoDB Atlas successfully.")
                print(f"[MONGO] Active Database: '{self.db.name}'")
                print(f"[MONGO] Ping Status: OK")
            except Exception as e:
                print(f"[MONGO ERROR] MongoDB Atlas connection unavailable ({e}).")
                print(f"[MONGO DIAGNOSTIC ACTION] Verify MongoDB Atlas -> Security -> Network Access -> Add IP Address (or 0.0.0.0/0) or check DB user password.")
                self.use_mongo = False
                self.mongo_client = None
                self.db = None
                print(f"[FALLBACK NOTICE] High-availability fallback active: Using local SQLite database so user login remains 100% operational.")

        # Always initialize local SQLite DB for fallback & startup migration
        try:
            os.makedirs(os.path.dirname(settings.SQLITE_PATH), exist_ok=True)
            self.sqlite_conn = sqlite3.connect(settings.SQLITE_PATH, check_same_thread=False)
            self.sqlite_conn.row_factory = sqlite3.Row
            self._init_sqlite_db()
        except Exception as sq_err:
            print(f"[SQLITE NOTICE] SQLite initialization: {sq_err}")

        # Perform Idempotent One-Time Migration from SQLite to MongoDB Atlas & Admin standardization
        if self.use_mongo:
            try:
                self.run_idempotent_sqlite_migration()
                self.migrate_and_standardize_users()
            except Exception as mig_err:
                print(f"[MIGRATION WARNING] Migration encountered error: {mig_err}")

    def run_idempotent_sqlite_migration(self):
        if not self.use_mongo or not self.sqlite_conn:
            return

        marker = self.db.database_migrations.find_one({"_id": "sqlite_migration_v1"})
        if marker:
            return # Already completed safely

        print(f"[MIGRATION] Checking local SQLite file for un-migrated records...")
        cursor = self.sqlite_conn.cursor()

        # 1. Users Migration
        inserted_users = 0
        skipped_users = 0
        try:
            cursor.execute("SELECT * FROM users")
            sqlite_users = [dict(row) for row in cursor.fetchall()]
            for u in sqlite_users:
                email = (u.get("email") or "").strip().lower()
                if not email:
                    continue
                existing = self.db.users.find_one({"email": email})
                if existing:
                    skipped_users += 1
                else:
                    user_doc = {
                        "id": u.get("id") or str(uuid.uuid4()),
                        "name": u.get("name") or "User",
                        "email": email,
                        "phone": u.get("phone") or "",
                        "password_hash": u.get("password_hash") or "",
                        "role": u.get("role") or "user",
                        "status": u.get("status") or "active",
                        "created_at": datetime.utcnow().isoformat()
                    }
                    self.db.users.insert_one(user_doc)
                    inserted_users += 1
        except Exception as e:
            print(f"[MIGRATION NOTICE] SQLite users migration error: {e}")

        # 2. Feedback Migration
        inserted_fb = 0
        skipped_fb = 0
        try:
            cursor.execute("SELECT * FROM feedback")
            sqlite_fb = [dict(row) for row in cursor.fetchall()]
            for f in sqlite_fb:
                fb_id = f.get("id") or str(uuid.uuid4())
                existing = self.db.feedback.find_one({"$or": [{"id": fb_id}, {"_id": ObjectId(fb_id) if ObjectId.is_valid(fb_id) else None}]})
                if existing:
                    skipped_fb += 1
                else:
                    fb_doc = {
                        "id": fb_id,
                        "user_id": f.get("user_id", ""),
                        "name": f.get("name", "User"),
                        "email": (f.get("email") or "").strip().lower(),
                        "rating": int(f.get("rating", 5)),
                        "suggestion": f.get("suggestion") or f.get("message") or "",
                        "status": f.get("status", "submitted"),
                        "created_at": f.get("created_at") or datetime.utcnow().isoformat()
                    }
                    self.db.feedback.insert_one(fb_doc)
                    inserted_fb += 1
        except Exception as e:
            print(f"[MIGRATION NOTICE] SQLite feedback migration error: {e}")

        # Set Migration Marker
        self.db.database_migrations.insert_one({
            "_id": "sqlite_migration_v1",
            "migrated_at": datetime.utcnow().isoformat(),
            "summary": {
                "users_inserted": inserted_users,
                "users_skipped": skipped_users,
                "feedback_inserted": inserted_fb,
                "feedback_skipped": skipped_fb
            }
        })
        print(f"[MIGRATION SUMMARY] Users Inserted: {inserted_users}, Skipped: {skipped_users} | Feedback Inserted: {inserted_fb}, Skipped: {skipped_fb}")

    def _init_sqlite_db(self):
        cursor = self.sqlite_conn.cursor()
        
        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                role TEXT DEFAULT 'user',
                status TEXT DEFAULT 'active'
            )
        """)
        for col_def in [("phone", "TEXT DEFAULT ''"), ("status", "TEXT DEFAULT 'active'")]:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_def[0]} {col_def[1]}")
            except Exception:
                pass
        self.sqlite_conn.commit()

    def migrate_and_standardize_users(self):
        from backend.utils.auth_utils import hash_password
        admin_email = settings.ADMIN_EMAIL.strip().lower()

        if self.use_mongo:
            import re
            # Safely create unique indexes on email and phone
            try:
                self.db.users.create_index("email", unique=True, sparse=True)
                self.db.users.create_index("phone", unique=True, sparse=True)
            except Exception as ie:
                print(f"[MONGO INDEX NOTICE] {ie}")

            # Canonical Admin Account Standardization for snpise448@gmail.com
            admin_user = self.db.users.find_one({"email": {"$regex": f"^{re.escape(admin_email)}$", "$options": "i"}})
            if not admin_user:
                admin_user = self.db.users.find_one({"role": "admin"})

            if admin_user:
                # Update existing admin account in-place, preserving _id and password_hash
                update_fields = {
                    "name": "Sangram Pise",
                    "email": admin_email,
                    "phone": "9405228955",
                    "role": "admin"
                }
                if not admin_user.get("password_hash"):
                    update_fields["password_hash"] = hash_password(settings.ADMIN_INITIAL_PASSWORD)
                if not admin_user.get("status"):
                    update_fields["status"] = "active"

                self.db.users.update_one(
                    {"_id": admin_user["_id"]},
                    {
                        "$set": update_fields,
                        "$unset": {
                            "google_id": ""
                        }
                    }
                )
                print(f"[MONGO MIGRATION] Canonical admin account '{admin_email}' standardized in-place.")
            else:
                doc_id = ObjectId()
                admin_doc = {
                    "_id": doc_id,
                    "id": str(doc_id),
                    "name": "Sangram Pise",
                    "email": admin_email,
                    "phone": "9405228955",
                    "password_hash": hash_password(settings.ADMIN_INITIAL_PASSWORD),
                    "role": "admin",
                    "status": "active",
                    "created_at": doc_id.generation_time.isoformat()
                }
                self.db.users.insert_one(admin_doc)
                print(f"[MONGO MIGRATION] Canonical admin account '{admin_email}' created successfully.")

            # Normal User Schema Standardization
            normal_users = list(self.db.users.find({"email": {"$ne": admin_email}}))
            for u in normal_users:
                update_set = {}
                if "status" not in u or not u["status"]:
                    update_set["status"] = "active"
                if "phone" not in u or u["phone"] is None:
                    update_set["phone"] = ""
                if "role" not in u or not u["role"]:
                    update_set["role"] = "user"
                if "created_at" not in u or not u["created_at"]:
                    update_set["created_at"] = u["_id"].generation_time.isoformat() if hasattr(u.get("_id"), "generation_time") else datetime.utcnow().isoformat()
                
                update_op = {"$unset": {"google_id": ""}}
                if update_set:
                    update_op["$set"] = update_set
                self.db.users.update_one({"_id": u["_id"]}, update_op)
            print(f"[MONGO MIGRATION] Standardized schema for {len(normal_users)} normal user documents.")
        else:
            if hasattr(self, 'sqlite_conn') and self.sqlite_conn:
                cursor = self.sqlite_conn.cursor()
                cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (admin_email,))
                admin_row = cursor.fetchone()
                if not admin_row:
                    cursor.execute("SELECT * FROM users WHERE role = 'admin'")
                    admin_row = cursor.fetchone()

                if admin_row:
                    admin_dict = dict(admin_row)
                    cursor.execute("DELETE FROM users WHERE role = 'admin' AND LOWER(email) != LOWER(?) AND id != ?", (admin_email, admin_dict["id"]))
                    if admin_dict.get("password_hash"):
                        cursor.execute(
                            "UPDATE users SET name = 'Sangram Pise', email = ?, phone = '9405228955', role = 'admin' WHERE id = ?",
                            (admin_email, admin_dict["id"])
                        )
                    else:
                        init_pwd_hash = hash_password(settings.ADMIN_INITIAL_PASSWORD)
                        cursor.execute(
                            "UPDATE users SET name = 'Sangram Pise', email = ?, phone = '9405228955', role = 'admin', status = 'active', password_hash = ? WHERE id = ?",
                            (admin_email, init_pwd_hash, admin_dict["id"])
                        )
                else:
                    admin_id = str(uuid.uuid4())
                    init_pwd_hash = hash_password(settings.ADMIN_INITIAL_PASSWORD)
                    created_at = datetime.utcnow().isoformat()
                    cursor.execute(
                        "INSERT INTO users (id, email, name, password_hash, phone, role, status, created_at) VALUES (?, ?, 'Sangram Pise', ?, '9405228955', 'admin', 'active', ?)",
                        (admin_id, admin_email, init_pwd_hash, created_at)
                    )
                self.sqlite_conn.commit()
                print(f"[SQLITE MIGRATION] Admin account '{admin_email}' standardized.")
        
        # 2. Predictions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                input_data TEXT NOT NULL,
                predictions TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # 3. Chat History Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # 4. Datasets Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS datasets (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                row_count INTEGER NOT NULL,
                summary TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # 5. Notifications Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                read_status INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # 7. OTP Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otps (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                otp_code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                attempts INTEGER DEFAULT 0,
                verified INTEGER DEFAULT 0,
                resend_available_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        
        self.sqlite_conn.commit()

    # Helpers to serialize/deserialize dictionaries to JSON strings for SQLite
    def _to_json(self, data):
        return json.dumps(data)

    def _from_json(self, text):
        return json.loads(text) if text else {}

    # --- USER METHODS ---
    def get_user_by_email(self, email: str):
        if not email:
            return None
        norm_email = email.strip().lower()
        if self.use_mongo:
            import re
            user = self.db.users.find_one({"email": {"$regex": f"^{re.escape(norm_email)}$", "$options": "i"}})
            if user:
                user["id"] = str(user.pop("_id"))
                user.pop("google_id", None)
            return user
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (norm_email,))
            row = cursor.fetchone()
            if row:
                u = dict(row)
                u.pop("google_id", None)
                return u
            return None

    def get_user_by_id(self, user_id: str):
        if not user_id:
            return None
        if self.use_mongo:
            user = None
            if ObjectId.is_valid(user_id):
                user = self.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                user = self.db.users.find_one({"id": user_id})
            if not user:
                user = self.db.users.find_one({"_id": user_id})
            if user:
                user["id"] = str(user.pop("_id"))
            return user
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_user_by_phone(self, phone: str):
        if not phone:
            return None
        clean_phone = phone.strip()
        if not clean_phone:
            return None
        if self.use_mongo:
            user = self.db.users.find_one({"phone": clean_phone})
            if user:
                user["id"] = str(user.pop("_id"))
            return user
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM users WHERE phone = ?", (clean_phone,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_user_status(self, user_id: str, status: str) -> bool:
        if not user_id:
            return False
        if self.use_mongo:
            res = self.db.users.update_one(
                {"$or": [{"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else None}, {"id": user_id}]},
                {"$set": {"status": status}}
            )
            return res.modified_count > 0
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE users SET status = ? WHERE id = ?", (status, user_id))
            self.sqlite_conn.commit()
            return cursor.rowcount > 0

    def create_user(self, user_id: str, email: str, name: str, password_hash: str, role: str = "user", phone: str = None, google_id: str = None, status: str = "active"):
        norm_email = email.strip().lower()
        clean_phone = (phone or "").strip()
        created_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            doc_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else ObjectId()
            user_doc = {
                "_id": doc_id,
                "id": str(doc_id),
                "name": name,
                "email": norm_email,
                "password_hash": password_hash,
                "phone": clean_phone,
                "role": "user" if role != "admin" else role,
                "status": status,
                "created_at": created_at
            }
            try:
                self.db.users.insert_one(user_doc)
            except Exception as e:
                err_str = str(e).lower()
                if "duplicate" in err_str or "dup key" in err_str or "11000" in err_str:
                    if "phone" in err_str:
                        raise HTTPException(status_code=400, detail="An account with this phone number already exists.")
                    raise HTTPException(status_code=400, detail="An account with this email already exists.")
                elif "timeout" in err_str or "connection" in err_str or "selection" in err_str:
                    raise HTTPException(status_code=503, detail="Unable to create account right now. Please try again later.")
                else:
                    raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(e)}")

            user_doc["id"] = str(user_doc.pop("_id"))
            print(f"[MONGO] User inserted successfully into '{settings.DB_NAME}.users': ID={user_doc['id']}, Email={norm_email}")
            return user_doc
        else:
            cursor = self.sqlite_conn.cursor()
            try:
                cursor.execute(
                    "INSERT INTO users (id, email, name, password_hash, phone, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (user_id, norm_email, name, password_hash, clean_phone, role, status, created_at)
                )
                self.sqlite_conn.commit()
            except sqlite3.IntegrityError as ie:
                err_str = str(ie).lower()
                if "phone" in err_str:
                    raise HTTPException(status_code=400, detail="An account with this phone number already exists.")
                raise HTTPException(status_code=400, detail="An account with this email already exists.")
            return {"id": user_id, "email": norm_email, "name": name, "phone": clean_phone, "role": role, "status": status, "created_at": created_at}

    def delete_user_account(self, user_id: str, email: str = None) -> dict:
        deleted_summary = {}
        norm_email = email.strip().lower() if email else ""

        if self.use_mongo:
            cols = self.db.list_collection_names()
            for col in cols:
                if col == "users":
                    query = {"$or": [{"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else None}, {"id": user_id}]}
                    if norm_email:
                        query["$or"].append({"email": norm_email})
                    res = self.db.users.delete_many(query)
                    if res.deleted_count > 0:
                        deleted_summary["users"] = res.deleted_count
                elif col == "otps":
                    if norm_email:
                        res = self.db.otps.delete_many({"email": norm_email})
                        if res.deleted_count > 0:
                            deleted_summary["otps"] = res.deleted_count
                else:
                    res = self.db[col].delete_many({"$or": [{"user_id": user_id}, {"userId": user_id}]})
                    if res.deleted_count > 0:
                        deleted_summary[col] = res.deleted_count
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [r[0] for r in cursor.fetchall()]
            for tbl in tables:
                if tbl == "users":
                    cursor.execute("DELETE FROM users WHERE id = ? OR LOWER(email) = LOWER(?)", (user_id, norm_email))
                    if cursor.rowcount > 0:
                        deleted_summary["users"] = cursor.rowcount
                elif tbl == "otps":
                    cursor.execute("DELETE FROM otps WHERE LOWER(email) = LOWER(?)", (norm_email,))
                    if cursor.rowcount > 0:
                        deleted_summary["otps"] = cursor.rowcount
                else:
                    try:
                        cursor.execute(f"DELETE FROM {tbl} WHERE user_id = ?", (user_id,))
                        if cursor.rowcount > 0:
                            deleted_summary[tbl] = cursor.rowcount
                    except Exception:
                        pass
            self.sqlite_conn.commit()

        print(f"[ACCOUNT DELETION] Account {user_id} ({email}) deleted. Summary: {deleted_summary}")
        return deleted_summary

    def record_login_history(self, user_id: str, ip_address: str = "127.0.0.1", user_agent: str = "Unknown"):
        login_time = datetime.utcnow().isoformat()
        if self.use_mongo:
            doc = {
                "user_id": user_id,
                "login_time": login_time,
                "ip_address": ip_address,
                "device_info": user_agent,
                "created_at": login_time
            }
            self.db.login_history.insert_one(doc)
            print(f"[MONGO] Login history recorded in '{settings.DB_NAME}.login_history' for User ID={user_id}")
        else:
            if hasattr(self, 'sqlite_conn') and self.sqlite_conn:
                cursor = self.sqlite_conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS login_history (
                        id TEXT PRIMARY KEY, user_id TEXT, login_time TEXT, ip_address TEXT, user_agent TEXT
                    )
                """)
                cursor.execute(
                    "INSERT INTO login_history (id, user_id, login_time, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), user_id, login_time, ip_address, user_agent)
                )
                self.sqlite_conn.commit()

    def update_user_password(self, email: str, new_password_hash: str) -> bool:
        if not email:
            return False
        norm_email = email.strip().lower()
        if self.use_mongo:
            import re
            res = self.db.users.update_one(
                {"email": {"$regex": f"^{re.escape(norm_email)}$", "$options": "i"}},
                {"$set": {"password_hash": new_password_hash}}
            )
            return res.matched_count > 0
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)", (new_password_hash, norm_email))
            self.sqlite_conn.commit()
            return cursor.rowcount > 0

    def list_users(self):
        if self.use_mongo:
            users = list(self.db.users.find())
            for u in users:
                raw_id = u.pop("_id")
                u["id"] = str(raw_id)
                u.pop("password_hash", None)
                if not u.get("created_at"):
                    u["created_at"] = raw_id.generation_time.isoformat() if hasattr(raw_id, "generation_time") else datetime.utcnow().isoformat()
            return users
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT id, email, name, phone, role, status, created_at FROM users")
            return [dict(row) for row in cursor.fetchall()]

    # --- OTP METHODS ---
    def save_otp(self, email: str, otp_code: str, expires_in_seconds: int = 300, resend_cooldown_seconds: int = 60):
        norm_email = email.strip().lower()
        now = datetime.utcnow()
        expires_at = (now + timedelta(seconds=expires_in_seconds)).isoformat()
        resend_available_at = (now + timedelta(seconds=resend_cooldown_seconds)).isoformat()
        created_at = now.isoformat()
        otp_id = str(uuid.uuid4()) if 'uuid' in globals() else str(datetime.utcnow().timestamp())

        if self.use_mongo:
            self.db.otps.delete_many({"email": norm_email})
            otp_doc = {
                "email": norm_email,
                "otp_code": otp_code,
                "expires_at": expires_at,
                "attempts": 0,
                "verified": False,
                "resend_available_at": resend_available_at,
                "created_at": created_at
            }
            self.db.otps.insert_one(otp_doc)
            return otp_doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM otps WHERE LOWER(email) = LOWER(?)", (norm_email,))
            cursor.execute(
                "INSERT INTO otps (id, email, otp_code, expires_at, attempts, verified, resend_available_at, created_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?)",
                (otp_id, norm_email, otp_code, expires_at, resend_available_at, created_at)
            )
            self.sqlite_conn.commit()
            return {
                "id": otp_id, "email": norm_email, "otp_code": otp_code,
                "expires_at": expires_at, "attempts": 0, "verified": False,
                "resend_available_at": resend_available_at, "created_at": created_at
            }

    def get_otp_record(self, email: str):
        norm_email = email.strip().lower()
        if self.use_mongo:
            import re
            return self.db.otps.find_one({"email": {"$regex": f"^{re.escape(norm_email)}$", "$options": "i"}})
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM otps WHERE LOWER(email) = LOWER(?)", (norm_email,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d["verified"] = bool(d["verified"])
                return d
            return None

    def increment_otp_attempts(self, email: str):
        norm_email = email.strip().lower()
        if self.use_mongo:
            import re
            self.db.otps.update_one(
                {"email": {"$regex": f"^{re.escape(norm_email)}$", "$options": "i"}},
                {"$inc": {"attempts": 1}}
            )
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE otps SET attempts = attempts + 1 WHERE LOWER(email) = LOWER(?)", (norm_email,))
            self.sqlite_conn.commit()

    def mark_otp_verified(self, email: str):
        norm_email = email.strip().lower()
        if self.use_mongo:
            import re
            self.db.otps.update_one(
                {"email": {"$regex": f"^{re.escape(norm_email)}$", "$options": "i"}},
                {"$set": {"verified": True}}
            )
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE otps SET verified = 1 WHERE LOWER(email) = LOWER(?)", (norm_email,))
            self.sqlite_conn.commit()

    def delete_otp(self, email: str):
        norm_email = email.strip().lower()
        if self.use_mongo:
            import re
            self.db.otps.delete_many({"email": {"$regex": f"^{re.escape(norm_email)}$", "$options": "i"}})
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM otps WHERE LOWER(email) = LOWER(?)", (norm_email,))
            self.sqlite_conn.commit()
            return [dict(row) for row in cursor.fetchall()]

    # --- PREDICTIONS METHODS ---
    def save_prediction(self, prediction_id: str, user_id: str, input_data: dict, predictions: dict):
        created_at = datetime.utcnow().isoformat()
        income = input_data.get("Income")
        expense = input_data.get("Expense")
        budget = input_data.get("Budget")

        if self.use_mongo:
            existing = self.db.predictions.find_one({
                "user_id": user_id,
                "input_data.Income": income,
                "input_data.Expense": expense,
                "input_data.Budget": budget
            })
            if existing:
                self.db.predictions.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"input_data": input_data, "predictions": predictions, "created_at": created_at}}
                )
                return {"id": str(existing["_id"]), "user_id": user_id, "input_data": input_data, "predictions": predictions, "created_at": created_at}

            doc = {
                "_id": ObjectId(prediction_id) if ObjectId.is_valid(prediction_id) else ObjectId(),
                "user_id": user_id,
                "input_data": input_data,
                "predictions": predictions,
                "created_at": created_at
            }
            self.db.predictions.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT id, input_data FROM predictions WHERE user_id = ?", (user_id,))
            rows = cursor.fetchall()
            for r in rows:
                existing_inp = self._from_json(r["input_data"])
                if (existing_inp.get("Income") == income and
                    existing_inp.get("Expense") == expense and
                    existing_inp.get("Budget") == budget):
                    cursor.execute(
                        "UPDATE predictions SET input_data = ?, predictions = ?, created_at = ? WHERE id = ?",
                        (self._to_json(input_data), self._to_json(predictions), created_at, r["id"])
                    )
                    self.sqlite_conn.commit()
                    return {"id": r["id"], "user_id": user_id, "input_data": input_data, "predictions": predictions, "created_at": created_at}

            cursor.execute(
                "INSERT INTO predictions (id, user_id, input_data, predictions, created_at) VALUES (?, ?, ?, ?, ?)",
                (prediction_id, user_id, self._to_json(input_data), self._to_json(predictions), created_at)
            )
            self.sqlite_conn.commit()
            return {"id": prediction_id, "user_id": user_id, "input_data": input_data, "predictions": predictions, "created_at": created_at}

    def get_predictions_by_user(self, user_id: str):
        if self.use_mongo:
            preds = list(self.db.predictions.find({"user_id": user_id}).sort("created_at", pymongo.DESCENDING))
            for p in preds:
                p["id"] = str(p.pop("_id"))
            return preds
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM predictions WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
            rows = cursor.fetchall()
            res = []
            for r in rows:
                item = dict(r)
                item["input_data"] = self._from_json(item["input_data"])
                item["predictions"] = self._from_json(item["predictions"])
                res.append(item)
            return res

    def get_prediction_by_id(self, prediction_id: str):
        if self.use_mongo:
            pred = self.db.predictions.find_one({"_id": ObjectId(prediction_id)})
            if not pred:
                return None
            pred["id"] = str(pred.pop("_id"))
            return pred
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM predictions WHERE id = ?", (prediction_id,))
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            item["input_data"] = self._from_json(item["input_data"])
            item["predictions"] = self._from_json(item["predictions"])
            return item

    def list_all_predictions(self):
        if self.use_mongo:
            preds = list(self.db.predictions.find().sort("created_at", pymongo.DESCENDING))
            for p in preds:
                p["id"] = str(p.pop("_id"))
            return preds
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM predictions ORDER BY created_at DESC")
            rows = cursor.fetchall()
            res = []
            for r in rows:
                item = dict(r)
                item["input_data"] = self._from_json(item["input_data"])
                item["predictions"] = self._from_json(item["predictions"])
                res.append(item)
            return res

    def delete_prediction(self, prediction_id: str, user_id: str) -> bool:
        if self.use_mongo:
            res = self.db.predictions.delete_one({"_id": ObjectId(prediction_id) if ObjectId.is_valid(prediction_id) else prediction_id, "user_id": user_id})
            if res.deleted_count == 0:
                res = self.db.predictions.delete_one({"id": prediction_id, "user_id": user_id})
            return res.deleted_count > 0
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM predictions WHERE id = ? AND user_id = ?", (prediction_id, user_id))
            self.sqlite_conn.commit()
            return cursor.rowcount > 0

    def clear_user_predictions(self, user_id: str) -> int:
        if self.use_mongo:
            res = self.db.predictions.delete_many({"user_id": user_id})
            return res.deleted_count
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM predictions WHERE user_id = ?", (user_id,))
            self.sqlite_conn.commit()
            return cursor.rowcount

    # --- CHAT HISTORY & SESSIONS METHODS ---
    def create_chat_session(self, user_id: str, title: str = "New Financial Chat"):
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            doc = {
                "_id": ObjectId(session_id) if ObjectId.is_valid(session_id) else ObjectId(),
                "session_id": session_id,
                "user_id": user_id,
                "title": title,
                "is_pinned": False,
                "is_deleted": False,
                "created_at": created_at,
                "updated_at": created_at
            }
            self.db.conversation_sessions.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversation_sessions (
                    id TEXT PRIMARY KEY, user_id TEXT, title TEXT, is_pinned INTEGER, is_deleted INTEGER, created_at TEXT, updated_at TEXT
                )
            """)
            cursor.execute(
                "INSERT INTO conversation_sessions (id, user_id, title, is_pinned, is_deleted, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)",
                (session_id, user_id, title, created_at, created_at)
            )
            self.sqlite_conn.commit()
            return {"id": session_id, "session_id": session_id, "user_id": user_id, "title": title, "is_pinned": False, "is_deleted": False, "created_at": created_at, "updated_at": created_at}

    def list_chat_sessions(self, user_id: str, include_deleted: bool = False):
        if self.use_mongo:
            query = {"user_id": user_id}
            if not include_deleted:
                query["is_deleted"] = False
            sessions = list(self.db.conversation_sessions.find(query).sort("updated_at", pymongo.DESCENDING))
            for s in sessions:
                s["id"] = str(s.pop("_id"))
                if "session_id" not in s:
                    s["session_id"] = s["id"]
            return sessions
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversation_sessions (
                    id TEXT PRIMARY KEY, user_id TEXT, title TEXT, is_pinned INTEGER, is_deleted INTEGER, created_at TEXT, updated_at TEXT
                )
            """)
            if include_deleted:
                cursor.execute("SELECT * FROM conversation_sessions WHERE user_id = ? ORDER BY updated_at DESC", (user_id,))
            else:
                cursor.execute("SELECT * FROM conversation_sessions WHERE user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY updated_at DESC", (user_id,))
            rows = cursor.fetchall()
            res = []
            for r in rows:
                item = dict(r)
                item["session_id"] = item["id"]
                item["is_pinned"] = bool(item.get("is_pinned", 0))
                item["is_deleted"] = bool(item.get("is_deleted", 0))
                res.append(item)
            return res

    def get_chat_session(self, session_id: str):
        if self.use_mongo:
            doc = self.db.conversation_sessions.find_one({"$or": [{"_id": ObjectId(session_id) if ObjectId.is_valid(session_id) else None}, {"session_id": session_id}, {"id": session_id}]})
            if doc:
                doc["id"] = str(doc.pop("_id"))
                if "session_id" not in doc:
                    doc["session_id"] = doc["id"]
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM conversation_sessions WHERE id = ?", (session_id,))
            row = cursor.fetchone()
            if row:
                item = dict(row)
                item["session_id"] = item["id"]
                return item
            return None

    def update_chat_session_title(self, session_id: str, title: str):
        updated_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.conversation_sessions.update_one(
                {"$or": [{"_id": ObjectId(session_id) if ObjectId.is_valid(session_id) else None}, {"session_id": session_id}, {"id": session_id}]},
                {"$set": {"title": title, "updated_at": updated_at}}
            )
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE conversation_sessions SET title = ?, updated_at = ? WHERE id = ?", (title, updated_at, session_id))
            self.sqlite_conn.commit()

    def toggle_pin_chat_session(self, session_id: str):
        session = self.get_chat_session(session_id)
        if not session:
            return False
        new_pinned = not session.get("is_pinned", False)
        if self.use_mongo:
            self.db.conversation_sessions.update_one(
                {"$or": [{"_id": ObjectId(session_id) if ObjectId.is_valid(session_id) else None}, {"session_id": session_id}, {"id": session_id}]},
                {"$set": {"is_pinned": new_pinned}}
            )
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE conversation_sessions SET is_pinned = ? WHERE id = ?", (1 if new_pinned else 0, session_id))
            self.sqlite_conn.commit()
        return new_pinned

    def soft_delete_chat_session(self, session_id: str):
        if self.use_mongo:
            self.db.conversation_sessions.update_one(
                {"$or": [{"_id": ObjectId(session_id) if ObjectId.is_valid(session_id) else None}, {"session_id": session_id}, {"id": session_id}]},
                {"$set": {"is_deleted": True}}
            )
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE conversation_sessions SET is_deleted = 1 WHERE id = ?", (session_id,))
            self.sqlite_conn.commit()
        return True

    def restore_chat_session(self, session_id: str):
        if self.use_mongo:
            self.db.conversation_sessions.update_one(
                {"$or": [{"_id": ObjectId(session_id) if ObjectId.is_valid(session_id) else None}, {"session_id": session_id}, {"id": session_id}]},
                {"$set": {"is_deleted": False}}
            )
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE conversation_sessions SET is_deleted = 0 WHERE id = ?", (session_id,))
            self.sqlite_conn.commit()
        return True

    def permanent_delete_chat_session(self, session_id: str, user_id: str):
        if self.use_mongo:
            self.db.conversation_sessions.delete_one({
                "user_id": user_id,
                "$or": [{"_id": ObjectId(session_id) if ObjectId.is_valid(session_id) else None}, {"session_id": session_id}, {"id": session_id}]
            })
            self.db.chat_history.delete_many({
                "user_id": user_id,
                "$or": [{"conversation_id": session_id}, {"session_id": session_id}]
            })
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM conversation_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
            cursor.execute("DELETE FROM chat_history WHERE conversation_id = ? AND user_id = ?", (session_id, user_id))
    def save_record_analysis_history(self, user_id: str, transaction_id: str, customer_id: str, health_score: float, prediction_result: dict, recommendation_summary: str):
        analysis_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        doc = {
            "analysis_id": analysis_id,
            "user_id": user_id,
            "transaction_id": transaction_id,
            "customer_id": customer_id,
            "analysis_time": created_at,
            "health_score": health_score,
            "prediction_result": prediction_result,
            "recommendation_summary": recommendation_summary,
            "created_at": created_at
        }
        if self.use_mongo:
            self.db.record_analysis_history.insert_one(doc)
            doc["_id"] = str(doc.get("_id", ""))
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS record_analysis_history (
                    analysis_id TEXT PRIMARY KEY, user_id TEXT, transaction_id TEXT, customer_id TEXT,
                    analysis_time TEXT, health_score REAL, prediction_result TEXT, recommendation_summary TEXT, created_at TEXT
                )
            """)
            cursor.execute(
                "INSERT INTO record_analysis_history (analysis_id, user_id, transaction_id, customer_id, analysis_time, health_score, prediction_result, recommendation_summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (analysis_id, user_id, transaction_id, customer_id, created_at, health_score, json.dumps(prediction_result), recommendation_summary, created_at)
            )
            self.sqlite_conn.commit()
        return doc

    def save_chat_message(self, message_id: str, user_id: str, sender: str, message: str, conversation_id: str = None):
        created_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            doc = {
                "_id": ObjectId(message_id) if ObjectId.is_valid(message_id) else ObjectId(),
                "user_id": user_id,
                "conversation_id": conversation_id,
                "sender": sender,
                "message": message,
                "created_at": created_at
            }
            self.db.chat_history.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            
            # Touch session updated_at
            if conversation_id:
                self.db.conversation_sessions.update_one(
                    {"$or": [{"_id": ObjectId(conversation_id) if ObjectId.is_valid(conversation_id) else None}, {"session_id": conversation_id}, {"id": conversation_id}]},
                    {"$set": {"updated_at": created_at}}
                )
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id TEXT PRIMARY KEY, user_id TEXT, conversation_id TEXT, sender TEXT, message TEXT, created_at TEXT
                )
            """)
            try:
                cursor.execute("ALTER TABLE chat_history ADD COLUMN conversation_id TEXT")
            except Exception:
                pass
            cursor.execute(
                "INSERT INTO chat_history (id, user_id, conversation_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (message_id, user_id, conversation_id, sender, message, created_at)
            )
            if conversation_id:
                cursor.execute("UPDATE conversation_sessions SET updated_at = ? WHERE id = ?", (created_at, conversation_id))
            self.sqlite_conn.commit()
            return {"id": message_id, "user_id": user_id, "conversation_id": conversation_id, "sender": sender, "message": message, "created_at": created_at}

    def get_session_messages(self, conversation_id: str, user_id: str = None, limit: int = 100):
        if self.use_mongo:
            query = {"$or": [{"conversation_id": conversation_id}, {"session_id": conversation_id}]}
            if user_id:
                query["user_id"] = user_id
            messages = list(self.db.chat_history.find(query).sort("created_at", pymongo.ASCENDING).limit(limit))
            for m in messages:
                m["id"] = str(m.pop("_id"))
            return messages
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM chat_history WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?", (conversation_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    def get_chat_history(self, user_id: str, limit: int = 50):
        if self.use_mongo:
            messages = list(self.db.chat_history.find({"user_id": user_id}).sort("created_at", pymongo.ASCENDING).limit(limit))
            for m in messages:
                m["id"] = str(m.pop("_id"))
            return messages
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT ?", (user_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    def clear_chat_history(self, user_id: str):
        if self.use_mongo:
            self.db.chat_history.delete_many({"user_id": user_id})
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM chat_history WHERE user_id = ?", (user_id,))
            self.sqlite_conn.commit()

    def save_message_feedback(self, message_id: str, user_id: str, rating: str, feedback_text: str = None):
        created_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            doc = {
                "message_id": message_id,
                "user_id": user_id,
                "rating": rating,
                "feedback_text": feedback_text or "",
                "created_at": created_at
            }
            self.db.message_feedback.insert_one(doc)
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS message_feedback (
                    id TEXT PRIMARY KEY, message_id TEXT, user_id TEXT, rating TEXT, feedback_text TEXT, created_at TEXT
                )
            """)
            cursor.execute(
                "INSERT INTO message_feedback (id, message_id, user_id, rating, feedback_text, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), message_id, user_id, rating, feedback_text or "", created_at)
            )
            self.sqlite_conn.commit()
            return {"message_id": message_id, "user_id": user_id, "rating": rating, "feedback_text": feedback_text, "created_at": created_at}

    # --- DATASET METADATA METHODS ---
    def save_dataset_meta(self, dataset_id: str, user_id: str, filename: str, row_count: int, summary: dict):
        created_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            doc = {
                "_id": ObjectId(dataset_id) if ObjectId.is_valid(dataset_id) else ObjectId(),
                "user_id": user_id,
                "filename": filename,
                "row_count": row_count,
                "summary": summary,
                "created_at": created_at
            }
            self.db.datasets.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute(
                "INSERT INTO datasets (id, user_id, filename, row_count, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (dataset_id, user_id, filename, row_count, self._to_json(summary), created_at)
            )
            self.sqlite_conn.commit()
            return {"id": dataset_id, "user_id": user_id, "filename": filename, "row_count": row_count, "summary": summary, "created_at": created_at}

    def list_datasets(self, user_id: str = None):
        if self.use_mongo:
            query = {"user_id": user_id} if user_id else {}
            ds_list = list(self.db.datasets.find(query).sort("created_at", pymongo.DESCENDING))
            for ds in ds_list:
                ds["id"] = str(ds.pop("_id"))
            return ds_list
        else:
            cursor = self.sqlite_conn.cursor()
            if user_id:
                cursor.execute("SELECT * FROM datasets WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
            else:
                cursor.execute("SELECT * FROM datasets ORDER BY created_at DESC")
            rows = cursor.fetchall()
            res = []
            for r in rows:
                item = dict(r)
                item["summary"] = self._from_json(item["summary"])
                res.append(item)
            return res

    # --- NOTIFICATIONS METHODS ---
    def create_notification(self, notif_id: str, user_id: str, title: str, message: str):
        created_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            doc = {
                "_id": ObjectId(notif_id) if ObjectId.is_valid(notif_id) else ObjectId(),
                "user_id": user_id,
                "title": title,
                "message": message,
                "read_status": False,
                "created_at": created_at
            }
            self.db.notifications.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute(
                "INSERT INTO notifications (id, user_id, title, message, read_status, created_at) VALUES (?, ?, ?, ?, 0, ?)",
                (notif_id, user_id, title, message, created_at)
            )
            self.sqlite_conn.commit()
            return {"id": notif_id, "user_id": user_id, "title": title, "message": message, "read_status": False, "created_at": created_at}

    def get_notifications(self, user_id: str, unread_only: bool = False):
        if self.use_mongo:
            query = {"user_id": user_id}
            if unread_only:
                query["read_status"] = False
            notifs = list(self.db.notifications.find(query).sort("created_at", pymongo.DESCENDING))
            for n in notifs:
                n["id"] = str(n.pop("_id"))
            return notifs
        else:
            cursor = self.sqlite_conn.cursor()
            if unread_only:
                cursor.execute("SELECT * FROM notifications WHERE user_id = ? AND read_status = 0 ORDER BY created_at DESC", (user_id,))
            else:
                cursor.execute("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
            rows = cursor.fetchall()
            res = []
            for r in rows:
                item = dict(r)
                item["read_status"] = bool(item["read_status"])
                res.append(item)
            return res

    def mark_notifications_read(self, user_id: str):
        if self.use_mongo:
            self.db.notifications.update_many({"user_id": user_id}, {"$set": {"read_status": True}})
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE notifications SET read_status = 1 WHERE user_id = ?", (user_id,))
            self.sqlite_conn.commit()

    def delete_notification(self, notif_id: str, user_id: str) -> bool:
        if self.use_mongo:
            res = self.db.notifications.delete_one({
                "_id": ObjectId(notif_id) if ObjectId.is_valid(notif_id) else notif_id,
                "user_id": user_id
            })
            if res.deleted_count == 0:
                res = self.db.notifications.delete_one({"id": notif_id, "user_id": user_id})
            return res.deleted_count > 0
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM notifications WHERE id = ? AND user_id = ?", (notif_id, user_id))
            self.sqlite_conn.commit()
            return cursor.rowcount > 0

    # --- FEEDBACK METHODS ---
    def create_feedback(self, feedback_id: str, user_id: str, name: str, email: str, message: str = None, rating: int = 5, suggestion: str = None, status: str = "submitted"):
        created_at = datetime.utcnow().isoformat()
        final_suggestion = (suggestion or message or "").strip()
        if self.use_mongo:
            doc = {
                "_id": ObjectId(feedback_id) if ObjectId.is_valid(feedback_id) else ObjectId(),
                "id": feedback_id,
                "user_id": user_id,
                "name": name,
                "email": email,
                "rating": int(rating),
                "suggestion": final_suggestion,
                "message": final_suggestion,
                "status": status,
                "created_at": created_at
            }
            self.db.feedback.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id TEXT PRIMARY KEY, user_id TEXT, name TEXT, email TEXT, rating INTEGER DEFAULT 5, suggestion TEXT, message TEXT, status TEXT DEFAULT 'submitted', created_at TEXT
                )
            """)
            for col_def in [("rating", "INTEGER DEFAULT 5"), ("suggestion", "TEXT DEFAULT ''"), ("status", "TEXT DEFAULT 'submitted'")]:
                try: cursor.execute(f"ALTER TABLE feedback ADD COLUMN {col_def[0]} {col_def[1]}")
                except Exception: pass
            cursor.execute(
                "INSERT INTO feedback (id, user_id, name, email, rating, suggestion, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (feedback_id, user_id, name, email, int(rating), final_suggestion, final_suggestion, status, created_at)
            )
            self.sqlite_conn.commit()
            return {"id": feedback_id, "user_id": user_id, "name": name, "email": email, "rating": int(rating), "suggestion": final_suggestion, "message": final_suggestion, "status": status, "created_at": created_at}

    def list_feedback(self):
        if self.use_mongo:
            fb_list = list(self.db.feedback.find().sort("created_at", pymongo.DESCENDING))
            for item in fb_list:
                item["id"] = str(item.pop("_id"))
                if "suggestion" not in item and "message" in item:
                    item["suggestion"] = item["message"]
            return fb_list
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM feedback ORDER BY created_at DESC")
            rows = [dict(row) for row in cursor.fetchall()]
            for item in rows:
                if "suggestion" not in item or not item["suggestion"]:
                    item["suggestion"] = item.get("message", "")
            return rows

    def get_user_feedback(self, user_id: str):
        if not user_id:
            return []
        if self.use_mongo:
            fb_list = list(self.db.feedback.find({"user_id": user_id}).sort("created_at", pymongo.DESCENDING))
            for item in fb_list:
                item["id"] = str(item.pop("_id"))
                if "suggestion" not in item and "message" in item:
                    item["suggestion"] = item["message"]
            return fb_list
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
            rows = [dict(row) for row in cursor.fetchall()]
            for item in rows:
                if "suggestion" not in item or not item["suggestion"]:
                    item["suggestion"] = item.get("message", "")
            return rows

    def delete_feedback(self, feedback_id: str) -> bool:
        if self.use_mongo:
            query = {"$or": [{"_id": ObjectId(feedback_id) if ObjectId.is_valid(feedback_id) else None}, {"id": feedback_id}]}
            res = self.db.feedback.delete_one(query)
            return res.deleted_count > 0
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))
            self.sqlite_conn.commit()
            return cursor.rowcount > 0

    # --- FINANCIAL PROFILE & ACCOUNT MERGING METHODS ---
    def save_financial_profile(self, user_id: str, profile_data: dict):
        created_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.financial_profiles.update_one(
                {"user_id": user_id},
                {"$set": {"user_id": user_id, "profile": profile_data, "updated_at": created_at}},
                upsert=True
            )
            return {"user_id": user_id, "profile": profile_data, "updated_at": created_at}
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS financial_profiles (
                    user_id TEXT PRIMARY KEY,
                    profile TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            cursor.execute(
                "INSERT INTO financial_profiles (user_id, profile, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(user_id) DO UPDATE SET profile=excluded.profile, updated_at=excluded.updated_at",
                (user_id, self._to_json(profile_data), created_at)
            )
            self.sqlite_conn.commit()
            return {"user_id": user_id, "profile": profile_data, "updated_at": created_at}

    def get_financial_profile(self, user_id: str):
        if self.use_mongo:
            doc = self.db.financial_profiles.find_one({"user_id": user_id})
            return doc.get("profile", {}) if doc else None
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT profile FROM financial_profiles WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            return self._from_json(row["profile"]) if row else None

    def update_user_google_info(self, user_id: str, google_id: str = None):
        updated_at = datetime.utcnow().isoformat()
        if self.use_mongo:
            update_fields = {"last_login": updated_at}
            if google_id:
                update_fields["google_id"] = google_id
            self.db.users.update_one({"id": user_id}, {"$set": update_fields})
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("UPDATE users SET created_at = ? WHERE id = ?", (updated_at, user_id))
            self.sqlite_conn.commit()

    def save_goal_plan(self, user_id: str, goal_data: dict):
        created_at = datetime.utcnow().isoformat()
        goal_id = str(uuid.uuid4())
        doc = {
            "_id": ObjectId(goal_id) if ObjectId.is_valid(goal_id) else ObjectId(),
            "goal_id": goal_id,
            "user_id": user_id,
            "goal_data": goal_data,
            "created_at": created_at
        }
        if self.use_mongo:
            self.db.financial_goals.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS financial_goals (
                    id TEXT PRIMARY KEY, user_id TEXT, goal_data TEXT, created_at TEXT
                )
            """)
            cursor.execute(
                "INSERT INTO financial_goals (id, user_id, goal_data, created_at) VALUES (?, ?, ?, ?)",
                (goal_id, user_id, self._to_json(goal_data), created_at)
            )
            self.sqlite_conn.commit()
            return {"id": goal_id, "user_id": user_id, "goal_data": goal_data, "created_at": created_at}

    def save_retirement_plan(self, user_id: str, retirement_data: dict):
        created_at = datetime.utcnow().isoformat()
        plan_id = str(uuid.uuid4())
        doc = {
            "_id": ObjectId(plan_id) if ObjectId.is_valid(plan_id) else ObjectId(),
            "plan_id": plan_id,
            "user_id": user_id,
            "retirement_data": retirement_data,
            "created_at": created_at
        }
        if self.use_mongo:
            self.db.retirement_plans.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS retirement_plans (
                    id TEXT PRIMARY KEY, user_id TEXT, retirement_data TEXT, created_at TEXT
                )
            """)
            cursor.execute(
                "INSERT INTO retirement_plans (id, user_id, retirement_data, created_at) VALUES (?, ?, ?, ?)",
                (plan_id, user_id, self._to_json(retirement_data), created_at)
            )
            self.sqlite_conn.commit()
            return {"id": plan_id, "user_id": user_id, "retirement_data": retirement_data, "created_at": created_at}

    def save_debt_plan(self, user_id: str, debt_data: dict):
        created_at = datetime.utcnow().isoformat()
        plan_id = str(uuid.uuid4())
        doc = {
            "_id": ObjectId(plan_id) if ObjectId.is_valid(plan_id) else ObjectId(),
            "plan_id": plan_id,
            "user_id": user_id,
            "debt_data": debt_data,
            "created_at": created_at
        }
        if self.use_mongo:
            self.db.debt_plans.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS debt_plans (
                    id TEXT PRIMARY KEY, user_id TEXT, debt_data TEXT, created_at TEXT
                )
            """)
            cursor.execute(
                "INSERT INTO debt_plans (id, user_id, debt_data, created_at)",
                (plan_id, user_id, self._to_json(debt_data), created_at)
            )
            self.sqlite_conn.commit()
            return {"id": plan_id, "user_id": user_id, "debt_data": debt_data, "created_at": created_at}

    def record_activity_log(self, user_id: str, action: str, description: str = None, metadata: dict = None):
        created_at = datetime.utcnow().isoformat()
        log_id = str(uuid.uuid4())
        doc = {
            "_id": ObjectId(log_id) if ObjectId.is_valid(log_id) else ObjectId(),
            "log_id": log_id,
            "user_id": user_id,
            "action": action,
            "description": description or "",
            "metadata": metadata or {},
            "created_at": created_at
        }
        if self.use_mongo:
            self.db.activity_logs.insert_one(doc)
            doc["id"] = str(doc.pop("_id"))
            return doc
        else:
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id TEXT PRIMARY KEY, user_id TEXT, action TEXT, description TEXT, metadata TEXT, created_at TEXT
                )
            """)
            cursor.execute(
                "INSERT INTO activity_logs (id, user_id, action, description, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (log_id, user_id, action, description or "", self._to_json(metadata or {}), created_at)
            )
            self.sqlite_conn.commit()
            return {"id": log_id, "user_id": user_id, "action": action, "description": description, "metadata": metadata, "created_at": created_at}

# Singleton Database Service instance
db_service = DBService()

