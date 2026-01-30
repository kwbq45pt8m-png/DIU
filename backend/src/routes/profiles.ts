import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

/**
 * Profile Routes - handles user profile viewing and updates
 */
export function registerProfileRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/profiles/:username
   * Get a user's profile by username (public endpoint)
   */
  app.fastify.get('/api/profiles/:username', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ id: string; userId: string; username: string; bio: string | null; createdAt: Date } | void> => {
    const { username } = request.params as { username: string };

    app.logger.info({ username }, 'Fetching user profile by username');

    try {
      const profile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.username, username),
        columns: {
          id: true,
          userId: true,
          username: true,
          bio: true,
          createdAt: true,
        },
      });

      if (!profile) {
        app.logger.warn({ username }, 'Profile not found');
        return reply.status(404).send({
          message: 'User profile not found'
        });
      }

      app.logger.info({ username }, 'Profile retrieved successfully');
      return profile;
    } catch (error) {
      app.logger.error({ err: error, username }, 'Failed to fetch profile');
      throw error;
    }
  });

  /**
   * PUT /api/profiles/me
   * Update current user's profile (bio, etc)
   */
  app.fastify.put('/api/profiles/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info({ body: request.body }, 'Updating user profile');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const { bio } = request.body as { bio?: string };

    try {
      // Get user's profile first
      const existingProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, session.user.id),
      });

      if (!existingProfile) {
        app.logger.warn({ userId: session.user.id }, 'User profile not found');
        return reply.status(404).send({
          message: 'Profile not found. Please set up username first.'
        });
      }

      // Update profile
      const [updated] = await app.db
        .update(schema.userProfiles)
        .set({
          bio: bio || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.userProfiles.userId, session.user.id))
        .returning();

      app.logger.info({ userId: session.user.id, bio }, 'Profile updated successfully');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to update profile');
      throw error;
    }
  });

  /**
   * GET /api/profiles/me
   * Get current user's profile
   */
  app.fastify.get('/api/profiles/me', async (
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
        app.logger.warn({ userId: session.user.id }, 'User profile not found');
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
}
