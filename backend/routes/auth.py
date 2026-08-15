from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from pydantic import BaseModel, EmailStr, Field
import uuid
import secrets
from datetime import datetime
from typing import Optional
from backend.config import settings
from backend.services.db_service import db_service
from backend.services.email_service import email_service
from backend.utils.auth_utils import hash_password, verify_password, create_jwt, decode_jwt
from backend.utils.response import api_response

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Pydantic Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)
    phone: str = Field(..., min_length=10, max_length=10)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthInput(BaseModel):
    email: EmailStr
    name: str
    google_id: Optional[str] = None
    credential: Optional[str] = None

class SendOtpInput(BaseModel):
    email: EmailStr

class VerifyOtpInput(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)

class ResetPasswordInput(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)

class ResetPasswordDirectInput(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=8)

class RefreshRequest(BaseModel):
    refresh_token: str


# --- Auth Middleware Dependency ---
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid format (should be: Bearer <token>)"
        )
    token = authorization.split(" ")[1]
    payload = decode_jwt(token, settings.JWT_SECRET)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired"
        )
    user = db_service.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in system"
        )
    # Reject request if user is currently inactive (logged out)
    if user.get("status") == "inactive":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session has expired or logged out. Please sign in again."
        )
    return user


def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin role required"
        )
    return current_user


# Helper to generate JWT pair
def _generate_user_tokens(user: dict):
    user_id = user["id"]
    email = user["email"]
    role = user.get("role", "user")

    token_payload = {
        "sub": user_id,
        "email": email,
        "role": role
    }

    access_token = create_jwt(token_payload, settings.JWT_SECRET, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    refresh_token = create_jwt(token_payload, settings.JWT_REFRESH_SECRET, expires_in=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600)

    user_data = {
        "id": user_id,
        "email": email,
        "name": user.get("name", "User"),
        "phone": user.get("phone", ""),
        "role": role,
        "status": user.get("status", "active")
    }

    return access_token, refresh_token, user_data


# --- Routes ---

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister):
    import re
    norm_email = user_in.email.strip().lower()
    norm_phone = user_in.phone.strip()

    # Validate 10-digit Indian Mobile Number Format
    if not re.match(r'^[6-9]\d{9}$', norm_phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 10-digit Indian mobile number."
        )

    # Check if email is already registered
    existing_email = db_service.get_user_by_email(norm_email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Check if phone is already registered
    existing_phone = db_service.get_user_by_phone(norm_phone)
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this phone number already exists."
        )

    # Hash password and create user
    pwd_hash = hash_password(user_in.password)
    user_id = str(uuid.uuid4())

    # CRITICAL SECURITY RULE: Normal registration ALWAYS creates role="user"
    role = "user"

    created_user = db_service.create_user(
        user_id=user_id,
        email=norm_email,
        name=user_in.name,
        password_hash=pwd_hash,
        role=role,
        phone=norm_phone,
        status="active"
    )

    actual_id = created_user.get("id", user_id)

    # Create welcome notification
    db_service.create_notification(
        notif_id=str(uuid.uuid4()),
        user_id=actual_id,
        title="Welcome to Finora AI!",
        message=f"Hi {user_in.name}, your account was created successfully. Explore your AI financial analyzer workspace!"
    )

    # Send Welcome Email (async/silent)
    try:
        email_service.send_welcome_email(norm_email, user_in.name)
    except Exception:
        pass

    # Generate tokens for immediate login
    user_dict = {
        "id": actual_id,
        "email": norm_email,
        "name": user_in.name,
        "phone": norm_phone,
        "role": role,
        "status": "active"
    }
    access_token, refresh_token, user_data = _generate_user_tokens(user_dict)

    return api_response(
        success=True,
        message="User registered successfully",
        data={
            "user": user_data,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        },
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_data
    )


@router.post("/login")
def login(credentials: UserLogin, request: Request):
    norm_email = credentials.email.strip().lower()
    user = db_service.get_user_by_email(norm_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password against bcrypt password_hash stored in MongoDB
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Update MongoDB status to 'active' on login
    db_service.update_user_status(user["id"], "active")
    user["status"] = "active"

    # Record login history in MongoDB
    ip_addr = request.client.host if request.client else "127.0.0.1"
    u_agent = request.headers.get("user-agent", "Unknown")
    db_service.record_login_history(
        user_id=user["id"],
        ip_address=ip_addr,
        user_agent=u_agent
    )

    access_token, refresh_token, user_data = _generate_user_tokens(user)

    return api_response(
        success=True,
        message="Login successful",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_data
        },
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_data
    )


