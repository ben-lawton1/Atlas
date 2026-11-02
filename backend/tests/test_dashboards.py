import pytest
from fastapi.testclient import TestClient

from app.main import create_app


class FakeCal:
    def __init__(self, name, items):
        self.name, self._items = name, items

    def items(self, start, days):
        return self._items


class FakePortfolio:
    name = "Broker"

    def snapshot(self, range):
        return {"total": 100.0, "asOf": "2026-11-02T00:00:00Z", "holdings": [{"symbol": "X"}], "bogus": 1}


class FakeBriefing:
    name = "Claude"

    def briefing(self):
        return {"summary": "Hi", "generatedAt": "2026-11-02T07:00:00Z"}


def item(id, date, time):
    return {"id": id, "title": id, "date": date, "time": time, "durationMin": None, "kind": "event", "tag": None,
            "done": None, "subtasks": [], "source": "fake", "location": None}


def make(brain, **sources):
    return TestClient(create_app(brain_dir=str(brain), static_dir="", chalk_api_url="http://127.0.0.1:9",
                                 dashboard_sources=sources))


def test_calendar_default(client):
    r = client.get("/api/calendar?start=2026-11-02")
    assert r.status_code == 200
    assert r.json() == {"connected": False, "sources": [], "start": "2026-11-02", "days": 7, "items": []}


def test_portfolio_default(client):
    assert client.get("/api/portfolio").json() == {
        "connected": False, "sources": [], "asOf": None, "currency": "USD", "range": "1M", "total": None,
        "dayChange": None, "totalChange": None, "history": [], "holdings": []}


def test_briefing_default(client):
    assert client.get("/api/briefing").json() == {
        "connected": False, "generatedAt": None, "summary": None, "upNext": [], "suggestions": []}


@pytest.mark.parametrize("qs", [
    "start=nope", "start=2026-13-40", "", "start=2026-11-02&days=0", "start=2026-11-02&days=43",
    "start=2026-11-02&days=x",
])
def test_calendar_validation(client, qs):
    assert client.get("/api/calendar?" + qs).status_code == 422


def test_portfolio_bad_range(client):
    assert client.get("/api/portfolio?range=5Y").status_code == 422
    assert client.get("/api/portfolio?range=ALL").json()["range"] == "ALL"


def test_calendar_start_normalized_and_days_echo(client):
    j = client.get("/api/calendar?start=2026-11-05T00:00:00&days=42").json()
    assert j["start"] == "2026-11-05" and j["days"] == 42


def test_writes_not_allowed(client):
    for path in ("/api/calendar", "/api/portfolio", "/api/briefing"):
        assert client.post(path).status_code in (404, 405)
        assert client.delete(path).status_code in (404, 405)


def test_calendar_providers_merged_sorted_windowed(brain):
    a = FakeCal("Google", [item("b", "2026-11-03", "09:00"), item("far", "2026-11-20", "09:00"),
                           item("allday", "2026-11-03", None)])
    b = FakeCal("Outlook", [item("a", "2026-11-03", "08:00"), item("early", "2026-11-01", "08:00"),
                            item("first", "2026-11-02", "23:00")])
    j = make(brain, calendar=[a, b]).get("/api/calendar?start=2026-11-02&days=7").json()
    assert j["connected"] is True and j["sources"] == ["Google", "Outlook"]
    assert [i["id"] for i in j["items"]] == ["first", "a", "b", "allday"]


def test_portfolio_and_briefing_providers(brain):
    c = make(brain, portfolio=[FakePortfolio()], briefing=[FakeBriefing()])
    p = c.get("/api/portfolio?range=1W").json()
    assert p["connected"] is True and p["sources"] == ["Broker"] and p["range"] == "1W"
    assert p["total"] == 100.0 and p["holdings"] == [{"symbol": "X"}] and "bogus" not in p
    b = c.get("/api/briefing").json()
    assert b["connected"] is True and b["summary"] == "Hi" and b["upNext"] == []
