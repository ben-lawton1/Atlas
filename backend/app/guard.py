"""D7 guard: the only code that decides which brain paths Atlas may expose.

Every route that touches the brain MUST go through `Guard`. Do not weaken it.
Rejected paths all look the same to callers (None / False), so a 404 never reveals existence.
"""

import os
import re

SECTIONS = ("entities", "connectors", "modules", "pipelines", "state", "intake")

# Directories never descended into by the tree/recent walks (noise, not secrets).
SKIP_DIRS = {"node_modules", "__pycache__"}

_DRIVE = re.compile(r"^[A-Za-z]:")


def _segments_ok(segments: list[str]) -> bool:
    """Pure, name-based checks on already-split relative segments."""
    if not segments or segments[0] not in SECTIONS:
        return False
    for seg in segments:
        if seg in ("", ".", "..") or seg.startswith("."):
            return False
    low = [s.lower() for s in segments]
    if low[0] == "intake" and len(low) > 1 and low[1] == "raw":
        return False
    # Any segment (file or dir) that looks like a database or env file is refused.
    for seg in low:
        if seg.endswith((".sqlite", ".db")) or ".sqlite-" in seg or ".db-" in seg or seg.startswith(".env"):
            return False
    return True


class Guard:
    def __init__(self, root: str) -> None:
        self.root = os.path.realpath(root)

    @staticmethod
    def split(rel: str) -> list[str] | None:
        """Split a client-supplied relative path, or None when it is malformed."""
        if not isinstance(rel, str) or not rel or "\x00" in rel or "\\" in rel:
            return None
        if rel.startswith("/") or _DRIVE.match(rel):
            return None
        segs = rel.split("/")
        if segs[-1] == "":  # tolerate one trailing slash on directories
            segs = segs[:-1]
        return segs

    def resolve(self, rel: str) -> str | None:
        """Absolute real path for `rel` if (and only if) it may be exposed, else None.

        Name checks first, then realpath must stay inside the root (defeats symlinks), then the
        real location is name-checked again so a symlink cannot lead into intake/raw, a .env, etc.
        """
        segs = self.split(rel)
        if segs is None or not _segments_ok(segs):
            return None
        real = os.path.realpath(os.path.join(self.root, *segs))
        try:
            if real == self.root or os.path.commonpath([self.root, real]) != self.root:
                return None
        except ValueError:
            return None
        back = os.path.relpath(real, self.root).replace(os.sep, "/").split("/")
        if not _segments_ok(back):
            return None
        return real
