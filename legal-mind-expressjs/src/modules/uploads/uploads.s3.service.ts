import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';
import { s3 } from '../../config/s3.js';

export const uploadsS3Service = {
  async startMultipart(fileName: string, contentType: string) {
    const key = `uploads/${randomUUID()}-${fileName}`;

    const command = new CreateMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const result = await s3.send(command);

    return {
      key,
      uploadId: result.UploadId!,
    };
  },

  async presignParts(payload: {
    key: string;
    uploadId: string;
    parts: number[];
  }) {
    const urls = await Promise.all(
      payload.parts.map(async (partNumber) => {
        const command = new UploadPartCommand({
          Bucket: env.S3_BUCKET,
          Key: payload.key,
          UploadId: payload.uploadId,
          PartNumber: partNumber,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 900 });

        return {
          partNumber,
          url,
        };
      }),
    );

    return { presignedParts: urls };
  },

  async completeMultipart(payload: {
    key: string;
    uploadId: string;
    parts: Array<{ PartNumber: number; ETag: string }>;
  }) {
    const command = new CompleteMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: payload.key,
      UploadId: payload.uploadId,
      MultipartUpload: {
        Parts: payload.parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    });

    const result = await s3.send(command);

    return {
      key: payload.key,
      location: result.Location,
      etag: result.ETag,
    };
  },

  async abortMultipart(payload: { key: string; uploadId: string }) {
    const command = new AbortMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: payload.key,
      UploadId: payload.uploadId,
    });

    await s3.send(command);
    return { success: true };
  },

  async getPreviewUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ResponseContentType: 'application/pdf',
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 900 });

    return { url };
  },
};