@router.post("/google")
def google_auth(input_data: GoogleAuthInput):
    norm_email = input_data.email.strip().lower()
    existing_user = db_service.get_user_by_email(norm_email)

    if existing_user:
        # Existing user - log in
        user = existing_user
    else:
        # New Google user - create account automatically
        user_id = str(uuid.uuid4())
        pwd_hash = hash_password(f"google_oauth_{user_id}_{secrets.token_hex(8)}")
        users_list = db_service.list_users()
        role = "admin" if len(users_list) == 0 else "user"

        user = db_service.create_user(
            user_id=user_id,
            email=norm_email,
            name=input_data.name,
            password_hash=pwd_hash,
            role=role,
            google_id=input_data.google_id
        )

        db_service.create_notification(
            notif_id=str(uuid.uuid4()),
            user_id=user["id"],
            title="Welcome via Google Sign-In!",
            message=f"Hi {input_data.name}, your account was linked with Google successfully."
        )

        try:
            email_service.send_welcome_email(norm_email, input_data.name)
        except Exception:
            pass

    access_token, refresh_token, user_data = _generate_user_tokens(user)

    return api_response(
        success=True,
        message="Google authentication successful",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_data
        },
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_data
    )


@router.post("/send-otp")
def send_otp(input_data: SendOtpInput):
    norm_email = input_data.email.strip().lower()
    user = db_service.get_user_by_email(norm_email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    # Check for active OTP & cooldown
    existing_otp = db_service.get_otp_record(norm_email)
    now_iso = datetime.utcnow().isoformat()

    if existing_otp:
        resend_time = existing_otp.get("resend_available_at", "")
        if resend_time and resend_time > now_iso:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Verification code already sent recently. Please wait 60 seconds before requesting a new code."
            )

    # Generate 6-digit random code
    otp_code = str(secrets.randbelow(900000) + 100000)

    # Save OTP to database (5 min expiry, 60s cooldown)
    db_service.save_otp(email=norm_email, otp_code=otp_code, expires_in_seconds=300, resend_cooldown_seconds=60)

    # Send email
    send_res = email_service.send_otp_email(to_email=norm_email, otp_code=otp_code, expires_minutes=5)

    return api_response(
        success=True,
        message="Verification code sent to your email address.",
        data={
            "email": norm_email,
            "cooldown_seconds": 60,
            "expires_in_seconds": 300,
            "delivery": send_res
        }
    )


@router.post("/verify-otp")
def verify_otp(input_data: VerifyOtpInput):
    norm_email = input_data.email.strip().lower()
    otp_record = db_service.get_otp_record(norm_email)

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP code found for this email. Please request a new code."
        )

    now_iso = datetime.utcnow().isoformat()
    if otp_record.get("expires_at", "") < now_iso:
        db_service.delete_otp(norm_email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired. Please request a new code."
        )

    attempts = otp_record.get("attempts", 0)
    if attempts >= 5:
        db_service.delete_otp(norm_email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum retry limit exceeded (5 attempts). Please request a new code."
        )

    if otp_record.get("otp_code") != input_data.otp_code.strip():
        db_service.increment_otp_attempts(norm_email)
        remaining = 4 - attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # Valid OTP! Mark as verified
    db_service.mark_otp_verified(norm_email)

    return api_response(
        success=True,
        message="OTP code verified successfully.",
        data={"email": norm_email, "verified": True}
    )


