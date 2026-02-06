import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq, and, ne } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';

/**
 * Auth Routes - handles post-registration username setup
 * Better Auth handles all authentication endpoints at /api/auth/*
 */
export function registerAuthRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/auth/health
   * Health check endpoint to verify authentication system is operational
   */
  app.fastify.get('/api/auth/health', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ status: string; message: string } | void> => {
    app.logger.info({}, 'Auth health check requested');

    try {
      return {
        status: 'ok',
        message: 'Authentication system is operational'
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Auth health check failed');
      return reply.status(500).send({
        status: 'error',
        message: 'Authentication system is not operational'
      });
    }
  });

  /**
   * POST /api/users/setup-username
   * Called after user registers/logs in to set their unique username
   * This is a required step after authentication
   * Idempotent: if user already has a profile, returns success with existing profile
   */
  app.fastify.post('/api/users/setup-username', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; message?: string; profile?: any } | void> => {
    app.logger.info({ userId: (request as any).user?.id, body: request.body }, 'Setting up username for user');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const { username } = request.body as { username?: string };

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      app.logger.warn({ userId: session.user.id }, 'Invalid username provided');
      return reply.status(400).send({
        success: false,
        message: 'Username is required and must be a non-empty string'
      });
    }

    const trimmedUsername = username.trim();

    try {
      // Check if user already has a profile
      const existingUserProfile = await app.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, session.user.id))
        .limit(1);

      // If user already has a profile, return success (idempotent)
      if (existingUserProfile.length > 0) {
        app.logger.info({ userId: session.user.id, username: existingUserProfile[0].username }, 'User already has profile, returning existing profile');
        return {
          success: true,
          message: 'Username already set',
          profile: existingUserProfile[0]
        };
      }

      // Check if the requested username is already taken by another user
      const existingUsername = await app.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.username, trimmedUsername))
        .limit(1);

      if (existingUsername.length > 0) {
        app.logger.warn({ userId: session.user.id, username: trimmedUsername }, 'Username already taken by another user');
        return reply.status(409).send({
          success: false,
          message: 'Username already taken'
        });
      }

      // Create user profile with username
      const [profile] = await app.db
        .insert(schema.userProfiles)
        .values({
          userId: session.user.id,
          username: trimmedUsername,
        })
        .returning();

      app.logger.info({ userId: session.user.id, username: trimmedUsername }, 'User profile created successfully');
      return {
        success: true,
        message: 'Username set successfully',
        profile
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, username: trimmedUsername }, 'Failed to set username');
      return reply.status(500).send({
        success: false,
        message: 'Failed to set up username. Please try again later.'
      });
    }
  });

  /**
   * GET /api/users/profile
   * Get current user's profile (with username)
   */
  app.fastify.get('/api/users/profile', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info({}, 'Fetching current user profile');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const profile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, session.user.id),
      });

      if (!profile) {
        app.logger.warn({ userId: session.user.id }, 'User profile not found - username not set up yet');
        return reply.status(404).send({
          message: 'Profile not found. Please set up username first.'
        });
      }

      app.logger.info({ userId: session.user.id, username: profile.username }, 'Profile retrieved successfully');
      return profile;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to retrieve profile');
      throw error;
    }
  });

  /**
   * GET /api/users/check-username/:username
   * Check if a username is available (no auth required)
   */
  app.fastify.get('/api/users/check-username/:username', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ available: boolean } | void> => {
    const { username } = request.params as { username: string };

    app.logger.info({ username }, 'Checking username availability');

    if (!username || username.trim().length === 0) {
      app.logger.warn({}, 'Empty username provided for check');
      return reply.status(400).send({
        message: 'Username is required'
      });
    }

    try {
      const existing = await app.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.username, username.trim()))
        .limit(1);

      const available = existing.length === 0;
      app.logger.info({ username, available }, 'Username availability checked');
      return { available };
    } catch (error) {
      app.logger.error({ err: error, username }, 'Failed to check username availability');
      throw error;
    }
  });

  /**
   * GET /api/users/interactions
   * Fetch all likes and comments on the authenticated user's posts
   * Excludes interactions from the user themselves
   * Response: Array of interactions ordered by createdAt DESC
   */
  app.fastify.get('/api/users/interactions', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    app.logger.info({}, 'Fetching user interactions');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      // Get all posts by the authenticated user
      const userPosts = await app.db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(eq(schema.posts.userId, session.user.id));

      if (userPosts.length === 0) {
        app.logger.info({ userId: session.user.id }, 'User has no posts');
        return [];
      }

      const postIds = userPosts.map(p => p.id);

      // Get all likes on user's posts (excluding likes by user themselves)
      const likes = await app.db
        .select({
          id: schema.likes.id,
          type: schema.likes.id, // placeholder for 'like' type
          userId: schema.likes.userId,
          postId: schema.likes.postId,
          createdAt: schema.likes.createdAt,
        })
        .from(schema.likes)
        .where(
          and(
            eq(schema.likes.postId, postIds[0]), // Start with first post
            ne(schema.likes.userId, session.user.id) // Exclude own interactions
          )
        );

      // Get all comments on user's posts (excluding comments by user themselves)
      const comments = await app.db
        .select({
          id: schema.comments.id,
          type: schema.comments.id, // placeholder for 'comment' type
          userId: schema.comments.userId,
          postId: schema.comments.postId,
          content: schema.comments.content,
          createdAt: schema.comments.createdAt,
        })
        .from(schema.comments)
        .where(
          and(
            eq(schema.comments.postId, postIds[0]), // Start with first post
            ne(schema.comments.userId, session.user.id) // Exclude own interactions
          )
        );

      // Manually fetch all likes and comments for each post
      const allInteractions: any[] = [];

      for (const postId of postIds) {
        // Get post content for context
        const post = await app.db.query.posts.findFirst({
          where: eq(schema.posts.id, postId),
          columns: { content: true },
        });

        // Get likes on this post
        const postLikes = await app.db
          .select({
            id: schema.likes.id,
            userId: schema.likes.userId,
            createdAt: schema.likes.createdAt,
          })
          .from(schema.likes)
          .where(
            and(
              eq(schema.likes.postId, postId),
              ne(schema.likes.userId, session.user.id)
            )
          );

        // Get comments on this post
        const postComments = await app.db
          .select({
            id: schema.comments.id,
            userId: schema.comments.userId,
            content: schema.comments.content,
            createdAt: schema.comments.createdAt,
          })
          .from(schema.comments)
          .where(
            and(
              eq(schema.comments.postId, postId),
              ne(schema.comments.userId, session.user.id)
            )
          );

        // Process likes
        for (const like of postLikes) {
          const interactorProfile = await app.db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.userId, like.userId),
            columns: { username: true },
          });

          allInteractions.push({
            id: like.id,
            type: 'like',
            interactorUserId: like.userId,
            interactorUsername: interactorProfile?.username || 'anonymous',
            postId,
            postContent: post?.content ? post.content.substring(0, 100) : null,
            createdAt: like.createdAt.toISOString(),
          });
        }

        // Process comments
        for (const comment of postComments) {
          const interactorProfile = await app.db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.userId, comment.userId),
            columns: { username: true },
          });

          allInteractions.push({
            id: comment.id,
            type: 'comment',
            interactorUserId: comment.userId,
            interactorUsername: interactorProfile?.username || 'anonymous',
            postId,
            postContent: post?.content ? post.content.substring(0, 100) : null,
            commentContent: comment.content,
            createdAt: comment.createdAt.toISOString(),
          });
        }
      }

      // Sort by createdAt DESC
      allInteractions.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      app.logger.info({ userId: session.user.id, count: allInteractions.length }, 'Interactions retrieved successfully');
      return allInteractions;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch interactions');
      throw error;
    }
  });

  /**
   * GET /api/auth/debug/users
   * Debug endpoint to check if user exists in the database
   * Query params: email (required)
   * Returns: user object if found, or "not found" if user doesn't exist
   */
  app.fastify.get('/api/auth/debug/users', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const query = request.query as { email?: string };
    const email = query.email?.toLowerCase().trim();

    if (!email) {
      app.logger.warn({}, 'Debug: No email provided in debug users endpoint');
      return reply.status(400).send({
        message: 'Email parameter is required'
      });
    }

    try {
      app.logger.info({ email }, 'Debug: Checking if user exists');

      const user = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      if (!user) {
        app.logger.info({ email }, 'Debug: User not found in database');
        return {
          found: false,
          message: 'User not found',
          email
        };
      }

      // Check if user has an account with password
      const account = await app.db.query.account.findFirst({
        where: eq(authSchema.account.userId, user.id),
      });

      app.logger.info({ email, userId: user.id, name: user.name, hasAccount: !!account }, 'Debug: User found in database');
      return {
        found: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          hasPasswordAccount: !!account && !!account.password,
          accountProvider: account?.providerId || null,
        }
      };
    } catch (error) {
      app.logger.error({ err: error, email }, 'Debug: Failed to check user');
      return reply.status(500).send({
        message: 'Failed to check user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/auth/debug/sessions
   * Debug endpoint to list all active sessions (requires authentication)
   * Returns: array of sessions for the current user
   */
  app.fastify.get('/api/auth/debug/sessions', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info({}, 'Debug: Fetching user sessions');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const sessions = await app.db.query.session.findMany({
        where: eq(authSchema.session.userId, session.user.id),
      });

      app.logger.info({ userId: session.user.id, count: sessions.length }, 'Debug: Sessions retrieved');
      return {
        userId: session.user.id,
        currentSession: session.session.id,
        totalSessions: sessions.length,
        sessions: sessions.map(s => ({
          id: s.id,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
          isCurrent: s.id === session.session.id,
        }))
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Debug: Failed to fetch sessions');
      throw error;
    }
  });
}
