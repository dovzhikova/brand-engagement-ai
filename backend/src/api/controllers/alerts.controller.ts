import { Request, Response, NextFunction } from 'express';
import { competitorAlertService } from '../../services/alerts/competitor.service';

export class AlertsController {
  getCompetitorMentions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { priority, competitor, limit } = req.query;

      const mentions = await competitorAlertService.getCompetitorMentions({
        priority: priority as 'high' | 'medium' | 'low' | undefined,
        competitor: competitor as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        count: mentions.length,
        mentions,
      });
    } catch (error) {
      next(error);
    }
  };

  getCompetitorSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await competitorAlertService.getCompetitorSummary();
      res.json(summary);
    } catch (error) {
      next(error);
    }
  };

  getTrackedCompetitors = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const competitors = competitorAlertService.getTrackedCompetitors();
      res.json(competitors);
    } catch (error) {
      next(error);
    }
  };

  analyzePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, content } = req.body;

      if (!title) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }

      const analysis = competitorAlertService.analyzePost(title, content);

      res.json({
        hasCompetitorMention: analysis !== null,
        analysis,
      });
    } catch (error) {
      next(error);
    }
  };
}
