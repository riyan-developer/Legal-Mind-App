import json
import os
import tempfile

from urllib.parse import unquote_plus
from app.services.s3_service import download_file
from app.services.extractor_service import extract_pdf_text_with_pages
from app.services.chunking_service import chunk_pages
from app.services.embedding_service import create_embeddings
from app.services.express_callback_service import send_indexed_chunks_to_express
from app.services.express_callback_service import send_result_to_express

processed_event_keys: set[str] = set()


async def process_s3_event_record(record: dict):
    event_name = record.get("eventName", "")
    bucket = record["s3"]["bucket"]["name"]
    raw_key = record["s3"]["object"]["key"]
    key = unquote_plus(raw_key)
    
    print(f"In Background Processing S3 event: {event_name} for bucket: {bucket}, key: {key}")

    dedupe_key = f"{event_name}:{bucket}:{key}"
    # if dedupe_key in processed_event_keys:
    #     return {"status": "skipped_duplicate", "key": key}

    processed_event_keys.add(dedupe_key)

    if "ObjectCreated" not in event_name:
        return {"status": "ignored_event", "event_name": event_name}

    suffix = os.path.splitext(key)[1].lower()
    if suffix != ".pdf":
        return {"status": "ignored_file_type", "key": key}

    print(f"Processing S3 event for bucket: {bucket}, key: {key}")
    try:
        await send_result_to_express({
            "bucket_name": bucket,
            "s3_key": key,
            "status": "processing"
        })
        with tempfile.TemporaryDirectory() as tmp_dir:
            local_path = os.path.join(tmp_dir, os.path.basename(key))
            download_file(bucket, key, local_path)

            extracted = extract_pdf_text_with_pages(local_path)
            chunks = chunk_pages(extracted["pages"])

            texts = [chunk["chunk_text"] for chunk in chunks]
            embeddings = create_embeddings(texts)

            enriched_chunks = []
            for i, chunk in enumerate(chunks):
                enriched_chunks.append({
                    **chunk,
                    "embedding": embeddings[i]
                })

            payload = {
                "bucket_name": bucket,
                "s3_key": key,
                "mime_type": "application/pdf",
                "chunks": enriched_chunks
            }
            

            result = await send_indexed_chunks_to_express(payload)
            await send_result_to_express({
                "bucket_name": bucket,
                "s3_key": key,
                "status": "indexed"
            })

            return {
                "status": "indexed",
                "key": key,
                "express_result": result
            }
    except Exception as e:
        await send_result_to_express({
            "bucket_name": bucket,
            "s3_key": key,
            "status": "error",
            "error": str(e)
        })
        print(f"Error processing S3 event record for key {key}: {str(e)}")
        return {"status": "error", "key": key, "error": str(e)}