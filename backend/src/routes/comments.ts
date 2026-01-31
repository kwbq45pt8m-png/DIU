import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq, desc, and, count } from 'drizzle-orm';
import * as schema from '../db/schema.js';

/**
 * Comment Routes - handles comments on posts
 */
export function registerCommentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/posts/:postId/comments
   * Create a comment on a post or a reply to an existing comment
   * Body: { content: string, parentCommentId?: string }
   */
  app.fastify.post('/api/posts/:postId/comments', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ id: string; postId: string; userId: string; content: string; parentCommentId?: string | null; createdAt: Date } | void> => {
    const { postId } = request.params as { postId: string };
    const { content, parentCommentId } = request.body as { content?: string; parentCommentId?: string };

    app.logger.info({ postId, parentCommentId, body: request.body }, 'Creating comment on post');

    const session = await requireAuth(request, reply);
    if (!session) return;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      app.logger.warn({ postId, userId: session.user.id }, 'Invalid comment content');
      return reply.status(400).send({
        message: 'Comment content is required and must be non-empty'
      });
    }

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

      // If parentCommentId is provided, verify parent comment exists and belongs to same post
      if (parentCommentId) {
        const parentComment = await app.db.query.comments.findFirst({
          where: eq(schema.comments.id, parentCommentId),
        });

        if (!parentComment) {
          app.logger.warn({ postId, parentCommentId }, 'Parent comment not found');
          return reply.status(404).send({
            message: 'Parent comment not found'
          });
        }

        if (parentComment.postId !== postId) {
          app.logger.warn({ postId, parentCommentId, parentPostId: parentComment.postId }, 'Parent comment belongs to different post');
          return reply.status(400).send({
            message: 'Parent comment must belong to the same post'
          });
        }
      }

      // Create comment
      const [comment] = await app.db
        .insert(schema.comments)
        .values({
          postId,
          userId: session.user.id,
          content: content.trim(),
          parentCommentId: parentCommentId || null,
        })
        .returning({
          id: schema.comments.id,
          postId: schema.comments.postId,
          userId: schema.comments.userId,
          content: schema.comments.content,
          parentCommentId: schema.comments.parentCommentId,
          createdAt: schema.comments.createdAt,
        });

      app.logger.info({ postId, userId: session.user.id, commentId: comment.id, parentCommentId }, 'Comment created successfully');
      return comment;
    } catch (error) {
      app.logger.error({ err: error, postId, userId: session.user.id, parentCommentId }, 'Failed to create comment');
      throw error;
    }
  });

  /**
   * GET /api/posts/:postId/comments
   * Get all comments on a post with replies nested
   * Returns top-level comments with their replies included in a 'replies' array
   * Includes authorId, hasLiked, and likeCount for each comment
   */
  app.fastify.get('/api/posts/:postId/comments', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { postId } = request.params as { postId: string };
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');

    app.logger.info({ postId, limit, offset }, 'Fetching post comments');

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

      // Try to get current user ID if authenticated
      let currentUserId: string | null = null;
      try {
        // Try to extract session - this is optional for public endpoint behavior
        const authHeader = request.headers.authorization;
        if (authHeader) {
          // We can't reliably get session on public endpoint, so we skip auth check
          // Comments page is public, but like status requires manual check if auth exists
        }
      } catch {
        // Not authenticated
      }

      // Fetch all comments for this post (no pagination on individual comments for nested structure)
      const allComments = await app.db.query.comments.findMany({
        where: eq(schema.comments.postId, postId),
        orderBy: desc(schema.comments.createdAt),
      });

      // Get user profiles for all comments
      const userProfilesMap = new Map<string, { username: string }>();
      for (const comment of allComments) {
        if (!userProfilesMap.has(comment.userId)) {
          const profile = await app.db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.userId, comment.userId),
            columns: { username: true },
          });
          userProfilesMap.set(comment.userId, { username: profile?.username || 'anonymous' });
        }
      }

      // Get like counts for all comments
      const commentLikeCountMap = new Map<string, number>();
      for (const comment of allComments) {
        const likeCountResult = await app.db
          .select({ count: count(schema.commentLikes.id) })
          .from(schema.commentLikes)
          .where(eq(schema.commentLikes.commentId, comment.id));
        commentLikeCountMap.set(comment.id, Number(likeCountResult[0]?.count || 0));
      }

      // Build a map of comments by parent ID for efficient nested lookup
      const repliesByParentId = new Map<string, typeof allComments>();
      for (const comment of allComments) {
        if (comment.parentCommentId) {
          if (!repliesByParentId.has(comment.parentCommentId)) {
            repliesByParentId.set(comment.parentCommentId, []);
          }
          repliesByParentId.get(comment.parentCommentId)!.push(comment);
        }
      }

      // Recursive function to build nested reply structure at all levels
      const buildNestedComment = (comment: typeof allComments[0]): any => {
        const userProfile = userProfilesMap.get(comment.userId);
        const directReplies = repliesByParentId.get(comment.id) || [];
        const likeCount = commentLikeCountMap.get(comment.id) || 0;

        return {
          id: comment.id,
          content: comment.content,
          authorUsername: userProfile?.username || 'anonymous',
          authorId: comment.userId,
          createdAt: comment.createdAt,
          parentCommentId: comment.parentCommentId,
          hasLiked: false, // Always false on public endpoint (no auth required)
          likeCount,
          replies: directReplies.map(reply => buildNestedComment(reply)), // Recursive call
        };
      };

      // Get only top-level comments (parentCommentId is null)
      const topLevelComments = allComments.filter(c => !c.parentCommentId);

      // Transform comments to response format with full recursive nesting
      const formattedComments = topLevelComments.slice(offset, offset + limit).map(comment => {
        return buildNestedComment(comment);
      });

      app.logger.info({ postId, count: formattedComments.length, limit, offset }, 'Post comments retrieved successfully');
      return formattedComments;
    } catch (error) {
      app.logger.error({ err: error, postId, limit, offset }, 'Failed to fetch post comments');
      throw error;
    }
  });

  /**
   * GET /api/comments/:commentId
   * Get a specific comment
   */
  app.fastify.get('/api/comments/:commentId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { commentId } = request.params as { commentId: string };

    app.logger.info({ commentId }, 'Fetching comment');

    try {
      const comment = await app.db.query.comments.findFirst({
        where: eq(schema.comments.id, commentId),
        with: {
          user: {
            columns: { id: true, email: true },
          },
        },
      });

      if (!comment) {
        app.logger.warn({ commentId }, 'Comment not found');
        return reply.status(404).send({
          message: 'Comment not found'
        });
      }

      app.logger.info({ commentId }, 'Comment retrieved successfully');
      return comment;
    } catch (error) {
      app.logger.error({ err: error, commentId }, 'Failed to fetch comment');
      throw error;
    }
  });

  /**
   * PUT /api/comments/:commentId
   * Update a comment (only owner can update)
   */
  app.fastify.put('/api/comments/:commentId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { commentId } = request.params as { commentId: string };
    const { content } = request.body as { content?: string };

    app.logger.info({ commentId, body: request.body }, 'Updating comment');

    const session = await requireAuth(request, reply);
    if (!session) return;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      app.logger.warn({ commentId, userId: session.user.id }, 'Invalid comment content');
      return reply.status(400).send({
        message: 'Comment content is required and must be non-empty'
      });
    }

    try {
      const comment = await app.db.query.comments.findFirst({
        where: eq(schema.comments.id, commentId),
      });

      if (!comment) {
        app.logger.warn({ commentId }, 'Comment not found');
        return reply.status(404).send({
          message: 'Comment not found'
        });
      }

      // Check ownership
      if (comment.userId !== session.user.id) {
        app.logger.warn({ commentId, userId: session.user.id }, 'Unauthorized comment update attempt');
        return reply.status(403).send({
          message: 'You can only update your own comments'
        });
      }

      // Update comment
      const [updated] = await app.db
        .update(schema.comments)
        .set({
          content: content.trim(),
          updatedAt: new Date(),
        })
        .where(eq(schema.comments.id, commentId))
        .returning();

      app.logger.info({ commentId, userId: session.user.id }, 'Comment updated successfully');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, commentId, userId: session.user.id }, 'Failed to update comment');
      throw error;
    }
  });

  /**
   * POST /api/comments/:commentId/like
   * Toggle like on a comment (like if not liked, unlike if already liked)
   * Requires authentication
   */
  app.fastify.post('/api/comments/:commentId/like', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ liked: boolean; likeCount: number } | void> => {
    const { commentId } = request.params as { commentId: string };

    app.logger.info({ commentId }, 'Toggling like on comment');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      // Check if comment exists
      const commentExists = await app.db.query.comments.findFirst({
        where: eq(schema.comments.id, commentId),
      });

      if (!commentExists) {
        app.logger.warn({ commentId }, 'Comment not found');
        return reply.status(404).send({
          message: 'Comment not found'
        });
      }

      // Check if user already liked this comment
      const existingLike = await app.db.query.commentLikes.findFirst({
        where: and(
          eq(schema.commentLikes.commentId, commentId),
          eq(schema.commentLikes.userId, session.user.id)
        ),
      });

      let liked = false;

      if (existingLike) {
        // User already liked, so unlike
        await app.db
          .delete(schema.commentLikes)
          .where(eq(schema.commentLikes.id, existingLike.id));
        app.logger.info({ commentId, userId: session.user.id }, 'Comment unliked successfully');
      } else {
        // User hasn't liked, so like
        await app.db
          .insert(schema.commentLikes)
          .values({
            commentId,
            userId: session.user.id,
          });
        liked = true;
        app.logger.info({ commentId, userId: session.user.id }, 'Comment liked successfully');
      }

      // Get updated like count
      const likeCountResult = await app.db
        .select({ count: count(schema.commentLikes.id) })
        .from(schema.commentLikes)
        .where(eq(schema.commentLikes.commentId, commentId));
      const likeCount = Number(likeCountResult[0]?.count || 0);

      return { liked, likeCount };
    } catch (error) {
      app.logger.error({ err: error, commentId, userId: session.user.id }, 'Failed to toggle comment like');
      throw error;
    }
  });

  /**
   * DELETE /api/comments/:commentId
   * Delete a comment (only owner can delete)
   */
  app.fastify.delete('/api/comments/:commentId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; message?: string } | void> => {
    const { commentId } = request.params as { commentId: string };

    app.logger.info({ commentId }, 'Deleting comment');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const comment = await app.db.query.comments.findFirst({
        where: eq(schema.comments.id, commentId),
      });

      if (!comment) {
        app.logger.warn({ commentId }, 'Comment not found');
        return reply.status(404).send({
          message: 'Comment not found'
        });
      }

      // Check ownership
      if (comment.userId !== session.user.id) {
        app.logger.warn({ commentId, userId: session.user.id }, 'Unauthorized comment deletion attempt');
        return reply.status(403).send({
          message: 'You can only delete your own comments'
        });
      }

      // Delete comment
      await app.db.delete(schema.comments).where(eq(schema.comments.id, commentId));

      app.logger.info({ commentId, userId: session.user.id }, 'Comment deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, commentId, userId: session.user.id }, 'Failed to delete comment');
      throw error;
    }
  });

  /**
   * GET /api/users/:username/comments
   * Get all comments by a user with pagination
   */
  app.fastify.get('/api/users/:username/comments', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { username } = request.params as { username: string };
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');

    app.logger.info({ username, limit, offset }, 'Fetching user comments');

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

      const comments = await app.db.query.comments.findMany({
        where: eq(schema.comments.userId, userProfile.userId),
        limit,
        offset,
        orderBy: desc(schema.comments.createdAt),
      });

      app.logger.info({ username, count: comments.length, limit, offset }, 'User comments retrieved successfully');
      return comments;
    } catch (error) {
      app.logger.error({ err: error, username, limit, offset }, 'Failed to fetch user comments');
      throw error;
    }
  });
}
