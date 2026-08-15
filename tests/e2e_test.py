import sys
import os
import uuid
import json
import io
import pandas as pd
from fastapi.testclient import TestClient

# Add project root to sys.path so we can import backend
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, project_root)

from backend.main import app
from backend.services.db_service import db_service

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("Finora AI - End-to-End Master Test Suite")
    print("=" * 60)

    # 1. Registration Test
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "StrongPassword123!"
    test_name = "Automated Tester"

    print(f"\n[1] Testing User Registration...")
    reg_res = client.post("/auth/register", json={
        "name": test_name,
        "email": test_email.upper(), # test case insensitivity
        "password": test_password
    })
    assert reg_res.status_code in [200, 201], f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    assert reg_data["success"] == True
    assert "access_token" in reg_data["data"]
    refresh_token = reg_data["data"]["refresh_token"]
    print("[OK] Registration successful (immediate tokens received).")

    # 2. Login Test (Case Insensitive)
    print(f"\n[2] Testing User Login (Case Insensitive)...")
    login_res = client.post("/auth/login", json={
        "email": test_email.lower(), # Login with lowercase
        "password": test_password
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    assert login_data["success"] == True
    token = login_data["data"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Login successful (case insensitive email matching verified).")

    # 3. Refresh Token Test
    print(f"\n[3] Testing Refresh Token Endpoint...")
    refresh_res = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200, f"Refresh failed: {refresh_res.text}"
    refresh_data = refresh_res.json()
    assert refresh_data["success"] == True
    new_access_token = refresh_data["data"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {new_access_token}"}
    print("[OK] Access Token refreshed successfully using Refresh Token.")

    # 4. OTP Flow Test
    print(f"\n[4] Testing OTP Request Flow...")
    otp_req = client.post("/auth/send-otp", json={"email": test_email})
    assert otp_req.status_code == 200, f"OTP request failed: {otp_req.text}"
    print("[OK] OTP Requested successfully.")

    # 5. Predict Endpoint
    print(f"\n[5] Testing AI Prediction Endpoint...")
    pred_res = client.post("/finance/predict", headers=auth_headers, json={
        "Age": 30,
        "Income": 50000,
        "Expense": 30000,
        "Debt": 5000,
        "Investment": 5000
    })
    assert pred_res.status_code == 200, f"Predict failed: {pred_res.text}"
    pred_data = pred_res.json()
    assert pred_data["success"] == True
    assert "predicted_savings" in pred_data["data"]
    print(f"[OK] Prediction generated: savings = {pred_data['data']['predicted_savings']}")

    # 6. Planner Endpoint
    print(f"\n[6] Testing Financial Planner Endpoint...")
    plan_res = client.post("/planner/retirement", headers=auth_headers, json={
        "current_age": 30,
        "retirement_age": 60,
        "monthly_income": 50000,
        "monthly_savings": 15000,
        "current_corpus": 100000,
        "inflation_rate_pct": 6,
        "annual_return_pct": 10,
        "life_expectancy": 80
    })
    assert plan_res.status_code == 200, f"Planner failed: {plan_res.text}"
    plan_data = plan_res.json()
    assert plan_data["success"] == True
    assert "retirement_corpus" in plan_data["data"]
    print(f"[OK] Retirement plan generated: corpus = {plan_data['data']['retirement_corpus']}")

    # 7. AI Financial Advisor Chat Test
    print(f"\n[7] Testing AI Financial Advisor Chat Endpoint...")
    chat_res = client.post("/assistant/chat", headers=auth_headers, json={
        "message": "How can I save money with ₹20,000 income?"
    })
    assert chat_res.status_code == 200, f"Advisor chat failed: {chat_res.text}"
    chat_data = chat_res.json()
    assert "reply" in chat_data
    print(f"[OK] AI Advisor generated custom advice successfully.")

    # 8. Upload Dataset Test (Small in-memory CSV)
    print(f"\n[8] Testing Dataset Upload Pipeline...")
    csv_data = "Income,Expense,Date\n5000,3000,2024-01-01\n6000,4000,2024-02-01\n"
    files = {"file": ("test_data.csv", io.BytesIO(csv_data.encode()), "text/csv")}
    upload_res = client.post("/finance/upload", headers=auth_headers, files=files)
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    assert upload_data["success"] == True
    print(f"[OK] Dataset upload successful! Processed {upload_data['data']['row_count']} rows.")

    print("\n[DONE] All master backend workflows passed successfully! [DONE]")

if __name__ == "__main__":
    run_tests()
