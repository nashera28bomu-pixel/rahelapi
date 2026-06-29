#!/usr/bin/env python3
"""
Cymor Movie API — Python Bridge
=================================
Auto-detects available moviebox_api version and uses correct class names.
Sends JSON commands via stdin, returns JSON responses via stdout.
"""

import sys
import json
import asyncio
import importlib


def send(success, data=None, error=None):
    out = {"success": success}
    if data is not None:
        out["data"] = data
    if error is not None:
        out["error"] = error
    print(json.dumps(out, default=str), flush=True)


def to_dict(obj):
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


def get_v2_exports():
    """Return the actual names exported by moviebox_api.v2"""
    import moviebox_api.v2 as v2mod
    return dir(v2mod)


# ── v1 handlers (confirmed working from docs) ─────────────────────────────────

async def search_v1(query, content_type="all"):
    from moviebox_api.v1.core import Search, Session, SubjectType

    session = Session()
    results = []

    async def fetch(subject_type, label):
        try:
            s = Search(session, query=query, subject_type=subject_type, per_page=20)
            raw = await s.get_content()
            items = raw.get("items", []) if isinstance(raw, dict) else (raw or [])
            for item in items:
                d = to_dict(item)
                if isinstance(d, dict):
                    d["content_type"] = label
                    results.append(d)
        except Exception as e:
            pass  # silently skip failed type

    if content_type in ("movie", "all"):
        await fetch(SubjectType.MOVIES, "movie")
    if content_type in ("series", "all"):
        await fetch(SubjectType.TV_SERIES, "series")

    return results


async def handle_search(params):
    query = params.get("query", "").strip()
    content_type = params.get("type", "all")
    if not query:
        raise ValueError("query is required")

    # Try v2 first, fall back to v1
    exports = get_v2_exports()

    # Find search class names dynamically
    movie_search_cls = None
    series_search_cls = None
    import moviebox_api.v2 as v2mod

    for name in exports:
        lower = name.lower()
        obj = getattr(v2mod, name)
        if not isinstance(obj, type):
            continue
        if "movie" in lower and "search" in lower:
            movie_search_cls = obj
        elif ("series" in lower or "tv" in lower) and "search" in lower:
            series_search_cls = obj

    results = []

    if movie_search_cls and content_type in ("movie", "all"):
        try:
            ms = movie_search_cls(query)
            raw = await ms.results() if asyncio.iscoroutinefunction(ms.results) else ms.results()
            for item in (raw or []):
                d = to_dict(item)
                if isinstance(d, dict):
                    d["content_type"] = "movie"
                    results.append(d)
        except Exception as e:
            pass

    if series_search_cls and content_type in ("series", "all"):
        try:
            ts = series_search_cls(query)
            raw = await ts.results() if asyncio.iscoroutinefunction(ts.results) else ts.results()
            for item in (raw or []):
                d = to_dict(item)
                if isinstance(d, dict):
                    d["content_type"] = "series"
                    results.append(d)
        except Exception as e:
            pass

    # Fall back to v1 if v2 gave nothing
    if not results:
        results = await search_v1(query, content_type)

    return {"items": results, "query": query, "content_type": content_type}


async def handle_movie_streams(params):
    from moviebox_api.v1 import MovieDetails, DownloadableMovieFilesDetail, Session
    from moviebox_api.v1.core import Search, SubjectType

    title = params.get("title") or params.get("query")
    if not title:
        raise ValueError("title is required")

    session = Session()

    # Search first to get page_url
    s = Search(session, query=title, subject_type=SubjectType.MOVIES, per_page=5)
    raw = await s.get_content()
    items = raw.get("items", []) if isinstance(raw, dict) else []
    if not items:
        return {"downloads": [], "captions": []}

    page_url = None
    for item in items:
        d = to_dict(item)
        page_url = d.get("page_url") if isinstance(d, dict) else getattr(item, "page_url", None)
        if page_url:
            break

    if not page_url:
        return {"downloads": [], "captions": []}

    md = MovieDetails(page_url, session=session)
    model = await md.get_content_model()
    dl = DownloadableMovieFilesDetail(session, model)
    dl_model = await dl.get_content_model()

    return {
        "downloads": to_dict(getattr(dl_model, "downloads", [])) or [],
        "captions": to_dict(getattr(dl_model, "captions", [])) or [],
    }


