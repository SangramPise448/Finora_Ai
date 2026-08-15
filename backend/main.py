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

# Mount Frontend Dist & SPA Fallback Handler for Production Deployments
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.middleware("http")
async def spa_fallback_middleware(request: Request, call_next):
    response = await call_next(request)
    if response.status_code == 404:
        path = request.url.path
        frontend_index = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist", "index.html")
        if os.path.exists(frontend_index) and not path.startswith(("/auth", "/finance", "/planner", "/assistant", "/reports", "/search", "/docs", "/openapi.json", "/health", "/assets")):
            return FileResponse(frontend_index)
    return response

logger.info(f"Finora AI backend initialized | {settings.PROJECT_NAME} v{settings.VERSION}")
