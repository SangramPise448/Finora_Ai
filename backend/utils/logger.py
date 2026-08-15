import os
import json
import logging
import logging.handlers
from datetime import datetime
from backend.config import settings

# Create logs directory
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Configure structured JSON logger
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "extra"):
            log_data.update(record.extra)
        return json.dumps(log_data)

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    # Console handler
    console = logging.StreamHandler()
    console.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"))
    logger.addHandler(console)

    # File handler with rotation (10MB, keep 5 backups)
    file_handler = logging.handlers.RotatingFileHandler(
        os.path.join(LOG_DIR, "finora.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setFormatter(JSONFormatter())
    logger.addHandler(file_handler)

    # Error-only file
    error_handler = logging.handlers.RotatingFileHandler(
        os.path.join(LOG_DIR, "finora_errors.log"),
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JSONFormatter())
    logger.addHandler(error_handler)

    return logger

# Root app logger
app_logger = get_logger("finora")
