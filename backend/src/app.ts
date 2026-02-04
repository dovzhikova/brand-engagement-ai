import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './api/routes/auth.routes';
import accountRoutes from './api/routes/accounts.routes';
import personaRoutes from './api/routes/personas.routes';
import engagementRoutes from './api/routes/engagements.routes';
import discoveryRoutes from './api/routes/discovery.routes';
import keywordRoutes from './api/routes/keywords.routes';
import subredditRoutes from './api/routes/subreddits.routes';
import analyticsRoutes from './api/routes/analytics.routes';
import alertsRoutes from './api/routes/alerts.routes';
import gscRoutes from './api/routes/gsc.routes';
import youtubeRoutes from './api/routes/youtube.routes';
import settingsRoutes from './api/routes/settings.routes';
import referralsRoutes from './api/routes/referrals.routes';
import { errorHandler } from './api/middleware/errorHandler';
import { logger } from './utils/logger';

const app: Express = express();

// Trust proxy for Railway/reverse proxy environments
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - require explicit FRONTEND_URL in production
const corsOrigin = process.env.FRONTEND_URL || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('FRONTEND_URL must be set in production'); })()
    : 'http://localhost:3000'
);
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Rate limiting - 100 requests per minute per user
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/engagements', engagementRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/subreddits', subredditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/gsc', gscRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/referrals', referralsRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

export default app;
