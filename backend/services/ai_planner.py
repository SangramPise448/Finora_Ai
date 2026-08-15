"""
Goal Tracking, Anomaly Detection, Retirement & Debt Optimization Service
Advanced AI-driven financial planning features for Finora AI
"""
import math
from datetime import datetime, timedelta
from typing import List, Optional
from backend.utils.logger import get_logger

logger = get_logger("finora.ai_planner")


# ─────────────────────────────────────────────────────────────────────────────
# GOAL TRACKER
# ─────────────────────────────────────────────────────────────────────────────
def calculate_goal_progress(goal_amount: float, monthly_savings: float,
                             current_saved: float = 0.0,
                             annual_return_pct: float = 8.0) -> dict:
    """
    Calculate how long to reach a financial goal given current savings rate
    and expected investment return.
    """
    # Validation checks to prevent division by zero or NaN
    goal_amount = max(0.01, float(goal_amount))
    monthly_savings = max(0.01, float(monthly_savings))
    current_saved = max(0.0, float(current_saved))
    annual_return_pct = max(0.0, min(100.0, float(annual_return_pct)))

    remaining = max(0.0, goal_amount - current_saved)
    r = annual_return_pct / 100 / 12

    # Project growth chart month-by-month
    growth_chart = []
    current_balance = current_saved
    total_contribution = current_saved
    months = 0
    max_months = 600 # 50 years max limit

    growth_chart.append({
        "month": 0,
        "year": 0,
        "balance": round(current_balance, 2),
        "contribution": round(total_contribution, 2),
        "interest": 0.0
    })

    while current_balance < goal_amount and months < max_months:
        months += 1
        interest_this_month = current_balance * r
        current_balance = current_balance + interest_this_month + monthly_savings
        total_contribution += monthly_savings

        if months % 12 == 0 or current_balance >= goal_amount:
            growth_chart.append({
                "month": months,
                "year": round(months / 12, 1),
                "balance": round(current_balance, 2),
                "contribution": round(total_contribution, 2),
                "interest": round(max(0.0, current_balance - total_contribution), 2)
            })

    years_required = round(months / 12, 1)
    future_value = round(current_balance, 2)
    interest_earned = round(max(0.0, future_value - total_contribution), 2)
    goal_completion_pct = round(min(100.0, (current_saved / goal_amount) * 100), 2)

    # Required monthly savings to achieve target goal in, say, 5 years (60 months)
    # Target date
    target_date = (datetime.utcnow() + timedelta(days=months * 30.44)).strftime("%B %Y")
    
    # Calculate required monthly savings to achieve in 5 years (60 months) as a baseline comparison
    if r > 0:
        monthly_required_savings = (goal_amount - current_saved * ((1 + r) ** 60)) * r / (((1 + r) ** 60) - 1)
    else:
        monthly_required_savings = (goal_amount - current_saved) / 60
    monthly_required_savings = max(0.01, round(monthly_required_savings, 2))

    advice = (
        f"At ₹{monthly_savings:,.0f}/month you'll reach your ₹{goal_amount:,.0f} goal in "
        f"~{years_required} years ({target_date}). "
        f"Investing at {annual_return_pct}% p.a. will help you yield ₹{interest_earned:,.0f} in interest."
    )

    return {
        "achievable": True,
        "months_to_goal": months,
        "years_required": years_required,
        "future_value": future_value,
        "total_contribution": round(total_contribution, 2),
        "interest_earned": interest_earned,
        "goal_completion_pct": goal_completion_pct,
        "monthly_required_savings": monthly_required_savings,
        "target_completion_date": target_date,
        "growth_chart": growth_chart,
        "advice": advice
    }


