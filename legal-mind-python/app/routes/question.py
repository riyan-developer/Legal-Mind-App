from fastapi import APIRouter, HTTPException
from app.models.question_models import (
    QuestionEmbeddingRequest,
    QuestionEmbeddingResponse,
)
from app.services.embedding_service import create_embeddings_async

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/embed", response_model=QuestionEmbeddingResponse)
async def embed_question(payload: QuestionEmbeddingRequest):
    question = payload.question.strip()

    if not question:
      raise HTTPException(status_code=400, detail="Question cannot be empty")

    embeddings = await create_embeddings_async([question])

    if not embeddings or not embeddings[0]:
        raise HTTPException(status_code=500, detail="Failed to create embedding")

    embedding = embeddings[0]

    return QuestionEmbeddingResponse(
        question=question,
        embedding=embedding,
        dimensions=len(embedding),
    )
