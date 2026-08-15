import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

class Settings:
    # General API Configuration
    PROJECT_NAME: str = "Finora AI API"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Security Configurations
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-for-finora-ai-change-in-prod-123456!")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "another-secret-key-for-refresh-token-456789!")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")) # 15 mins default
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Admin Credentials Configuration
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "snpise448@gmail.com")
    ADMIN_INITIAL_PASSWORD: str = os.getenv("ADMIN_INITIAL_PASSWORD", "Sangram_CR_@0007")
    
    # File Upload Limits
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "200"))
    MAX_UPLOAD_SIZE_BYTES: int = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    
    # SMTP Email Configurations
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "Finora AI")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "support@finora.ai")
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    
    # Calculate base directory dynamically (config.py is in backend/)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Database Configurations
    MONGODB_URL: str = os.getenv("MONGODB_URL", os.getenv("MONGODB_URI", ""))
    MONGODB_URI: str = MONGODB_URL
    DB_NAME: str = os.getenv("DB_NAME", "personal_finance_db")
    DATABASE_MODE: str = os.getenv("DATABASE_MODE", "mongodb").lower()
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", os.path.join(BASE_DIR, "backend", "finora.db"))
    
    # ML Models & Mappings Configurations
    MODEL_PATH: str = os.getenv("MODEL_PATH", os.path.join(BASE_DIR, "model", "Personal_Finance_Model.pkl"))
    MAPPINGS_PATH: str = os.getenv("MAPPINGS_PATH", os.path.join(BASE_DIR, "model", "categorical_mappings.json"))
    MEDIANS_PATH: str = os.getenv("MEDIANS_PATH", os.path.join(BASE_DIR, "model", "column_medians.json"))
    
    # AI Assistant Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
