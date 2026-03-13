from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.answer_models import AnswerQuestionRequest
from app.services.answer_service import stream_answer_question_from_chunks

router = APIRouter(prefix="/answers", tags=["answers"])


@router.post("/stream")
async def answer_from_chunks_stream(payload: AnswerQuestionRequest):
    question = payload.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if not payload.chunks:
        raise HTTPException(status_code=400, detail="Chunks are required")

    stream = stream_answer_question_from_chunks(
        question=question,
        chunks=[chunk.model_dump() for chunk in payload.chunks],
    )

    return StreamingResponse(stream, media_type="application/x-ndjson")
