# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Skill loading. A skill is a directory holding ``SKILL.md``: YAML frontmatter with
``name`` and ``description``, then the instructions. The static prompt carries the index
and ``load_skill`` returns a body on demand.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from commerce_common.locale import get_locale, t


@dataclass(frozen=True)
class Skill:
    name: str
    description: str
    body: str
    # commerce-agents-zh: Chinese copies. Empty falls back to the upstream English text.
    description_zh: str = ""
    body_zh: str = ""


class SkillLoadError(ValueError):
    pass


def parse_skill_md(text: str, path: Path | None = None) -> Skill:
    if not text.startswith("---"):
        raise SkillLoadError(f"{path or 'SKILL.md'}: missing YAML frontmatter")
    try:
        _, frontmatter, body = text.split("---", 2)
    except ValueError as exc:
        raise SkillLoadError(f"{path or 'SKILL.md'}: malformed frontmatter fences") from exc
    meta = yaml.safe_load(frontmatter) or {}
    name = meta.get("name")
    description = meta.get("description")
    if not name or not description:
        raise SkillLoadError(f"{path or 'SKILL.md'}: frontmatter needs `name` and `description`")
    description_zh = str(meta.get("description_zh") or description).strip()
    body_zh = (meta.get("body_zh") or "").strip()
    return Skill(
        name=str(name),
        description=str(description).strip(),
        body=body.strip(),
        description_zh=description_zh,
        body_zh=body_zh,
    )


def load_skill_dir(skill_dir: Path) -> Skill:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        raise SkillLoadError(f"{skill_dir}: no SKILL.md found")
    return parse_skill_md(skill_md.read_text(encoding="utf-8"), path=skill_md)


def load_skills(skills_root: Path) -> list[Skill]:
    """Every skill directory under ``skills_root``; names must be unique."""
    skills = [
        load_skill_dir(child)
        for child in sorted(skills_root.iterdir())
        if child.is_dir() and (child / "SKILL.md").exists()
    ]
    names = [skill.name for skill in skills]
    duplicates = {name for name in names if names.count(name) > 1}
    if duplicates:
        raise SkillLoadError(f"duplicate skill names: {sorted(duplicates)}")
    return skills


class SkillRegistry:
    """The loaded skills, sorted by name so the index renders the same bytes every time."""

    def __init__(self, skills: list[Skill]):
        self._skills = sorted(skills, key=lambda skill: skill.name)
        self._by_name = {skill.name: skill for skill in self._skills}

    @classmethod
    def from_dir(cls, skills_root: Path) -> SkillRegistry:
        return cls(load_skills(skills_root))

    @property
    def names(self) -> list[str]:
        return [skill.name for skill in self._skills]

    def index_block(self) -> str:
        if not self._skills:
            return "(no skills installed)"
        return "\n".join(
            f"- `{skill.name}` — {t(skill.description, skill.description_zh)}"
            for skill in self._skills
        )

    def get_instructions(self, name: str) -> str | None:
        skill = self._by_name.get(name)
        if skill is None:
            return None
        # Chinese edition: in the zh locale, serve the Chinese body when one exists.
        if get_locale() == "zh" and skill.body_zh:
            return skill.body_zh
        return skill.body
