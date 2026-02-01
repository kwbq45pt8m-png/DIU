import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProfileRoutes } from './routes/profiles.js';
import { registerPostRoutes } from './routes/posts.js';
import { registerLikeRoutes } from './routes/likes.js';
import { registerCommentRoutes } from './routes/comments.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerStampRoutes } from './routes/stamps.js';

// Combine both schema objects
const schema = { ...appSchema, ...authSchema };

// Create application with combined schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with Better Auth
// Supports email/password, Google OAuth, Apple OAuth, and phone number
app.withAuth();

// Enable file storage for S3 uploads
app.withStorage();

// Register route modules - add them AFTER app creation
registerAuthRoutes(app);
registerProfileRoutes(app);
registerPostRoutes(app);
registerLikeRoutes(app);
registerCommentRoutes(app);
registerMediaRoutes(app);
registerStampRoutes(app);

await app.run();
app.logger.info('DIU application running - Ready for posts, likes, and comments');
