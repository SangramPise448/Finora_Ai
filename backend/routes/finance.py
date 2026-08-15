"""
Enhanced finance routes with validation pipeline integration.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import uuid
import pandas as pd
import numpy as np
import io
import os
from datetime import datetime
from typing import Optional
from backend.routes.auth import get_current_user, get_admin_user
from backend.services.db_service import db_service
from backend.services.ml_service import ml_service
from backend.services.validation_service import validate_and_clean_dataframe
from backend.utils.logger import get_logger

logger = get_logger("finora.finance")

router = APIRouter(prefix="/finance", tags=["Finance & Predictions"])


# ─── Pydantic Schemas ────────────────────────────────────────────────────────
class ProfileInputSchema(BaseModel):
    Income: float = Field(..., gt=0, description="Monthly gross income (₹)")
    Expense: float = Field(..., ge=0, description="Monthly total expenses (₹)")
    Budget: float = Field(0.0, ge=0, description="Allocated monthly budget (₹)")
    Investment: Optional[float] = Field(0.0, ge=0, description="Monthly investments (₹)")
    Age: Optional[int] = Field(30, ge=18, le=100, description="Age of the user")
    Gender: Optional[str] = Field("Male", description="Gender")
    Occupation: Optional[str] = Field("Software Engineer", description="Occupation")
    Employment_Type: Optional[str] = Field("Salaried", description="Employment type")
    Marital_Status: Optional[str] = Field("Single", description="Marital status")
    Credit_Score: Optional[int] = Field(700, ge=300, le=900, description="Credit Score")
    Loan: Optional[float] = Field(0.0, ge=0, description="Outstanding loan amount (₹)")
    EMI: Optional[float] = Field(0.0, ge=0, description="Monthly EMI (₹)")
    Category: Optional[str] = Field("Food", description="Primary spending category")
    Payment_Mode: Optional[str] = Field("Credit Card", description="Payment mode")
    Risk_Profile: Optional[str] = Field("Medium", description="Risk tolerance")
    Financial_Goal: Optional[str] = Field("Wealth Creation", description="Primary financial goal")
    Goal_Amount: Optional[float] = Field(100000.0, ge=0, description="Goal target amount (₹)")


class FeedbackCreateSchema(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="1 to 5 star rating")
    suggestion: Optional[str] = Field(None, max_length=1000, description="Suggestion text (max 1000 chars)")
    message: Optional[str] = Field(None, max_length=1000, description="Legacy message alias")
    name: Optional[str] = None
    email: Optional[str] = None


# ─── Prediction ───────────────────────────────────────────────────────────────
@router.post("/predict")
def predict_savings(profile: ProfileInputSchema, current_user: dict = Depends(get_current_user)):
    input_dict = profile.model_dump()
    input_dict["Customer_ID"] = "CUST_" + current_user["id"][:8]
    input_dict["Transaction_ID"] = "TXN_" + str(uuid.uuid4())[:8]

    pred_res = ml_service.predict_profile(input_dict)
    logger.info(f"Prediction for user {current_user['id'][:8]}: savings={pred_res['predicted_savings']}")

    pred_id = str(uuid.uuid4())
    db_service.save_prediction(
        prediction_id=pred_id,
        user_id=current_user["id"],
        input_data=input_dict,
        predictions=pred_res
    )
    # Save financial profile for Executive Dashboard real-time persistence
    db_service.save_financial_profile(
        user_id=current_user["id"],
        profile_data=input_dict
    )

    # Smart notifications
    if pred_res["budget_utilization"] > 90:
        db_service.create_notification(
            notif_id=str(uuid.uuid4()),
            user_id=current_user["id"],
            title="⚠️ High Budget Utilization!",
            message=f"Your expenses are using {pred_res['budget_utilization']:.1f}% of your budget. Consider reducing non-essential spending."
        )
    if pred_res["financial_health_score"] >= 70:
        db_service.create_notification(
            notif_id=str(uuid.uuid4()),
            user_id=current_user["id"],
            title="🎉 Excellent Financial Health!",
            message=f"Your health score is {pred_res['financial_health_score']:.1f}/100. You're on a great financial trajectory!"
        )
    elif pred_res["predicted_savings"] < 0:
        db_service.create_notification(
            notif_id=str(uuid.uuid4()),
            user_id=current_user["id"],
            title="🚨 Negative Savings Alert!",
            message="Your expenses exceed your income. Immediate budget review recommended."
        )

    from backend.utils.response import api_response
    result = {**pred_res, "input_data": input_dict, "prediction_id": pred_id}
    return api_response(success=True, message="Prediction completed successfully", data=result, **result)


def _clean_float(val, default=0.0) -> float:
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val) if not np.isnan(val) else default
    try:
        s = str(val).replace("₹", "").replace("$", "").replace(",", "").strip()
        if not s or s.lower() in ("nan", "null", "none", "n/a"):
            return default
        return float(s)
    except Exception:
        return default

def _clean_int(val, default=0) -> int:
    if val is None:
        return default
    if isinstance(val, int):
        return val
    try:
        s = str(val).replace(",", "").strip()
        return int(float(s))
    except Exception:
        return default

@router.post("/prediction/single-record")
def predict_single_record(record: dict, current_user: dict = Depends(get_current_user)):
    try:
        raw_income = _clean_float(record.get("Income") or record.get("income") or record.get("Monthly_Income") or record.get("Salary"))
        raw_expense = _clean_float(record.get("Expense") or record.get("expense") or record.get("Monthly_Expense") or record.get("Amount"))
        raw_savings = _clean_float(record.get("Savings") or record.get("savings"))
        raw_budget = _clean_float(record.get("Budget") or record.get("budget"))
        raw_investment = _clean_float(record.get("Investment") or record.get("investment"))

        expense = raw_expense if raw_expense > 0 else 35000.0
        income = raw_income if raw_income > 0 else max(65000.0, expense + raw_savings + raw_investment)
        budget = raw_budget if raw_budget > 0 else max(45000.0, expense * 1.1)
        investment = raw_investment if raw_investment >= 0 else 10000.0

        input_dict = {
            "Income": income,
            "Expense": expense,
            "Budget": budget,
            "Investment": investment,
            "Age": _clean_int(record.get("Age") or record.get("age"), 30),
            "Gender": str(record.get("Gender") or record.get("gender") or "Male"),
            "Occupation": str(record.get("Occupation") or record.get("occupation") or "Software Engineer"),
            "Employment_Type": str(record.get("Employment_Type") or record.get("employment_type") or "Salaried"),
            "Marital_Status": str(record.get("Marital_Status") or record.get("marital_status") or "Single"),
            "Credit_Score": _clean_int(record.get("Credit_Score") or record.get("credit_score"), 720),
            "Loan": _clean_float(record.get("Loan") or record.get("loan"), 0.0),
            "EMI": _clean_float(record.get("EMI") or record.get("emi"), 0.0),
            "Category": str(record.get("Category") or record.get("category") or "General"),
            "Payment_Mode": str(record.get("Payment_Mode") or record.get("payment_mode") or "Credit Card"),
            "Risk_Profile": str(record.get("Risk_Profile") or record.get("risk_profile") or "Medium"),
            "Financial_Goal": str(record.get("Financial_Goal") or record.get("financial_goal") or "Wealth Creation"),
            "Goal_Amount": _clean_float(record.get("Goal_Amount") or record.get("goal_amount"), 100000.0),
            "Customer_ID": str(record.get("Customer_ID") or record.get("customer_id") or f"CUST_{current_user['id'][:8]}"),
            "Transaction_ID": str(record.get("Transaction_ID") or record.get("transaction_id") or f"TXN_{str(uuid.uuid4())[:8]}"),
            "Merchant": str(record.get("Merchant") or record.get("merchant") or "Finora Partner"),
            "Date": str(record.get("Date") or record.get("date") or datetime.utcnow().strftime("%Y-%m-%d")),
            "City": str(record.get("City") or record.get("city") or "Mumbai"),
            "State": str(record.get("State") or record.get("state") or "Maharashtra"),
        }

        pred_res = ml_service.predict_profile(input_dict)
        
        income = input_dict["Income"]
        expense = input_dict["Expense"]
        savings = pred_res["predicted_savings"]
        budget = input_dict["Budget"]
        balance = max(0.0, income - expense + input_dict["Investment"])
        health_score = pred_res["financial_health_score"]
        debt_ratio = round((input_dict["EMI"] / income * 100), 1) if income > 0 else 0.0

        risk_level = "Low"
        if expense > income or debt_ratio > 40:
            risk_level = "High"
        elif expense > (income * 0.7) or debt_ratio > 25:
            risk_level = "Moderate"

        exec_summary = (
            f"Selected transaction record for Customer {input_dict['Customer_ID']} shows an annual income capacity of ₹{income*12:,.0f} "
            f"with current monthly expenditure of ₹{expense:,.0f} ({expense/income*100:.1f}% of income). "
            f"The AI Financial Health Engine assigned a score of {health_score:.1f}/100. "
            f"With optimized budget allocation, monthly savings can reach ₹{savings:,.0f}."
        )

        why_score = [
            f"Savings Rate: {(savings/income*100):.1f}% of income is preserved monthly." if income > 0 else "Income baseline verified.",
            f"Budget Discipline: Expenses consume {(expense/budget*100):.1f}% of allocated budget." if budget > 0 else "Budget target maintained.",
            f"Debt Burden: EMI commitments represent {debt_ratio:.1f}% of gross income.",
            f"Risk Category: Transaction assigned '{risk_level}' risk level."
        ]

        charts = {
            "income_vs_expense": [
                {"name": "Income", "amount": income, "color": "#10b981"},
                {"name": "Expense", "amount": expense, "color": "#ef4444"},
                {"name": "Predicted Savings", "amount": max(0.0, savings), "color": "#8b5cf6"}
            ],
            "budget_utilization": {
                "budget": budget,
                "utilized": expense,
                "percentage": min(100.0, round((expense / budget * 100), 1)) if budget > 0 else 0.0
            },
            "savings_forecast": [
                {"year": "Current", "savings": round(savings * 1)},
                {"year": "Year 1", "savings": round(savings * 12 * 1.08)},
                {"year": "Year 2", "savings": round(savings * 24 * 1.16)},
                {"year": "Year 3", "savings": round(savings * 36 * 1.25)},
                {"year": "Year 5", "savings": round(savings * 60 * 1.45)}
            ],
            "category_breakdown": [
                {"category": input_dict["Category"], "amount": expense * 0.45},
                {"category": "Utilities & Housing", "amount": expense * 0.25},
                {"category": "Investment & SIP", "amount": input_dict["Investment"]},
                {"category": "Discretionary & Other", "amount": max(0.0, expense * 0.30 - input_dict["Investment"])}
            ],
            "health_meter": {
                "score": health_score,
                "label": "Excellent" if health_score >= 80 else "Good" if health_score >= 65 else "Average" if health_score >= 50 else "Poor"
            },
            "wealth_prediction": [
                {"period": "1 Month", "wealth": round(income - expense)},
                {"period": "3 Months", "wealth": round((income - expense) * 3 * 1.02)},
                {"period": "6 Months", "wealth": round((income - expense) * 6 * 1.05)},
                {"period": "1 Year", "wealth": round((income - expense) * 12 * 1.10)},
                {"period": "5 Years", "wealth": round((income - expense) * 60 * 1.35)}
            ],
            "investment_recommendation": [
                {"type": "SIP Mutual Funds", "amount": round(savings * 0.40), "percentage": 40},
                {"type": "Fixed Deposits (FD)", "amount": round(savings * 0.25), "percentage": 25},
                {"type": "Equity Stocks", "amount": round(savings * 0.20), "percentage": 20},
                {"type": "Emergency Fund", "amount": round(savings * 0.15), "percentage": 15}
            ],
            "ai_risk_assessment": [
                {"subject": "Income Stability", "score": 85},
                {"subject": "Savings Rate", "score": min(100, int((savings/income*100)*2)) if income > 0 else 50},
                {"subject": "Debt Burden", "score": max(10, 100 - int(debt_ratio*2))},
                {"subject": "Spending Control", "score": max(10, 100 - int((expense/income*100))) if income > 0 else 50},
                {"subject": "Investment Capacity", "score": 75}
            ],
            "monthly_projection": [
                {"month": f"Month {i+1}", "income": income, "expense": round(expense * (1 + i*0.01)), "savings": round(savings * (1 + i*0.02)), "balance": round(balance + (savings * (i+1)))}
                for i in range(6)
            ]
        }

        recommendations_by_priority = {
            "high": [
                f"Establish a 6-month liquid emergency buffer of ₹{expense*6:,.0f} immediately.",
                f"Limit non-essential category expenditures ({input_dict['Category']}) to below 30% of income."
            ],
            "medium": [
                f"Increase monthly SIP allocation by ₹{round(savings*0.2):,.0f} in index equity funds.",
                f"Prepay outstanding debt/loans to reduce monthly EMI burden below 20%."
            ],
            "low": [
                "Optimize Section 80C & 80D tax deductions via ELSS and health insurance premiums.",
                "Set up automated sweeps to transfer surplus monthly balance into high-yield liquid funds."
            ]
        }

        result_payload = {
            "customer_information": input_dict,
            "financial_summary": {
                "income": income,
                "expense": expense,
                "savings": savings,
                "budget": budget,
                "balance": balance,
                "health_score": health_score,
                "predicted_monthly_savings": savings,
                "investment_capacity": round(savings * 0.6),
                "debt_ratio": debt_ratio,
                "risk_score": 15 if risk_level == "Low" else 45 if risk_level == "Moderate" else 80,
                "risk_level": risk_level
            },
            "ai_executive_summary": exec_summary,
            "why_health_score": why_score,
            "charts": charts,
            "recommendations_by_priority": recommendations_by_priority,
            "metadata": {
                "analyzed_by": current_user.get("name", "User"),
                "analysis_time": datetime.utcnow().strftime("%b %d, %Y %H:%M:%S UTC"),
                "model_version": "Random Forest Regressor v1.0.0",
                "dataset_name": "Transaction Dataset Upload"
            }
        }

        db_service.save_record_analysis_history(
            user_id=current_user["id"],
            transaction_id=input_dict["Transaction_ID"],
            customer_id=input_dict["Customer_ID"],
            health_score=health_score,
            prediction_result=result_payload,
            recommendation_summary=exec_summary
        )

        from backend.utils.response import api_response
        return api_response(success=True, message="Single record analysis completed", data=result_payload, **result_payload)
    except Exception as e:
        logger.error(f"Single record prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Single record prediction error: {str(e)}")


@router.get("/dashboard-summary")
def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    preds = db_service.get_predictions_by_user(user_id)
    latest_pred = preds[0] if preds else None
    
    saved_profile = db_service.get_financial_profile(user_id)
    
    income = 0.0
    expense = 0.0
    budget = 0.0
    investment = 0.0
    health_score = 50.0
    savings = 0.0
    wealth_cat = "Medium"

    if latest_pred:
        inp = latest_pred.get("input_data", {})
        out = latest_pred.get("predictions", {})
        income = float(inp.get("Income", 0.0))
        expense = float(inp.get("Expense", 0.0))
        budget = float(inp.get("Budget", 0.0))
        investment = float(inp.get("Investment", 0.0))
        health_score = float(out.get("financial_health_score", 50.0))
        savings = float(out.get("predicted_savings", income - expense))
        wealth_cat = out.get("future_wealth_category", "Medium")
    elif saved_profile:
        income = float(saved_profile.get("Income", 0.0))
        expense = float(saved_profile.get("Expense", 0.0))
        budget = float(saved_profile.get("Budget", 0.0))
        investment = float(saved_profile.get("Investment", 0.0))
        savings = max(0.0, income - expense)

    summary_data = {
        "monthly_income": income,
        "monthly_expenses": expense,
        "monthly_budget": budget,
        "monthly_investment": investment,
        "predicted_savings": savings,
        "financial_health_score": health_score,
        "future_wealth_category": wealth_cat,
        "budget_utilization": round((expense / budget * 100), 1) if budget > 0 else 0.0,
        "latest_prediction": latest_pred
    }

    from backend.utils.response import api_response
    return api_response(success=True, message="Dashboard summary loaded", data=summary_data, **summary_data)


@router.get("/history")
def get_prediction_history(current_user: dict = Depends(get_current_user)):
    return db_service.get_predictions_by_user(current_user["id"])


@router.delete("/history/{prediction_id}")
def delete_single_prediction(prediction_id: str, current_user: dict = Depends(get_current_user)):
    success = db_service.delete_prediction(prediction_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Prediction record not found")
    return {"message": "Prediction record deleted successfully", "prediction_id": prediction_id}


@router.delete("/history")
def clear_all_predictions(current_user: dict = Depends(get_current_user)):
    count = db_service.clear_user_predictions(current_user["id"])
    return {"message": "All prediction history cleared successfully", "deleted_count": count}


# ─── Dataset Upload with Validation Pipeline ──────────────────────────────────
@router.post("/upload")
async def upload_financial_dataset(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    from backend.config import settings
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    contents = await file.read()

    # File size check (200 MB)
    max_bytes = getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 200 * 1024 * 1024)
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed limit of {max_bytes / (1024*1024):.0f} MB."
        )

    # Parse file (.xlsx / .xls vs .csv)
    fname = file.filename.lower()
    try:
        if fname.endswith((".xls", ".xlsx")):
            try:
                df = pd.read_excel(io.BytesIO(contents))
            except Exception:
                df = pd.read_csv(io.BytesIO(contents))
        else:
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding="utf-8")
            except Exception:
                df = pd.read_csv(io.BytesIO(contents), encoding="latin1")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse file '{file.filename}'. Please upload a valid CSV or Excel (.xlsx, .xls) document. ({str(e)})"
        )

    # Run validation pipeline
    validation = validate_and_clean_dataframe(df, file.filename)
    if not validation["is_valid"]:
        err_msg = "; ".join(validation.get("errors", ["Dataset validation failed."]))
        raise HTTPException(
            status_code=400,
            detail=f"Dataset validation failed: {err_msg}"
        )

    cleaned_df = validation["cleaned_df"]
    logger.info(f"Dataset upload by {current_user['id'][:8]}: {file.filename}, {len(cleaned_df)} rows")

    # Save cleaned dataset locally in uploads/ directory
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    cleaned_file_path = os.path.join(uploads_dir, f"cleaned_{file.filename.replace(' ', '_')}")
    cleaned_df.to_csv(cleaned_file_path, index=False)

    # Run ML predictions
    try:
        predictions, summary = ml_service.predict_dataset(cleaned_df)
    except Exception as e:
        logger.error(f"ML prediction error on dataset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"ML model error during batch prediction: {str(e)}")

    # Persist metadata
    ds_id = str(uuid.uuid4())
    db_service.save_dataset_meta(
        dataset_id=ds_id,
        user_id=current_user["id"],
        filename=file.filename,
        row_count=len(cleaned_df),
        summary=summary
    )

    db_service.create_notification(
        notif_id=str(uuid.uuid4()),
        user_id=current_user["id"],
        title="✅ Dataset Analysis Complete!",
        message=f"'{file.filename}' — {len(cleaned_df):,} records processed. Avg predicted savings: ₹{summary.get('average_predicted_savings', 0):,.0f}/month."
    )

    # Safe conversion of head preview to dict
    preview_df = cleaned_df.head(15).replace({np.nan: None, np.inf: None, -np.inf: None})
    preview_rows = preview_df.to_dict(orient="records")

    from backend.utils.response import api_response
    return api_response(
        success=True,
        message="Dataset uploaded successfully",
        data={
            "dataset_id": ds_id,
            "filename": file.filename,
            "row_count": len(cleaned_df),
            "validation": {
                "is_valid": True,
                "warnings": validation["warnings"],
                "stats": validation["stats"]
            },
            "summary": summary,
            "preview_rows": preview_rows
        }
    )


@router.get("/datasets/{dataset_id}/download")
def download_cleaned_dataset(dataset_id: str, current_user: dict = Depends(get_current_user)):
    # Find dataset metadata to fetch filename
    datasets = db_service.list_datasets(current_user["id"])
    dataset = next((d for d in datasets if d["id"] == dataset_id), None)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset metadata not found.")
    
    filename = dataset["filename"]
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    cleaned_file_path = os.path.join(uploads_dir, f"cleaned_{filename.replace(' ', '_')}")
    
    if not os.path.exists(cleaned_file_path):
        raise HTTPException(status_code=404, detail=f"Cleaned dataset file '{filename}' was not found on server.")
    
    return FileResponse(
        cleaned_file_path,
        media_type="text/csv",
        filename=f"cleaned_{filename}"
    )


@router.get("/datasets")
def list_uploaded_datasets(current_user: dict = Depends(get_current_user)):
    return db_service.list_datasets(current_user["id"])


# ─── Notifications ────────────────────────────────────────────────────────────
@router.get("/notifications")
def get_user_notifications(current_user: dict = Depends(get_current_user)):
    return db_service.get_notifications(current_user["id"])


@router.post("/notifications/read")
def mark_user_notifications_read(current_user: dict = Depends(get_current_user)):
    db_service.mark_notifications_read(current_user["id"])
    return {"message": "All notifications marked as read"}


@router.delete("/notifications/{notif_id}")
def dismiss_notification(notif_id: str, current_user: dict = Depends(get_current_user)):
    success = db_service.delete_notification(notif_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification dismissed"}


# ─── Feedback ─────────────────────────────────────────────────────────────────
@router.post("/feedback")
def submit_user_feedback(
    fb: FeedbackCreateSchema,
    current_user: dict = Depends(get_current_user)
):
    if not (1 <= fb.rating <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a rating between 1 and 5 stars."
        )

    final_text = (fb.suggestion or fb.message or "").strip()
    if not final_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter your suggestion or feedback."
        )

    if len(final_text) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback text exceeds maximum allowed length of 1000 characters."
        )

    fb_id = str(uuid.uuid4())
    # STRICT SESSION BINDING: Derive identity exclusively from authenticated JWT current_user
    db_service.create_feedback(
        feedback_id=fb_id,
        user_id=current_user["id"],
        name=current_user.get("name", "User"),
        email=current_user["email"],
        rating=fb.rating,
        suggestion=final_text,
        status="submitted"
    )
    from backend.utils.response import api_response
    return api_response(
        success=True,
        message="Feedback submitted successfully. Thank you!",
        data={"feedback_id": fb_id, "rating": fb.rating, "suggestion": final_text, "status": "submitted"}
    )


@router.get("/feedback/my")
def get_my_feedback(current_user: dict = Depends(get_current_user)):
    user_fb = db_service.get_user_feedback(current_user["id"])
    from backend.utils.response import api_response
    return api_response(success=True, message="User feedback history retrieved", data=user_fb)


@router.get("/feedback")
def list_all_feedback(admin_user: dict = Depends(get_admin_user)):
    all_fb = db_service.list_feedback()
    from backend.utils.response import api_response
    return api_response(success=True, message="System feedback entries retrieved", data=all_fb)


@router.delete("/feedback/{feedback_id}")
def admin_delete_feedback(feedback_id: str, admin_user: dict = Depends(get_admin_user)):
    deleted = db_service.delete_feedback(feedback_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback entry not found."
        )
    from backend.utils.response import api_response
    return api_response(
        success=True,
        message="Feedback entry deleted successfully.",
        data={"feedback_id": feedback_id}
    )


# ─── Admin Stats ───────────────────────────────────────────────────────────────
@router.get("/admin/stats")
def get_admin_dashboard_stats(admin_user: dict = Depends(get_admin_user)):
    users = db_service.list_users()
    preds = db_service.list_all_predictions()
    datasets = db_service.list_datasets()
    feedback = db_service.list_feedback()

    health_scores = []
    util_scores = []
    for p in preds:
        pred_dict = p.get("predictions", {}) if isinstance(p, dict) else {}
        if isinstance(pred_dict, dict):
            if "financial_health_score" in pred_dict:
                try: health_scores.append(float(pred_dict["financial_health_score"]))
                except (ValueError, TypeError): pass
            if "budget_utilization" in pred_dict:
                try: util_scores.append(float(pred_dict["budget_utilization"]))
                except (ValueError, TypeError): pass

    avg_health = round(sum(health_scores) / len(health_scores), 2) if health_scores else 0.0
    avg_util = round(sum(util_scores) / len(util_scores), 2) if util_scores else 0.0

    stats_payload = {
        "total_users": len(users),
        "total_predictions": len(preds),
        "total_datasets": len(datasets),
        "total_feedback": len(feedback),
        "average_health_score": avg_health,
        "average_budget_utilization": avg_util,
    }
    from backend.utils.response import api_response
    return api_response(success=True, message="Admin stats retrieved", data=stats_payload, **stats_payload)
