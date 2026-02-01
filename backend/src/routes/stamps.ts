import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

/**
 * Stamps Routes - handles daily activity stamps/streaks
 */
export function registerStampRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/stamps/my-stamps
   * Get all daily stamps for the authenticated user
   * Returns array of stamp dates with timestamps
   */
  app.fastify.get('/api/stamps/my-stamps', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<Array<{ stampDate: string; createdAt: string }> | void> => {
    app.logger.info({}, 'Fetching user stamps');

    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const stamps = await app.db.query.dailyStamps.findMany({
        where: eq(schema.dailyStamps.userId, session.user.id),
        orderBy: desc(schema.dailyStamps.stampDate),
      });

      const formattedStamps = stamps.map(stamp => ({
        stampDate: stamp.stampDate,
        createdAt: stamp.createdAt.toISOString(),
      }));

      app.logger.info({ userId: session.user.id, count: formattedStamps.length }, 'User stamps retrieved successfully');
      return formattedStamps;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user stamps');
      throw error;
    }
  });
}
