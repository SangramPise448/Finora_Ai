import re
import os
import pandas as pd
from typing import Dict, Any, List, Optional
from backend.services.db_service import db_service

class AIContextService:
    def parse_dynamic_facts_from_history(self, history: List[Dict[str, Any]], current_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses conversation history to extract dynamically spoken user facts (e.g. salary hikes, debt updates)
        and overlays them onto the user's active financial profile.
        """
        updated_profile = dict(current_profile)
        
        for h in history:
            if h.get("sender") == "user":
                msg = h.get("message", "").lower()
                
                # Check for salary/income mentions e.g. "salary is 50000", "income 70k", "salary hike to 80000", "earn 300000"
                lakh_match = re.search(r'(?:salary|income|earn|hike|make)\s*(?:is|to|of|around)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b', msg)
                if lakh_match:
                    updated_profile["Income"] = float(lakh_match.group(1)) * 100000.0
                else:
                    k_match = re.search(r'(?:salary|income|earn|hike|make)\s*(?:is|to|of|around)?\s*₹?\s*(\d+(?:\.\d+)?)\s*k\b', msg)
                    if k_match:
                        updated_profile["Income"] = float(k_match.group(1)) * 1000.0
                    else:
                        num_match = re.search(r'(?:salary|income|earn|hike|make)\s*(?:is|to|of|around)?\s*₹?\s*(\d{4,9})\b', msg)
                        if num_match:
                            updated_profile["Income"] = float(num_match.group(1))

                # Check for debt/EMI mentions e.g. "emi is 15000", "loan of 500000"
                emi_match = re.search(r'(?:emi|loan|debt)\s*(?:is|of|about)?\s*₹?\s*(\d{4,9})\b', msg)
                if emi_match:
                    updated_profile["Debt"] = float(emi_match.group(1))

        return updated_profile

    def get_uploaded_csv_analytics(self, user_id: str) -> Dict[str, Any]:
        """
        Loads and analyzes the user's latest uploaded transaction dataset CSV
        to extract category spending breakdowns, top overspending categories, and major vendor expenses.
        """
        datasets = db_service.list_datasets(user_id) if hasattr(db_service, 'list_datasets') else []
        if not datasets or len(datasets) == 0:
            return {}

        latest_ds = datasets[0]
        filename = latest_ds.get("filename", "")
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
        cleaned_file_path = os.path.join(uploads_dir, f"cleaned_{filename.replace(' ', '_')}")

        if not os.path.exists(cleaned_file_path):
            return {"filename": filename, "row_count": latest_ds.get("row_count", 0)}

        try:
            df = pd.read_csv(cleaned_file_path)
            stats = {
                "filename": filename,
                "row_count": len(df),
                "columns": list(df.columns)
            }
            # Identify spending columns
            cat_col = next((c for c in df.columns if any(k in c.lower() for k in ["category", "type", "description"])), None)
            amt_col = next((c for c in df.columns if any(k in c.lower() for k in ["amount", "expense", "cost", "price", "value"])), None)

            if cat_col and amt_col:
                category_totals = df.groupby(cat_col)[amt_col].sum().sort_values(ascending=False).head(5).to_dict()
                stats["top_spending_categories"] = category_totals
                total_spend = float(df[amt_col].sum())
                stats["total_dataset_spend"] = total_spend
                
                # Identify overspending category
                top_cat = list(category_totals.keys())[0] if category_totals else "General"
                stats["overspending_category"] = top_cat
                stats["overspending_amount"] = category_totals.get(top_cat, 0)
                stats["overspending_pct"] = round((category_totals.get(top_cat, 0) / total_spend * 100), 1) if total_spend > 0 else 0

            return stats
        except Exception as e:
            return {"filename": filename, "error": str(e)}

    def get_full_user_context(self, user_id: str) -> Dict[str, Any]:
        """
        Aggregates complete user context:
        - Financial Profile (Income, Expense, Debt, Age, Occupation, Risk, Goals, Family Size)
        - Dynamic Chat Memory Facts (salary hikes, debt updates)
        - Latest ML Prediction results & Explanation Parameters
        - Uploaded Dataset CSV Row Analytics & Overspending Breakdown
        - Goal Tracker targets
        - Retirement Planner targets
        - Recent Chat Memory (last 10 messages)
        """
        context: Dict[str, Any] = {
            "profile": {},
            "prediction": {},
            "dataset_analytics": {},
            "goals": [],
            "retirement": {},
            "chat_history": []
        }

        # 1. Financial Profile
        profile_data = db_service.get_financial_profile(user_id)
        if profile_data:
            context["profile"] = profile_data
        else:
            context["profile"] = {
                "Income": 75000.0,
                "Expense": 48000.0,
                "Budget": 55000.0,
                "Investment": 15000.0,
                "Age": 28,
                "Occupation": "Professional",
                "Risk_Appetite": "Moderate",
                "Debt": 12000.0,
                "Family_Size": 3,
                "Financial_Goal": "Wealth Accumulation",
                "Investment_Horizon_Years": 5,
                "Retirement_Age": 60
            }

        # 2. Chat History (last 10 messages)
        history = db_service.get_chat_history(user_id, limit=10)
        context["chat_history"] = history

        # 3. Dynamic Fact Extraction from Chat History
        context["profile"] = self.parse_dynamic_facts_from_history(history, context["profile"])

        # 4. Latest ML Prediction
        preds = db_service.get_predictions_by_user(user_id)
        if preds and len(preds) > 0:
            context["prediction"] = preds[0]

        # 5. Uploaded CSV Analytics
        context["dataset_analytics"] = self.get_uploaded_csv_analytics(user_id)

        # 6. Active Goal Tracker
        goals = db_service.get_user_goals(user_id) if hasattr(db_service, 'get_user_goals') else []
        context["goals"] = goals[:3]

        # 7. Active Retirement Plan
        ret_plan = db_service.get_user_retirement_plan(user_id) if hasattr(db_service, 'get_user_retirement_plan') else None
        if ret_plan:
            context["retirement"] = ret_plan

        return context

    def format_context_prompt(self, context: Dict[str, Any]) -> str:
        """
        Formats user context into a structured system prompt for Gemini / AI Advisor.
        """
        p = context.get("profile", {})
        pred = context.get("prediction", {}).get("predictions", {})
        csv_analytics = context.get("dataset_analytics", {})
        goals = context.get("goals", [])
        ret = context.get("retirement", {})

        income = p.get("Income", 75000.0)
        expense = p.get("Expense", 48000.0)
        budget = p.get("Budget", 55000.0)
        investment = p.get("Investment", 15000.0)
        age = p.get("Age", 28)
        occ = p.get("Occupation", "Professional")
        risk = p.get("Risk_Appetite", "Moderate")
        debt = p.get("Debt", 0.0)
        family = p.get("Family_Size", 1)
        goal = p.get("Financial_Goal", "Savings")
        ret_age = p.get("Retirement_Age", 60)

        health_score = pred.get("financial_health_score", 50.0)
        savings_pred = pred.get("predicted_savings", income - expense)
        wealth_cat = pred.get("future_wealth_category", "Medium")

        prompt = (
            "You are Finora AI, an elite, highly intelligent AI Financial Chatbot (acting like ChatGPT/Gemini specialized in Personal Finance).\n"
            "MANDATORY ADVISOR DIRECTIVES:\n"
            "1. CURRENCY RULE: All monetary figures MUST be in Indian Rupees (₹ / INR). Never use dollars ($).\n"
            "2. LIVE INDIAN MARKET BENCHMARKS:\n"
            "   - Nifty 50 Index: 12-14% CAGR (Equity benchmark)\n"
            "   - Gold & Silver: 8-10% long-term CAGR\n"
            "   - PPF (Public Provident Fund): 7.1% tax-free interest\n"
            "   - ELSS Tax Savers (Sec 80C): 12-15% CAGR (3-year lock-in)\n"
            "   - India Inflation Rate: 6.0% per annum\n"
            "3. DYNAMIC CONVERSATION MEMORY: Automatically use previously mentioned user numbers (e.g. if user said 'My salary is ₹50,000' or 'Hike to ₹70,000', use that updated active base).\n"
            "4. RESPONSE COMPONENT REQUIREMENTS: Every response MUST contain:\n"
            "   - **Financial Analysis**: Deep analytical breakdown of their specific query.\n"
            "   - **Personalized Recommendation**: Clear, tailored advice.\n"
            "   - **Numerical Calculation**: Step-by-step math in Indian Rupees (₹).\n"
            "   - **Pros & Cons / Risk Analysis**: Benefits, trade-offs, and market risks.\n"
            "   - **Immediate Action Plan**: 1-2 concrete steps to execute today.\n"
            "   - **Future Outlook**: Projected wealth growth over 1, 3, and 5 years.\n"
            "5. ZERO STATIC TEMPLATES: Answer ANY finance question (Stock market basics, NSE/BSE, Mutual Funds, SIP, Tax, Debt Avalanche, Cryptocurrency, Loans, Real Estate, Insurance, Salary planning, CSV overspending analysis, ML prediction explanations) naturally and uniquely.\n\n"
            "ACTIVE DASHBOARD & FINANCIAL PROFILE:\n"
            f"- Monthly Income (Active Base): ₹{income:,.2f}\n"
            f"- Monthly Expenses: ₹{expense:,.2f}\n"
            f"- Allocated Budget: ₹{budget:,.2f}\n"
            f"- Current Investments: ₹{investment:,.2f}\n"
            f"- Outstanding Debt / EMI: ₹{debt:,.2f}\n"
            f"- User Age: {age} | Occupation: {occ} | Family Size: {family}\n"
            f"- Risk Appetite: {risk} | Goal: {goal} | Retirement Target Age: {ret_age}\n\n"
            "ML PREDICTION METRICS & MODEL EXPLANATION:\n"
            f"- Financial Health Score: {health_score:.1f}% (Calculated via Random Forest Model based on Savings Ratio & Debt-to-Income)\n"
            f"- ML Predicted Monthly Savings: ₹{savings_pred:,.2f}\n"
            f"- 5-Year Wealth Category: {wealth_cat}\n"
        )

        if csv_analytics.get("top_spending_categories"):
            prompt += (
                f"\nUPLOADED TRANSACTION CSV ANALYTICS ('{csv_analytics.get('filename')}'):\n"
                f"- Total Rows: {csv_analytics.get('row_count')}\n"
                f"- Total Spend in File: ₹{csv_analytics.get('total_dataset_spend', 0):,.2f}\n"
                f"- Top Overspending Category: {csv_analytics.get('overspending_category')} (₹{csv_analytics.get('overspending_amount', 0):,.2f} — {csv_analytics.get('overspending_pct')}% of total spend)\n"
                f"- Category Breakdown: {csv_analytics.get('top_spending_categories')}\n"
            )

        if goals:
            prompt += "\nACTIVE FINANCIAL GOALS:\n"
            for g in goals:
                prompt += f"- Goal: {g.get('title', 'Goal')} | Target: ₹{g.get('target_amount', 0):,.2f} | Deadline: {g.get('deadline', 'N/A')}\n"

        if ret:
            prompt += f"\nRETIREMENT PLAN: Corpus Target: ₹{ret.get('target_corpus', 0):,.2f} at age {ret_age}.\n"

        return prompt

ai_context_service = AIContextService()
