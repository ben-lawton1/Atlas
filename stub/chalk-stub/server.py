"""Stub Chalk for Atlas's tests: an in-memory library with the write endpoints Atlas proxies (D21),
and an embed page that speaks the Chalk side of D13 (index.html)."""

import json
import os
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
LOCK = threading.Lock()
NEXT_ID = [1]

# Notebooks keep their sections, sections keep their pages (dicts like Chalk's /api/library).
NOTEBOOKS = [{
    "name": "Stub Notebook",
    "sections": [{
        "name": "Stub Section",
        "pages": [
            {"id": "p1", "name": "Page One", "version": 1, "updatedAt": "2026-10-30T10:00:00.000Z"},
            {"id": "p2", "name": "Page Two", "version": 1, "updatedAt": "2026-10-31T10:00:00.000Z"},
        ],
    }],
}]


class HttpError(Exception):
    def __init__(self, code, detail):
        self.code, self.detail = code, detail


def library():
    return {
        "path": "stub-library",
        "notebooks": [{
            "name": nb["name"],
            "sections": [{
                "name": s["name"],
                "pages": [dict(p, notebook=nb["name"], section=s["name"]) for p in s["pages"]],
            } for s in nb["sections"]],
        } for nb in NOTEBOOKS],
    }


def clean(name):
    if not isinstance(name, str) or not name.strip():
        raise HttpError(422, [{"loc": ["body", "name"], "msg": "name must not be empty"}])
    return name.strip()[:120]


def unique(name, taken):
    """Chalk suffixes a clashing name; so does the stub."""
    if name not in taken:
        return name
    n = 2
    while f"{name} {n}" in taken:
        n += 1
    return f"{name} {n}"


def find_nb(name):
    for nb in NOTEBOOKS:
        if nb["name"] == name:
            return nb
    raise HttpError(404, "Notebook not found")


def find_sec(nb, name):
    for s in nb["sections"]:
        if s["name"] == name:
            return s
    raise HttpError(404, "Section not found")


def find_page(pid):
    for nb in NOTEBOOKS:
        for s in nb["sections"]:
            for p in s["pages"]:
                if p["id"] == pid:
                    return nb, s, p
    raise HttpError(404, "Board not found")


def route(method, path, body):
    """Returns (status, json-able or None)."""
    seg = [unquote(s) for s in path.strip("/").split("/")]
    if seg[:2] == ["api", "library"] and method == "GET":
        return 200, library()
    if seg[:2] == ["api", "notebooks"]:
        rest = seg[2:]
        if not rest and method == "POST":
            name = unique(clean(body.get("name")), [n["name"] for n in NOTEBOOKS])
            NOTEBOOKS.append({"name": name, "sections": []})
            return 201, {"name": name}
        if len(rest) == 1 and method in ("PUT", "DELETE"):
            nb = find_nb(rest[0])
            if method == "DELETE":
                NOTEBOOKS.remove(nb)
                return 204, None
            nb["name"] = unique(clean(body.get("name")), [n["name"] for n in NOTEBOOKS if n is not nb])
            return 200, {"name": nb["name"]}
        if len(rest) == 2 and rest[1] == "sections" and method == "POST":
            nb = find_nb(rest[0])
            name = unique(clean(body.get("name")), [s["name"] for s in nb["sections"]])
            nb["sections"].append({"name": name, "pages": []})
            return 201, {"name": name}
        if len(rest) == 3 and rest[1] == "sections" and method in ("PUT", "DELETE"):
            nb = find_nb(rest[0])
            sec = find_sec(nb, rest[2])
            if method == "DELETE":
                nb["sections"].remove(sec)
                return 204, None
            sec["name"] = unique(clean(body.get("name")), [s["name"] for s in nb["sections"] if s is not sec])
            return 200, {"name": sec["name"]}
    if seg[:2] == ["api", "boards"]:
        rest = seg[2:]
        if not rest and method == "POST":
            if not body.get("notebook") or not body.get("section"):
                raise HttpError(400, "notebook and section must be given together")
            sec = find_sec(find_nb(body["notebook"]), body["section"])
            pid = f"n{NEXT_ID[0]}"
            NEXT_ID[0] += 1
            # an old updatedAt keeps new pages out of the "recent" top 8 the home test checks
            page = {"id": pid, "name": body.get("name") or "Untitled", "version": 1, "updatedAt": "2026-10-01T10:00:00.000Z"}
            sec["pages"].append(page)
            return 201, dict(page, notebook=body["notebook"], section=body["section"], scene={})
        if len(rest) == 1 and method == "PUT":
            nb, sec, p = find_page(rest[0])
            p["name"] = clean(body.get("name"))
            return 200, dict(p, notebook=nb["name"], section=sec["name"])
        if len(rest) == 1 and method == "DELETE":
            nb, sec, p = find_page(rest[0])
            sec["pages"].remove(p)
            return 204, None
    raise HttpError(404, "not found")


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _api(self, method):
        path = self.path.split("?", 1)[0]
        body = {}
        n = int(self.headers.get("Content-Length") or 0)
        if n:
            try:
                body = json.loads(self.rfile.read(n))
            except ValueError:
                body = {}
        try:
            with LOCK:
                status, payload = route(method, path, body if isinstance(body, dict) else {})
        except HttpError as err:
            status, payload = err.code, {"detail": err.detail}
        data = b"" if payload is None else json.dumps(payload).encode()
        self._send(status, data, "application/json")

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if re.match(r"^/api/", path):
            self._api("GET")
        elif path == "/":
            with open(os.path.join(HERE, "index.html"), "rb") as fh:
                self._send(200, fh.read(), "text/html; charset=utf-8")
        else:
            self._send(404, b"not found", "text/plain")

    def do_POST(self):
        self._api("POST")

    def do_PUT(self):
        self._api("PUT")

    def do_DELETE(self):
        self._api("DELETE")

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8081), Handler).serve_forever()
