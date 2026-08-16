from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
import uuid
import re
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from backend.config import settings
from backend.routes.auth import get_current_user
from backend.services.db_service import db_service
from backend.services.ai_context_service import ai_context_service
from backend.services.gemini_service import gemini_service

logger = logging.getLogger("finora.assistant")

router = APIRouter(prefix="/assistant", tags=["AI Financial Assistant"])

class ChatMessageSchema(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponseSchema(BaseModel):
    reply: str
    conversation_id: str
    suggested_prompts: List[str]

class FeedbackSchema(BaseModel):
    message_id: str
    rating: str # "like" or "dislike"
    feedback_text: Optional[str] = None

# --- Helper: Generate Title from First Message ---
def generate_session_title(first_message: str) -> str:
    msg = first_message.strip()
    # Check for salary/income figure
    lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b', msg, re.IGNORECASE)
    k_match = re.search(r'(\d+(?:\.\d+)?)\s*k\b', msg, re.IGNORECASE)
    raw_num = re.search(r'₹?\s*(\d{4,8})', msg)
    
    amount_str = ""
    if lakh_match:
        amount_str = f" ₹{lakh_match.group(1)}L"
    elif k_match:
        amount_str = f" ₹{k_match.group(1)}K"
    elif raw_num:
        val = int(raw_num.group(1))
        amount_str = f" ₹{val:,.0f}"

    msg_lower = msg.lower()
    if any(k in msg_lower for k in ["salary", "income", "earn", "budget", "save", "saving"]):
        return f"Budget & Savings Plan{amount_str}"
    elif any(k in msg_lower for k in ["invest", "sip", "mutual", "stock", "equity"]):
        return f"Investment Strategy{amount_str}"
    elif any(k in msg_lower for k in ["loan", "emi", "debt", "credit"]):
        return f"Debt & EMI Plan{amount_str}"
    elif any(k in msg_lower for k in ["tax", "80c", "80d", "nps"]):
        return f"Tax Saving Strategy"
    elif any(k in msg_lower for k in ["retire", "pension"]):
        return f"Retirement Planning"
    
    words = msg.split()
    clean_title = " ".join(words[:5])
    return clean_title.capitalize() if clean_title else "Financial Session"

# --- Heuristic Fallback Engine ---
def get_heuristic_reply(message: str, full_context: Dict[str, Any]) -> str:
    msg = message.lower().strip()
    
    p = full_context.get("profile", {})
    pred = full_context.get("prediction", {}).get("predictions", {})
    history = full_context.get("chat_history", [])
    
    profile_income = float(p.get("Income", 75000.0))
    profile_expense = float(p.get("Expense", 48000.0))
    profile_budget = float(p.get("Budget", 55000.0))
    profile_debt = float(p.get("Debt", 12000.0))
    profile_health = float(pred.get("financial_health_score", 50.0))

    # Retrieve previous message for history context
    previous_msg = ""
    if history and len(history) > 1:
        previous_msg = history[-2].get("message", "").lower()

    # Extract numeric figures
    extracted_amount = None
    for text_check in [msg, previous_msg]:
        if extracted_amount:
            break
        lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b', text_check)
        if lakh_match:
            extracted_amount = float(lakh_match.group(1)) * 100000.0
            break
        k_match = re.search(r'(\d+(?:\.\d+)?)\s*k\b', text_check)
        if k_match:
            extracted_amount = float(k_match.group(1)) * 1000.0
            break
        raw_matches = re.findall(r'\b\d{4,9}\b', text_check)
        if raw_matches:
            extracted_amount = float(raw_matches[0])
            break

    active_income = extracted_amount if extracted_amount and extracted_amount > 1000 else profile_income

    needs_50 = active_income * 0.50
    wants_30 = active_income * 0.30
    invest_20 = active_income * 0.20
    
    sip_equity = invest_20 * 0.60
    sip_debt = invest_20 * 0.20
    sip_emergency = invest_20 * 0.20
    wealth_5y = (invest_20 * 12 * 5) * 1.32

    # Intent 1: Salary / Budget / Savings Plan
    if any(k in msg for k in ["save", "saving", "salary", "income", "earn", "budget", "plan", "how to save", "manage money"]):
        return (
            f"### 🎯 Tailored Financial Master Plan for ₹{active_income:,.0f}/month Income\n\n"
            f"Based on your profile (Age: {p.get('Age', 28)}, Health Score: {profile_health:.1f}%):\n\n"
            f"#### 1. Numerical Budget Breakdown (50/30/20 Rule)\n"
            f"| Category | Allocation | Monthly Amount |\n"
            f"| :--- | :--- | :--- |\n"
            f"| 🏠 **Needs & Fixed Bills** | 50% | **₹{needs_50:,.0f}** |\n"
            f"| 🛍️ **Lifestyle & Wants** | 30% | **₹{wants_30:,.0f}** |\n"
            f"| 💰 **Investments & Savings** | 20% | **₹{invest_20:,.0f}** |\n\n"
            f"#### 2. Actionable Recommendations\n"
            f"1. **Automate Payday Sweep**: Move **₹{invest_20:,.0f}** into index funds on salary day.\n"
            f"2. **Cap Discretionary Spending**: Keep lifestyle spending under **₹{wants_30:,.0f}**.\n"
            f"3. **Build Emergency Buffer**: Maintain 6 months of expenses (**₹{needs_50 * 6:,.0f}**).\n\n"
            f"#### 3. 5-Year Wealth Compounded Forecast\n"
            f"Investing **₹{invest_20:,.0f}/month** consistently at 12% CAGR yields **₹{wealth_5y:,.0f}** in 5 years."
        )

    # Intent 2: Investment / SIP / Mutual Funds / Stocks
    elif any(k in msg for k in ["invest", "investment", "sip", "mutual", "stock", "equity", "wealth", "portfolio"]):
        return (
            f"### 📈 Optimized Investment & SIP Blueprint (₹{active_income:,.0f} Income Base)\n\n"
            f"Target Monthly Investment (20% of Income): **₹{invest_20:,.0f}**\n\n"
            f"#### Asset Allocation Strategy\n"
            f"| Asset Class | Share | Monthly Allocation | Expected CAGR |\n"
            f"| :--- | :--- | :--- | :--- |\n"
            f"| **Equity Index Funds** | 60% | **₹{sip_equity:,.0f}** | 12-14% |\n"
            f"| **ELSS / PPF Tax Savers** | 20% | **₹{sip_debt:,.0f}** | 7-12% |\n"
            f"| **Liquid Emergency Reserve** | 20% | **₹{sip_emergency:,.0f}** | 6-7% |\n\n"
            f"#### Projected Wealth Accumulation\n"
            f"- **1 Year**: ₹{invest_20 * 12 * 1.06:,.0f}\n"
            f"- **3 Years**: ₹{invest_20 * 36 * 1.18:,.0f}\n"
            f"- **5 Years**: ₹{wealth_5y:,.0f}"
        )

    # Intent 3: Loan / Debt / EMI
    elif any(k in msg for k in ["loan", "emi", "debt", "credit", "card", "prepay"]):
        return (
            f"### 💳 Debt Optimization & Prepayment Strategy\n\n"
            f"- **EMI Threshold**: Current debt EMI is ₹{profile_debt:,.0f}. Keep total EMIs strictly below 35% of income (**₹{active_income * 0.35:,.0f}**).\n"
            f"- **Debt Avalanche**: Pay off high-interest credit card debt (>18% APR) first.\n"
            f"- **Home Loan Hack**: Prepaying 1 extra EMI per year reduces a 20-year loan tenure by ~4.5 years!"
        )

    # Intent 4: Tax Saving / Insurance
    elif any(k in msg for k in ["tax", "80c", "80d", "nps", "insurance"]):
        return (
            f"### 📋 Indian Income Tax & Insurance Optimization\n\n"
            f"1. **Section 80C (Up to ₹1.5 Lakhs)**: Invest in ELSS Mutual Funds (3-year lock-in) or PPF.\n"
            f"2. **Section 80D (Health Insurance)**: Deduct up to ₹25,000 for self/family and ₹50,000 for senior citizen parents.\n"
            f"3. **Section 80CCD(1B) (NPS)**: Deduct an extra ₹50,000 via National Pension System.\n"
            f"4. **Term Insurance**: Buy term life cover of 10-15x annual income (~₹{active_income * 12 * 10:,.0f})."
        )

    # Default
    clean_q = message.strip()
    return (
        f"### 💡 Financial Guidance: \"{clean_q}\"\n\n"
        f"Based on your profile (Health Score: **{profile_health:.1f}%**):\n\n"
        f"- **Monthly Income**: **₹{active_income:,.0f}**\n"
        f"- **Needs Limit (50%)**: **₹{needs_50:,.0f}**\n"
        f"- **Lifestyle Cap (30%)**: **₹{wants_30:,.0f}**\n"
        f"- **Target Investment Pool (20%)**: **₹{invest_20:,.0f}/month**\n\n"
        f"Feel free to ask specific questions about SIPs, loan prepayments, stock allocation, or tax saving!"
    )

# --- API Endpoints ---

@router.post("/sessions/new")
def start_new_session(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    session = db_service.create_chat_session(user_id, title="New Financial Chat")
    return {"success": True, "data": session}

@router.get("/sessions")
def list_user_sessions(
    q: Optional[str] = Query(None),
    trash: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    raw_sessions = db_service.list_chat_sessions(user_id, include_deleted=trash)
    
    # Filter by search query if present
    if q and q.strip():
        term = q.strip().lower()
        raw_sessions = [s for s in raw_sessions if term in s.get("title", "").lower()]

    if trash:
        raw_sessions = [s for s in raw_sessions if s.get("is_deleted")]
    else:
        raw_sessions = [s for s in raw_sessions if not s.get("is_deleted")]

    # Date categorization
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    last_week_start = today_start - timedelta(days=7)

    categorized: Dict[str, List[dict]] = {
        "Pinned": [],
        "Today": [],
        "Yesterday": [],
        "Last Week": [],
        "Older": []
    }

    for s in raw_sessions:
        if s.get("is_pinned") and not trash:
            categorized["Pinned"].append(s)
            continue

        created_str = s.get("updated_at") or s.get("created_at") or ""
        try:
            c_date = datetime.fromisoformat(created_str.replace("Z", ""))
        except Exception:
            c_date = now

        if c_date >= today_start:
            categorized["Today"].append(s)
        elif c_date >= yesterday_start:
            categorized["Yesterday"].append(s)
        elif c_date >= last_week_start:
            categorized["Last Week"].append(s)
        else:
            categorized["Older"].append(s)

    return {"success": True, "data": categorized, "total": len(raw_sessions)}

@router.get("/sessions/{session_id}")
def get_session_details(session_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    session = db_service.get_chat_session(session_id)
    messages = db_service.get_session_messages(session_id, user_id=user_id)
    return {"success": True, "session": session, "messages": messages}

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    db_service.soft_delete_chat_session(session_id)
    return {"success": True, "message": "Session moved to Trash"}

@router.delete("/sessions/{session_id}/permanent")
def permanent_delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    db_service.permanent_delete_chat_session(session_id, current_user["id"])
    return {"success": True, "message": "Session permanently deleted"}

@router.post("/sessions/{session_id}/restore")
def restore_session(session_id: str, current_user: dict = Depends(get_current_user)):
    db_service.restore_chat_session(session_id)
    return {"success": True, "message": "Session restored"}

@router.post("/sessions/{session_id}/pin")
def pin_session(session_id: str, current_user: dict = Depends(get_current_user)):
    new_status = db_service.toggle_pin_chat_session(session_id)
    return {"success": True, "is_pinned": new_status}

@router.post("/sessions/{session_id}/refresh")
def refresh_session_state(session_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    session = db_service.get_chat_session(session_id)
    messages = db_service.get_session_messages(session_id, user_id=user_id)
    return {"success": True, "session": session, "messages": messages}

@router.post("/chat", response_model=ChatResponseSchema)
def send_chat_message(msg_in: ChatMessageSchema, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_message = msg_in.message.strip()
    
    # Ensure active session
    session_id = msg_in.conversation_id
    if not session_id or session_id == "null":
        new_sess = db_service.create_chat_session(user_id, title=generate_session_title(user_message))
        session_id = new_sess["session_id"]
    else:
        # Check if first message in existing default session
        existing_msgs = db_service.get_session_messages(session_id, user_id=user_id)
        if len(existing_msgs) == 0:
            db_service.update_chat_session_title(session_id, generate_session_title(user_message))

    # Save user message
    db_service.save_chat_message(
        message_id=str(uuid.uuid4()),
        user_id=user_id,
        sender="user",
        message=user_message,
        conversation_id=session_id
    )
    
    # Fetch full user context (including session chat history)
    full_context = ai_context_service.get_full_user_context(user_id)
    session_messages = db_service.get_session_messages(session_id, user_id=user_id)
    full_context["chat_history"] = session_messages

    system_prompt = ai_context_service.format_context_prompt(full_context)

    # Generate response via Gemini API Service
    ai_reply = gemini_service.generate_chat_response(
        system_prompt=system_prompt,
        user_message=user_message,
        chat_history=session_messages
    )

    # Fallback to intelligent heuristic recommendation engine if Gemini is unconfigured/offline
    if not ai_reply:
        logger.info(">>> ASSISTANT: Using intelligent fallback recommendation engine.")
        ai_reply = get_heuristic_reply(user_message, full_context)
        
    # Save assistant reply
    db_service.save_chat_message(
        message_id=str(uuid.uuid4()),
        user_id=user_id,
        sender="assistant",
        message=ai_reply,
        conversation_id=session_id
    )

    # Record AI interaction activity log in MongoDB Atlas
    db_service.record_activity_log(
        user_id=user_id,
        action="ai_chat",
        description=f"Asked AI Assistant: {user_message[:60]}...",
        metadata={"session_id": session_id, "prompt": user_message[:100]}
    )
    
    suggested = [
        "How can I optimize my monthly budget?",
        "Where should I allocate my savings?",
        "What is my 5-year wealth forecast?"
    ]
    
    return {
        "reply": ai_reply,
        "conversation_id": session_id,
        "suggested_prompts": suggested
    }

@router.post("/feedback")
def submit_feedback(fb_in: FeedbackSchema, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    res = db_service.save_message_feedback(
        message_id=fb_in.message_id,
        user_id=user_id,
        rating=fb_in.rating,
        feedback_text=fb_in.feedback_text
    )
    db_service.record_activity_log(
        user_id=user_id,
        action="submit_feedback",
        description=f"Submitted {fb_in.rating} feedback for AI response",
        metadata={"message_id": fb_in.message_id, "rating": fb_in.rating}
    )
    return {"success": True, "data": res}

@router.get("/history")
def get_chat_history(current_user: dict = Depends(get_current_user)):
    return db_service.get_chat_history(current_user["id"], limit=50)

@router.delete("/history")
def clear_chat_history(current_user: dict = Depends(get_current_user)):
    db_service.clear_chat_history(current_user["id"])
    return {"message": "Chat history cleared successfully"}
