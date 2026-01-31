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
   * Body: { content?: string, mediaKey?: string, mediaType?: 'image' | 'video' }
   * mediaKey is the permanent storage key returned from /api/upload/media
   */
  app.fastify.post('/api/posts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ id: string; userId: string; content: string | null; mediaUrl: string | null; mediaType: string | null; createdAt: Date } | void> => {
    app.logger.info({ body: request.body }, 'Creating new post');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      // Get content and media info from request body
      const body = request.body as any;
      const content = body?.content || null;
      const mediaKey = body?.mediaKey || null;
      const mediaType = body?.mediaType || null;

      // Validate post has either content or media
      if (!content && !mediaKey) {
        app.logger.warn({ userId: session.user.id }, 'Post must have content or media');
        return reply.status(400).send({
          message: 'Post must contain either text content or media'
        });
      }

      // Validate media type if mediaKey is provided
      if (mediaKey && !['image', 'video'].includes(mediaType)) {
        app.logger.warn({ userId: session.user.id, mediaType }, 'Invalid media type');
        return reply.status(400).send({
          message: 'Media type must be either "image" or "video"'
        });
      }

      // Create post (mediaUrl stores the permanent storage key)
      const [post] = await app.db
        .insert(schema.posts)
        .values({
          userId: session.user.id,
          content: content || null,
          mediaUrl: mediaKey || null, // Store the permanent storage key
          mediaType: mediaType || null,
          fileKey: null, // Legacy field for backward compatibility
          fileType: 'text', // Legacy field for backward compatibility
        })
        .returning({
          id: schema.posts.id,
          userId: schema.posts.userId,
          content: schema.posts.content,
          mediaUrl: schema.posts.mediaUrl,
          mediaType: schema.posts.mediaType,
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
   * Get a specific post detail with enriched format (matching feed endpoint)
   * Returns: { id, content, mediaUrl (signed), mediaType, authorUsername, createdAt, likeCount, commentCount, hasLiked }
   */
  app.fastify.get('/api/posts/:postId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { postId } = request.params as { postId: string };

    app.logger.info({ postId }, 'Fetching post detail');

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

      // Get author's username
      const userProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, post.userId),
        columns: { username: true },
      });

      // Get like count
      const likesResult = await app.db
        .select({ count: count(schema.likes.id) })
        .from(schema.likes)
        .where(eq(schema.likes.postId, postId));
      const likeCount = Number(likesResult[0]?.count || 0);

      // Get comment count
      const commentsResult = await app.db
        .select({ count: count(schema.comments.id) })
        .from(schema.comments)
        .where(eq(schema.comments.postId, postId));
      const commentCount = Number(commentsResult[0]?.count || 0);

      // Generate fresh signed URL from storage key if media exists
      let mediaUrl: string | null = null;
      if (post.mediaUrl) {
        try {
          const { url } = await app.storage.getSignedUrl(post.mediaUrl);
          mediaUrl = url;
        } catch (urlError) {
          app.logger.warn({ err: urlError, mediaKey: post.mediaUrl }, 'Failed to generate signed URL');
        }
      }

      app.logger.info({ postId }, 'Post detail retrieved successfully');
      return {
        id: post.id,
        content: post.content,
        mediaUrl,
        mediaType: post.mediaType,
        authorUsername: userProfile?.username || 'anonymous',
        createdAt: post.createdAt,
        likeCount,
        commentCount,
        hasLiked: false, // Always false on public endpoint
      };
    } catch (error) {
      app.logger.error({ err: error, postId }, 'Failed to fetch post detail');
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

          // Generate fresh signed URL from storage key if media exists
          let mediaUrl: string | null = null;
          if (post.mediaUrl) {
            try {
              const { url } = await app.storage.getSignedUrl(post.mediaUrl);
              mediaUrl = url;
            } catch (urlError) {
              app.logger.warn({ err: urlError, mediaKey: post.mediaUrl }, 'Failed to generate signed URL');
            }
          }

          return {
            id: post.id,
            content: post.content,
            mediaUrl,
            mediaType: post.mediaType,
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
   * GET /api/users/me/posts
   * Get authenticated user's own posts with pagination
   * Query params: limit (default 20), offset (default 0)
   * Response includes: id, content, fileUrl, fileType, authorUsername, createdAt, likeCount, commentCount, hasLiked
   * Note: hasLiked is always false (user cannot like their own posts)
   */
  app.fastify.get('/api/users/me/posts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    app.logger.info({ body: request.body }, 'Fetching authenticated user posts');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100); // Cap at 100
    const offset = parseInt(query.offset || '0');

    app.logger.info({ userId: session.user.id, limit, offset }, 'Fetching user posts');

    try {
      const posts = await app.db.query.posts.findMany({
        where: eq(schema.posts.userId, session.user.id),
        limit,
        offset,
        orderBy: desc(schema.posts.createdAt),
      });

      // Enrich posts with user info, likes, and comments
      const enrichedPosts = await Promise.all(
        posts.map(async (post) => {
          // Get author's username (will be current user's username)
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

          // Generate fresh signed URL from storage key if media exists
          let mediaUrl: string | null = null;
          if (post.mediaUrl) {
            try {
              const { url } = await app.storage.getSignedUrl(post.mediaUrl);
              mediaUrl = url;
            } catch (urlError) {
              app.logger.warn({ err: urlError, mediaKey: post.mediaUrl }, 'Failed to generate signed URL');
            }
          }

          return {
            id: post.id,
            content: post.content,
            mediaUrl,
            mediaType: post.mediaType,
            authorUsername: userProfile?.username || 'anonymous',
            createdAt: post.createdAt,
            likeCount,
            commentCount,
            hasLiked: false, // User cannot like their own posts
          };
        })
      );

      app.logger.info({ userId: session.user.id, count: enrichedPosts.length, limit, offset }, 'User posts retrieved successfully');
      return enrichedPosts;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, limit, offset }, 'Failed to fetch user posts');
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
   * PUT /api/posts/:postId
   * Update a post (only owner can update)
   * Body: { content?: string, mediaKey?: string, mediaType?: 'image' | 'video' }
   * mediaKey is the permanent storage key returned from /api/upload/media
   */
  app.fastify.put('/api/posts/:postId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ id: string; content: string | null; mediaUrl: string | null; mediaType: string | null; authorUsername: string; createdAt: Date; likeCount: number; commentCount: number; hasLiked: boolean } | void> => {
    const { postId } = request.params as { postId: string };

    app.logger.info({ postId, body: request.body }, 'Updating post');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      // Fetch the post
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
        app.logger.warn({ postId, userId: session.user.id }, 'Unauthorized post update attempt');
        return reply.status(403).send({
          message: 'You can only update your own posts'
        });
      }

      // Get content and media info from request body
      const body = request.body as any;
      const newContent = body?.content !== undefined ? body.content : post.content;
      const newMediaKey = body?.mediaKey !== undefined ? body.mediaKey : post.mediaUrl; // mediaUrl stores the key
      const newMediaType = body?.mediaType !== undefined ? body.mediaType : post.mediaType;

      // Validate post has either content or media
      if (!newContent && !newMediaKey) {
        app.logger.warn({ postId, userId: session.user.id }, 'Post must have content or media');
        return reply.status(400).send({
          message: 'Post must contain either text content or media'
        });
      }

      // Validate media type if mediaKey is provided
      if (newMediaKey && !['image', 'video'].includes(newMediaType)) {
        app.logger.warn({ postId, userId: session.user.id, mediaType: newMediaType }, 'Invalid media type');
        return reply.status(400).send({
          message: 'Media type must be either "image" or "video"'
        });
      }

      // Update post (mediaUrl stores the permanent storage key)
      const [updatedPost] = await app.db
        .update(schema.posts)
        .set({
          content: newContent || null,
          mediaUrl: newMediaKey || null, // Store the permanent storage key
          mediaType: newMediaType || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.posts.id, postId))
        .returning();

      // Get author's username
      const userProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, updatedPost.userId),
        columns: { username: true },
      });

      // Get like count
      const likesResult = await app.db
        .select({ count: count(schema.likes.id) })
        .from(schema.likes)
        .where(eq(schema.likes.postId, postId));
      const likeCount = Number(likesResult[0]?.count || 0);

      // Get comment count
      const commentsResult = await app.db
        .select({ count: count(schema.comments.id) })
        .from(schema.comments)
        .where(eq(schema.comments.postId, postId));
      const commentCount = Number(commentsResult[0]?.count || 0);

      // Generate fresh signed URL from storage key if media exists
      let mediaUrl: string | null = null;
      if (updatedPost.mediaUrl) {
        try {
          const { url } = await app.storage.getSignedUrl(updatedPost.mediaUrl);
          mediaUrl = url;
        } catch (urlError) {
          app.logger.warn({ err: urlError, mediaKey: updatedPost.mediaUrl }, 'Failed to generate signed URL');
        }
      }

      app.logger.info({ postId, userId: session.user.id }, 'Post updated successfully');
      return {
        id: updatedPost.id,
        content: updatedPost.content,
        mediaUrl,
        mediaType: updatedPost.mediaType,
        authorUsername: userProfile?.username || 'anonymous',
        createdAt: updatedPost.createdAt,
        likeCount,
        commentCount,
        hasLiked: false, // User cannot like their own posts
      };
    } catch (error) {
      app.logger.error({ err: error, postId, userId: session.user.id }, 'Failed to update post');
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

      // Delete file from storage if exists (both old fileKey and new mediaUrl formats)
      if (post.fileKey) {
        try {
          await app.storage.delete(post.fileKey);
          app.logger.info({ fileKey: post.fileKey }, 'File deleted from storage');
        } catch (storageError) {
          app.logger.warn({ err: storageError, fileKey: post.fileKey }, 'Failed to delete file from storage');
          // Don't fail the post deletion if file deletion fails
        }
      }

      if (post.mediaUrl) {
        try {
          await app.storage.delete(post.mediaUrl);
          app.logger.info({ mediaKey: post.mediaUrl }, 'Media file deleted from storage');
        } catch (storageError) {
          app.logger.warn({ err: storageError, mediaKey: post.mediaUrl }, 'Failed to delete media file from storage');
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
