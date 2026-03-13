import boto3
from botocore.client import Config
from app.config import settings


s3_client = boto3.client(
    "s3",
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    config=Config(signature_version="s3v4"),
)


def download_file(bucket: str, key: str, local_path: str) -> None:
    s3_client.download_file(bucket, key, local_path)