# ─────────────────────────────────────────────────────────────────────────────
# RETIREMENT PLANNER
# ─────────────────────────────────────────────────────────────────────────────
def calculate_retirement_plan(
    current_age: int,
    retirement_age: int,
    monthly_income: float,
    monthly_savings: float,
    current_corpus: float = 0.0,
    inflation_rate_pct: float = 6.0,
    annual_return_pct: float = 10.0,
    life_expectancy: int = 80
) -> dict:
    """
    Projects retirement corpus required and whether current savings are sufficient.
    """
    # Validation inputs
    current_age = max(18, min(80, int(current_age)))
    retirement_age = max(current_age + 1, min(90, int(retirement_age)))
    life_expectancy = max(retirement_age + 1, min(120, int(life_expectancy)))
    
    monthly_income = max(0.01, float(monthly_income))
    monthly_savings = max(0.01, float(monthly_savings))
    current_corpus = max(0.0, float(current_corpus))
    inflation_rate_pct = max(0.0, min(50.0, float(inflation_rate_pct)))
    annual_return_pct = max(0.0, min(100.0, float(annual_return_pct)))

    years_to_retire = retirement_age - current_age
    years_in_retirement = life_expectancy - retirement_age

    # Compounding rates
    r_accum = annual_return_pct / 100 / 12
    real_return_rate = (1 + annual_return_pct / 100) / (1 + inflation_rate_pct / 100) - 1
    r_real = real_return_rate / 12

    # Year-by-year accumulation phase projection
    corpus = current_corpus
    growth_chart = []
    total_saved = current_corpus
    
    growth_chart.append({
        "age": current_age,
        "year": 0,
        "corpus": round(corpus, 2),
        "contributions": round(total_saved, 2)
    })
    
    for yr in range(1, years_to_retire + 1):
        for _ in range(12):
            interest = corpus * r_accum
            corpus = corpus + interest + monthly_savings
            total_saved += monthly_savings
            
        growth_chart.append({
            "age": current_age + yr,
            "year": yr,
            "corpus": round(corpus, 2),
            "contributions": round(total_saved, 2)
        })
        
    retirement_corpus = round(corpus, 2)

    # Future expenses at retirement age adjusted for inflation
    future_monthly_expenses = monthly_income * ((1 + inflation_rate_pct / 100) ** years_to_retire)
    future_monthly_expenses = round(future_monthly_expenses, 2)

    # Required corpus in future value at retirement
    if r_real > 0:
        required_corpus = future_monthly_expenses * (1 - (1 + r_real) ** (-years_in_retirement * 12)) / r_real
    else:
        required_corpus = future_monthly_expenses * 12 * years_in_retirement
    required_corpus = round(required_corpus, 2)

    # Inflation adjusted corpus (in today's rupees)
    inflation_adjusted_corpus = required_corpus / ((1 + inflation_rate_pct / 100) ** years_to_retire)
    inflation_adjusted_corpus = round(inflation_adjusted_corpus, 2)

    # Monthly safe withdrawal limit (monthly pension using real returns)
    if r_real > 0:
        monthly_pension = retirement_corpus * r_real / (1 - (1 + r_real) ** (-years_in_retirement * 12))
    else:
        monthly_pension = retirement_corpus / (years_in_retirement * 12)
    monthly_pension = round(monthly_pension, 2)

    safe_withdrawal = round(monthly_pension * 12, 2)
    readiness_score = round(min(100.0, (retirement_corpus / required_corpus) * 100), 1) if required_corpus > 0 else 100.0

    timeline = [
        {"title": "Accumulation Start", "age": current_age, "desc": f"Starting with ₹{current_corpus:,.0f} corpus."},
        {"title": "Retirement Age", "age": retirement_age, "desc": f"Projected Corpus: ₹{retirement_corpus:,.0f} vs Target ₹{required_corpus:,.0f}."},
        {"title": "Life Expectancy", "age": life_expectancy, "desc": f"End of projection at age {life_expectancy}."}
    ]

    return {
        "years_to_retire": years_to_retire,
        "years_after_retirement": years_in_retirement,
        "retirement_corpus": retirement_corpus,
        "required_corpus": required_corpus,
        "inflation_adjusted_corpus": inflation_adjusted_corpus,
        "future_monthly_expenses": future_monthly_expenses,
        "monthly_pension": monthly_pension,
        "safe_withdrawal": safe_withdrawal,
        "retirement_readiness_score": readiness_score,
        "retirement_timeline": timeline,
        "growth_chart": growth_chart,
        "advice": (
            f"✅ You are fully on track! Your projected corpus of ₹{retirement_corpus:,.0f} exceeds the target."
            if readiness_score >= 100
            else f"⚠️ Deficit detected. You need ₹{required_corpus - retirement_corpus:,.0f} more. Consider increasing monthly savings."
        )
    }


