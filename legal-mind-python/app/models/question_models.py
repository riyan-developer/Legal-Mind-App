from pydantic import BaseModel, Field


class QuestionEmbeddingRequest(BaseModel):
    question: str = Field(..., min_length=1)


class QuestionEmbeddingResponse(BaseModel):
    question: str
    embedding: list[float]
    dimensions: int