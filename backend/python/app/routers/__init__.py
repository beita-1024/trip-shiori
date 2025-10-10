"""FastAPI routers package."""

# re-export routers for convenience imports in app.main
from . import health, calc, internal_ai  # noqa: F401