@router.post("/reset-password-direct")
def reset_password_direct(input_data: ResetPasswordDirectInput):
    import re
    norm_email = input_data.email.strip().lower()
    user = db_service.get_user_by_email(norm_email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user account found with this email address."
        )

    pwd = input_data.new_password
    if len(pwd) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', pwd):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least 1 uppercase letter.")
    if not re.search(r'[a-z]', pwd):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least 1 lowercase letter.")
    if not re.search(r'[0-9]', pwd):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least 1 numeric digit.")
    if not re.search(r'[^A-Za-z0-9]', pwd):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least 1 special character.")

    # Hash new password & update DB
    new_pwd_hash = hash_password(pwd)
    updated = db_service.update_user_password(norm_email, new_pwd_hash)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user password in database."
        )

    # Security notification
    db_service.create_notification(
        notif_id=str(uuid.uuid4()),
        user_id=user["id"],
        title="Password Reset Completed",
        message="Your account password was updated successfully. All previous sessions have been invalidated."
    )

    try:
        email_service.send_password_changed_email(norm_email, user.get("name", "User"))
    except Exception:
        pass

    return api_response(
        success=True,
        message="Password updated successfully! You can now log in with your new password.",
        data={"email": norm_email}
    )


@router.post("/reset-password")
def reset_password(input_data: ResetPasswordInput):
    norm_email = input_data.email.strip().lower()
    otp_record = db_service.get_otp_record(norm_email)

    if not otp_record or not otp_record.get("verified", False):
        if not otp_record or otp_record.get("otp_code") != input_data.otp_code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or unverified OTP code. Please verify your code first."
            )

    if len(input_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    new_pwd_hash = hash_password(input_data.new_password)
    updated = db_service.update_user_password(norm_email, new_pwd_hash)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    db_service.delete_otp(norm_email)
    user = db_service.get_user_by_email(norm_email)
    user_name = user.get("name", "User") if user else "User"

    try:
        email_service.send_password_changed_email(norm_email, user_name)
    except Exception:
        pass

    if user:
        db_service.create_notification(
            notif_id=str(uuid.uuid4()),
            user_id=user["id"],
            title="Password Changed",
            message="Your account password was changed successfully."
        )

    return api_response(
        success=True,
        message="Password changed successfully. You can now log in with your new password.",
        data={"email": norm_email}
    )


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user_payload = {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "phone": current_user.get("phone", ""),
        "role": current_user["role"],
        "status": current_user.get("status", "active")
    }
    return api_response(
        success=True,
        message="User profile retrieved",
        data=user_payload,
        **user_payload
    )


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    db_service.update_user_status(current_user["id"], "inactive")
    return api_response(
        success=True,
        message="Successfully signed out of Finora AI."
    )


@router.delete("/account")
def delete_account(current_user: dict = Depends(get_current_user)):
    # Primary Admin Deletion Guard
    if current_user.get("role") == "admin" or current_user.get("email", "").strip().lower() == settings.ADMIN_EMAIL.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account cannot be deleted via self-service user deletion."
        )

    deleted_summary = db_service.delete_user_account(current_user["id"], current_user["email"])
    return api_response(
        success=True,
        message="Account and all associated application data permanently deleted.",
        data={"deleted_records": deleted_summary}
    )


@router.get("/users")
def get_all_users(admin_user: dict = Depends(get_admin_user)):
    users = db_service.list_users()
    return api_response(success=True, message="User list retrieved", data=users)


@router.delete("/users/{target_user_id}")
def admin_delete_user(target_user_id: str, admin_user: dict = Depends(get_admin_user)):
    target_user = db_service.get_user_by_id(target_user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Protection: Prevent admin accounts from being deleted
    target_email = target_user.get("email", "").strip().lower()
    target_role = target_user.get("role", "user")
    if target_role == "admin" or target_email == settings.ADMIN_EMAIL.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be deleted."
        )

    deleted_summary = db_service.delete_user_account(target_user_id, target_email)
    return api_response(
        success=True,
        message=f"User account '{target_email}' and all associated data permanently deleted.",
        data={"deleted_records": deleted_summary}
    )


@router.post("/refresh")
def refresh(req: RefreshRequest):
    payload = decode_jwt(req.refresh_token, settings.JWT_REFRESH_SECRET)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or has expired"
        )
    user = db_service.get_user_by_id(payload["sub"])
    if not user or user.get("status") == "inactive":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or session inactive"
        )

    access_token, refresh_token, user_data = _generate_user_tokens(user)

    return api_response(
        success=True,
        message="Token refreshed successfully",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_data
        },
        access_token=access_token,
        token_type="bearer"
    )
