from pydantic import BaseModel
from dotenv import load_dotenv
import os


load_dotenv()


class Settings(BaseModel):
    # --- External API Keys ---
    FINNHUB_API_KEY: str = ""
    TIINGO_API_KEY: str = ""
    FRED_API_KEY: str = ""
    FMP_API_KEY: str = ""

    # --- Redis ---
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # --- Azure OpenAI ---
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_DEPLOYMENT_NAME: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-05-01-preview"

    # --- LLM / Sentiment ---
    LLM_MAX_TOKENS: int = 500
    SENTIMENT_CACHE_TTL_SECONDS: int = 3600
    NEWS_LOOKBACK_HOURS: int = 24

    # --- MongoDB ---
    MONGO_URI: str = "mongodb://localhost:27017/financedb"
    MONGO_DB_NAME: str = "financedb"

    # --- Provider Resolver ---
    # Comma-separated list of providers in priority order
    PROVIDER_CHAIN: str = "yahoo,tiingo,finnhub"

    def __init__(self, **kwargs):
        # Load from environment variables if not provided
        fields = type(self).model_fields
        for field in fields:
            if field not in kwargs:
                env_value = os.getenv(field)
                if env_value is not None:
                    if fields[field].annotation == int:
                        kwargs[field] = int(env_value)
                    else:
                        kwargs[field] = env_value
        super().__init__(**kwargs)

    def validate(self) -> list[str]:
        warnings = []
        if not self.FINNHUB_API_KEY:
            warnings.append("FINNHUB_API_KEY is missing")
        if not self.TIINGO_API_KEY:
            warnings.append("TIINGO_API_KEY is missing (Tiingo fallback disabled)")
        if not self.FRED_API_KEY:
            warnings.append("FRED_API_KEY is missing (macro snapshot fields will be null)")
        if not self.FMP_API_KEY:
            warnings.append("FMP_API_KEY is missing (market calendar endpoints return empty lists)")
        if not self.AZURE_OPENAI_API_KEY:
            warnings.append("AZURE_OPENAI_API_KEY is missing")
        if not self.AZURE_OPENAI_ENDPOINT:
            warnings.append("AZURE_OPENAI_ENDPOINT is missing")
        if not self.AZURE_OPENAI_DEPLOYMENT_NAME:
            warnings.append("AZURE_OPENAI_DEPLOYMENT_NAME is missing")
        return warnings


settings = Settings()