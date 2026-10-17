r"""Record each candidate model's pinned revision and declared license (S1 prerequisite).

The script only fetches metadata. A human reads the model card and license text and
sets ``decision`` to ``use`` or ``reject``; ``run_zero_shot`` refuses anything else.

Usage (from ``ml/``)::

    .\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.verify_models
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from huggingface_hub import model_info

LOCK_FILE = Path(__file__).with_name("models.lock.json")
CANDIDATES = {
    "nli": ("MoritzLaurer/deberta-v3-base-zeroshot-v2.0", "zero-shot-classification", ("event_type", "tone", "material")),
    "finbert": ("ProsusAI/finbert", "text-classification", ("tone",)),
}


def main() -> int:
    entries = []
    for key, (model_id, task, heads) in CANDIDATES.items():
        info = model_info(model_id)
        card = info.card_data.to_dict() if info.card_data else {}
        entries.append({
            "key": key,
            "id": model_id,
            "task": task,
            "heads": list(heads),
            "revision": info.sha,
            "declared_license": card.get("license"),
            "model_card_url": f"https://huggingface.co/{model_id}/blob/{info.sha}/README.md",
            "checked_on": date.today().isoformat(),
            "decision": "pending",
            "decision_note": "",
        })
        print(f"{key}: {model_id}@{info.sha} declared_license={card.get('license')!r}")
    LOCK_FILE.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {LOCK_FILE}; set decision to 'use' or 'reject' after reading each license")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