# ─────────────────────────────────────────────────────────────────────────────
# DEBT OPTIMIZER
# ─────────────────────────────────────────────────────────────────────────────
def optimize_debt_repayment(debts: List[dict], extra_monthly_payment: float = 0.0) -> dict:
    """
    Uses the Avalanche method (highest interest first) to minimize total interest paid.
    """
    if not debts:
        return {"plan": [], "total_interest": 0, "months_to_debt_free": 0}

    sorted_debts = sorted(debts, key=lambda d: d.get("interest_rate_pct", 0), reverse=True)
    total_interest = 0
    max_months = 0
    plan = []

    remaining_extra = extra_monthly_payment

    for debt in sorted_debts:
        balance = float(debt.get("balance", 0))
        rate = float(debt.get("interest_rate_pct", 0)) / 100 / 12
        min_pay = float(debt.get("min_payment", balance * 0.02))
        payment = min_pay + remaining_extra

        months = 0
        interest_paid = 0

        while balance > 0 and months < 600:
            interest = balance * rate
            interest_paid += interest
            principal = min(payment - interest, balance)
            balance -= principal
            months += 1
            if balance <= 0:
                remaining_extra += min_pay
                break

        plan.append({
            "name": debt.get("name", f"Debt {len(plan)+1}"),
            "original_balance": debt.get("balance", 0),
            "interest_rate_pct": debt.get("interest_rate_pct", 0),
            "monthly_payment": round(min_pay + extra_monthly_payment, 2),
            "months_to_payoff": months,
            "total_interest_paid": round(interest_paid, 2),
            "method": "Avalanche (Highest Interest First)"
        })
        total_interest += interest_paid
        max_months = max(max_months, months)

    return {
        "plan": plan,
        "total_interest_saved_vs_minimum": round(total_interest, 2),
        "months_to_debt_free": max_months,
        "strategy": "Debt Avalanche",
        "advice": (
            f"Using the Avalanche method with ₹{extra_monthly_payment:,.0f} extra/month, "
            f"you'll be debt-free in ~{max_months} months."
        )
    }


# ─────────────────────────────────────────────────────────────────────────────
# ANOMALY DETECTION
# ─────────────────────────────────────────────────────────────────────────────
def detect_anomalies(transactions: List[dict], z_threshold: float = 2.5) -> dict:
    if len(transactions) < 5:
        return {"anomalies": [], "summary": "Not enough data for anomaly detection (need ≥5 records)."}

    amounts = [float(t.get("Expense", 0) or t.get("amount", 0)) for t in transactions]
    mean_val = sum(amounts) / len(amounts)
    std_val = (sum((x - mean_val) ** 2 for x in amounts) / len(amounts)) ** 0.5

    anomalies = []
    for i, (txn, amt) in enumerate(zip(transactions, amounts)):
        if std_val > 0:
            z = abs(amt - mean_val) / std_val
            if z >= z_threshold:
                anomalies.append({
                    "row": i + 1,
                    "amount": round(amt, 2),
                    "z_score": round(z, 2),
                    "deviation_pct": round((amt - mean_val) / mean_val * 100, 1),
                    "category": txn.get("Category", "Unknown"),
                    "date": txn.get("Date", "N/A"),
                    "severity": "high" if z >= 3.5 else "medium"
                })

    return {
        "anomalies": anomalies,
        "total_transactions": len(transactions),
        "flagged_count": len(anomalies),
        "mean_expense": round(mean_val, 2),
        "std_expense": round(std_val, 2),
        "summary": f"Detected {len(anomalies)} anomalous transaction(s)."
    }
