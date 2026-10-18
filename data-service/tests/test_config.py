from app.config import Settings


def test_settings_do_not_declare_mongo_fields():
    assert "MONGO_URI" not in Settings.model_fields
    assert "MONGO_DB_NAME" not in Settings.model_fields


def test_settings_ignore_mongo_environment(monkeypatch):
    monkeypatch.setenv("MONGO_URI", "mongodb://ignored:27017/financedb")

    assert not hasattr(Settings(), "MONGO_URI")
