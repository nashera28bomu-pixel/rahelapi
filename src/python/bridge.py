#!/usr/bin/env python3
"""
Cymor Movie API — Python Bridge (v2)
=====================================
Wraps moviebox_api.v2 and responds to JSON commands via stdin/stdout.

Protocol:
  Input  (stdin):  {"action": "search", "params": {"query": "avatar", "type": "movie"}}
  Output (stdout): {"success": true, "data": {...}}
"""

import sys
import json
import asyncio


def send(success, data=None, error=None):
    out = {"success": success}
    if data is not None:
        out["data"] = data
    if error is not None:
        out["error"] = error
    print(json.dumps(out, default=str), flush=True)


def to_dict(obj):
    """Recursively convert Pydantic models / dataclasses to plain dicts."""
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, (list, tuple)):
        return [to_dict(i) for i in obj]
    if isinstance(obj, dict):
        return {k: to_dict(v) for k, v in obj.items()}
    if hasattr(obj, "model_dump"):
        return to_dict(obj.model_dump())
    if hasattr(obj, "__dict__"):
        return {k: to_dict(v) for k, v in obj.__dict__.items() if not k.startswith("_")}
    return str(obj)


# ── Handlers ──────────────────────────────────────────────────────────────────

async def handle_search(params):
    from moviebox_api.v2 import MovieSearch, TVSeriesSearch

    query = params.get("query", "").strip()
    content_type = params.get("type", "all")
    if not query:
        raise ValueError("query is required")

    results = []

    if content_type in ("movie", "all"):
        try:
            ms = MovieSearch(query)
            movies = await ms.results()
            for m in (movies or []):
                d = to_dict(m)
                d["content_type"] = "movie"
                results.append(d)
        except Exception as e:
            pass  # Don't fail entirely if movies fail

    if content_type in ("series", "all"):
        try:
            ts = TVSeriesSearch(query)
            series = await ts.results()
            for s in (series or []):
                d = to_dict(s)
                d["content_type"] = "series"
                results.append(d)
        except Exception as e:
            pass

    return {"items": results, "query": query, "content_type": content_type}


async def handle_movie_details(params):
    from moviebox_api.v2 import Movie

    title = params.get("title") or params.get("query")
    year = params.get("year")
    if not title:
        raise ValueError("title is required")

    m = Movie(title, year=year)
    details = await m.get_info()
    return to_dict(details)


async def handle_series_details(params):
    from moviebox_api.v2 import TVSeries

    title = params.get("title") or params.get("query")
    year = params.get("year")
    if not title:
        raise ValueError("title is required")

    s = TVSeries(title, year=year)
    details = await s.get_info()
    return to_dict(details)


async def handle_movie_streams(params):
    from moviebox_api.v2 import Movie

    title = params.get("title") or params.get("query")
    year = params.get("year")
    quality = params.get("quality", "1080p")
    if not title:
        raise ValueError("title is required")

    m = Movie(title, year=year)
    files = await m.get_files(quality=quality)
    captions = await m.get_captions()
    return {
        "downloads": to_dict(files) if files else [],
        "captions": to_dict(captions) if captions else [],
    }


async def handle_series_streams(params):
    from moviebox_api.v2 import TVSeries

    title = params.get("title") or params.get("query")
    season = int(params.get("season", 1))
    episode = int(params.get("episode", 1))
    year = params.get("year")
    if not title:
        raise ValueError("title is required")

    s = TVSeries(title, year=year)
    files = await s.get_files(season=season, episode=episode)
    captions = await s.get_captions(season=season, episode=episode)
    return {
        "downloads": to_dict(files) if files else [],
        "captions": to_dict(captions) if captions else [],
        "season": season,
        "episode": episode,
    }


async def handle_homepage(params):
    from moviebox_api.v2 import MovieSearch, TVSeriesSearch

    movies, series = [], []
    try:
        ms = MovieSearch("the")
        movies = to_dict(await ms.results()) or []
    except:
        pass
    try:
        ts = TVSeriesSearch("the")
        series = to_dict(await ts.results()) or []
    except:
        pass

    for m in movies: m["content_type"] = "movie"
    for s in series: s["content_type"] = "series"

    return {
        "trending_movies": movies[:10],
        "trending_series": series[:10],
        "featured": (movies + series)[:6],
    }


# ── Router ────────────────────────────────────────────────────────────────────

ACTIONS = {
    "search": handle_search,
    "movie_details": handle_movie_details,
    "series_details": handle_series_details,
    "movie_streams": handle_movie_streams,
    "series_streams": handle_series_streams,
    "movie_downloads": handle_movie_streams,   # alias
    "series_downloads": handle_series_streams, # alias
    "homepage": handle_homepage,
}


async def main():
    raw = sys.stdin.read().strip()
    if not raw:
        send(False, error="No input")
        return
    try:
        cmd = json.loads(raw)
    except Exception as e:
        send(False, error=f"Invalid JSON: {e}")
        return

    action = cmd.get("action")
    params = cmd.get("params", {})

    handler = ACTIONS.get(action)
    if not handler:
        send(False, error=f"Unknown action: {action}. Valid: {list(ACTIONS)}")
        return

    try:
        result = await handler(params)
        send(True, data=result)
    except Exception as e:
        send(False, error=f"{type(e).__name__}: {e}")


if __name__ == "__main__":
    asyncio.run(main())
