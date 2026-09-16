"""Internal service authentication dependency."""
from fastapi import Header, HTTPException, status, Depends
from app.config.settings import Settings, get_settings


async def verify_internal_service_key(
    x_internal_service_key: str = Header(None, alias="X-Internal-Service-Key"),
    settings: Settings = Depends(get_settings)
) -> str:
    """Verify incoming request contains a valid internal service key."""
    if not x_internal_service_key or x_internal_service_key.strip() != settings.INTERNAL_SERVICE_KEY.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing X-Internal-Service-Key header."
        )
    return x_internal_service_key
