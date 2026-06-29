#!/usr/bin/env python3
"""
Cymor Movie API — Python Bridge
================================
This script is the integration layer between the Node.js backend and the
moviebox-api Python library. It reads a JSON command from stdin and writes
a JSON response to stdout.

Protocol:
  Input  (stdin):  {"action": "search", "params": {"query": "avatar", "type": "movie"}}
  Output (stdout): {"success": true, "data": {...}}  or  {"success": false, "error": "..."}

This bridge is spawned by Node.js on-demand using child_process.spawn.
"""

import sys
import json
import asyncio
import traceback


def send_response(success: bool, data=None, error: str = None):
    """Write a JSON response to stdout and exit."""
    response = {"success": success}
    if data is not None:
        response["data"] = data
    if error is not None:
        response["error"] = error
    print(json.dumps(response, default=str), flush=True)


def serialize_model(obj):
    """Recursively serialize Pydantic models and common types to dicts."""
    if obj is None:
        return None
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dict__"):
        return {k: serialize_model(v) for k, v in obj.__dict__.items() if not k.startswith("_")}
    if isinstance(obj, (list, tuple)):
        return [serialize_model(i) for i in obj]
    if isinstance(obj, dict):
        return {k: serialize_model(v) for k, v in obj.items()}
    return obj


async def handle_search(params: dict) -> dict:
    """Search for movies, TV series, or all content."""
    from moviebox_api.v1.core import Search, Session, SubjectType

    query = params.get("query", "")
    content_type = params.get("type", "all")  # movie | series | all
    page = params.get("page", 1)
    per_page = params.get("per_page", 20)

    if not query:
        raise ValueError("Search query is required")

    session = Session()
    results = []

    async def search_type(subject_type, label):
        s = Search(session, query=query, subject_type=subject_type, page=page, per_page=per_page)
        raw = await s.get_content()
        items = raw.get("items", []) if isinstance(raw, dict) else []
        pager = raw.get("pager", {}) if isinstance(raw, dict) else {}
        serialized = []
        for item in items:
            serialized.append({
                "id": getattr(item, "id", None) or (item.get("id") if isinstance(item, dict) else None),
                "title": getattr(item, "title", None) or (item.get("title") if isinstance(item, dict) else None),
                "year": getattr(item, "year", None) or (item.get("year") if isinstance(item, dict) else None),
                "poster": getattr(item, "poster_url", None) or (item.get("poster_url") if isinstance(item, dict) else None),
                "page_url": getattr(item, "page_url", None) or (item.get("page_url") if isinstance(item, dict) else None),
                "content_type": label,
                "_raw": serialize_model(item),
            })
        return serialized, pager

    if content_type == "movie":
        items, pager = await search_type(SubjectType.MOVIES, "movie")
    elif content_type == "series":
        items, pager = await search_type(SubjectType.TV_SERIES, "series")
    else:
        movie_items, movie_pager = await search_type(SubjectType.MOVIES, "movie")
        series_items, series_pager = await search_type(SubjectType.TV_SERIES, "series")
        items = movie_items + series_items
        pager = movie_pager

    return {"items": items, "pager": serialize_model(pager), "query": query, "content_type": content_type}


async def handle_movie_details(params: dict) -> dict:
    """Get full details for a movie by page_url."""
    from moviebox_api.v1 import MovieDetails, Session

    page_url = params.get("page_url")
    if not page_url:
        raise ValueError("page_url is required")

    session = Session()
    md = MovieDetails(page_url, session=session)
    details = await md.get_content_model()
    return serialize_model(details)


async def handle_series_details(params: dict) -> dict:
    """Get full details for a TV series by page_url."""
    from moviebox_api.v1 import TVSeriesDetails, Session

    page_url = params.get("page_url")
    if not page_url:
        raise ValueError("page_url is required")

    session = Session()
    details_inst = TVSeriesDetails(page_url, session=session)
    details = await details_inst.get_content_model()
    return serialize_model(details)


async def handle_movie_downloads(params: dict) -> dict:
    """Get downloadable file links for a movie."""
    from moviebox_api.v1 import DownloadableMovieFilesDetail, MovieDetails, Session

    page_url = params.get("page_url")
    if not page_url:
        raise ValueError("page_url is required")

    session = Session()
    md = MovieDetails(page_url, session=session)
    details_model = await md.get_content_model()

    dl_files = DownloadableMovieFilesDetail(session, details_model)
    dl_detail = await dl_files.get_content_model()

    downloads = serialize_model(dl_detail.downloads) if hasattr(dl_detail, "downloads") else []
    captions = serialize_model(dl_detail.captions) if hasattr(dl_detail, "captions") else []

    return {"downloads": downloads, "captions": captions}


async def handle_series_downloads(params: dict) -> dict:
    """Get downloadable file links for a TV series episode."""
    from moviebox_api.v1 import DownloadableTVSeriesFilesDetail, TVSeriesDetails, Session

    page_url = params.get("page_url")
    season = params.get("season", 1)
    episode = params.get("episode", 1)

    if not page_url:
        raise ValueError("page_url is required")

    session = Session()
    details_inst = TVSeriesDetails(page_url, session=session)
    details_model = await details_inst.get_content_model()

    dl_files = DownloadableTVSeriesFilesDetail(session, details_model)
    dl_detail = await dl_files.get_content_model(season=int(season), episode=int(episode))

    downloads = serialize_model(dl_detail.downloads) if hasattr(dl_detail, "downloads") else []
    captions = serialize_model(dl_detail.captions) if hasattr(dl_detail, "captions") else []

    return {"downloads": downloads, "captions": captions, "season": season, "episode": episode}


async def handle_homepage(params: dict) -> dict:
    """Get homepage content (trending/popular items)."""
    from moviebox_api.v1.core import Search, Session, SubjectType

    session = Session()

    async def fetch(subject_type, limit=10):
        s = Search(session, query="", subject_type=subject_type, per_page=limit)
        raw = await s.get_content()
        items = raw.get("items", []) if isinstance(raw, dict) else []
        return [serialize_model(i) for i in items[:limit]]

    movies = await fetch(SubjectType.MOVIES, 10)
    series = await fetch(SubjectType.TV_SERIES, 10)

    return {
        "trending_movies": movies,
        "trending_series": series,
        "featured": (movies + series)[:6],
    }


# ─── Action Router ───────────────────────────────────────────────────────────

ACTIONS = {
    "search": handle_search,
    "movie_details": handle_movie_details,
    "series_details": handle_series_details,
    "movie_downloads": handle_movie_downloads,
    "series_downloads": handle_series_downloads,
    "homepage": handle_homepage,
}


async def main():
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        send_response(False, error="No input received")
        return

    try:
        command = json.loads(raw_input)
    except json.JSONDecodeError as e:
        send_response(False, error=f"Invalid JSON input: {e}")
        return

    action = command.get("action")
    params = command.get("params", {})

    if not action:
        send_response(False, error="'action' field is required")
        return

    handler = ACTIONS.get(action)
    if not handler:
        send_response(False, error=f"Unknown action: '{action}'. Valid actions: {list(ACTIONS.keys())}")
        return

    try:
        result = await handler(params)
        send_response(True, data=result)
    except ValueError as e:
        send_response(False, error=str(e))
    except Exception as e:
        send_response(False, error=f"{type(e).__name__}: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main())
