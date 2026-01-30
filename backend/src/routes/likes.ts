import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

/**
 * Like Routes - handles post likes/unlikes
 */
export function registerLikeRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/posts/:postId/like
   * Like a post (creates like if doesn't exist, ignores if already liked)
   */
  app.fastify.post('/api/posts/:postId/like', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; likeId?: string; message?: string } | void> => {
    const { postId } = request.params as { postId: string };

    app.logger.info({ postId, body: request.body }, 'Liking post');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      // Check if post exists
      const post = await app.db.query.posts.findFirst({
        where: eq(schema.posts.id, postId),
      });

      if (!post) {
        app.logger.warn({ postId }, 'Post not found');
        return reply.status(404).send({
          message: 'Post not found'
        });
      }

      // Check if already liked
      const existingLike = await app.db.query.likes.findFirst({
        where: and(
          eq(schema.likes.postId, postId),
          eq(schema.likes.userId, session.user.id)
        ),
      });

      if (existingLike) {
        app.logger.info({ postId, userId: session.user.id }, 'Post already liked');
        return {
          success: true,
          likeId: existingLike.id,
          message: 'Post already liked'
        };
      }

      // Create like
      const [like] = await app.db
        .insert(schema.likes)
        .values({
          postId,
          userId: session.user.id,
        })
        .returning({ id: schema.likes.id });

      app.logger.info({ postId, userId: session.user.id, likeId: like.id }, 'Post liked successfully');
      return {
        success: true,
        likeId: like.id
      };
    } catch (error) {
      app.logger.error({ err: error, postId, userId: session.user.id }, 'Failed to like post');
      throw error;
    }
  });

  /**
   * DELETE /api/posts/:postId/like
   * Unlike a post
   */
  app.fastify.delete('/api/posts/:postId/like', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; message?: string } | void> => {
    const { postId } = request.params as { postId: string };

    app.logger.info({ postId }, 'Unliking post');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      // Check if post exists
      const post = await app.db.query.posts.findFirst({
        where: eq(schema.posts.id, postId),
      });

      if (!post) {
        app.logger.warn({ postId }, 'Post not found');
        return reply.status(404).send({
          message: 'Post not found'
        });
      }

      // Find and delete like
      const existingLike = await app.db.query.likes.findFirst({
        where: and(
          eq(schema.likes.postId, postId),
          eq(schema.likes.userId, session.user.id)
        ),
      });

      if (!existingLike) {
        app.logger.info({ postId, userId: session.user.id }, 'Like not found - post not liked by user');
        return {
          success: true,
          message: 'Post not liked by user'
        };
      }

      await app.db.delete(schema.likes).where(eq(schema.likes.id, existingLike.id));

      app.logger.info({ postId, userId: session.user.id }, 'Post unliked successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, postId, userId: session.user.id }, 'Failed to unlike post');
      throw error;
    }
  });

  /**
   * GET /api/posts/:postId/likes
   * Get all users who liked a post with pagination
   */
  app.fastify.get('/api/posts/:postId/likes', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { postId } = request.params as { postId: string };
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');

    app.logger.info({ postId, limit, offset }, 'Fetching post likes');

    try {
      // Check if post exists
      const post = await app.db.query.posts.findFirst({
        where: eq(schema.posts.id, postId),
      });

      if (!post) {
        app.logger.warn({ postId }, 'Post not found');
        return reply.status(404).send({
          message: 'Post not found'
        });
      }

      const likes = await app.db.query.likes.findMany({
        where: eq(schema.likes.postId, postId),
        limit,
        offset,
        with: {
          user: {
            columns: { id: true, email: true },
          },
        },
      });

      app.logger.info({ postId, count: likes.length, limit, offset }, 'Post likes retrieved successfully');
      return likes;
    } catch (error) {
      app.logger.error({ err: error, postId, limit, offset }, 'Failed to fetch post likes');
      throw error;
    }
  });

  /**
   * GET /api/posts/:postId/likes/me
   * Check if current user liked a post
   */
  app.fastify.get('/api/posts/:postId/likes/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ liked: boolean; likeId?: string } | void> => {
    const { postId } = request.params as { postId: string };

    app.logger.info({ postId }, 'Checking if user liked post');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const like = await app.db.query.likes.findFirst({
        where: and(
          eq(schema.likes.postId, postId),
          eq(schema.likes.userId, session.user.id)
        ),
      });

      const liked = !!like;
      app.logger.info({ postId, userId: session.user.id, liked }, 'Like status checked');
      return {
        liked,
        likeId: like?.id
      };
    } catch (error) {
      app.logger.error({ err: error, postId, userId: session.user.id }, 'Failed to check like status');
      throw error;
    }
  });
}
