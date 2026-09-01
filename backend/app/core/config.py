from uuid import UUID

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY"),
    )
    PUNA_COMPANY_ID: str = ""
    AUTOPOST_WORKER_TOKEN: str = ""
    AUTOPOST_SCHEDULER_ENABLED: bool = False
    AUTOPOST_MUTATIONS_ENABLED: bool = False
    AUTOPOST_ALLOWED_IMAGE_HOSTS: str = ".supabase.co"
    GEMINI_API_KEY: str = ""
    REPLICATE_API_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def validate_runtime(self) -> None:
        missing = [
            name
            for name, value in (
                ("SUPABASE_URL", self.SUPABASE_URL),
                ("SUPABASE_SERVICE_ROLE_KEY", self.SUPABASE_SERVICE_ROLE_KEY),
                ("PUNA_COMPANY_ID", self.PUNA_COMPANY_ID),
                ("AUTOPOST_WORKER_TOKEN", self.AUTOPOST_WORKER_TOKEN),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(f"Missing required server configuration: {', '.join(missing)}")
        if len(self.AUTOPOST_WORKER_TOKEN) < 32:
            raise RuntimeError("AUTOPOST_WORKER_TOKEN must contain at least 32 characters")
        try:
            UUID(self.PUNA_COMPANY_ID)
        except ValueError as exc:
            raise RuntimeError("PUNA_COMPANY_ID must be a UUID") from exc

    @property
    def allowed_image_hosts(self) -> tuple[str, ...]:
        return tuple(host.strip().lower() for host in self.AUTOPOST_ALLOWED_IMAGE_HOSTS.split(",") if host.strip())

settings = Settings()
