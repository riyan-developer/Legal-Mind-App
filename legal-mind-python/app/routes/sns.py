import json
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from app.models.sns_models import SnsEnvelope
from app.services.sns_service import confirm_subscription, is_expected_topic
from app.services.indexing_service import process_s3_event_record

router = APIRouter(prefix="/sns", tags=["sns"])


@router.post("/s3-upload-complete")
async def sns_s3_upload_complete(
    request: Request,
    background_tasks: BackgroundTasks,
    x_amz_sns_message_type: str | None = Header(default=None),
):
    print(f"Received SNS message of type: {x_amz_sns_message_type}")
    body = await request.json()
    envelope = SnsEnvelope(**body)

    if not is_expected_topic(envelope.TopicArn):
        raise HTTPException(status_code=403, detail="Unexpected SNS topic")

    if envelope.Type == "SubscriptionConfirmation":
        if not envelope.SubscribeURL:
            raise HTTPException(status_code=400, detail="Missing SubscribeURL")
        background_tasks.add_task(confirm_subscription, envelope.SubscribeURL)
        return JSONResponse({"message": "Subscription confirmation started"})

    if envelope.Type == "Notification":
        message = json.loads(envelope.Message)

        if "Records" not in message:
            return JSONResponse({"message": "No S3 records found"})

        for record in message["Records"]:
            print(f"Scheduling processing for S3 event record: {record['eventName']} on bucket {record['s3']['bucket']['name']} with key {record['s3']['object']['key']}")
            background_tasks.add_task(process_s3_event_record, record)

        return JSONResponse({"message": "Notification accepted"})

    return JSONResponse({"message": f"Ignored SNS message type: {envelope.Type}"})