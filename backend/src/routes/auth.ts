import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

/**
 * Auth Routes - handles post-registration username setup
 * Better Auth handles all authentication endpoints at /api/auth/*
 */
export function registerAuthRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/users/setup-username
   * Called after user registers/logs in to set their unique username
   * This is a required step after authentication
   */
  app.fastify.post('/api/users/setup-username', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; message?: string; profile?: any } | void> => {
    app.logger.info({ body: request.body }, 'Setting up username for user');

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

    // Check if username already exists
    const existingProfile = await app.db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.username, trimmedUsername))
      .limit(1);

    if (existingProfile.length > 0) {
      app.logger.warn({ username: trimmedUsername }, 'Username already exists');
      return reply.status(409).send({
        success: false,
        message: 'Username already taken'
      });
    }

    try {
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
        message: 'Failed to set username'
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
}
