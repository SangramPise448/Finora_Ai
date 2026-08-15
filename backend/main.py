"""
Finora AI Backend - Main Application Entry Point
Enterprise-grade FastAPI with security middleware, structured logging, and all routers.
"""
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.config import settings
from backend.routes import auth, finance, assistant, reports, planner, search
from backend.middleware.security import SecurityMiddleware
from backend.utils.logger import get_logger

logger = get_logger("finora.main")

# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Application Instance
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "**Finora AI** – Enterprise-grade AI-powered Personal Finance Analyzer & Future Financial "
        "Planning platform API. Powered by FastAPI, Machine Learning, MongoDB Atlas / SQLite.\n\n"
        "### Features\n"
        "- 🔐 JWT Authentication with RBAC (user/admin roles)\n"
        "- 🤖 ML-powered savings prediction (Random Forest)\n"
        "- 📊 Dataset upload with validation pipeline\n"
        "- 🎯 Goal tracking, retirement planning, debt optimization\n"
        "- 🚨 Anomaly detection on spending patterns\n"
        "- 💬 AI financial assistant (Gemini-powered)\n"
        "- 📄 PDF/Excel report generation\n"
        "- 🛡️ Rate limiting, security headers, structured logging"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Authentication", "description": "User registration, login, JWT refresh, RBAC"},
        {"name": "Finance & Predictions", "description": "ML predictions, dataset upload, notifications"},
        {"name": "AI Financial Planner", "description": "Goals, retirement, debt optimizer, anomalies"},
        {"name": "AI Assistant", "description": "Gemini AI financial advisor chat"},
        {"name": "Reports", "description": "PDF & Excel report generation and download"},
    ]
)

# ─────────────────────────────────────────────────────────────────────────────
# Middleware Stack (order matters — outermost first)
# ─────────────────────────────────────────────────────────────────────────────

# 1. Security middleware (rate limiting + security headers + request logging)
app.add_middleware(SecurityMiddleware)

# 2. CORS — allow the React frontend (all local ports during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(finance.router)
app.include_router(planner.router)
app.include_router(assistant.router)
app.include_router(reports.router)
app.include_router(search.router)

# ─────────────────────────────────────────────────────────────────────────────
# Global Exception Handler
# ─────────────────────────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Our team has been notified."}
    )

# ─────────────────────────────────────────────────────────────────────────────
# Health & Info Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/", tags=["System"])
def root():
    from backend.services.ml_service import ml_service
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "development" if settings.DEBUG else "production",
        "database": "MongoDB Atlas" if bool(settings.MONGODB_URI) else "SQLite (Local)",
        "ml_model": "loaded" if ml_service.model is not None else "not_found (using heuristic fallback)",
        "docs": "/docs",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.get("/health", tags=["System"])
def health_check():
    from backend.services.db_service import db_service
    return {
        "status": "healthy",
        "database": "connected" if db_service is not None else "error",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

logger.info(f"Finora AI backend initialized | {settings.PROJECT_NAME} v{settings.VERSION}")
