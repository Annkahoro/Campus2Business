import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { corsOrigins, isProd } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { ApiError } from './utils/ApiError.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();

app.set('trust proxy', 1); // Render sits behind a proxy (needed for rate limiting by IP)

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, server-to-server) that send no Origin header.
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      return callback(ApiError.forbidden('CORS_NOT_ALLOWED', `Origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
