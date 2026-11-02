"""Stub Chalk for Atlas's tests: GET /api/library and an embed page that speaks the Chalk side of D13."""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
LIBRARY = {
    "path": "stub-library",
    "notebooks": [{
        "name": "Stub Notebook",
        "sections": [{
            "name": "Stub Section",
            "pages": [
                {"id": "p1", "name": "Page One", "version": 1, "updatedAt": "2026-10-30T10:00:00.000Z",
                 "notebook": "Stub Notebook", "section": "Stub Section"},
                {"id": "p2", "name": "Page Two", "version": 1, "updatedAt": "2026-10-31T10:00:00.000Z",
                 "notebook": "Stub Notebook", "section": "Stub Section"},
            ],
        }],
    }],
}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/library":
            self._send(200, json.dumps(LIBRARY).encode(), "application/json")
        elif path == "/":
            with open(os.path.join(HERE, "index.html"), "rb") as fh:
                self._send(200, fh.read(), "text/html; charset=utf-8")
        else:
            self._send(404, b"not found", "text/plain")

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8081), Handler).serve_forever()
