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
   * Update current user's profile (bio, username, etc)
   * Body: { username?: string, bio?: string }
   */
  app.fastify.put('/api/profiles/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info({ body: request.body }, 'Updating user profile');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const { bio, username } = request.body as { bio?: string; username?: string };

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

      // Validate and process username if provided
      let newUsername = existingProfile.username;
      if (username !== undefined) {
        // Validate username format (3-20 chars, alphanumeric + underscore only)
        if (!username || username.length < 3 || username.length > 20) {
          app.logger.warn({ userId: session.user.id, username }, 'Invalid username length');
          return reply.status(400).send({
            message: 'Username must be 3-20 characters long'
          });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          app.logger.warn({ userId: session.user.id, username }, 'Invalid username format');
          return reply.status(400).send({
            message: 'Username can only contain letters, numbers, and underscores'
          });
        }

        // Check if username is already taken (by another user)
        if (username !== existingProfile.username) {
          const existingUsername = await app.db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.username, username),
          });

          if (existingUsername) {
            app.logger.warn({ username }, 'Username already taken');
            return reply.status(400).send({
              message: 'Username already taken'
            });
          }
        }

        newUsername = username;
      }

      // Update profile
      const [updated] = await app.db
        .update(schema.userProfiles)
        .set({
          username: newUsername,
          bio: bio !== undefined ? bio || null : existingProfile.bio,
          updatedAt: new Date(),
        })
        .where(eq(schema.userProfiles.userId, session.user.id))
        .returning();

      app.logger.info({ userId: session.user.id, username: newUsername, bio }, 'Profile updated successfully');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to update profile');
      throw error;
    }
  });

  /**
   * PUT /api/users/profile
   * Alias for PUT /api/profiles/me for backward compatibility
   * Update current user's profile (username, bio, etc)
   * Body: { username?: string, bio?: string }
   */
  app.fastify.put('/api/users/profile', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info({ body: request.body }, 'Updating user profile via /api/users/profile');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const { bio, username } = request.body as { bio?: string; username?: string };

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

      // Validate and process username if provided
      let newUsername = existingProfile.username;
      if (username !== undefined) {
        // Validate username format (3-20 chars, alphanumeric + underscore only)
        if (!username || username.length < 3 || username.length > 20) {
          app.logger.warn({ userId: session.user.id, username }, 'Invalid username length');
          return reply.status(400).send({
            message: 'Username must be 3-20 characters long'
          });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          app.logger.warn({ userId: session.user.id, username }, 'Invalid username format');
          return reply.status(400).send({
            message: 'Username can only contain letters, numbers, and underscores'
          });
        }

        // Check if username is already taken (by another user)
        if (username !== existingProfile.username) {
          const existingUsername = await app.db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.username, username),
          });

          if (existingUsername) {
            app.logger.warn({ username }, 'Username already taken');
            return reply.status(400).send({
              message: 'Username already taken'
            });
          }
        }

        newUsername = username;
      }

      // Update profile
      const [updated] = await app.db
        .update(schema.userProfiles)
        .set({
          username: newUsername,
          bio: bio !== undefined ? bio || null : existingProfile.bio,
          updatedAt: new Date(),
        })
        .where(eq(schema.userProfiles.userId, session.user.id))
        .returning();

      app.logger.info({ userId: session.user.id, username: newUsername, bio }, 'Profile updated successfully');
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
