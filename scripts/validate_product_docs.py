from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


ID_PATTERN = re.compile(
    r"\b(?:"
    r"CAP-CUR-(?:BE|DS|FE|XR)-\d{3}|"
    r"CAP-TGT-\d{3}|"
    r"PRD-(?:FR|NFR)-\d{3}|"
    r"EPIC-\d{3}|"
    r"STORY-\d{3}-\d{2}|"
    r"DOC-CONFLICT-\d{3}"
    r")\b"
)
EVIDENCE_LEVEL_PATTERN = re.compile(
    r"(?im)^\s*[-*]?\s*Evidence Level\s*:\s*E([23])\b"
)
FIELD_PATTERN = re.compile(
    r"(?im)^\s*[-*]?\s*(?:\*\*)?([^:*\n]+?)(?:\*\*)?\s*:\s*(.*)$"
)

EPIC_SECTIONS = (
    "Outcome",
    "Problem",
    "Scope",
    "Out of Scope",
    "Requirements",
    "Dependencies",
    "Risks",
    "Success Evidence",
    "Story Plan",
)
STORY_SECTIONS = (
    "User Story",
    "Business Value",
    "Scope",
    "Out of Scope",
    "Preconditions",
    "Acceptance Criteria",
    "Data and Provenance",
    "Degradation",
    "Testing",
    "Dependencies",
    "Traceability",
    "Definition of Done",
)


@dataclass(frozen=True)
class ValidationError:
    code: str
    path: Path
    message: str


def extract_ids(text: str) -> set[str]:
    """Return all governed identifiers present in Markdown text."""

    return set(ID_PATTERN.findall(text))


def extract_references(text: str) -> set[str]:
    """Return identifier tokens that may be references or definitions."""

    return extract_ids(text)


def required_sections(path: Path) -> tuple[str, ...]:
    """Return the section headings required for a recognized artifact."""

    name = path.name
    parts = {part.lower() for part in path.parts}

    if name == "CONTRIBUTING.md":
        return (
            "Artifact Taxonomy",
            "Stable IDs and Statuses",
            "Evidence Contract",
            "Authoring Workflow",
        )
    if name == "PRD.md":
        return (
            "Executive Summary",
            "Product Scope",
            "Functional Requirements",
            "Non-Functional Requirements",
            "Testing Strategy",
            "Degradation",
        )
    if name == "CURRENT_STATE_BASELINE.md":
        return ("Method", "Capability Inventory", "Limitations")
    if name == "CAPABILITY_GAP_MAP.md":
        return ("Gap Map", "Traceability")
    if "evidence" in parts and name == "legacy-document-conflicts.md":
        return ("Conflict Records",)
    if "evidence" in parts:
        return ("Audit Metadata", "Evidence Records", "Limitations")
    if "epics" in parts and name.startswith("EPIC-"):
        return EPIC_SECTIONS
    if "stories" in parts and name.startswith("STORY-"):
        return STORY_SECTIONS
    return ()


def _headings(text: str) -> list[str]:
    return [
        re.sub(r"^#{1,6}\s+", "", line).strip().lower()
        for line in text.splitlines()
        if re.match(r"^#{1,6}\s+", line)
    ]


def _has_section(text: str, section: str) -> bool:
    expected = section.lower()
    return any(expected in heading for heading in _headings(text))


def _definition_ids(path: Path, text: str) -> list[str]:
    """Find identifier declarations without treating normal links as declarations."""

    declarations: list[str] = []
    name = path.name
    parts = {part.lower() for part in path.parts}

    if name == "CONTRIBUTING.md" or name in {
        "README.md",
        "CURRENT_STATE_BASELINE.md",
        "CAPABILITY_GAP_MAP.md",
    }:
        return declarations

    for line in text.splitlines():
        heading = re.match(r"^#{1,6}\s+", line)
        if heading and "PRD.md" != name:
            declarations.extend(extract_ids(line))

        if re.match(
            r"^\s*[-*]?\s*(?:\*\*)?(?:ID|Capability ID|Requirement ID|Epic ID|Story ID|Conflict ID)(?:\*\*)?\s*:",
            line,
            re.IGNORECASE,
        ):
            declarations.extend(extract_ids(line))

        if name == "PRD.md" and re.match(r"^\s*\|", line):
            first_cell = line.split("|", 2)[1] if "|" in line else ""
            declarations.extend(extract_ids(first_cell))

    if "stories" in parts and name.startswith("STORY-") and not any(
        identifier.startswith("STORY-") for identifier in declarations
    ):
        declarations.extend(extract_ids(name))
    if "epics" in parts and name.startswith("EPIC-") and not any(
        identifier.startswith("EPIC-") for identifier in declarations
    ):
        declarations.extend(extract_ids(name))

    return declarations


