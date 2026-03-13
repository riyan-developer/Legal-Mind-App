import httpx
from app.config import settings


async def send_indexed_chunks_to_express(payload: dict):
    url = f"{settings.express_api_base_url}/api/internal/indexing/chunks"

    headers = {
        "x-internal-api-key": settings.express_internal_api_key,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()

async def send_result_to_express(payload: dict):
    url = f"{settings.express_api_base_url}/api/internal/indexing/result"

    headers = {
        "x-internal-api-key": settings.express_internal_api_key,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()
