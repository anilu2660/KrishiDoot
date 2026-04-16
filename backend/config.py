from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATA_GOV_API_KEY: str = "579b464db66ec23bdd000001d48b1f69dc574a3745bb3f1fc4046969"
    GEMINI_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    TELEGRAM_BOT_TOKEN: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