def _field_values(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    lines = text.splitlines()
    for index, line in enumerate(lines):
        match = FIELD_PATTERN.match(line)
        if not match:
            continue
        label = re.sub(r"\s+", " ", match.group(1).strip()).lower()
        value = match.group(2).strip()
        if not value and index + 1 < len(lines):
            next_line = lines[index + 1].strip()
            if next_line and not next_line.startswith("#") and not FIELD_PATTERN.match(next_line):
                value = next_line.lstrip("-*").strip()
        values[label] = value
    return values


def _record_blocks(text: str, prefix: str) -> list[tuple[str, str]]:
    lines = text.splitlines()
    records: list[tuple[str, str]] = []
    for index, line in enumerate(lines):
        heading = re.match(r"^(#{2,6})\s+", line)
        if not heading:
            continue
        identifiers = [identifier for identifier in extract_ids(line) if identifier.startswith(prefix)]
        if not identifiers:
            continue
        level = len(heading.group(1))
        end = len(lines)
        for candidate_index in range(index + 1, len(lines)):
            candidate = re.match(r"^(#{2,6})\s+", lines[candidate_index])
            if candidate and len(candidate.group(1)) <= level:
                end = candidate_index
                break
        records.append((sorted(identifiers)[0], "\n".join(lines[index:end])))
    return records


def _is_policy(path: Path) -> bool:
    return path.name == "CONTRIBUTING.md"


def _is_review_artifact(path: Path) -> bool:
    return path.name.startswith(("review-", "reconcile-"))


def _error(code: str, path: Path, message: str) -> ValidationError:
    return ValidationError(code=code, path=path, message=message)


def _validate_required_sections(path: Path, text: str) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for section in required_sections(path):
        if not _has_section(text, section):
            errors.append(
                _error(
                    "MISSING_SECTION",
                    path,
                    f"required section '{section}' is missing",
                )
            )
    return errors


def _validate_evidence(path: Path, text: str) -> list[ValidationError]:
    if _is_policy(path) or "evidence" not in {part.lower() for part in path.parts}:
        return []

    records = _record_blocks(text, "CAP-CUR-")
    if not records:
        return []

    errors: list[ValidationError] = []
    record_fields = (
        "summary",
        "evidence level",
        "contract",
        "evidence locator",
        "verification",
        "limitations",
        "legacy claims",
    )
    required_fields = {
        "commit": "EVIDENCE_COMMIT",
        "evidence locator": "EVIDENCE_LOCATOR",
        "reviewer": "EVIDENCE_REVIEWER",
        "review date": "EVIDENCE_DATE",
        "environment": "EVIDENCE_ENVIRONMENT",
        "verification": "EVIDENCE_VERIFICATION",
        "limitations": "EVIDENCE_LIMITATIONS",
    }
    for identifier, block in records:
        values = _field_values(block)
        for field in record_fields:
            if not values.get(field):
                errors.append(
                    _error(
                        "MISSING_EVIDENCE_FIELD",
                        path,
                        f"{identifier} requires a non-empty '{field}' field",
                    )
                )

        if not EVIDENCE_LEVEL_PATTERN.search(block):
            continue
        for field, code in required_fields.items():
            if not values.get(field):
                errors.append(
                    _error(code, path, f"E2/E3 evidence requires a non-empty '{field}'")
                )
    return errors


def _validate_target_status(path: Path, text: str) -> list[ValidationError]:
    if path.name != "PRD.md":
        return []
    errors: list[ValidationError] = []
    lines = text.splitlines()
    for index, line in enumerate(lines):
        target_ids = extract_ids(line) & {
            identifier
            for identifier in extract_ids(line)
            if identifier.startswith(("CAP-TGT-", "PRD-FR-", "PRD-NFR-"))
        }
        if not target_ids:
            continue

        status_on_line = re.search(r"\bImplemented\b", line, re.IGNORECASE)
        status_in_record = any(
            re.search(r"^\s*[-*]?\s*Status\s*:\s*Implemented\b", candidate, re.IGNORECASE)
            for candidate in lines[index + 1 : min(index + 4, len(lines))]
        )
        if status_on_line or status_in_record:
            errors.append(
                _error(
                    "TARGET_IMPLEMENTED",
                    path,
                    f"target requirement {sorted(target_ids)[0]} is marked Implemented",
                )
            )
    return errors


def _validate_prd_degradation(path: Path, text: str) -> list[ValidationError]:
    if path.name != "PRD.md":
        return []
    target_ids = {
        identifier
        for identifier in extract_ids(text)
        if identifier.startswith(("CAP-TGT-", "PRD-FR-", "PRD-NFR-"))
    }
    if target_ids and not re.search(r"degrad", text, re.IGNORECASE):
        return [
            _error(
                "MISSING_DEGRADATION",
                path,
                "target requirements must state explicit provider/LLM degradation behavior",
            )
        ]
    return []


def _validate_conflict(path: Path, text: str) -> list[ValidationError]:
    if "conflict" not in path.name.lower() and "DOC-CONFLICT-" not in text:
        return []
    records = _record_blocks(text, "DOC-CONFLICT-")
    if not records:
        records = [("conflict", text)]
    errors: list[ValidationError] = []
    for identifier, block in records:
        if not re.search(
            r"(?im)^\s*(?:[-*]?\s*)?(?:\*\*)?Disposition(?:\*\*)?\s*[:|]",
            block,
        ):
            errors.append(
                _error(
                    "CONFLICT_DISPOSITION",
                    path,
                    f"{identifier} requires an explicit disposition",
                )
            )
    return errors


def _validate_story_ownership(path: Path, text: str) -> list[ValidationError]:
    parts = list(path.parts)
    try:
        stories_index = next(index for index, part in enumerate(parts) if part.lower() == "stories")
    except StopIteration:
        return []
    if stories_index + 1 >= len(parts):
        return []

    owner = parts[stories_index + 1]
    owner_match = re.fullmatch(r"EPIC-(\d{3})", owner, re.IGNORECASE)
    if not owner_match or not path.name.startswith("STORY-"):
        return []

    expected = owner_match.group(1)
    story_ids = [identifier for identifier in extract_ids(text) if identifier.startswith("STORY-")]
    if any(identifier.split("-")[1] != expected for identifier in story_ids):
        return [
            _error(
                "STORY_OWNERSHIP",
                path,
                f"story identifier must belong to {owner}",
            )
        ]
    if not path.name.startswith(f"STORY-{expected}-"):
        return [
            _error(
                "STORY_OWNERSHIP",
                path,
                f"story filename must belong to {owner}",
            )
        ]
    return []


def _validate_complete(root: Path, files: list[Path]) -> list[ValidationError]:
    errors: list[ValidationError] = []
    canonical = ("CURRENT_STATE_BASELINE.md", "PRD.md", "CAPABILITY_GAP_MAP.md")
    for name in canonical:
        if not (root / name).is_file():
            errors.append(
                _error("COMPLETE_ARTIFACT", root / name, f"missing canonical artifact {name}")
            )

    for number in range(11):
        matches = list((root / "epics").glob(f"EPIC-{number:03d}-*.md"))
        if not matches:
            errors.append(
                _error(
                    "COMPLETE_ARTIFACT",
                    root / "epics" / f"EPIC-{number:03d}-*.md",
                    f"missing epic EPIC-{number:03d}",
                )
            )

    for number in range(1, 7):
        matches = list((root / "stories" / "EPIC-000").glob(f"STORY-000-{number:02d}-*.md"))
        if not matches:
            errors.append(
                _error(
                    "COMPLETE_ARTIFACT",
                    root / "stories" / "EPIC-000" / f"STORY-000-{number:02d}-*.md",
                    f"missing EPIC-000 story STORY-000-{number:02d}",
                )
            )

    if not (root / "README.md").is_file():
        errors.append(_error("COMPLETE_ARTIFACT", root / "README.md", "missing product index"))
    if not (root.parent / "README.md").is_file():
        errors.append(
            _error("COMPLETE_ARTIFACT", root.parent / "README.md", "missing repository documentation index")
        )
    return errors


def validate_product_docs(root: Path, complete: bool = False) -> list[ValidationError]:
    """Validate product documentation incrementally or as the complete set."""

    root = root.resolve()
    if not root.is_dir():
        return [_error("ROOT_NOT_FOUND", root, "product documentation root does not exist")]

    files = sorted(root.rglob("*.md"))
    errors: list[ValidationError] = []
    definitions_by_id: defaultdict[str, list[Path]] = defaultdict(list)
    declarations_by_file: dict[Path, list[str]] = {}

    for path in files:
        text = path.read_text(encoding="utf-8")
        declarations = _definition_ids(path, text)
        declarations_by_file[path] = declarations
        for identifier in declarations:
            definitions_by_id[identifier].append(path)

        if _is_policy(path):
            errors.extend(_validate_required_sections(path, text))
            continue

        errors.extend(_validate_required_sections(path, text))
        errors.extend(_validate_evidence(path, text))
        errors.extend(_validate_target_status(path, text))
        errors.extend(_validate_prd_degradation(path, text))
        errors.extend(_validate_conflict(path, text))
        errors.extend(_validate_story_ownership(path, text))

    for identifier, owners in definitions_by_id.items():
        if len(owners) > 1:
            for path in sorted(set(owners)):
                errors.append(
                    _error(
                        "DUPLICATE_ID",
                        path,
                        f"identifier {identifier} is declared more than once",
                    )
                )

    known_ids = set(definitions_by_id)
    for path in files:
        if _is_policy(path) or _is_review_artifact(path):
            continue
        text = path.read_text(encoding="utf-8")
        declared_here = set(declarations_by_file.get(path, []))
        for identifier in sorted(extract_references(text) - known_ids - declared_here):
            errors.append(
                _error(
                    "UNKNOWN_REFERENCE",
                    path,
                    f"reference {identifier} has no declaration in the product documentation set",
                )
            )

    if complete:
        errors.extend(_validate_complete(root, files))

    return sorted(errors, key=lambda error: (str(error.path), error.code, error.message))


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate product documentation contracts")
    parser.add_argument("--root", type=Path, default=Path("docs/product"))
    parser.add_argument("--complete", action="store_true")
    args = parser.parse_args(argv)

    errors = validate_product_docs(args.root, complete=args.complete)
    if errors:
        for error in errors:
            print(f"{error.code}: {error.path}: {error.message}")
        return 1

    mode = "complete" if args.complete else "incremental"
    print(f"Product documentation validation passed ({mode} mode): {args.root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
