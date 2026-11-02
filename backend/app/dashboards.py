"""Read-only dashboard endpoints (D37): /api/calendar, /api/portfolio, /api/briefing.

Until a connector exists they return empty data with `connected: false`. Connectors plug in as
sources (the protocols below) passed to `build_router`; the response shapes never change.
"""

from datetime import date, timedelta
from typing import Any, Literal, Protocol

from fastapi import APIRouter, Query

Range = Literal["1D", "1W", "1M", "1Y", "ALL"]
Item = dict[str, Any]  # CalendarItem, see the contract in D37


class CalendarSource(Protocol):
    name: str

    def items(self, start: date, days: int) -> list[Item]: ...


class PortfolioSource(Protocol):
    name: str

    def snapshot(self, range: Range) -> dict[str, Any]: ...  # any of the portfolio fields except connected/sources/range


class BriefingSource(Protocol):
    name: str

    def briefing(self) -> dict[str, Any]: ...  # any of generatedAt, summary, upNext, suggestions


def _sort_key(item: Item) -> tuple[str, str]:
    return (item["date"], item.get("time") or "99:99")


def build_router(
    calendar: list[CalendarSource] | None = None,
    portfolio: list[PortfolioSource] | None = None,
    briefing: list[BriefingSource] | None = None,
) -> APIRouter:
    calendar, portfolio, briefing = calendar or [], portfolio or [], briefing or []
    router = APIRouter()

    @router.get("/api/calendar")
    def get_calendar(start: date = Query(...), days: int = Query(7, ge=1, le=42)) -> dict:
        end = (start + timedelta(days=days - 1)).isoformat()
        merged: list[Item] = []
        for src in calendar:
            merged.extend(i for i in src.items(start, days) if start.isoformat() <= i["date"] <= end)
        merged.sort(key=_sort_key)
        return {
            "connected": bool(calendar),
            "sources": [s.name for s in calendar],
            "start": start.isoformat(),
            "days": days,
            "items": merged,
        }

    @router.get("/api/portfolio")
    def get_portfolio(range: Range = Query("1M")) -> dict:
        out: dict[str, Any] = {
            "connected": bool(portfolio), "sources": [s.name for s in portfolio], "asOf": None,
            "currency": "USD", "range": range, "total": None, "dayChange": None, "totalChange": None,
            "history": [], "holdings": [],
        }
        taken: set[str] = set()
        for src in portfolio:  # first source to supply a field wins
            for key, value in src.snapshot(range).items():
                if key in out and key not in ("connected", "sources", "range") and key not in taken:
                    out[key] = value
                    taken.add(key)
        return out

    @router.get("/api/briefing")
    def get_briefing() -> dict:
        out: dict[str, Any] = {
            "connected": bool(briefing), "generatedAt": None, "summary": None, "upNext": [], "suggestions": [],
        }
        taken: set[str] = set()
        for src in briefing:
            for key, value in src.briefing().items():
                if key in out and key != "connected" and key not in taken:
                    out[key] = value
                    taken.add(key)
        return out

    return router
