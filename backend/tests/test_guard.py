"""D7 guard tests: every rejection rule, plus the things that must stay reachable."""

import os

import pytest

from app.guard import Guard

ALLOWED = [
    "entities/personal/about.md",
    "connectors/gmail.md",
    "modules/demo/run.py",
    "pipelines/example.md",
    "state/schema/001.sql",
    "intake/README.md",
    "intake/note.txt",
    "state/image.png",
    "entities",
    "entities/personal",
    "entities/personal/",
]

REJECTED = [
    # outside the six sections
    "secret.md",
    "README.md",
    "outside/leak.md",
    "",
    "entities/../secret.md",
    "entities/personal/../../secret.md",
    "../aios/entities/personal/about.md",
    "entities/personal/../../../etc/passwd",
    # dotfiles and dot directories
    ".env",
    ".git/HEAD",
    ".claude/settings.json",
    "entities/.hidden.md",
    "entities/.private/notes.md",
    "entities/personal/.env",
    "intake/.env.local",
    "entities/./personal/about.md",
    "entities/personal/.",
    # traversal spellings
    "..",
    "entities/..",
    "entities//personal/about.md",
    # absolute, drive, backslash, NUL
    "/etc/passwd",
    "/aios/entities/personal/about.md",
    "C:/Windows/win.ini",
    "c:secret.md",
    "entities\\personal\\about.md",
    "entities\\..\\secret.md",
    "entities/personal/about.md\x00.png",
    # raw and databases
    "intake/raw",
    "intake/raw/x.txt",
    "intake/raw/anything/deeper.txt",
    "INTAKE/raw/x.txt",
    "intake/RAW/x.txt",
    "state/aios.sqlite",
    "state/AIOS.SQLITE",
    "state/aios.sqlite-wal",
    "state/aios.sqlite-shm",
    "state/other.db",
    "state/other.DB",
    "Entities/personal/about.md",  # sections are matched exactly
]


@pytest.fixture()
def guard(brain):
    return Guard(str(brain))


@pytest.mark.parametrize("rel", ALLOWED)
def test_allowed(guard, brain, rel):
    real = guard.resolve(rel)
    assert real is not None
    assert os.path.exists(real)


@pytest.mark.parametrize("rel", REJECTED)
def test_rejected(guard, rel):
    assert guard.resolve(rel) is None


def test_fixture_really_contains_the_forbidden_things(brain):
    """Guards the guard tests: if the fixture lost these, the rejections above would prove nothing."""
    for rel in [".env", "secret.md", "intake/raw/x.txt", "state/aios.sqlite", "entities/.hidden.md", "state/other.db"]:
        assert os.path.exists(brain / rel), rel


def test_symlink_escaping_root_rejected(guard, brain, tmp_path):
    outside = tmp_path / "elsewhere.md"
    outside.write_text("outside the brain")
    os.symlink(outside, brain / "entities" / "link.md")
    assert guard.resolve("entities/link.md") is None


def test_symlink_dir_escaping_root_rejected(guard, brain, tmp_path):
    d = tmp_path / "elsewhere"
    d.mkdir()
    (d / "x.md").write_text("x")
    os.symlink(d, brain / "entities" / "linkdir")
    assert guard.resolve("entities/linkdir") is None
    assert guard.resolve("entities/linkdir/x.md") is None


def test_symlink_inside_root_to_forbidden_rejected(guard, brain):
    os.symlink(brain / "intake" / "raw" / "x.txt", brain / "entities" / "to-raw.txt")
    os.symlink(brain / ".env", brain / "entities" / "to-env.txt")
    os.symlink(brain / "state" / "aios.sqlite", brain / "entities" / "to-db.txt")
    os.symlink(brain / "secret.md", brain / "entities" / "to-secret.md")
    for name in ["to-raw.txt", "to-env.txt", "to-db.txt", "to-secret.md"]:
        assert guard.resolve(f"entities/{name}") is None, name


def test_symlink_inside_root_to_allowed_is_fine(guard, brain):
    os.symlink(brain / "pipelines" / "example.md", brain / "entities" / "alias.md")
    assert guard.resolve("entities/alias.md") is not None


def test_section_symlinked_out_rejected(tmp_path):
    root = tmp_path / "root"
    root.mkdir()
    out = tmp_path / "out"
    out.mkdir()
    (out / "a.md").write_text("a")
    os.symlink(out, root / "entities")
    assert Guard(str(root)).resolve("entities/a.md") is None
    assert Guard(str(root)).resolve("entities") is None
