import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash", env="GEMINI_MODEL")
    DATABASE_URL: str = Field(default="sqlite:///./incident_system.db", env="DATABASE_URL")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
        env="CORS_ORIGINS"
    )
    PORT: int = Field(default=8008, env="PORT")
    INVESTIGATION_MAX_ROUNDS: int = Field(default=4, env="INVESTIGATION_MAX_ROUNDS")
    INVESTIGATION_MAX_TOOLS: int = Field(default=12, env="INVESTIGATION_MAX_TOOLS")
    DATA_DIR: str = Field(default="data", env="DATA_DIR")

    # Autonomy & Monitoring Settings
    MONITORING_MODE: str = Field(default="simulation", env="MONITORING_MODE") # "simulation", "real", "hybrid"
    PROMETHEUS_BASE_URL: str = Field(default="", env="PROMETHEUS_BASE_URL")
    PROMETHEUS_ALERT_WEBHOOK_TOKEN: str = Field(default="incidentiq-secret-token", env="PROMETHEUS_ALERT_WEBHOOK_TOKEN")
    DETECTION_POLL_INTERVAL_SECONDS: int = Field(default=15, env="DETECTION_POLL_INTERVAL_SECONDS")
    TELEMETRY_STALE_AFTER_SECONDS: int = Field(default=120, env="TELEMETRY_STALE_AFTER_SECONDS")
    SIMULATION_MODE: bool = Field(default=True, env="SIMULATION_MODE")
    RECOVERY_REQUIRES_APPROVAL: bool = Field(default=True, env="RECOVERY_REQUIRES_APPROVAL")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def has_gemini_key(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip() and self.GEMINI_API_KEY.strip() != "your_api_key_here")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

