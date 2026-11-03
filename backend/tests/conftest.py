import os
import shutil

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "aios")


@pytest.fixture()
def brain(tmp_path):
    """A throwaway copy of the fixture brain (so tests may add symlinks / set mtimes)."""
    dest = tmp_path / "aios"
    shutil.copytree(FIXTURE, dest)
    return dest


@pytest.fixture()
def client(brain):
    return TestClient(create_app(brain_dir=str(brain), static_dir=""))
