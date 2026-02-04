import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DiscoveryService } from '../../services/workflow/discovery.service';
import { redisHelpers } from '../../utils/redis';
import { getScheduler } from '../../services/scheduler/scheduler.service';

const fetchSchema = z.object({
  subreddits: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(25),
});

export class DiscoveryController {
  private discoveryService = new DiscoveryService();

  fetch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subreddits, keywords, limit } = fetchSchema.parse(req.body);

      const jobId = await this.discoveryService.triggerFetch({
        subreddits,
        keywords,
        limit,
        userId: req.user!.userId,
      });

      res.json({ jobId, message: 'Discovery job started' });
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.query;

      if (!jobId || typeof jobId !== 'string') {
        const latestJob = await redisHelpers.getJSON<{
          id: string;
          status: string;
          progress: number;
          discoveredCount: number;
        }>('discovery:latest');

        res.json(latestJob || { status: 'idle' });
        return;
      }

      const status = await this.discoveryService.getJobStatus(jobId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  };

  listJobs = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobs = await this.discoveryService.getRecentJobs();
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  };

  getScheduleInfo = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduler = getScheduler();
      const info = await scheduler.getScheduleInfo();
      res.json({
        ...info,
        intervalHours: parseInt(process.env.DISCOVERY_INTERVAL_HOURS || '2', 10),
        autoDiscoveryEnabled: true,
      });
    } catch (error) {
      next(error);
    }
  };
}
