from __future__ import annotations

import argparse
import re
import sys
from collections import Counter, defaultdict
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
GAP_CLASSES = frozenset(
    {"None", "Verification", "Documentation", "Behavior", "Data", "Architecture", "Compliance", "Deferred"}
)
GAP_READINESS = frozenset({"Ready", "Blocked", "Deferred"})
MARKDOWN_LINK_PATTERN = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
MARKDOWN_REFERENCE_DEFINITION_PATTERN = re.compile(
    r"(?m)^ {0,3}\[([^\]\n]+)\]:\s*(?:<([^>\n]+)>|(\S+))"
)
MARKDOWN_REFERENCE_USE_PATTERN = re.compile(r"(?<!!)\[([^\]\n]+)\]\[([^\]\n]*)\]")
EVIDENCE_ANNEXES = (
    "backend.md",
    "data-service.md",
    "frontend.md",
    "cross-runtime.md",
    "legacy-document-conflicts.md",
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


def _gap_rows(text: str) -> list[tuple[str, list[str]]]:
    section = re.search(r"(?ms)^## Gap Map\s*\n(.*?)(?=^## |\Z)", text)
    if not section:
        return []
    rows: list[tuple[str, list[str]]] = []
    for line in section.group(1).splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip().strip("`") for cell in line.strip().strip("|").split("|")]
        if cells and re.fullmatch(r"PRD-(?:FR|NFR)-\d{3}", cells[0]):
            rows.append((cells[0], cells))
    return rows


def _section_body(text: str, heading: str) -> str:
    section = re.search(rf"(?ms)^## {re.escape(heading)}\s*\n(.*?)(?=^## |\Z)", text)
    return section.group(1) if section else ""


def _table_rows(body: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in body.splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip().strip("`") for cell in line.strip().strip("|").split("|")]
        if cells and all(re.fullmatch(r":?-+:?", cell) for cell in cells):
            continue
        rows.append(cells)
    return rows


def _validate_delivery_epics(root: Path, gap_rows: list[tuple[str, list[str]]]) -> list[ValidationError]:
    expected_owner = {
        identifier: cells[5]
        for identifier, cells in gap_rows
        if len(cells) == 10 and re.fullmatch(r"EPIC-0(?:0\d|10)", cells[5])
    }
    requirements_seen: defaultdict[str, list[Path]] = defaultdict(list)
    stories_seen: defaultdict[str, list[Path]] = defaultdict(list)
    errors: list[ValidationError] = []

    for path in sorted((root / "epics").glob("EPIC-*.md")):
        owner_match = re.match(r"^(EPIC-(\d{3}))-", path.name)
        if not owner_match or not 1 <= int(owner_match.group(2)) <= 10:
            continue
        owner = owner_match.group(1)
        text = path.read_text(encoding="utf-8")
        number = int(owner_match.group(2))
        if number <= 4:
            expected_phase = "V1 Foundation"
        elif number <= 7:
            expected_phase = "Value MVP"
        else:
            expected_phase = "Post-V1"
        phase = re.search(r"(?m)^- Phase:\s*(.+)$", text)
        if not phase or not phase.group(1).startswith(expected_phase):
            errors.append(_error("EPIC_PHASE", path, f"{owner} requires {expected_phase} phase"))
        requirement_rows = [
            cells
            for cells in _table_rows(_section_body(text, "Requirements"))
            if cells and re.fullmatch(r"PRD-(?:FR|NFR)-\d{3}", cells[0])
        ]
        owned = {cells[0] for cells in requirement_rows}
        for cells in requirement_rows:
            identifier = cells[0]
            requirements_seen[identifier].append(path)
            if expected_owner.get(identifier) != owner:
                errors.append(_error("EPIC_REQUIREMENT_OWNER", path, f"{identifier} belongs to {expected_owner.get(identifier, 'no mapped epic')}, not {owner}"))
        for identifier, mapped_owner in expected_owner.items():
            if mapped_owner == owner and identifier not in owned:
                errors.append(_error("EPIC_REQUIREMENT_MISSING", path, f"{owner} is missing mapped {identifier}"))

        evidence = _section_body(text, "Success Evidence")
        has_method = re.search(r"(?i)\b(?:fixtures?|tests?|exercises?|drills?|samples?|audits?)\b", evidence)
        has_observable = re.search(
            r"(?i)\b(?:rejects?|proves?|shows?|records?|compares?|replays?|asserts?|"
            r"passes?|fails?|verifies?|exposes?|measures?|demonstrates?|covers?)\b",
            evidence,
        )
        if not has_method or not has_observable:
            errors.append(_error("EPIC_SUCCESS_EVIDENCE", path, f"{owner} needs a reproducible method and observable result"))

        story_rows = [
            cells
            for cells in _table_rows(_section_body(text, "Story Plan"))
            if cells and cells[0] != "Proposed story"
        ]
        if not story_rows:
            errors.append(_error("EPIC_STORY_MISSING", path, f"{owner} requires proposed stories"))
        for cells in story_rows:
            if len(cells) != 3 or not all(cells):
                errors.append(_error("EPIC_STORY_FIELDS", path, "story plan requires ID, outcome, and dependency"))
            if len(cells) >= 3 and cells[2].strip().lower().rstrip(".") in {"none", "tbd", "n/a", "na", "-"}:
                errors.append(_error("EPIC_STORY_DEPENDENCY", path, f"{owner} has placeholder story dependency"))
            identifier = cells[0]
            if not re.fullmatch(r"STORY-\d{3}-\d{2}", identifier):
                errors.append(_error("EPIC_STORY_ID", path, f"invalid proposed story {identifier}"))
                continue
            stories_seen[identifier].append(path)
            if not identifier.startswith(f"STORY-{owner_match.group(2)}-"):
                errors.append(_error("EPIC_STORY_OWNER", path, f"{identifier} does not belong to {owner}"))

    for identifier, paths in requirements_seen.items():
        if len(paths) > 1:
            errors.append(_error("EPIC_REQUIREMENT_DUPLICATE", paths[0], f"{identifier} appears in {len(paths)} delivery epic requirement rows"))
    for identifier, paths in stories_seen.items():
        if len(paths) > 1:
            errors.append(_error("EPIC_STORY_DUPLICATE", paths[0], f"{identifier} appears in {len(paths)} story-plan rows"))
    return errors


