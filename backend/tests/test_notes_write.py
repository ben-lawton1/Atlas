"""Slice 7: the notes write proxy (D21) and the Origin/JSON guard (D22), against a fake Chalk on a local port."""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

ORIGIN = "http://localhost:8090"


class FakeChalk:
    def __init__(self):
        self.calls: list[tuple[str, str, object]] = []
        self.reply: tuple[int, object] = (200, {"name": "ok"})
        outer = self

        class H(BaseHTTPRequestHandler):
            def _do(self):
                n = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(n) if n else b""
                outer.calls.append((self.command, self.path, json.loads(raw) if raw else None))
                status, body = outer.reply
                payload = b"" if body is None else json.dumps(body).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            do_POST = do_PUT = do_DELETE = _do

            def log_message(self, *a):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


@pytest.fixture()
def chalk():
    c = FakeChalk()
    yield c
    c.close()


@pytest.fixture()
def api(chalk, brain):
    return TestClient(create_app(brain_dir=str(brain), static_dir="", chalk_api_url=chalk.url))


H = {"Origin": ORIGIN}


def test_create_notebook(api, chalk):
    chalk.reply = (201, {"name": "Work"})
    r = api.post("/api/notes/notebooks", json={"name": "Work"}, headers=H)
    assert (r.status_code, r.json()) == (201, {"name": "Work"})
    assert chalk.calls == [("POST", "/api/notebooks", {"name": "Work"})]


def test_rename_and_delete_notebook_encode_path(api, chalk):
    chalk.reply = (200, {"name": "B c"})
    assert api.put("/api/notes/notebooks/A%20b%3F", json={"name": "B c"}, headers=H).status_code == 200
    chalk.reply = (204, None)
    r = api.delete("/api/notes/notebooks/A%20b%3F", headers=H)
    assert r.status_code == 204 and r.content == b""
    assert chalk.calls[0] == ("PUT", "/api/notebooks/A%20b%3F", {"name": "B c"})
    assert chalk.calls[1] == ("DELETE", "/api/notebooks/A%20b%3F", None)


def test_sections(api, chalk):
    chalk.reply = (201, {"name": "S"})
    assert api.post("/api/notes/notebooks/N/sections", json={"name": "S"}, headers=H).status_code == 201
    chalk.reply = (200, {"name": "T"})
    assert api.put("/api/notes/notebooks/N/sections/S%20s", json={"name": "T"}, headers=H).status_code == 200
    chalk.reply = (204, None)
    assert api.delete("/api/notes/notebooks/N/sections/S%20s", headers=H).status_code == 204
    assert chalk.calls == [
        ("POST", "/api/notebooks/N/sections", {"name": "S"}),
        ("PUT", "/api/notebooks/N/sections/S%20s", {"name": "T"}),
        ("DELETE", "/api/notebooks/N/sections/S%20s", None),
    ]


def test_create_board_only_allowed_fields_and_scene_stripped(api, chalk):
    chalk.reply = (201, {"id": "b1", "name": "P", "version": 1, "notebook": "N", "section": "S", "scene": {"big": 1}})
    r = api.post(
        "/api/notes/boards",
        json={"name": "P", "notebook": "N", "section": "S", "scene": {"elements": [1]}, "baseVersion": 3, "x": 1},
        headers=H,
    )
    assert r.status_code == 201
    assert chalk.calls == [("POST", "/api/boards", {"name": "P", "notebook": "N", "section": "S"})]
    assert "scene" not in r.json() and r.json()["id"] == "b1"


def test_rename_board_only_name(api, chalk):
    chalk.reply = (200, {"id": "b1", "name": "New", "version": 2})
    r = api.put("/api/notes/boards/b1", json={"name": "New", "scene": {}, "baseVersion": 1}, headers=H)
    assert r.status_code == 200
    assert chalk.calls == [("PUT", "/api/boards/b1", {"name": "New"})]


def test_delete_board(api, chalk):
    chalk.reply = (204, None)
    assert api.delete("/api/notes/boards/b%201", headers=H).status_code == 204
    assert chalk.calls == [("DELETE", "/api/boards/b%201", None)]


