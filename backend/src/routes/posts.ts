import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq, desc, and, isNull, count } from 'drizzle-orm';
import * as schema from '../db/schema.js';

/**
 * Post Routes - handles creation, retrieval, and file uploads
 */
export function registerPostRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/posts
   * Create a new post (text, photo, or video)
   * Supports multipart form data for file uploads
   */
  app.fastify.post('/api/posts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ id: string; userId: string; content: string | null; fileType: string; fileKey: string | null; createdAt: Date } | void> => {
    app.logger.info({ body: request.body }, 'Creating new post');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      // Handle file upload if present
      let fileKey: string | null = null;
      let fileType: 'text' | 'photo' | 'video' = 'text';

      // Check if this is multipart form data
      const contentType = request.headers['content-type'];
      if (contentType && contentType.includes('multipart/form-data')) {
        const data = await request.file({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

        if (data) {
          // Determine file type from MIME type
          const mimeType = data.mimetype;
          if (mimeType.startsWith('image/')) {
            fileType = 'photo';
          } else if (mimeType.startsWith('video/')) {
            fileType = 'video';
          }

          try {
            const buffer = await data.toBuffer();
            const timestamp = Date.now();
            const fileName = data.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `posts/${session.user.id}/${timestamp}-${fileName}`;

            fileKey = await app.storage.upload(key, buffer);
            app.logger.info({ fileKey, userId: session.user.id }, 'File uploaded to storage');
          } catch (uploadError) {
            app.logger.error({ err: uploadError, userId: session.user.id }, 'File upload failed or exceeded size limit');
            return reply.status(413).send({
              message: 'File too large or upload failed (max 50MB)'
            });
          }
        }
      }

      // Get content from request body or FormData
      const body = request.body as any;
      const content = typeof body === 'object' ? body.content : null;

      // Validate post has either content or file
      if (!content && !fileKey) {
        app.logger.warn({ userId: session.user.id }, 'Post must have content or file');
        return reply.status(400).send({
          message: 'Post must contain either text content or a file'
        });
      }

      // Create post
      const [post] = await app.db
        .insert(schema.posts)
        .values({
          userId: session.user.id,
          content: content || null,
          fileKey,
          fileType,
        })
        .returning({
          id: schema.posts.id,
          userId: schema.posts.userId,
          content: schema.posts.content,
          fileType: schema.posts.fileType,
          fileKey: schema.posts.fileKey,
          createdAt: schema.posts.createdAt,
        });

      app.logger.info({ postId: post.id, userId: session.user.id }, 'Post created successfully');
      return post;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create post');
      throw error;
    }
  });

  /**
   * GET /api/posts/:postId
   * Get a specific post with like count and comment count
   */
  app.fastify.get('/api/posts/:postId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { postId } = request.params as { postId: string };

    app.logger.info({ postId }, 'Fetching post');

    try {
      const post = await app.db.query.posts.findFirst({
        where: eq(schema.posts.id, postId),
        with: {
          user: {
            columns: { id: true, email: true, createdAt: true },
          },
          likes: {
            columns: { id: true },
          },
          comments: {
            with: {
              user: {
                columns: { id: true, email: true },
              },
            },
          },
        },
      });

      if (!post) {
        app.logger.warn({ postId }, 'Post not found');
        return reply.status(404).send({
          message: 'Post not found'
        });
      }

      // Generate signed URL for file if present
      if (post.fileKey) {
        const { url } = await app.storage.getSignedUrl(post.fileKey);
        (post as any).fileUrl = url;
      }

      app.logger.info({ postId }, 'Post retrieved successfully');
      return post;
    } catch (error) {
      app.logger.error({ err: error, postId }, 'Failed to fetch post');
      throw error;
    }
  });

  /**
   * GET /api/posts
   * Get feed of all posts with pagination (PUBLIC - no auth required)
   * Query params: limit (default 20), offset (default 0)
   * Response includes: id, content, fileUrl, fileType, authorUsername, createdAt, likeCount, commentCount, hasLiked
   * Note: hasLiked is always false for unauthenticated users (auth checking not supported on public routes)
   */
  app.fastify.get('/api/posts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100); // Cap at 100
    const offset = parseInt(query.offset || '0');

    app.logger.info({ limit, offset }, 'Fetching posts feed');

    try {
      const posts = await app.db.query.posts.findMany({
        limit,
        offset,
        orderBy: desc(schema.posts.createdAt),
      });

      // Enrich posts with user info, likes, and comments
      const enrichedPosts = await Promise.all(
        posts.map(async (post) => {
          // Get author's username
          const userProfile = await app.db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.userId, post.userId),
            columns: { username: true },
          });

          // Get like count
          const likesResult = await app.db
            .select({ count: count(schema.likes.id) })
            .from(schema.likes)
            .where(eq(schema.likes.postId, post.id));
          const likeCount = Number(likesResult[0]?.count || 0);

          // Get comment count
          const commentsResult = await app.db
            .select({ count: count(schema.comments.id) })
            .from(schema.comments)
            .where(eq(schema.comments.postId, post.id));
          const commentCount = Number(commentsResult[0]?.count || 0);

          // Generate signed URL for file if present
          let fileUrl: string | null = null;
          if (post.fileKey) {
            try {
              const { url } = await app.storage.getSignedUrl(post.fileKey);
              fileUrl = url;
            } catch (urlError) {
              app.logger.warn({ err: urlError, fileKey: post.fileKey }, 'Failed to generate signed URL');
            }
          }

          return {
            id: post.id,
            content: post.content,
            fileUrl,
            fileType: post.fileType,
            authorUsername: userProfile?.username || 'anonymous',
            createdAt: post.createdAt,
            likeCount,
            commentCount,
            hasLiked: false, // Always false on public endpoint
          };
        })
      );

      app.logger.info({ count: enrichedPosts.length, limit, offset }, 'Posts feed retrieved successfully');
      return enrichedPosts;
    } catch (error) {
      app.logger.error({ err: error, limit, offset }, 'Failed to fetch posts feed');
      throw error;
    }
  });

  /**
   * GET /api/users/:username/posts
   * Get all posts by a specific user
   */
  app.fastify.get('/api/users/:username/posts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { username } = request.params as { username: string };
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');

    app.logger.info({ username, limit, offset }, 'Fetching user posts');

    try {
      // Get user profile to find userId
      const userProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.username, username),
      });

      if (!userProfile) {
        app.logger.warn({ username }, 'User profile not found');
        return reply.status(404).send({
          message: 'User not found'
        });
      }

      const posts = await app.db.query.posts.findMany({
        where: eq(schema.posts.userId, userProfile.userId),
        limit,
        offset,
        orderBy: desc(schema.posts.createdAt),
        with: {
          user: {
            columns: { id: true, email: true },
          },
          likes: {
            columns: { id: true },
          },
          comments: {
            with: {
              user: {
                columns: { id: true, email: true },
              },
            },
          },
        },
      });

      // Generate signed URLs for files
      const postsWithUrls = await Promise.all(
        posts.map(async (post) => {
          if (post.fileKey) {
            const { url } = await app.storage.getSignedUrl(post.fileKey);
            return { ...post, fileUrl: url };
          }
          return post;
        })
      );

      app.logger.info({ username, count: postsWithUrls.length, limit, offset }, 'User posts retrieved successfully');
      return postsWithUrls;
    } catch (error) {
      app.logger.error({ err: error, username, limit, offset }, 'Failed to fetch user posts');
      throw error;
    }
  });

  /**
   * DELETE /api/posts/:postId
   * Delete a post (only owner can delete)
   */
  app.fastify.delete('/api/posts/:postId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; message?: string } | void> => {
    const { postId } = request.params as { postId: string };

    app.logger.info({ postId }, 'Deleting post');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const post = await app.db.query.posts.findFirst({
        where: eq(schema.posts.id, postId),
      });

      if (!post) {
        app.logger.warn({ postId }, 'Post not found');
        return reply.status(404).send({
          message: 'Post not found'
        });
      }

      // Check ownership
      if (post.userId !== session.user.id) {
        app.logger.warn({ postId, userId: session.user.id }, 'Unauthorized post deletion attempt');
        return reply.status(403).send({
          message: 'You can only delete your own posts'
        });
      }

      // Delete file from storage if exists
      if (post.fileKey) {
        try {
          await app.storage.delete(post.fileKey);
          app.logger.info({ fileKey: post.fileKey }, 'File deleted from storage');
        } catch (storageError) {
          app.logger.warn({ err: storageError, fileKey: post.fileKey }, 'Failed to delete file from storage');
          // Don't fail the post deletion if file deletion fails
        }
      }

      // Delete post (cascades to likes and comments)
      await app.db.delete(schema.posts).where(eq(schema.posts.id, postId));

      app.logger.info({ postId, userId: session.user.id }, 'Post deleted successfully');
      return { success: true, message: 'Post deleted successfully' };
    } catch (error) {
      app.logger.error({ err: error, postId, userId: session.user.id }, 'Failed to delete post');
      throw error;
    }
  });
}
