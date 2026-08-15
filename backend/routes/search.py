import re
from fastapi import APIRouter, Depends, Query, status
from typing import List, Dict, Any, Optional
from backend.routes.auth import get_current_user
from backend.services.db_service import db_service

router = APIRouter(prefix="/search", tags=["Project Search"])

# Static Application Pages Index
APP_PAGES = [
    {
        "id": "page_dashboard",
        "title": "Executive Dashboard",
        "description": "Main financial overview, monthly income, expense cards, health score & predictions.",
        "category": "Pages",
        "url": "/dashboard",
        "icon": "LayoutDashboard"
    },
    {
        "id": "page_profile",
        "title": "Financial Profile & Form",
        "description": "Update monthly income, expenses, budget, debt, family size, risk tolerance & goals.",
        "category": "Pages",
        "url": "/dashboard",
        "icon": "UserCheck"
    },
    {
        "id": "page_advisor",
        "title": "AI Financial Advisor Chat",
        "description": "ChatGPT-style AI chatbot for personal finance, SIP, tax, stock market & debt planning.",
        "category": "Pages",
        "url": "/assistant",
        "icon": "Bot"
    },
    {
        "id": "page_planner",
        "title": "Future Financial Planner & Retirement",
        "description": "Long-term wealth accumulation, compounding projections & target retirement corpus.",
        "category": "Pages",
        "url": "/planner",
        "icon": "TrendingUp"
    },
    {
        "id": "page_upload",
        "title": "Uploaded CSV Datasets",
        "description": "Upload bank statements, clean transactions & view category overspending breakdowns.",
        "category": "Pages",
        "url": "/data-upload",
        "icon": "UploadCloud"
    },
    {
        "id": "page_reports",
        "title": "Financial Reports & Summaries",
        "description": "Generate, view, and export PDF summaries and Excel financial reports.",
        "category": "Pages",
        "url": "/reports",
        "icon": "FileText"
    },
    {
        "id": "page_settings",
        "title": "Account Settings & Security",
        "description": "Manage user profile, change password, theme preferences & security logs.",
        "category": "Pages",
        "url": "/settings",
        "icon": "Settings"
    }
]

