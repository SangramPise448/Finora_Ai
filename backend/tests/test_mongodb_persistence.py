import unittest
import uuid
import pymongo
import certifi
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings
from backend.services.db_service import db_service

class TestMongoDBPersistence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_email = f"test_mongo_{uuid.uuid4().hex[:8]}@example.com"
        cls.test_phone = f"98{uuid.uuid4().int % 100000000:08d}"
        cls.test_password = "Password@123"
        cls.new_password = "NewPassword@456"

    def test_01_mongodb_atlas_connection_ping(self):
        """Verify MongoDB Atlas ping succeeds and active database is personal_finance_db."""
        self.assertTrue(db_service.use_mongo, "MongoDB service is not active")
        self.assertIsNotNone(db_service.db, "MongoDB database instance is None")
        self.assertEqual(db_service.db.name, "personal_finance_db", "Database name is not 'personal_finance_db'")
        
        ping_res = db_service.mongo_client.admin.command("ping")
        self.assertTrue(ping_res.get("ok") in (1, 1.0, True), f"MongoDB ping failed: {ping_res}")

    def test_02_user_registration_persists_to_mongodb(self):
        """Verify user registration inserts document into MongoDB Atlas personal_finance_db.users."""
        res = self.client.post("/auth/register", json={
            "name": "Mongo Test User",
            "email": self.test_email,
            "phone": self.test_phone,
            "password": self.test_password
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data.get("success"))

        # Query MongoDB directly to verify document persistence
        mongo_doc = db_service.db.users.find_one({"email": self.test_email})
        self.assertIsNotNone(mongo_doc, f"User '{self.test_email}' not found in MongoDB Atlas")
        self.assertEqual(mongo_doc.get("phone"), self.test_phone)
        self.assertEqual(mongo_doc.get("role"), "user")
        self.assertEqual(mongo_doc.get("status"), "active")
        self.assertTrue("password_hash" in mongo_doc)

    def test_03_duplicate_email_and_phone_rejection(self):
        """Verify duplicate registration attempts return HTTP 400."""
        dup_email_res = self.client.post("/auth/register", json={
            "name": "Dup User",
            "email": self.test_email,
            "phone": "97" + f"{uuid.uuid4().int % 100000000:08d}",
            "password": "Password@123"
        })
        self.assertEqual(dup_email_res.status_code, 400)
        self.assertIn("already exists", dup_email_res.json().get("detail", "").lower())

        dup_phone_res = self.client.post("/auth/register", json={
            "name": "Dup User",
            "email": f"dup_{uuid.uuid4().hex[:6]}@example.com",
            "phone": self.test_phone,
            "password": "Password@123"
        })
        self.assertEqual(dup_phone_res.status_code, 400)
        self.assertIn("already exists", dup_phone_res.json().get("detail", "").lower())

    def test_04_login_authenticates_against_mongodb(self):
        """Verify user login authenticates against MongoDB Atlas password_hash."""
        login_res = self.client.post("/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        self.assertEqual(login_res.status_code, 200)
        data = login_res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("access_token", data.get("data", {}))

    def test_05_admin_login_authenticates_canonical_admin(self):
        """Verify Admin login succeeds using canonical admin snpise448@gmail.com."""
        admin_login = self.client.post("/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_INITIAL_PASSWORD
        })
        self.assertEqual(admin_login.status_code, 200)
        admin_data = admin_login.json()
        self.assertEqual(admin_data.get("data", {}).get("user", {}).get("role"), "admin")

    def test_06_feedback_submission_persists_to_mongodb(self):
        """Verify feedback submission persists to personal_finance_db.feedback."""
        login_res = self.client.post("/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        fb_res = self.client.post("/finance/feedback", json={
            "rating": 5,
            "suggestion": "MongoDB integration test feedback rating 5 stars"
        }, headers=headers)
        self.assertEqual(fb_res.status_code, 200)

        # Verify feedback in MongoDB
        fb_doc = db_service.db.feedback.find_one({"email": self.test_email})
        self.assertIsNotNone(fb_doc, "Feedback not found in MongoDB personal_finance_db.feedback")
        self.assertEqual(fb_doc.get("rating"), 5)

    def test_07_admin_panel_queries_users_from_mongodb(self):
        """Verify Admin Panel user query fetches users from MongoDB personal_finance_db.users."""
        admin_login = self.client.post("/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_INITIAL_PASSWORD
        })
        admin_token = admin_login.json()["data"]["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        users_res = self.client.get("/auth/users", headers=admin_headers)
        self.assertEqual(users_res.status_code, 200)
        users_list = users_res.json().get("data", [])
        
        mongo_count = db_service.db.users.count_documents({})
        self.assertEqual(len(users_list), mongo_count, "Admin Panel user count does not match MongoDB Atlas count")

    def test_08_cleanup_test_user_from_mongodb(self):
        """Verify user deletion removes test user document from MongoDB Atlas."""
        user_doc = db_service.db.users.find_one({"email": self.test_email})
        self.assertIsNotNone(user_doc)
        user_id = str(user_doc.get("id") or user_doc.get("_id"))

        admin_login = self.client.post("/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_INITIAL_PASSWORD
        })
        admin_token = admin_login.json()["data"]["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        del_res = self.client.delete(f"/auth/users/{user_id}", headers=admin_headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify deletion in MongoDB
        deleted_doc = db_service.db.users.find_one({"email": self.test_email})
        self.assertIsNone(deleted_doc, "Deleted user still exists in MongoDB Atlas")

if __name__ == "__main__":
    unittest.main()
