"""Read-only views of the brain: tree, file preview and recent files. Never writes (D6)."""

import heapq
import os
from datetime import datetime, timezone
from typing import Any

from app.guard import SECTIONS, SKIP_DIRS, Guard

MAX_BYTES = 1024 * 1024

MARKDOWN_EXT = {".md", ".markdown"}
TEXT_EXT = {
    ".sql", ".py", ".ps1", ".sh", ".json", ".yaml", ".yml", ".txt", ".toml", ".js", ".ts", ".css", ".html",
}


def kind_of(name: str) -> str:
    ext = os.path.splitext(name)[1].lower()
    if ext in MARKDOWN_EXT:
        return "markdown"
    if ext in TEXT_EXT:
        return "text"
    return "unsupported"


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class TooLarge(Exception):
    pass


class Brain:
    def __init__(self, root: str) -> None:
        self.guard = Guard(root)

    def _entries(self, rel: str) -> list[tuple[str, bool]]:
        """Allowed children of `rel` as (name, is_dir); anything the guard rejects is simply absent."""
        real = self.guard.resolve(rel)
        if not real or not os.path.isdir(real):
            return []
        out: list[tuple[str, bool]] = []
        try:
            names = os.listdir(real)
        except OSError:
            return []
        for name in names:
            if name in SKIP_DIRS:
                continue
            child = self.guard.resolve(f"{rel}/{name}")
            if child is None:
                continue
            if os.path.isdir(child):
                out.append((name, True))
            elif os.path.isfile(child):
                out.append((name, False))
        return out

    def _dir(self, rel: str) -> list[dict[str, Any]]:
        entries = sorted(self._entries(rel), key=lambda e: (not e[1], e[0].lower(), e[0]))
        nodes: list[dict[str, Any]] = []
        for name, is_dir in entries:
            child = f"{rel}/{name}"
            if is_dir:
                nodes.append({"name": name, "path": child, "type": "dir", "children": self._dir(child)})
            else:
                nodes.append({"name": name, "path": child, "type": "file", "kind": kind_of(name)})
        return nodes

    def tree(self) -> dict[str, Any]:
        sections = []
        for s in SECTIONS:
            real = self.guard.resolve(s)
            children = self._dir(s) if real and os.path.isdir(real) else []
            sections.append({"name": s, "path": s, "type": "dir", "children": children})
        return {"sections": sections}

    def file(self, rel: str) -> dict[str, Any] | None:
        """Preview dict; None when rejected or missing (-> 404); raises TooLarge (-> 413)."""
        real = self.guard.resolve(rel)
        if not real or not os.path.isfile(real):
            return None
        st = os.stat(real)
        clean = rel.rstrip("/")
        kind = kind_of(os.path.basename(clean))
        out: dict[str, Any] = {"path": clean, "kind": kind, "size": st.st_size, "modifiedAt": iso(st.st_mtime)}
        if kind != "unsupported":
            if st.st_size > MAX_BYTES:
                raise TooLarge()
            with open(real, "rb") as fh:
                out["content"] = fh.read(MAX_BYTES + 1).decode("utf-8", errors="replace")
        return out

    def recent(self, limit: int) -> list[dict[str, Any]]:
        found: list[tuple[float, str, int]] = []

        def walk(rel: str) -> None:
            for name, is_dir in self._entries(rel):
                child = f"{rel}/{name}"
                if is_dir:
                    walk(child)
                else:
                    st = os.stat(self.guard.resolve(child) or "")
                    found.append((st.st_mtime, child, st.st_size))

        for s in SECTIONS:
            walk(s)
        top = heapq.nlargest(limit, found, key=lambda t: (t[0], t[1]))
        return [{"path": p, "name": os.path.basename(p), "modifiedAt": iso(m), "size": sz} for m, p, sz in top]
