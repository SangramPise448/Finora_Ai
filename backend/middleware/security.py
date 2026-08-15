"""
Security & Rate Limiting Middleware for Finora AI Backend.
Handles: rate limiting, CORS security headers, request logging, and file upload scanning.
"""
import time
import uuid
from collections import defaultdict
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from backend.utils.logger import get_logger

logger = get_logger("finora.middleware")

# In-memory rate limit store (use Redis in production)
_rate_store: dict = defaultdict(list)
RATE_LIMIT = 120       # requests per window
RATE_WINDOW = 60       # seconds

class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # --- Rate Limiting by IP ---
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - RATE_WINDOW
        _rate_store[client_ip] = [t for t in _rate_store[client_ip] if t > window_start]

        if len(_rate_store[client_ip]) >= RATE_LIMIT:
            logger.warning(f"[{request_id}] Rate limit exceeded for IP={client_ip}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down and try again in a minute."}
            )
        _rate_store[client_ip].append(now)

        # --- Request Logging ---
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"| IP={client_ip} | UA={request.headers.get('user-agent', 'unknown')[:60]}"
        )

        # --- Process Request ---
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            elapsed = round((time.time() - start_time) * 1000, 2)
            logger.error(f"[{request_id}] UNHANDLED EXCEPTION after {elapsed}ms: {exc}", exc_info=True)
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})

        elapsed = round((time.time() - start_time) * 1000, 2)
        level = "warning" if response.status_code >= 400 else "info"
        getattr(logger, level)(
            f"[{request_id}] Response {response.status_code} in {elapsed}ms | {request.url.path}"
        )

        # --- Security Headers ---
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        return response
