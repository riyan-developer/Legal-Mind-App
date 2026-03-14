from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    aws_region: str = os.getenv("AWS_REGION", "")
    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    s3_bucket: str = os.getenv("S3_BUCKET", "")

    sns_topic_arn: str = os.getenv("SNS_TOPIC_ARN", "")
    express_api_base_url: str = os.getenv("EXPRESS_API_BASE_URL", "")
    express_internal_api_key: str = os.getenv("EXPRESS_INTERNAL_API_KEY", "")

    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "openai")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_embedding_model: str = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    openai_chat_model: str = os.getenv("OPENAI_CHAT_MODEL", "gpt-5")
    answer_max_context_chars: int = int(os.getenv("ANSWER_MAX_CONTEXT_CHARS", "800"))
    answer_max_context_chunks: int = int(os.getenv("ANSWER_MAX_CONTEXT_CHUNKS", "8"))


settings = Settings()
