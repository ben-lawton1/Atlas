import json
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from fastapi.testclient import TestClient

from app.brain import MAX_BYTES
from app.main import create_app

SECTIONS = ["entities", "connectors", "modules", "pipelines", "state", "intake"]


def walk(nodes):
    for n in nodes:
        yield n
        if n["type"] == "dir":
            yield from walk(n["children"])


def test_health_and_config(client, monkeypatch):
    assert client.get("/api/health").json() == {"status": "ok"}
    cfg = client.get("/api/config").json()
    assert set(cfg) == {"chalkPublicUrl", "brainLabel", "terminalUrl"}
    assert cfg["chalkPublicUrl"] == "http://localhost:8080"


def test_config_from_env(brain, monkeypatch):
    monkeypatch.setenv("CHALK_PUBLIC_URL", "http://chalk.test:1234")
    monkeypatch.setenv("ATLAS_BRAIN_LABEL", "C:/brain")
    c = TestClient(create_app(brain_dir=str(brain), static_dir=""))
    assert c.get("/api/config").json() == {
        "chalkPublicUrl": "http://chalk.test:1234",
        "brainLabel": "C:/brain",
        "terminalUrl": "http://127.0.0.1:7681",
    }


def test_unknown_api_is_json_404(client):
    r = client.get("/api/nope")
    assert r.status_code == 404
    assert r.json() == {"detail": "Not found"}


def test_tree_sections_in_order(client):
    tree = client.get("/api/atlas/tree").json()
    assert [s["name"] for s in tree["sections"]] == SECTIONS
    assert all(s["type"] == "dir" for s in tree["sections"])


def test_tree_ordering_dirs_first_then_alphabetical(client):
    entities = client.get("/api/atlas/tree").json()["sections"][0]
    personal = entities["children"][0]
    assert personal["path"] == "entities/personal"
    assert [c["name"] for c in personal["children"]] == ["about.md", "alpha.md", "zeta.md"]
    state = client.get("/api/atlas/tree").json()["sections"][4]
    names = [c["name"] for c in state["children"]]
    assert names[0] == "schema"  # directory before files
    assert names[1:] == ["image.png"]


def test_tree_dirs_before_files_in_modules(client):
    modules = client.get("/api/atlas/tree").json()["sections"][2]
    demo = modules["children"][0]
    assert [(c["name"], c["type"]) for c in demo["children"]] == [("README.md", "file"), ("run.py", "file")]


def test_tree_excludes_forbidden(client):
    tree = client.get("/api/atlas/tree").json()
    paths = {n["path"] for n in walk(tree["sections"])}
    for bad in [
        "state/aios.sqlite", "state/aios.sqlite-wal", "state/aios.sqlite-shm", "state/other.db",
        "intake/raw", "intake/raw/x.txt", "intake/.env.local", "entities/.hidden.md",
        "entities/.private", "entities/personal/.env",
    ]:
        assert bad not in paths
    assert not any("/." in p or p.startswith(".") for p in paths)
    assert "intake/README.md" in paths


def test_tree_with_missing_sections(tmp_path):
    (tmp_path / "entities").mkdir()
    c = TestClient(create_app(brain_dir=str(tmp_path), static_dir=""))
    sections = c.get("/api/atlas/tree").json()["sections"]
    assert [s["name"] for s in sections] == SECTIONS
    assert all(s["children"] == [] for s in sections)


def test_tree_hides_symlink_escapes(client, brain, tmp_path):
    outside = tmp_path / "outside.md"
    outside.write_text("x")
    os.symlink(outside, brain / "entities" / "escape.md")
    os.symlink(brain / ".env", brain / "entities" / "env-link.md")
    paths = {n["path"] for n in walk(client.get("/api/atlas/tree").json()["sections"])}
    assert "entities/escape.md" not in paths
    assert "entities/env-link.md" not in paths


def test_file_markdown(client):
    r = client.get("/api/atlas/file", params={"path": "entities/personal/about.md"})
    assert r.status_code == 200
    body = r.json()
    assert body["kind"] == "markdown"
    assert body["path"] == "entities/personal/about.md"
    assert body["content"].startswith("# Personal")
    assert body["size"] == len(body["content"].encode())
    assert body["modifiedAt"].endswith("Z")


def test_file_text_kinds(client, brain):
    for name, kind in [("run.py", "text")]:
        r = client.get("/api/atlas/file", params={"path": f"modules/demo/{name}"}).json()
        assert r["kind"] == kind and "print" in r["content"]
    assert client.get("/api/atlas/file", params={"path": "state/schema/001.sql"}).json()["kind"] == "text"
    assert client.get("/api/atlas/file", params={"path": "intake/note.txt"}).json()["kind"] == "text"
    for ext in ["json", "yaml", "yml", "toml", "js", "ts", "css", "html", "ps1", "sh"]:
        (brain / "modules" / f"f.{ext}").write_text("x")
        assert client.get("/api/atlas/file", params={"path": f"modules/f.{ext}"}).json()["kind"] == "text", ext


def test_file_unsupported_has_no_content(client):
    body = client.get("/api/atlas/file", params={"path": "state/image.png"}).json()
    assert body["kind"] == "unsupported"
    assert "content" not in body
    assert body["size"] > 0


def test_file_size_cap(client, brain):
    (brain / "intake" / "big.md").write_text("a" * MAX_BYTES)
    assert client.get("/api/atlas/file", params={"path": "intake/big.md"}).status_code == 200
    (brain / "intake" / "big.md").write_text("a" * (MAX_BYTES + 1))
    assert client.get("/api/atlas/file", params={"path": "intake/big.md"}).status_code == 413


