import logging

import pytest

from app import dependencies
from app.config import settings


def _names(providers) -> list[str]:
    return [provider.provider_name for provider in providers]


@pytest.fixture
def no_keys(monkeypatch):
    monkeypatch.setattr(settings, "TIINGO_API_KEY", "")
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "")


@pytest.fixture
def all_keys(monkeypatch):
    monkeypatch.setattr(settings, "TIINGO_API_KEY", "test-tiingo-key")
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "test-finnhub-key")


def test_chain_order_follows_provider_chain(all_keys):
    assert _names(dependencies.build_provider_chain("tiingo,finnhub,yahoo")) == ["tiingo", "finnhub", "yahoo"]


def test_omitted_provider_is_not_registered(all_keys):
    assert _names(dependencies.build_provider_chain("tiingo")) == ["tiingo"]


def test_default_chain_without_keys_registers_only_yahoo(no_keys):
    assert _names(dependencies.build_provider_chain(dependencies.DEFAULT_PROVIDER_CHAIN)) == ["yahoo"]


def test_chain_normalizes_case_whitespace_and_duplicates(no_keys, caplog):
    with caplog.at_level(logging.WARNING, logger="app.dependencies"):
        assert _names(dependencies.build_provider_chain(" Yahoo , yahoo ,bogus")) == ["yahoo"]

    assert "unknown provider 'bogus' in PROVIDER_CHAIN ignored" in caplog.text


@pytest.mark.parametrize("raw", ["", " , ", "finnhub"])
def test_unusable_chain_falls_back_to_default(no_keys, caplog, raw):
    with caplog.at_level(logging.ERROR, logger="app.dependencies"):
        assert _names(dependencies.build_provider_chain(raw)) == ["yahoo"]

    assert "produced no usable provider" in caplog.text
