from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import io
import pandas as pd
from backend.routes.auth import get_current_user
from backend.services.db_service import db_service
from backend.services.pdf_service import generate_financial_pdf
from backend.services.metadata_service import ml_metadata_service

router = APIRouter(prefix="/reports", tags=["Export System"])

def _get_user_prediction(current_user: dict, prediction_id: str | None = None):
    if prediction_id:
        prediction = db_service.get_prediction_by_id(prediction_id)
        if not prediction or prediction.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction record not found for this user."
            )
        return prediction

    preds = db_service.get_predictions_by_user(current_user["id"])
    if not preds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No prediction records found. Please enter your financial inputs on the dashboard first."
        )
    return preds[0]

@router.get("/pdf")
@router.get("/pdf/{prediction_id}")
def export_pdf_report(current_user: dict = Depends(get_current_user), prediction_id: str | None = None):
    latest_pred = _get_user_prediction(current_user, prediction_id)
    pdf_buffer = generate_financial_pdf(
        user_name=current_user["name"],
        email=current_user["email"],
        prediction_data=latest_pred
    )
    db_service.record_activity_log(
        user_id=current_user["id"],
        action="download_pdf_report",
        description="Downloaded PDF financial intelligence report",
        metadata={"prediction_id": prediction_id}
    )
    filename = f"Finora_AI_Report_{current_user['name'].replace(' ', '_')}.pdf"
    if prediction_id:
        filename = f"Finora_AI_Report_{current_user['name'].replace(' ', '_')}_{prediction_id[:8]}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/csv")
@router.get("/csv/{prediction_id}")
def export_csv_history(current_user: dict = Depends(get_current_user), prediction_id: str | None = None):
    if prediction_id:
        pred = _get_user_prediction(current_user, prediction_id)
        row = {
            "prediction_id": pred["id"],
            "created_at": pred["created_at"],
            **pred["input_data"],
            **pred["predictions"]
        }
        row.pop("savings_forecast", None)
        row.pop("Customer_ID", None)
        row.pop("Transaction_ID", None)
        df = pd.DataFrame([row])
    else:
        preds = db_service.get_predictions_by_user(current_user["id"])
        if not preds:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No prediction records available.")
        records = []
        for p in preds:
            row = {
                "prediction_id": p["id"],
                "created_at": p["created_at"],
                **p["input_data"],
                **p["predictions"]
            }
            row.pop("savings_forecast", None)
            row.pop("Customer_ID", None)
            row.pop("Transaction_ID", None)
            records.append(row)
        df = pd.DataFrame(records)
        
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    response_stream = io.BytesIO(stream.getvalue().encode('utf-8'))
    filename = f"Finora_History_{current_user['name'].replace(' ', '_')}.csv"
    if prediction_id:
        filename = f"Finora_History_{current_user['name'].replace(' ', '_')}_{prediction_id[:8]}.csv"
    return StreamingResponse(
        response_stream,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/excel")
@router.get("/excel/{prediction_id}")
def export_excel_history(current_user: dict = Depends(get_current_user), prediction_id: str | None = None):
    if prediction_id:
        pred = _get_user_prediction(current_user, prediction_id)
        records = [{
            "Prediction_ID": pred["id"],
            "Date": pred["created_at"],
            "Income": pred["input_data"].get("Income", 0.0),
            "Expense": pred["input_data"].get("Expense", 0.0),
            "Budget": pred["input_data"].get("Budget", 0.0),
            "Investment": pred["input_data"].get("Investment", 0.0),
            "Age": pred["input_data"].get("Age", 30),
            "Occupation": pred["input_data"].get("Occupation", ""),
            "Predicted_Savings": pred["predictions"].get("predicted_savings", 0.0),
            "Predicted_Annual_Savings": pred["predictions"].get("predicted_annual_savings", 0.0),
            "Financial_Health_Score": pred["predictions"].get("financial_health_score", 50.0),
            "Budget_Utilization": pred["predictions"].get("budget_utilization", 0.0),
            "Emergency_Fund_Target": pred["predictions"].get("emergency_fund", 0.0),
            "Wealth_Tier": pred["predictions"].get("future_wealth_category", "")
        }]
    else:
        preds = db_service.get_predictions_by_user(current_user["id"])
        if not preds:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No prediction records available.")
        records = []
        for p in preds:
            row = {
                "Prediction_ID": p["id"],
                "Date": p["created_at"],
                "Income": p["input_data"].get("Income", 0.0),
                "Expense": p["input_data"].get("Expense", 0.0),
                "Budget": p["input_data"].get("Budget", 0.0),
                "Investment": p["input_data"].get("Investment", 0.0),
                "Age": p["input_data"].get("Age", 30),
                "Occupation": p["input_data"].get("Occupation", ""),
                "Predicted_Savings": p["predictions"].get("predicted_savings", 0.0),
                "Predicted_Annual_Savings": p["predictions"].get("predicted_annual_savings", 0.0),
                "Financial_Health_Score": p["predictions"].get("financial_health_score", 50.0),
                "Budget_Utilization": p["predictions"].get("budget_utilization", 0.0),
                "Emergency_Fund_Target": p["predictions"].get("emergency_fund", 0.0),
                "Wealth_Tier": p["predictions"].get("future_wealth_category", "")
            }
            records.append(row)
            
    df = pd.DataFrame(records)
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Finora Predictions", index=False)
    buffer.seek(0)
    filename = f"Finora_History_{current_user['name'].replace(' ', '_')}.xlsx"
    if prediction_id:
        filename = f"Finora_History_{current_user['name'].replace(' ', '_')}_{prediction_id[:8]}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