def _validate_gap_map(path: Path, text: str, prd_text: str) -> list[ValidationError]:
    rows = _gap_rows(text)
    required = {
        identifier
        for identifier in _definition_ids(path.with_name("PRD.md"), prd_text)
        if identifier.startswith(("PRD-FR-", "PRD-NFR-"))
    }
    counts: defaultdict[str, int] = defaultdict(int)
    errors: list[ValidationError] = []
    for identifier, cells in rows:
        counts[identifier] += 1
        if len(cells) != 10 or any(not cell for cell in cells):
            errors.append(_error("GAP_ROW_FIELDS", path, f"{identifier} requires ten non-empty primary fields"))
            continue
        target, current, gap_class, statement, owner, dependency, risk, acceptance, readiness = cells[1:]
        if not re.fullmatch(r"CAP-TGT-\d{3}", target):
            errors.append(_error("GAP_TARGET", path, f"{identifier} requires one target capability"))
        if current != "None" and not re.fullmatch(r"CAP-CUR-(?:BE|DS|FE|XR)-\d{3}(?:,\s*CAP-CUR-(?:BE|DS|FE|XR)-\d{3})*", current):
            errors.append(_error("GAP_CURRENT", path, f"{identifier} requires current evidence IDs or None"))
        if gap_class not in GAP_CLASSES:
            errors.append(_error("GAP_CLASS", path, f"{identifier} has invalid class {gap_class}"))
        if not re.fullmatch(r"EPIC-0(?:0\d|10)", owner):
            errors.append(_error("GAP_EPIC_OWNER", path, f"{identifier} requires one EPIC-000 through EPIC-010 owner"))
        if readiness not in GAP_READINESS:
            errors.append(_error("GAP_READINESS", path, f"{identifier} has invalid readiness {readiness}"))
        if owner in {"EPIC-008", "EPIC-009", "EPIC-010"} and readiness != "Deferred":
            errors.append(_error("EPIC_DEFERRED_READINESS", path, f"{identifier} must remain Deferred for Post-V1 delivery"))
        if not statement or not dependency or not risk or not acceptance:
            errors.append(_error("GAP_ROW_FIELDS", path, f"{identifier} has an empty required field"))

    for identifier in sorted(required):
        if counts[identifier] == 0:
            errors.append(_error("GAP_MISSING_REQUIREMENT", path, f"{identifier} has no primary gap row"))
        elif counts[identifier] > 1:
            errors.append(_error("GAP_DUPLICATE_REQUIREMENT", path, f"{identifier} has {counts[identifier]} primary rows"))
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


def _planned_story_ids(path: Path, text: str) -> set[str]:
    if path.parent.name != "epics":
        return set()
    owner = re.match(r"EPIC-(\d{3})-", path.name)
    if not owner:
        return set()
    planned: set[str] = set()
    for line in _section_body(text, "Story Plan").splitlines():
        if re.match(r"^\s*(?:\d+\.|[-*])\s+", line):
            planned.update(
                identifier
                for identifier in extract_ids(line)
                if identifier.startswith(f"STORY-{owner.group(1)}-")
            )
        elif line.startswith("|"):
            first_cell = line.strip().strip("|").split("|", 1)[0].strip().strip("`")
            if re.fullmatch(rf"STORY-{owner.group(1)}-\d{{2}}", first_cell):
                planned.add(first_cell)
    return planned


