from __future__ import annotations

import unittest
from contextlib import contextmanager
from pathlib import Path
from textwrap import dedent

from scripts.validate_product_docs import validate_product_docs


TEST_TEMP_ROOT = Path(__file__).resolve().parents[2] / ".cache" / "product-doc-validation-tests"
TEST_TEMP_ROOT.mkdir(parents=True, exist_ok=True)


class ValidateProductDocsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture_path = TEST_TEMP_ROOT / self._testMethodName
        self.fixture_path.mkdir(parents=True, exist_ok=True)
        for path in self.fixture_path.rglob("*.md"):
            path.unlink()

    @contextmanager
    def fixture(self):
        yield self.fixture_path

    def write(self, root: Path, relative: str, content: str) -> None:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(dedent(content).strip() + "\n", encoding="utf-8")

    def codes(self, root: Path, complete: bool = False) -> set[str]:
        return {error.code for error in validate_product_docs(root, complete=complete)}

    def test_rejects_duplicate_ids(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "evidence/backend.md",
                """
                # Backend Evidence
                ## Audit Metadata
                ## Evidence Records
                ### CAP-CUR-BE-001
                ### CAP-CUR-BE-001
                ## Limitations
                """,
            )

            self.assertIn("DUPLICATE_ID", self.codes(root))

    def test_rejects_missing_required_story_heading(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            sections = [
                "User Story",
                "Business Value",
                "Scope",
                "Out of Scope",
                "Preconditions",
                "Data and Provenance",
                "Degradation",
                "Testing",
                "Dependencies",
                "Traceability",
                "Definition of Done",
            ]
            body = "# STORY-000-01 Audit backend\n" + "\n".join(
                f"## {section}\n- recorded" for section in sections
            )
            self.write(root, "stories/EPIC-000/STORY-000-01-audit.md", body)

            self.assertIn("MISSING_SECTION", self.codes(root))

    def test_rejects_unknown_requirement_reference(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "PRD.md",
                """
                # PRD
                ## Executive Summary
                ## Product Scope
                ## Functional Requirements
                | `PRD-FR-001` | Proposed |
                ## Non-Functional Requirements
                | `PRD-NFR-001` | Proposed |
                ## Testing Strategy
                ## Degradation
                ## References
                """,
            )
            self.write(
                root,
                "CAPABILITY_GAP_MAP.md",
                """
                # Capability Gap Map
                ## Gap Map
                | Requirement | Evidence |
                | `PRD-FR-999` | None |
                ## Traceability
                """,
            )

            self.assertIn("UNKNOWN_REFERENCE", self.codes(root))

    def test_rejects_e2_without_locator(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "evidence/backend.md",
                """
                # Backend Evidence
                ## Audit Metadata
                ## Evidence Records
                ### CAP-CUR-BE-001
                - Evidence Level: E2 - Implementation Verified
                - Commit: abc1234
                - Evidence Locator:
                - Reviewer: reviewer
                - Review Date: 2026-10-01
                - Environment: local
                - Verification: code inspection
                - Limitations: tests not run
                ## Limitations
                """,
            )

            self.assertIn("EVIDENCE_LOCATOR", self.codes(root))

    def test_rejects_evidence_record_without_legacy_claims(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "evidence/backend.md",
                """
                # Backend Evidence
                ## Audit Metadata
                ## Evidence Records
                ### CAP-CUR-BE-001
                - Summary: backend endpoint evidence
                - Evidence Level: E1 - Documented Claim
                - Contract: endpoint contract
                - Evidence Locator: docs/current.md#endpoint
                - Verification: documentation review
                - Limitations: runtime not executed
                ## Limitations
                """,
            )

            self.assertIn("MISSING_EVIDENCE_FIELD", self.codes(root))

    def test_rejects_target_requirement_marked_implemented(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "PRD.md",
                """
                # PRD
                ## Executive Summary
                ## Product Scope
                ## Functional Requirements
                | `CAP-TGT-001` | Implemented |
                | `PRD-FR-001` | Implemented |
                ## Non-Functional Requirements
                | `PRD-NFR-001` | Proposed |
                ## Testing Strategy
                ## Degradation
                ## References
                """,
            )

            self.assertIn("TARGET_IMPLEMENTED", self.codes(root))

    def test_rejects_target_spec_without_degradation_requirement(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "PRD.md",
                """
                # PRD
                ## Target Requirements
                ### CAP-TGT-001
                - Status: Proposed
                """,
            )

            self.assertIn("MISSING_DEGRADATION", self.codes(root))

    def test_rejects_conflict_without_disposition(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "evidence/legacy-document-conflicts.md",
                """
                # Legacy Conflicts
                ## Conflict Records
                ### DOC-CONFLICT-001
                - Claim A: legacy authentication is global
                - Claim B: current routes are unauthenticated
                """,
            )

            self.assertIn("CONFLICT_DISPOSITION", self.codes(root))

    def test_policy_artifact_is_not_capability_evidence(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "CONTRIBUTING.md",
                """
                # Authoring Contract
                ## Artifact Taxonomy
                ## Stable IDs and Statuses
                ## Evidence Contract
                ## Authoring Workflow
                - Evidence Level: E2 - Implementation Verified
                """,
            )

            errors = validate_product_docs(root)

            self.assertNotIn("EVIDENCE_LOCATOR", {error.code for error in errors})

    def test_complete_mode_requires_canonical_artifacts(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)

            errors = validate_product_docs(root, complete=True)

            self.assertTrue(any(error.code == "COMPLETE_ARTIFACT" for error in errors))

    def test_accepts_minimal_complete_document_set(self) -> None:
        with self.fixture() as directory:
            root = Path(directory)
            self.write(
                root,
                "PRD.md",
                """
                # PRD
                ## Executive Summary
                ## Product Scope
                ## Functional Requirements
                | `CAP-TGT-001` | Proposed |
                | `PRD-FR-001` | Proposed |
                ## Non-Functional Requirements
                | `PRD-NFR-001` | Proposed |
                ## Testing Strategy
                ## Degradation
                ## References
                """,
            )
            self.write(
                root,
                "CURRENT_STATE_BASELINE.md",
                """
                # Current-State Baseline
                ## Method
                ## Capability Inventory
                ## Limitations
                """,
            )
            self.write(
                root,
                "CAPABILITY_GAP_MAP.md",
                """
                # Capability Gap Map
                ## Gap Map
                ## Traceability
                | `CAP-TGT-001` | `PRD-FR-001` | `EPIC-001` |
                """,
            )
            self.write(root, "README.md", "# Product Documentation\n")
            self.write(root.parent, "README.md", "# Documentation\n")

            epic_sections = [
                "Outcome",
                "Problem",
                "Scope",
                "Out of Scope",
                "Requirements",
                "Dependencies",
                "Risks",
                "Success Evidence",
                "Story Plan",
            ]
            for number in range(11):
                epic_id = f"EPIC-{number:03d}"
                body = f"# {epic_id} Outcome\n" + "\n".join(
                    f"## {section}\n- recorded" for section in epic_sections
                )
                self.write(root, f"epics/{epic_id}-outcome.md", body)

            story_sections = [
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
            ]
            for number in range(1, 7):
                story_id = f"STORY-000-{number:02d}"
                body = f"# {story_id} Verification\n" + "\n".join(
                    f"## {section}\n- recorded" for section in story_sections
                )
                self.write(
                    root,
                    f"stories/EPIC-000/{story_id}-verification.md",
                    body,
                )

            errors = validate_product_docs(root, complete=True)

            self.assertEqual([], errors)


if __name__ == "__main__":
    unittest.main()
