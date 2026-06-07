"""
Market data provider abstraction layer.

Exports the resolver and all concrete providers so that application
code only imports from this package — never from provider internals.
"""

from app.providers.base import (
    IMarketDataProvider,
    OHLCVBar,
    AssetInfo,
    ProviderHealth,
    ProviderStatus,
    FinancialStatements,
    NewsItem,
    AnalystRecommendation,
)
from app.providers.market_data_resolver import MarketDataResolver

__all__ = [
    "IMarketDataProvider",
    "OHLCVBar",
    "AssetInfo",
    "ProviderHealth",
    "ProviderStatus",
    "FinancialStatements",
    "NewsItem",
    "AnalystRecommendation",
    "MarketDataResolver",
]
