"""
Standardized API Response Helper for Finora AI.
Provides unified response formatting across all routes.
"""
from typing import Any, Optional, List
from fastapi.responses import JSONResponse

def api_response(
    success: bool = True,
    message: str = "Success",
    data: Optional[Any] = None,
    errors: Optional[List[str]] = None,
    status_code: int = 200,
    **extra_fields
) -> dict:
    """
    Creates a standardized API dictionary payload.
    Additional kwarg key-values are merged into the top-level payload for backward compatibility.
    """
    payload = {
        "success": success,
        "message": message,
        "data": data if data is not None else {},
        "errors": errors or []
    }
    if extra_fields:
        payload.update(extra_fields)
    return payload

def api_json_response(
    success: bool = True,
    message: str = "Success",
    data: Optional[Any] = None,
    errors: Optional[List[str]] = None,
    status_code: int = 200,
    **extra_fields
) -> JSONResponse:
    """
    Returns a FastAPI JSONResponse with standardized payload structure.
    """
    content = api_response(
        success=success,
        message=message,
        data=data,
        errors=errors,
        **extra_fields
    )
    return JSONResponse(status_code=status_code, content=content)