@router.get("")
def search_internal_content(
    q: str = Query(..., min_length=1, description="Internal search query term"),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    user_id = current_user["id"]
    query = q.strip().lower()
    results: List[Dict[str, Any]] = []

    # 1. Match Static Application Pages
    for page in APP_PAGES:
        t_lower = page["title"].lower()
        d_lower = page["description"].lower()
        if query in t_lower or query in d_lower:
            score = 100 if t_lower.startswith(query) else (80 if query in t_lower else 50)
            results.append({**page, "score": score})

    # 2. Match Live Financial Profile Metrics & Values
    profile = db_service.get_financial_profile(user_id)
    if profile:
        income = float(profile.get("Income", 0))
        expense = float(profile.get("Expense", 0))
        budget = float(profile.get("Budget", 0))
        debt = float(profile.get("Debt", 0))
        investment = float(profile.get("Investment", 0))

        metrics = [
            ("Monthly Income", f"Active income base: ₹{income:,.2f}", "/dashboard", "Income", income),
            ("Monthly Expenses", f"Current monthly expenditure: ₹{expense:,.2f}", "/dashboard", "Expense", expense),
            ("Allocated Budget", f"Monthly budget allocation: ₹{budget:,.2f}", "/dashboard", "Budget", budget),
            ("Outstanding Debt / EMI", f"Monthly debt obligation: ₹{debt:,.2f}", "/dashboard", "Debt", debt),
            ("Monthly Investment", f"Active monthly investment: ₹{investment:,.2f}", "/dashboard", "Investment", investment),
        ]
        for name, desc, url, key, val in metrics:
            if query in name.lower() or query in key.lower():
                results.append({
                    "id": f"metric_{key.lower()}",
                    "title": f"{name}: ₹{val:,.2f}",
                    "description": desc,
                    "category": "Financial Profile",
                    "url": url,
                    "icon": "DollarSign",
                    "score": 95
                })

    # 3. Match ML Predictions
    preds_list = db_service.get_predictions_by_user(user_id)
    if preds_list and len(preds_list) > 0:
        pred_data = preds_list[0].get("predictions", {})
        health_score = pred_data.get("financial_health_score", 0)
        savings = pred_data.get("predicted_savings", 0)
        wealth_cat = pred_data.get("future_wealth_category", "Medium")

        pred_items = [
            ("Financial Health Score", f"Current health rating: {health_score:.1f}%", "/dashboard", "Health"),
            ("Predicted Monthly Savings", f"ML predicted savings: ₹{savings:,.2f}", "/dashboard", "Savings"),
            ("Future Wealth Category", f"5-year forecast category: {wealth_cat}", "/planner", "Wealth")
        ]
        for title, desc, url, key in pred_items:
            if query in title.lower() or query in key.lower():
                results.append({
                    "id": f"pred_{key.lower()}",
                    "title": title,
                    "description": desc,
                    "category": "Predictions",
                    "url": url,
                    "icon": "BrainCircuit",
                    "score": 90
                })

    # 4. Match Uploaded CSV Datasets
    datasets = db_service.list_datasets(user_id) if hasattr(db_service, 'list_datasets') else []
    for ds in datasets:
        fn = ds.get("filename", "")
        if query in fn.lower():
            results.append({
                "id": f"dataset_{ds.get('id')}",
                "title": f"Dataset: {fn}",
                "description": f"Processed {ds.get('row_count', 0)} transaction rows.",
                "category": "Uploaded Datasets",
                "url": "/data-upload",
                "icon": "FileSpreadsheet",
                "score": 85
            })

    # 5. Match AI Conversation History
    history = db_service.get_chat_history(user_id, limit=20)
    for h in history:
        msg = h.get("message", "")
        if query in msg.lower():
            snippet = msg[:90] + "..." if len(msg) > 90 else msg
            results.append({
                "id": f"chat_{h.get('id', 'h')}",
                "title": f"AI Chat: \"{snippet}\"",
                "description": f"Sender: {h.get('sender', 'user').capitalize()} | Timestamp: {h.get('created_at', '')[:16]}",
                "category": "AI Chat History",
                "url": "/assistant",
                "icon": "MessageSquare",
                "score": 75
            })

    # 6. Match Goals & Retirement Plans
    goals = db_service.get_user_goals(user_id) if hasattr(db_service, 'get_user_goals') else []
    for g in goals:
        g_title = g.get("title", "Goal")
        if query in g_title.lower() or query in "goal":
            results.append({
                "id": f"goal_{g.get('id')}",
                "title": f"Goal: {g_title}",
                "description": f"Target: ₹{g.get('target_amount', 0):,.2f} | Deadline: {g.get('deadline', 'N/A')}",
                "category": "Goals & Retirement",
                "url": "/planner",
                "icon": "Target",
                "score": 80
            })

    # 7. Match Notifications
    notifs = db_service.get_user_notifications(user_id) if hasattr(db_service, 'get_user_notifications') else []
    for n in notifs:
        n_title = n.get("title", "")
        n_msg = n.get("message", "")
        if query in n_title.lower() or query in n_msg.lower():
            results.append({
                "id": f"notif_{n.get('id')}",
                "title": f"Notification: {n_title}",
                "description": n_msg,
                "category": "Notifications",
                "url": "/dashboard",
                "icon": "Bell",
                "score": 70
            })

    # Sort results by score (highest first) and limit to top 20 items
    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    top_results = results[:20]

    # Group results by category
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for item in top_results:
        cat = item.get("category", "General")
        if cat not in grouped:
            grouped[cat] = []
        # Remove internal score key before returning
        item_clean = {k: v for k, v in item.items() if k != "score"}
        grouped[cat].append(item_clean)

    return {
        "success": True,
        "query": q,
        "total_matches": len(results),
        "results": grouped
    }
