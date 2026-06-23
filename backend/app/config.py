import os

# Absolute path to this file → app/ → backend/
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Project root (DR/)
_PROJECT_ROOT = os.path.dirname(_BACKEND_ROOT)

class Settings:
    # Use absolute path for DB to prevent creating multiple DBs depending on CWD
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(_BACKEND_ROOT, 'acusight.db')}")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "b3dfa72db6e3a9c9f280a56e300bd7e5ab78c3c1e2b4f9dfc2d1b7d5a5cf2b3e")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # Use absolute path for static uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(_BACKEND_ROOT, "static", "uploads"))
    
    # Model path: resolve relative to project root so it works regardless of CWD.
    # The trained model lives at DR/best_dr_model.keras, not DR/backend/best_dr_model.keras.
    _default_model = os.path.join(_PROJECT_ROOT, "best_dr_model.keras")
    MODEL_PATH: str = os.getenv("MODEL_PATH", _default_model)

settings = Settings()

# Ensure static directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "original"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "heatmap"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "reports"), exist_ok=True)
