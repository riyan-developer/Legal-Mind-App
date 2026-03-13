import httpx
from app.config import settings


async def confirm_subscription(subscribe_url: str) -> None:
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(subscribe_url)
        resp.raise_for_status()


def is_expected_topic(topic_arn: str) -> bool:
    return topic_arn == settings.sns_topic_arn