@pytest.mark.parametrize(
    "status,body",
    [
        (404, {"detail": "Board not found"}),
        (409, {"detail": "exists"}),
        (422, {"detail": [{"loc": ["body", "name"], "msg": "bad"}]}),
    ],
)
def test_chalk_errors_pass_through(api, chalk, status, body):
    chalk.reply = (status, body)
    r = api.put("/api/notes/boards/zzz", json={"name": "x"}, headers=H)
    assert (r.status_code, r.json()) == (status, body)


def test_chalk_unreachable_is_502(brain):
    app = TestClient(create_app(brain_dir=str(brain), static_dir="", chalk_api_url="http://127.0.0.1:9"))
    r = app.delete("/api/notes/boards/b1", headers=H)
    assert r.status_code == 502 and "reachable" in r.json()["detail"]


def test_missing_name_is_422_and_never_forwarded(api, chalk):
    assert api.post("/api/notes/notebooks", json={}, headers=H).status_code == 422
    assert chalk.calls == []


ALL_WRITES = [
    ("POST", "/api/notes/notebooks", {"name": "x"}),
    ("PUT", "/api/notes/notebooks/a", {"name": "x"}),
    ("DELETE", "/api/notes/notebooks/a", None),
    ("POST", "/api/notes/notebooks/a/sections", {"name": "x"}),
    ("PUT", "/api/notes/notebooks/a/sections/b", {"name": "x"}),
    ("DELETE", "/api/notes/notebooks/a/sections/b", None),
    ("POST", "/api/notes/boards", {"name": "x"}),
    ("PUT", "/api/notes/boards/i", {"name": "x"}),
    ("DELETE", "/api/notes/boards/i", None),
]


@pytest.mark.parametrize("method,path,body", ALL_WRITES)
def test_guard_rejects_bad_and_missing_origin(api, chalk, method, path, body):
    for headers in ({"Origin": "http://evil.example"}, {}, {"Origin": "http://localhost:8091"}, {"Origin": "null"}):
        r = api.request(method, path, json=body, headers=headers)
        assert r.status_code == 403, (headers, r.status_code)
    assert chalk.calls == []


@pytest.mark.parametrize("method,path,body", [w for w in ALL_WRITES if w[0] != "DELETE"])
def test_guard_rejects_non_json_content_type(api, chalk, method, path, body):
    for ctype in ("text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x"):
        r = api.request(method, path, content=json.dumps(body), headers={"Origin": ORIGIN, "Content-Type": ctype})
        assert r.status_code == 415, (ctype, r.status_code)
    assert api.request(method, path, content=b"{}", headers={"Origin": ORIGIN}).status_code == 415
    assert chalk.calls == []


def test_every_default_origin_allowed_and_json_charset_ok(api, chalk):
    chalk.reply = (201, {"name": "x"})
    for o in ("http://localhost:8090", "http://127.0.0.1:8090", "http://localhost:5174", "http://127.0.0.1:5174"):
        r = api.post(
            "/api/notes/notebooks",
            content='{"name":"x"}',
            headers={"Origin": o, "Content-Type": "application/json; charset=utf-8"},
        )
        assert r.status_code == 201, o


def test_origins_come_from_config(chalk, brain):
    app = TestClient(
        create_app(brain_dir=str(brain), static_dir="", chalk_api_url=chalk.url, origins="http://app-test:8000, http://other:1/")
    )
    chalk.reply = (201, {"name": "x"})
    assert app.post("/api/notes/notebooks", json={"name": "x"}, headers={"Origin": "http://app-test:8000"}).status_code == 201
    assert app.post("/api/notes/notebooks", json={"name": "x"}, headers={"Origin": "http://other:1"}).status_code == 201
    assert app.post("/api/notes/notebooks", json={"name": "x"}, headers={"Origin": ORIGIN}).status_code == 403


def test_no_cors_headers(api):
    r = api.options(
        "/api/notes/notebooks", headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "POST"}
    )
    assert "access-control-allow-origin" not in r.headers
    r = api.post("/api/notes/notebooks", json={"name": "x"}, headers=H)
    assert "access-control-allow-origin" not in r.headers


def test_config_has_terminal_url(brain):
    app = TestClient(create_app(brain_dir=str(brain), static_dir="", terminal_url="http://t:1"))
    assert app.get("/api/config").json()["terminalUrl"] == "http://t:1"
    d = TestClient(create_app(brain_dir=str(brain), static_dir=""))
    assert d.get("/api/config").json()["terminalUrl"] == "http://127.0.0.1:7681"