def _validate_complete(root: Path, files: list[Path]) -> list[ValidationError]:
    errors: list[ValidationError] = []
    canonical = ("CURRENT_STATE_BASELINE.md", "PRD.md", "CAPABILITY_GAP_MAP.md")
    required_files = [
        *(root / name for name in canonical),
        *(root / "evidence" / name for name in EVIDENCE_ANNEXES),
    ]
    for path in required_files:
        if not path.is_file():
            errors.append(
                _error("COMPLETE_ARTIFACT", path, f"missing canonical artifact {path.name}")
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

    product_index = root / "README.md"
    docs_index = root.parent / "README.md"
    if not product_index.is_file():
        errors.append(_error("COMPLETE_ARTIFACT", root / "README.md", "missing product index"))
    if not docs_index.is_file():
        errors.append(
            _error("COMPLETE_ARTIFACT", root.parent / "README.md", "missing repository documentation index")
        )
    product_targets = [
        root.parent / "superpowers" / "specs" / "2026-09-29-investment-platform-product-foundation-design.md",
        *required_files,
        *sorted((root / "epics").glob("EPIC-*.md")),
        *sorted((root / "stories" / "EPIC-000").glob("STORY-000-*.md")),
    ]
    if product_index.is_file():
        errors.extend(_validate_index_navigation(product_index, product_targets))
    if docs_index.is_file():
        errors.extend(_validate_index_navigation(docs_index, [product_index]))
    return errors


def _reference_key(label: str) -> str:
    return " ".join(label.split()).casefold()


def _local_index_target(path: Path, target: str) -> Path | None:
    target = target.strip().strip("<>")
    if target.startswith(("#", "//")) or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", target):
        return None
    file_target = target.split("#", 1)[0].split("?", 1)[0]
    return (path.parent / file_target).resolve() if file_target else None


def _validate_index_navigation(path: Path, required_targets: Sequence[Path]) -> list[ValidationError]:
    errors: list[ValidationError] = []
    text = path.read_text(encoding="utf-8")
    definitions = {
        _reference_key(match.group(1)): match.group(2) or match.group(3)
        for match in MARKDOWN_REFERENCE_DEFINITION_PATTERN.finditer(text)
    }
    targets = [match.group(1) for match in MARKDOWN_LINK_PATTERN.finditer(text)]
    for match in MARKDOWN_REFERENCE_USE_PATTERN.finditer(text):
        label = match.group(2) or match.group(1)
        target = definitions.get(_reference_key(label))
        if target is None:
            errors.append(_error("INDEX_REFERENCE_UNDEFINED", path, f"undefined index link reference: {label}"))
        else:
            targets.append(target)

    local_targets: Counter[Path] = Counter()
    for target in targets:
        local_path = _local_index_target(path, target)
        if local_path is None:
            continue
        local_targets[local_path] += 1
        if not local_path.is_file():
            errors.append(_error("INDEX_LINK_MISSING", path, f"index link target does not exist: {target}"))
    for required in required_targets:
        count = local_targets[required.resolve()]
        if count == 0:
            errors.append(_error("INDEX_NAV_MISSING", path, f"canonical index link is missing: {required.name}"))
        elif count > 1:
            errors.append(_error("INDEX_NAV_DUPLICATE", path, f"canonical index link appears {count} times: {required.name}"))
    return errors


def validate_product_docs(
    root: Path, complete: bool = False, delivery_complete: bool = False
) -> list[ValidationError]:
    """Validate incremental, delivery-catalog, or full product documentation."""

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
    gap_path = root / "CAPABILITY_GAP_MAP.md"
    if gap_path.is_file():
        prd_path = root / "PRD.md"
        prd_text = prd_path.read_text(encoding="utf-8") if prd_path.is_file() else ""
        gap_text = gap_path.read_text(encoding="utf-8")
        gap_rows = _gap_rows(gap_text)
        errors.extend(_validate_gap_map(gap_path, gap_text, prd_text))
        forward_epic_owners = {
            cells[5]
            for _, cells in gap_rows
            if len(cells) == 10 and re.fullmatch(r"EPIC-0(?:0\d|10)", cells[5])
        }
    else:
        gap_rows = []
        forward_epic_owners = set()
    errors.extend(_validate_delivery_epics(root, gap_rows))
    if delivery_complete:
        for number in range(1, 11):
            if not list((root / "epics").glob(f"EPIC-{number:03d}-*.md")):
                errors.append(
                    _error(
                        "DELIVERY_EPIC_MISSING",
                        root / "epics" / f"EPIC-{number:03d}-*.md",
                        f"delivery epic EPIC-{number:03d} is missing",
                    )
                )
    for path in files:
        if _is_policy(path) or _is_review_artifact(path):
            continue
        text = path.read_text(encoding="utf-8")
        declared_here = set(declarations_by_file.get(path, []))
        allowed_forward = forward_epic_owners if path == gap_path else _planned_story_ids(path, text)
        for identifier in sorted(extract_references(text) - known_ids - declared_here - allowed_forward):
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
    parser.add_argument("--delivery-complete", action="store_true")
    args = parser.parse_args(argv)

    errors = validate_product_docs(
        args.root, complete=args.complete, delivery_complete=args.delivery_complete
    )
    if errors:
        for error in errors:
            print(f"{error.code}: {error.path}: {error.message}")
        return 1

    if args.complete:
        mode = "complete"
    elif args.delivery_complete:
        mode = "delivery-complete"
    else:
        mode = "incremental"
    print(f"Product documentation validation passed ({mode} mode): {args.root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
