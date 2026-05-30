import os
from dataclasses import dataclass
from datetime import timedelta

from dotenv import load_dotenv


load_dotenv()


def _require(name: str) -> str:
    v = os.getenv(name, "").strip()
    if not v:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return v


@dataclass(frozen=True)
class Settings:
    APP_SECRET_KEY: str = os.getenv("APP_SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=int(os.getenv("JWT_EXPIRE_HOURS", "12")))

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://dam_user:dam_pass@localhost:5432/dam",
    )

    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")

    # Storage
    GCS_BUCKET: str = os.getenv("GCS_BUCKET", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    LOCAL_STORAGE_DIR: str = os.getenv("LOCAL_STORAGE_DIR", "./data/storage")

    # Vector store persistence (FAISS)
    FAISS_INDEX_PATH: str = os.getenv("FAISS_INDEX_PATH", "./data/vector/faiss.index")
    FAISS_META_PATH: str = os.getenv("FAISS_META_PATH", "./data/vector/faiss_meta.jsonl")

    # AI models
    CLIP_MODEL_NAME: str = os.getenv("CLIP_MODEL_NAME", "openai/clip-vit-base-patch32")
    ZERO_SHOT_MODEL_NAME: str = os.getenv("ZERO_SHOT_MODEL_NAME", "facebook/bart-large-mnli")
    DEVICE: str = os.getenv("DEVICE", "cpu")

    DUPLICATE_SIM_THRESHOLD: float = float(os.getenv("DUPLICATE_SIM_THRESHOLD", "0.985"))
    ADMIN_ACCESS_KEY: str = os.getenv("ADMIN_ACCESS_KEY", "dam-admin-2024")


settings = Settings()

