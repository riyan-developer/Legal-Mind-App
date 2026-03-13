from pydantic import BaseModel, Field
from typing import Optional


class RetrievedChunk(BaseModel):
    id: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    chunk_text: str


class AnswerQuestionRequest(BaseModel):
    question: str = Field(..., min_length=1)
    chunks: list[RetrievedChunk]
