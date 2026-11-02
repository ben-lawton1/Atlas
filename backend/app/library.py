"""Server-side proxy to Chalk's GET /api/library (the browser never calls Chalk's API via Atlas directly)."""

import json
import urllib.error
import urllib.request
from typing import Any

TIMEOUT_S = 3.0


class ChalkUnavailable(Exception):
    pass


def fetch_library(chalk_api_url: str) -> Any:
    url = chalk_api_url.rstrip("/") + "/api/library"
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_S) as resp:  # noqa: S310 - url is operator config
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise ChalkUnavailable(f"Chalk isn't reachable at {chalk_api_url} ({type(exc).__name__})") from exc
