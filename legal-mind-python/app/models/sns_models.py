from pydantic import BaseModel
from typing import Optional


class SnsEnvelope(BaseModel):
    Type: str
    MessageId: str
    TopicArn: str
    Message: str
    Timestamp: str
    SignatureVersion: Optional[str] = None
    Signature: Optional[str] = None
    SigningCertURL: Optional[str] = None
    SubscribeURL: Optional[str] = None
    Token: Optional[str] = None