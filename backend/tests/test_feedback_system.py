import unittest
import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.db_service import db_service
from backend.config import settings

class TestFeedbackSystem(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_a_email = f"user_a_{uuid.uuid4().hex[:6]}@example.com"
        self.user_b_email = f"user_b_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "Password123!"

        # Register User A
        reg_a = self.client.post("/auth/register", json={
            "name": "User Alpha", "email": self.user_a_email, "phone": f"98{uuid.uuid4().int % 100000000:08d}", "password": self.password
        })
        self.assertEqual(reg_a.status_code, 201)
        self.user_a_id = reg_a.json()["data"]["user"]["id"]
        login_a = self.client.post("/auth/login", json={"email": self.user_a_email, "password": self.password})
        self.token_a = login_a.json()["access_token"]
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}

        # Register User B
        reg_b = self.client.post("/auth/register", json={
            "name": "User Beta", "email": self.user_b_email, "phone": f"99{uuid.uuid4().int % 100000000:08d}", "password": self.password
        })
        self.assertEqual(reg_b.status_code, 201)
        self.user_b_id = reg_b.json()["data"]["user"]["id"]
        login_b = self.client.post("/auth/login", json={"email": self.user_b_email, "password": self.password})
        self.token_b = login_b.json()["access_token"]
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

        # Admin Token
        admin_login = self.client.post("/auth/login", json={
            "email": settings.ADMIN_EMAIL, "password": settings.ADMIN_INITIAL_PASSWORD
        })
        self.admin_token = admin_login.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

    def test_01_submit_valid_feedback_and_rating_validation(self):
        # Valid 5-star feedback
        res = self.client.post("/finance/feedback", json={
            "rating": 5, "suggestion": "Excellent AI forecasting dashboard!"
        }, headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])

        # Valid 1-star feedback
        res_1 = self.client.post("/finance/feedback", json={
            "rating": 1, "suggestion": "Needs faster loading times."
        }, headers=self.headers_a)
        self.assertEqual(res_1.status_code, 200)

        # Rating 0 (invalid)
        res_0 = self.client.post("/finance/feedback", json={
            "rating": 0, "suggestion": "Invalid zero rating"
        }, headers=self.headers_a)
        self.assertIn(res_0.status_code, (400, 422))

        # Rating 6 (invalid)
        res_6 = self.client.post("/finance/feedback", json={
            "rating": 6, "suggestion": "Invalid six rating"
        }, headers=self.headers_a)
        self.assertIn(res_6.status_code, (400, 422))

    def test_02_suggestion_text_validation(self):
        # Empty suggestion
        res_empty = self.client.post("/finance/feedback", json={
            "rating": 4, "suggestion": ""
        }, headers=self.headers_a)
        self.assertIn(res_empty.status_code, (400, 422))

        # Whitespace-only suggestion
        res_ws = self.client.post("/finance/feedback", json={
            "rating": 4, "suggestion": "     "
        }, headers=self.headers_a)
        self.assertIn(res_ws.status_code, (400, 422))

        # >1000 chars suggestion
        long_text = "A" * 1005
        res_long = self.client.post("/finance/feedback", json={
            "rating": 4, "suggestion": long_text
        }, headers=self.headers_a)
        self.assertIn(res_long.status_code, (400, 422))

    def test_03_user_identity_session_binding(self):
        # User A attempts to submit feedback with fake user_id in payload
        res = self.client.post("/finance/feedback", json={
            "rating": 5, "suggestion": "Spoof test suggestion", "user_id": "FAKE_USER_ID", "email": "fake@attacker.com"
        }, headers=self.headers_a)
        self.assertEqual(res.status_code, 200)

        # Verify in DB that the feedback is bound to User A's real user_id and email
        my_fb = db_service.get_user_feedback(self.user_a_id)
        found = [f for f in my_fb if f.get("suggestion") == "Spoof test suggestion"]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["user_id"], self.user_a_id)
        self.assertEqual(found[0]["email"], self.user_a_email)

    def test_04_my_feedback_isolation(self):
        # User A submits feedback
        self.client.post("/finance/feedback", json={
            "rating": 5, "suggestion": "User A Unique Suggestion"
        }, headers=self.headers_a)

        # User B submits feedback
        self.client.post("/finance/feedback", json={
            "rating": 3, "suggestion": "User B Unique Suggestion"
        }, headers=self.headers_b)

        # User A fetches my feedback
        res_a = self.client.get("/finance/feedback/my", headers=self.headers_a)
        self.assertEqual(res_a.status_code, 200)
        items_a = res_a.json().get("data", [])
        self.assertTrue(any(f["suggestion"] == "User A Unique Suggestion" for f in items_a))
        self.assertFalse(any(f["suggestion"] == "User B Unique Suggestion" for f in items_a))

        # User B fetches my feedback
        res_b = self.client.get("/finance/feedback/my", headers=self.headers_b)
        self.assertEqual(res_b.status_code, 200)
        items_b = res_b.json().get("data", [])
        self.assertTrue(any(f["suggestion"] == "User B Unique Suggestion" for f in items_b))
        self.assertFalse(any(f["suggestion"] == "User A Unique Suggestion" for f in items_b))

    def test_05_admin_access_control(self):
        # Admin can view all feedback
        res_admin = self.client.get("/finance/feedback", headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 200)

        # Normal User A receives 403 Forbidden
        res_user = self.client.get("/finance/feedback", headers=self.headers_a)
        self.assertEqual(res_user.status_code, 403)

    def test_06_account_deletion_feedback_cleanup(self):
        # User A submits feedback
        self.client.post("/finance/feedback", json={
            "rating": 4, "suggestion": "Delete cleanup test for User A"
        }, headers=self.headers_a)

        # User B submits feedback
        self.client.post("/finance/feedback", json={
            "rating": 5, "suggestion": "Preserved feedback for User B"
        }, headers=self.headers_b)

        # Delete User A account
        db_service.delete_user_account(self.user_a_id, self.user_a_email)

        # Verify User A feedback is deleted
        fb_a = db_service.get_user_feedback(self.user_a_id)
        self.assertEqual(len(fb_a), 0)

        # Verify User B feedback is intact
        fb_b = db_service.get_user_feedback(self.user_b_id)
        self.assertTrue(any(f["suggestion"] == "Preserved feedback for User B" for f in fb_b))

    def test_07_admin_delete_feedback(self):
        # User A submits feedback
        sub_res = self.client.post("/finance/feedback", json={
            "rating": 5, "suggestion": "Feedback to be deleted by admin"
        }, headers=self.headers_a)
        fb_id = sub_res.json()["data"]["feedback_id"]

        # Normal User A attempts to delete feedback -> 403 Forbidden
        user_del = self.client.delete(f"/finance/feedback/{fb_id}", headers=self.headers_a)
        self.assertEqual(user_del.status_code, 403)

        # Admin deletes feedback -> 200 OK
        admin_del = self.client.delete(f"/finance/feedback/{fb_id}", headers=self.admin_headers)
        self.assertEqual(admin_del.status_code, 200)

        # Verify feedback no longer exists in User A history
        fb_a = db_service.get_user_feedback(self.user_a_id)
        self.assertFalse(any(f.get("id") == fb_id for f in fb_a))

if __name__ == "__main__":
    unittest.main()
