import { loadApiConfig } from '@vda-ledger/config';
import { logger } from './logger.js';

/**
 * Optional remote report artefact storage (S3-compatible).
 * Local filesystem under storage/reports remains the download source of truth.
 */
export const reportStorage = {
  async put(key, buffer, { contentType = 'application/octet-stream' } = {}) {
    const config = loadApiConfig();
    if (config.reportStorage !== 's3' || !config.s3Bucket) {
      return { storage: 'skipped', key };
    }

    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: config.s3Region,
        ...(config.s3Endpoint ? { endpoint: config.s3Endpoint, forcePathStyle: true } : {}),
        ...(config.awsAccessKeyId
          ? {
              credentials: {
                accessKeyId: config.awsAccessKeyId,
                secretAccessKey: config.awsSecretAccessKey,
              },
            }
          : {}),
      });
      await client.send(
        new PutObjectCommand({
          Bucket: config.s3Bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return { storage: 's3', key, path: `s3://${config.s3Bucket}/${key}` };
    } catch (err) {
      logger.warn('S3 report upload failed', { error: err.message, key });
      throw err;
    }
  },
};
