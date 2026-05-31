from pydantic import BaseModel
from dotenv import load_dotenv
import os


load_dotenv()


class Settings(BaseModel):
    FINNHUB_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-20250514"
    LLM_MAX_TOKENS: int = 500
    SENTIMENT_CACHE_TTL_SECONDS: int = 3600
    NEWS_LOOKBACK_HOURS: int = 24

    def __init__(self, **kwargs):
        # Load from environment variables if not provided
        for field in self.__fields__:
            if field not in kwargs:
                env_value = os.getenv(field)
                if env_value is not None:
                    if self.__fields__[field].annotation == int:
                        kwargs[field] = int(env_value)
                    else:
                        kwargs[field] = env_value
        super().__init__(**kwargs)

    def validate(self) -> list[str]:
        warnings = []
        if not self.FINNHUB_API_KEY:
            warnings.append("FINNHUB_API_KEY is missing")
        if not self.ANTHROPIC_API_KEY:
            warnings.append("ANTHROPIC_API_KEY is missing")
        return warnings


settings = Settings()
