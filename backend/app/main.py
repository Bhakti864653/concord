import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .matching import router as matching_router
from .profiles import router as profiles_router

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

logger = logging.getLogger("concord")

app = FastAPI(title="Concord API")

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # An exception that escapes a route handler would otherwise surface as a
    # bare 500 from Starlette's ServerErrorMiddleware, which sits outside
    # CORSMiddleware and so ships without CORS headers - the browser reports
    # that as an opaque "Failed to fetch" with no visible error at all.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=502,
        content={"detail": "Something went wrong on our end. Please try again."},
    )


app.include_router(profiles_router)
app.include_router(matching_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "supabase_url_configured": bool(os.getenv("SUPABASE_URL")),
        "supabase_key_configured": bool(os.getenv("SUPABASE_PUBLISHABLE_KEY")),
        "frontend_origins_debug": [repr(o) for o in frontend_origins],
    }
