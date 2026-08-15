"""
Advanced planning routes: Goals, Anomaly Detection, Retirement, Debt Optimization
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from backend.routes.auth import get_current_user
from backend.services.ai_planner import (
    calculate_goal_progress,
    detect_anomalies,
    calculate_retirement_plan,
    optimize_debt_repayment
)
from backend.utils.response import api_response

router = APIRouter(prefix="/planner", tags=["AI Financial Planner"])


class GoalRequest(BaseModel):
    goal_amount: float
    monthly_savings: float
    current_saved: float = 0.0
    annual_return_pct: float = 8.0


class RetirementRequest(BaseModel):
    current_age: int = Field(..., ge=18, le=80)
    retirement_age: int = Field(..., ge=40, le=90)
    monthly_income: float
    monthly_savings: float
    current_corpus: float = 0.0
    inflation_rate_pct: float = 6.0
    annual_return_pct: float = 10.0
    life_expectancy: int = 80


class DebtItem(BaseModel):
    name: str
    balance: float
    interest_rate_pct: float
    min_payment: float


class DebtRequest(BaseModel):
    debts: List[DebtItem]
    extra_monthly_payment: float = 0.0


class AnomalyRequest(BaseModel):
    transactions: List[dict]
    z_threshold: float = 2.5


@router.post("/goal")
def goal_tracker(req: GoalRequest, _: dict = Depends(get_current_user)):
    res = calculate_goal_progress(
        goal_amount=req.goal_amount,
        monthly_savings=req.monthly_savings,
        current_saved=req.current_saved,
        annual_return_pct=req.annual_return_pct
    )
    return api_response(success=True, message="Goal progress calculated", data=res, **res)


@router.post("/retirement")
def retirement_planner(req: RetirementRequest, _: dict = Depends(get_current_user)):
    res = calculate_retirement_plan(
        current_age=req.current_age,
        retirement_age=req.retirement_age,
        monthly_income=req.monthly_income,
        monthly_savings=req.monthly_savings,
        current_corpus=req.current_corpus,
        inflation_rate_pct=req.inflation_rate_pct,
        annual_return_pct=req.annual_return_pct,
        life_expectancy=req.life_expectancy
    )
    return api_response(success=True, message="Retirement plan generated", data=res, **res)


@router.post("/debt")
def debt_optimizer(req: DebtRequest, _: dict = Depends(get_current_user)):
    res = optimize_debt_repayment(
        debts=[d.model_dump() for d in req.debts],
        extra_monthly_payment=req.extra_monthly_payment
    )
    return api_response(success=True, message="Debt optimization plan generated", data=res, **res)


@router.post("/anomalies")
def anomaly_detection(req: AnomalyRequest, _: dict = Depends(get_current_user)):
    res = detect_anomalies(req.transactions, req.z_threshold)
    return api_response(success=True, message="Anomaly analysis completed", data=res, **res)
