import unittest
import json
import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.db_service import db_service
from backend.config import settings

class TestAccountUpgrade(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Ensure migration is run
        db_service.migrate_and_standardize_users()

    def test_01_admin_standardization_and_protection(self):
        admin = db_service.get_user_by_email(settings.ADMIN_EMAIL)
        self.assertIsNotNone(admin, "Admin account must exist")
        self.assertEqual(admin.get("name"), "Sangram Pise")
        self.assertEqual(admin.get("phone"), "9405228955")
        self.assertEqual(admin.get("role"), "admin")
        self.assertEqual(admin.get("status"), "active")
        self.assertNotIn("google_id", admin, "google_id must be omitted from admin document")
        self.assertNotIn("created_at", admin, "created_at must be omitted from admin document")

        # Test login with initial admin password
        res_login = self.client.post("/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_INITIAL_PASSWORD
        })
        self.assertEqual(res_login.status_code, 200, "Admin login must succeed with initial password")

    def test_02_registration_with_phone_and_validation(self):
        test_email = f"test_user_{uuid.uuid4().hex[:6]}@domain.com"
        test_phone = f"98{uuid.uuid4().int % 100000000:08d}"

        # 1. Invalid phone format test
        res_invalid = self.client.post("/auth/register", json={
            "email": test_email,
            "name": "Test User",
            "phone": "12345", # Invalid format length
            "password": "Password123!"
        })
        self.assertIn(res_invalid.status_code, [400, 422])

        # 2. Valid registration
        res_reg = self.client.post("/auth/register", json={
            "email": test_email,
            "name": "Test User",
            "phone": test_phone,
            "password": "Password123!"
        })
        self.assertEqual(res_reg.status_code, 201)
        data = res_reg.json().get("data", {})
        self.assertEqual(data.get("user", {}).get("phone"), test_phone)
        self.assertEqual(data.get("user", {}).get("role"), "user")

        # 3. Duplicate phone registration test
        res_dup_phone = self.client.post("/auth/register", json={
            "email": f"another_{uuid.uuid4().hex[:6]}@domain.com",
            "name": "Another User",
            "phone": test_phone, # Duplicate
            "password": "Password123!"
        })
        self.assertEqual(res_dup_phone.status_code, 400)
        self.assertEqual(res_dup_phone.json().get("detail"), "An account with this phone number already exists.")

    def test_03_status_lifecycle_and_inactive_guard(self):
        test_email = f"status_user_{uuid.uuid4().hex[:6]}@domain.com"
        test_phone = f"98{uuid.uuid4().int % 100000000:08d}"

        # Register -> status active
        res_reg = self.client.post("/auth/register", json={
            "email": test_email,
            "name": "Status User",
            "phone": test_phone,
            "password": "Password123!"
        })
        self.assertEqual(res_reg.status_code, 201)
        token = res_reg.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        # Check /auth/me -> status active
        res_me = self.client.get("/auth/me", headers=headers)
        self.assertEqual(res_me.status_code, 200)

        # Logout -> status inactive
        res_logout = self.client.post("/auth/logout", headers=headers)
        self.assertEqual(res_logout.status_code, 200)

        # Immediate request using old token -> 401 Unauthorized because status is inactive
        res_blocked = self.client.get("/auth/me", headers=headers)
        self.assertEqual(res_blocked.status_code, 401)

        # Login again -> reactivates status to active
        res_login = self.client.post("/auth/login", json={
            "email": test_email,
            "password": "Password123!"
        })
        self.assertEqual(res_login.status_code, 200)
        new_token = res_login.json().get("access_token")
        new_headers = {"Authorization": f"Bearer {new_token}"}
        res_me2 = self.client.get("/auth/me", headers=new_headers)
        self.assertEqual(res_me2.status_code, 200)

    def test_04_two_user_account_deletion_isolation(self):
        # Create User A & User B
        email_a = f"usera_{uuid.uuid4().hex[:6]}@domain.com"
        phone_a = f"98{uuid.uuid4().int % 100000000:08d}"
        res_a = self.client.post("/auth/register", json={"email": email_a, "name": "User A", "phone": phone_a, "password": "Password123!"})
        token_a = res_a.json().get("access_token")
        user_a_id = res_a.json().get("user", {}).get("id")

        email_b = f"userb_{uuid.uuid4().hex[:6]}@domain.com"
        phone_b = f"98{uuid.uuid4().int % 100000000:08d}"
        res_b = self.client.post("/auth/register", json={"email": email_b, "name": "User B", "phone": phone_b, "password": "Password123!"})
        token_b = res_b.json().get("access_token")
        user_b_id = res_b.json().get("user", {}).get("id")

        # Save predictions for User A & User B
        db_service.save_prediction(str(uuid.uuid4()), user_a_id, {"Income": 50000}, {"savings": 15000})
        db_service.save_prediction(str(uuid.uuid4()), user_b_id, {"Income": 60000}, {"savings": 20000})

        # User A deletes account
        res_del_a = self.client.delete("/auth/account", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(res_del_a.status_code, 200)
        self.assertIn("deleted_records", res_del_a.json().get("data", {}))

        # Verify User A data is purged from DB
        user_a_db = db_service.get_user_by_id(user_a_id)
        self.assertIsNone(user_a_db, "User A document must be deleted")
        preds_a = db_service.get_predictions_by_user(user_a_id)
        self.assertEqual(len(preds_a), 0, "User A predictions must be deleted")

        # Verify User B data is 100% INTACT
        user_b_db = db_service.get_user_by_id(user_b_id)
        self.assertIsNotNone(user_b_db, "User B document must remain intact")
        preds_b = db_service.get_predictions_by_user(user_b_id)
        self.assertEqual(len(preds_b), 1, "User B predictions must remain intact")

    def test_05_admin_password_reset_and_restart_persistence(self):
        admin_email = settings.ADMIN_EMAIL
        new_pwd = "NewAdminPass_@2026"

        # 1. Reset Admin password
        res_reset = self.client.post("/auth/reset-password-direct", json={
            "email": admin_email,
            "new_password": new_pwd
        })
        self.assertEqual(res_reset.status_code, 200, "Reset password must return 200 OK")

        # 2. Login with NEW password -> MUST SUCCEED
        res_login_new = self.client.post("/auth/login", json={
            "email": admin_email,
            "password": new_pwd
        })
        self.assertEqual(res_login_new.status_code, 200, "Login with NEW password must succeed")

        # 3. Login with OLD password -> MUST FAIL
        res_login_old = self.client.post("/auth/login", json={
            "email": admin_email,
            "password": settings.ADMIN_INITIAL_PASSWORD
        })
        self.assertEqual(res_login_old.status_code, 401, "Login with OLD password must fail")

        # 4. Simulate backend restart (re-run startup migration)
        db_service.migrate_and_standardize_users()

        # 5. Login with NEW password after backend restart -> MUST STILL SUCCEED
        res_login_restart = self.client.post("/auth/login", json={
            "email": admin_email,
            "password": new_pwd
        })
        self.assertEqual(res_login_restart.status_code, 200, "NEW password must STILL work after backend restart migration")

        # 6. Reset back to initial password for subsequent test runs
        self.client.post("/auth/reset-password-direct", json={
            "email": admin_email,
            "new_password": settings.ADMIN_INITIAL_PASSWORD
        })

    def test_06_registration_security_cannot_create_admin_and_error_classification(self):
        # 1. Registration with Admin Email MUST BE REJECTED as duplicate
        res_admin_reg = self.client.post("/auth/register", json={
            "email": settings.ADMIN_EMAIL,
            "name": "Attacker",
            "phone": "9811122233",
            "password": "Password123!"
        })
        self.assertEqual(res_admin_reg.status_code, 400)
        self.assertEqual(res_admin_reg.json().get("detail"), "An account with this email already exists.")

        # Verify Admin account role was NOT changed
        admin_doc = db_service.get_user_by_email(settings.ADMIN_EMAIL)
        self.assertEqual(admin_doc.get("role"), "admin")
        self.assertEqual(admin_doc.get("name"), "Sangram Pise")

        # 2. Duplicate Email Error message check for standard user
        email_dup = f"dup_email_{uuid.uuid4().hex[:6]}@domain.com"
        phone_1 = f"98{uuid.uuid4().int % 100000000:08d}"
        phone_2 = f"98{uuid.uuid4().int % 100000000:08d}"

        res_u1 = self.client.post("/auth/register", json={"email": email_dup, "name": "User 1", "phone": phone_1, "password": "Password123!"})
        self.assertEqual(res_u1.status_code, 201)

        res_u2_dup = self.client.post("/auth/register", json={"email": email_dup, "name": "User 2", "phone": phone_2, "password": "Password123!"})
        self.assertEqual(res_u2_dup.status_code, 400)
        self.assertEqual(res_u2_dup.json().get("detail"), "An account with this email already exists.")

if __name__ == "__main__":
    unittest.main()