async def handle_series_streams(params):
    from moviebox_api.v1 import TVSeriesDetails, DownloadableTVSeriesFilesDetail, Session
    from moviebox_api.v1.core import Search, SubjectType

    title = params.get("title") or params.get("query")
    season = int(params.get("season", 1))
    episode = int(params.get("episode", 1))
    if not title:
        raise ValueError("title is required")

    session = Session()

    s = Search(session, query=title, subject_type=SubjectType.TV_SERIES, per_page=5)
    raw = await s.get_content()
    items = raw.get("items", []) if isinstance(raw, dict) else []
    if not items:
        return {"downloads": [], "captions": [], "season": season, "episode": episode}

    page_url = None
    for item in items:
        d = to_dict(item)
        page_url = d.get("page_url") if isinstance(d, dict) else getattr(item, "page_url", None)
        if page_url:
            break

    if not page_url:
        return {"downloads": [], "captions": [], "season": season, "episode": episode}

    sd = TVSeriesDetails(page_url, session=session)
    model = await sd.get_content_model()
    dl = DownloadableTVSeriesFilesDetail(session, model)
    dl_model = await dl.get_content_model(season=season, episode=episode)

    return {
        "downloads": to_dict(getattr(dl_model, "downloads", [])) or [],
        "captions": to_dict(getattr(dl_model, "captions", [])) or [],
        "season": season,
        "episode": episode,
    }


async def handle_movie_details(params):
    from moviebox_api.v1 import MovieDetails, Session
    from moviebox_api.v1.core import Search, SubjectType

    title = params.get("title") or params.get("query")
    if not title:
        raise ValueError("title is required")

    session = Session()
    s = Search(session, query=title, subject_type=SubjectType.MOVIES, per_page=3)
    raw = await s.get_content()
    items = raw.get("items", []) if isinstance(raw, dict) else []
    if not items:
        return {}

    item = items[0]
    d = to_dict(item)
    page_url = d.get("page_url") if isinstance(d, dict) else getattr(item, "page_url", None)
    if not page_url:
        return d

    md = MovieDetails(page_url, session=session)
    model = await md.get_content_model()
    result = to_dict(model)
    result["content_type"] = "movie"
    return result


async def handle_series_details(params):
    from moviebox_api.v1 import TVSeriesDetails, Session
    from moviebox_api.v1.core import Search, SubjectType

    title = params.get("title") or params.get("query")
    if not title:
        raise ValueError("title is required")

    session = Session()
    s = Search(session, query=title, subject_type=SubjectType.TV_SERIES, per_page=3)
    raw = await s.get_content()
    items = raw.get("items", []) if isinstance(raw, dict) else []
    if not items:
        return {}

    item = items[0]
    d = to_dict(item)
    page_url = d.get("page_url") if isinstance(d, dict) else getattr(item, "page_url", None)
    if not page_url:
        return d

    sd = TVSeriesDetails(page_url, session=session)
    model = await sd.get_content_model()
    result = to_dict(model)
    result["content_type"] = "series"
    return result


async def handle_homepage(params):
    results = await search_v1("the", "all")
    movies = [r for r in results if r.get("content_type") == "movie"][:10]
    series = [r for r in results if r.get("content_type") == "series"][:10]
    return {
        "trending_movies": movies,
        "trending_series": series,
        "featured": (movies + series)[:6],
    }


async def handle_inspect(params):
    """Debug: return what's exported by moviebox_api.v2"""
    import moviebox_api.v2 as v2mod
    return {"v2_exports": dir(v2mod)}


# ── Router ────────────────────────────────────────────────────────────────────

ACTIONS = {
    "search": handle_search,
    "movie_details": handle_movie_details,
    "series_details": handle_series_details,
    "movie_streams": handle_movie_streams,
    "series_streams": handle_series_streams,
    "movie_downloads": handle_movie_streams,
    "series_downloads": handle_series_streams,
    "homepage": handle_homepage,
    "inspect": handle_inspect,
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
