from fastapi import FastAPI
from app.routes.sns import router as sns_router
from app.routes.question import router as questions_router
from app.routes.answers import router as answers_router

app = FastAPI(title="LegalMind Python Indexer")

app.include_router(sns_router)
app.include_router(questions_router)
app.include_router(answers_router)

@app.get("/health")
async def health():
    return {"ok": True}