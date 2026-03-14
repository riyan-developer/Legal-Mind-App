from openai import AsyncOpenAI, OpenAI
from app.config import settings

client = OpenAI(api_key=settings.openai_api_key)
async_client = AsyncOpenAI(api_key=settings.openai_api_key)


def create_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    response = client.embeddings.create(
        model=settings.openai_embedding_model,
        input=texts
    )
    return [item.embedding for item in response.data]


async def create_embeddings_async(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    response = await async_client.embeddings.create(
        model=settings.openai_embedding_model,
        input=texts
    )
    return [item.embedding for item in response.data]
