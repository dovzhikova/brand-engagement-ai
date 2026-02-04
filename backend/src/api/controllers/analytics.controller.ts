import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AnalyticsService } from '../../services/analytics/analytics.service';
import { NotFoundError } from '../middleware/errorHandler';

const trendsQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
});

export class AnalyticsController {
  private analyticsService = new AnalyticsService();

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.analyticsService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  getTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { days } = trendsQuerySchema.parse(req.query);
      const trends = await this.analyticsService.getTrends(days);
      res.json(trends);
    } catch (error) {
      next(error);
    }
  };

  getAccountPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const performance = await this.analyticsService.getAccountPerformance(id);

      if (!performance) {
        throw new NotFoundError('Account not found');
      }

      res.json(performance);
    } catch (error) {
      next(error);
    }
  };

  getSubredditPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const performance = await this.analyticsService.getSubredditPerformance();
      res.json(performance);
    } catch (error) {
      next(error);
    }
  };
}