@pytest.mark.parametrize("path", [
    ".env", "secret.md", "entities/../secret.md", "entities/personal/../../secret.md", "/etc/passwd",
    "entities\\personal\\about.md", "intake/raw/x.txt", "state/aios.sqlite", "state/aios.sqlite-wal", "state/other.db",
    "entities/.hidden.md", "intake/.env.local", "entities/personal/.env", "entities/nope.md", "entities",
    "entities/personal", "", "entities/%2e%2e/secret.md", "C:/Windows/win.ini",
])
def test_file_rejections_are_404(client, path):
    r = client.get("/api/atlas/file", params={"path": path})
    assert r.status_code == 404


def test_file_rejection_indistinguishable_from_missing(client):
    a = client.get("/api/atlas/file", params={"path": "intake/raw/x.txt"})
    b = client.get("/api/atlas/file", params={"path": "intake/raw/does-not-exist.txt"})
    assert a.status_code == b.status_code == 404
    assert a.json() == b.json()


def test_file_raw_url_traversal(client):
    # unencoded dot segments in the query string value reach the handler as-is
    r = client.get("/api/atlas/file?path=entities/personal/%2e%2e/%2e%2e/secret.md")
    assert r.status_code == 404


def test_file_symlink_escape_404(client, brain, tmp_path):
    outside = tmp_path / "outside.md"
    outside.write_text("outside")
    os.symlink(outside, brain / "entities" / "escape.md")
    assert client.get("/api/atlas/file", params={"path": "entities/escape.md"}).status_code == 404


def test_recent_orders_and_excludes(client, brain):
    now = 1_700_000_000
    for i, rel in enumerate(["entities/personal/alpha.md", "pipelines/example.md", "intake/note.txt"]):
        os.utime(brain / rel, (now + i * 100, now + i * 100))
    # forbidden files get the newest mtimes: they must still be absent
    for rel in [".env", "secret.md", "intake/raw/x.txt", "state/aios.sqlite", "entities/.hidden.md", "state/other.db",
                "state/aios.sqlite-wal", "intake/.env.local"]:
        os.utime(brain / rel, (now + 9999, now + 9999))
    for rel in ["connectors/gmail.md", "entities/personal/about.md", "entities/personal/zeta.md",
                "modules/demo/README.md", "modules/demo/run.py", "state/schema/001.sql", "state/image.png",
                "intake/README.md"]:
        os.utime(brain / rel, (now - 1000, now - 1000))
    items = client.get("/api/atlas/recent", params={"limit": 3}).json()
    assert [i["path"] for i in items] == ["intake/note.txt", "pipelines/example.md", "entities/personal/alpha.md"]
    assert set(items[0]) == {"path", "name", "modifiedAt", "size"}
    everything = {i["path"] for i in client.get("/api/atlas/recent", params={"limit": 100}).json()}
    assert not {".env", "secret.md", "intake/raw/x.txt", "state/aios.sqlite", "entities/.hidden.md", "state/other.db",
                "state/aios.sqlite-wal", "intake/.env.local", "outside/leak.md"} & everything


def test_recent_default_limit_and_validation(client):
    assert len(client.get("/api/atlas/recent").json()) <= 8
    assert client.get("/api/atlas/recent", params={"limit": 0}).status_code == 422


# ---- Chalk library proxy ------------------------------------------------

LIBRARY = {"path": "x", "notebooks": [{"name": "NB", "sections": [{"name": "S", "pages": [
    {"id": "p1", "name": "One", "version": 1, "updatedAt": "2026-01-01T00:00:00.000Z", "notebook": "NB", "section": "S"}]}]}]}


@pytest.fixture()
def fake_chalk():
    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/api/library":
                data = json.dumps(LIBRARY).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, *a):
            pass

    srv = HTTPServer(("127.0.0.1", 0), H)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{srv.server_port}"
    srv.shutdown()


def test_library_proxy_success(brain, fake_chalk):
    c = TestClient(create_app(brain_dir=str(brain), static_dir="", chalk_api_url=fake_chalk))
    r = c.get("/api/notes/library")
    assert r.status_code == 200
    assert r.json() == LIBRARY


def test_library_proxy_unreachable_is_502(client):
    r = client.get("/api/notes/library")
    assert r.status_code == 502
    assert "reachable" in r.json()["detail"]


def test_library_proxy_non_json_is_502(brain):
    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"<html>not json</html>")

        def log_message(self, *a):
            pass

    srv = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        c = TestClient(create_app(brain_dir=str(brain), static_dir="", chalk_api_url=f"http://127.0.0.1:{srv.server_port}"))
        assert c.get("/api/notes/library").status_code == 502
    finally:
        srv.shutdown()


# ---- SPA fallback -------------------------------------------------------

def test_spa_fallback(brain, tmp_path):
    static = tmp_path / "static"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text("<html>spa</html>")
    (static / "assets" / "a.js").write_text("console.log(1)")
    c = TestClient(create_app(brain_dir=str(brain), static_dir=str(static)))
    for p in ["/", "/atlas/entities/personal/about.md", "/notes/abc123"]:
        r = c.get(p)
        assert r.status_code == 200 and "spa" in r.text
        assert r.headers["cache-control"] == "no-cache"
    r = c.get("/assets/a.js")
    assert "console.log" in r.text and "immutable" in r.headers["cache-control"]
    assert c.get("/api/nope").status_code == 404
    assert "root:" not in c.get("/..%2f..%2fetc/passwd").text
