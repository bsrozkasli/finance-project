"""Lazy model factories so non-training commands do not import heavy libraries."""

from __future__ import annotations

from dataclasses import dataclass
from itertools import product
from typing import Any

import numpy as np
import pandas as pd

from finance_ml.core.features import FEATURE_COLUMNS


@dataclass(frozen=True)
class ModelCandidate:
    """A named deterministic candidate and its hyperparameters."""

    name: str
    parameters: dict[str, object]


@dataclass
class XGBoostPipeline:
    """Preprocessor plus fitted XGBoost estimator with pipeline-like inference."""

    preprocessor: Any
    estimator: Any

    def predict_proba(self, frame: pd.DataFrame) -> np.ndarray:
        return self.estimator.predict_proba(self.preprocessor.transform(frame))


def _sklearn_components() -> tuple[Any, Any, Any, Any, Any, Any, Any]:
    try:
        from sklearn.compose import ColumnTransformer
        from sklearn.dummy import DummyClassifier
        from sklearn.impute import SimpleImputer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder, StandardScaler
    except ImportError as error:  # pragma: no cover - environment configuration
        raise RuntimeError("scikit-learn is required; install requirements-ml.txt") from error
    return (
        ColumnTransformer,
        DummyClassifier,
        SimpleImputer,
        LogisticRegression,
        Pipeline,
        OneHotEncoder,
        StandardScaler,
    )


def build_preprocessor() -> Any:
    """Build the shared numeric/sector transformation without symbol identity."""

    ColumnTransformer, _, SimpleImputer, _, Pipeline, OneHotEncoder, StandardScaler = _sklearn_components()
    numeric_pipeline = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, list(FEATURE_COLUMNS)),
            ("sector", categorical_pipeline, ["sector"]),
        ],
        remainder="drop",
    )


def make_dummy_classifier(random_seed: int = 42) -> Any:
    """Create the mandatory class-prior baseline."""

    _, DummyClassifier, *_ = _sklearn_components()
    return DummyClassifier(strategy="prior", random_state=random_seed)


def make_logistic_pipeline(random_seed: int = 42) -> Any:
    """Create a regularised linear baseline suitable for calibrated probabilities."""

    _, _, _, LogisticRegression, Pipeline, _, _ = _sklearn_components()
    return Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            (
                "classifier",
                LogisticRegression(
                    max_iter=2_000,
                    class_weight="balanced",
                    random_state=random_seed,
                ),
            ),
        ]
    )


def xgboost_candidates() -> tuple[ModelCandidate, ...]:
    """Return the small CPU-safe candidate grid fixed by the experiment protocol."""

    return tuple(
        ModelCandidate(
            name="xgboost",
            parameters={
                "learning_rate": learning_rate,
                "max_depth": max_depth,
                "min_child_weight": min_child_weight,
                "subsample": 0.8,
                "colsample_bytree": 0.8,
            },
        )
        for learning_rate, max_depth, min_child_weight in product((0.03, 0.05), (3, 5), (5, 10))
    )


def fit_xgboost(
    train_frame: pd.DataFrame,
    train_target: pd.Series,
    validation_frame: pd.DataFrame,
    validation_target: pd.Series,
    parameters: dict[str, object],
    random_seed: int = 42,
) -> XGBoostPipeline:
    """Fit CPU histogram XGBoost with a validation-only early-stopping watchlist."""

    try:
        from xgboost import XGBClassifier
    except ImportError as error:  # pragma: no cover - environment configuration
        raise RuntimeError("xgboost is required; install requirements-ml.txt") from error
    preprocessor = build_preprocessor()
    train_matrix = preprocessor.fit_transform(train_frame)
    validation_matrix = preprocessor.transform(validation_frame)
    estimator = XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        tree_method="hist",
        device="cpu",
        n_estimators=500,
        early_stopping_rounds=50,
        random_state=random_seed,
        n_jobs=-1,
        **parameters,
    )
    estimator.fit(
        train_matrix,
        train_target,
        eval_set=[(validation_matrix, validation_target)],
        verbose=False,
    )
    return XGBoostPipeline(preprocessor=preprocessor, estimator=estimator)
