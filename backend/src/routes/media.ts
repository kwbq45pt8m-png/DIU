import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

/**
 * Media Routes - handles file uploads to cloud storage
 */
export function registerMediaRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/upload/media
   * Upload media file (image or video)
   * Multipart form data with 'media' field
   * Max file size: 100MB
   * Returns: { url: string, mediaKey: string, mediaType: 'image' | 'video' }
   * mediaKey is the permanent storage key for the file
   * url is a temporary signed URL for immediate preview
   */
  app.fastify.post('/api/upload/media', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ url: string; mediaKey: string; mediaType: 'image' | 'video' } | void> => {
    app.logger.info({}, 'Uploading media file');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      // Get the file from the request
      const data = await request.file({ limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

      if (!data) {
        app.logger.warn({ userId: session.user.id }, 'No file provided in upload');
        return reply.status(400).send({
          message: 'File is required'
        });
      }

      // Validate MIME type
      const mimeType = data.mimetype.toLowerCase();
      let mediaType: 'image' | 'video';

      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

      if (validImageTypes.includes(mimeType)) {
        mediaType = 'image';
      } else if (validVideoTypes.includes(mimeType)) {
        mediaType = 'video';
      } else {
        app.logger.warn({ userId: session.user.id, mimeType }, 'Invalid file type');
        return reply.status(400).send({
          message: 'File type not supported. Supported: JPEG, PNG, GIF, WebP (images) and MP4, MOV, AVI, WebM (videos)'
        });
      }

      try {
        // Upload file to storage
        const buffer = await data.toBuffer();
        const timestamp = Date.now();
        const fileExtension = getFileExtension(mimeType);
        const fileName = `${timestamp}-${sanitizeFileName(data.filename)}`;
        const key = `media/${session.user.id}/${fileName}`;

        const uploadedKey = await app.storage.upload(key, buffer);
        app.logger.info({ userId: session.user.id, mediaKey: uploadedKey }, 'Media file uploaded successfully');

        // Generate signed URL for immediate preview
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        return {
          url,
          mediaKey: uploadedKey,
          mediaType,
        };
      } catch (uploadError) {
        app.logger.error({ err: uploadError, userId: session.user.id }, 'File upload failed or exceeded size limit');
        return reply.status(413).send({
          message: 'File too large or upload failed (max 100MB)'
        });
      }
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to upload media');
      throw error;
    }
  });
}

/**
 * Helper function to sanitize file names
 */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Helper function to get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeMap: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
  };

  return mimeMap[mimeType.toLowerCase()] || 'bin';
}
