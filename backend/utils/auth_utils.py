import base64
import hmac
import hashlib
import json
import time
import bcrypt

# --- JWT HELPER METHODS (Zero Dependency RFC 7519 Compliant) ---
def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict, secret: str, expires_in: int = 86400) -> str:
    """
    Creates a JWT token with an expiration time (expires_in seconds, default 24h)
    """
    payload_copy = payload.copy()
    payload_copy["exp"] = int(time.time()) + expires_in
    
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload_copy).encode('utf-8'))
    
    message = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str, secret: str) -> dict:
    """
    Decodes a JWT token and verifies the HMAC signature. Returns None if invalid or expired.
    """
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        
        message = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).digest()
        expected_sig_b64 = base64url_encode(expected_sig)
        
        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None
            
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        
        # Verify Expiration
        if "exp" in payload and payload["exp"] < time.time():
            return None
            
        return payload
    except Exception:
        return None

# --- BCRYPT PASSWORD HASHING ---
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False
