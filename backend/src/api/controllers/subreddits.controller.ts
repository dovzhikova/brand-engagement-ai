import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

const subredditSchema = z.object({
  name: z.string().min(1).max(50),
  phase: z.number().min(1).default(1),
  selfPromoRules: z.string().optional(),
  minKarma: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export class SubredditsController {
  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subreddits = await prisma.subreddit.findMany({
        orderBy: [
          { phase: 'asc' },
          { name: 'asc' },
        ],
      });

      res.json(subreddits);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = subredditSchema.parse(req.body);

      // Normalize name (remove r/ prefix if present)
      const normalizedName = data.name.replace(/^r\//, '');

      const existing = await prisma.subreddit.findUnique({
        where: { name: normalizedName },
      });

      if (existing) {
        throw new ConflictError('Subreddit already exists');
      }

      const subreddit = await prisma.subreddit.create({
        data: {
          ...data,
          name: normalizedName,
        },
      });

      res.status(201).json(subreddit);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = subredditSchema.partial().parse(req.body);

      const existing = await prisma.subreddit.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Subreddit not found');
      }

      // If name is being updated, normalize it
      if (data.name) {
        data.name = data.name.replace(/^r\//, '');
      }

      const subreddit = await prisma.subreddit.update({
        where: { id },
        data,
      });

      res.json(subreddit);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await prisma.subreddit.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Subreddit not found');
      }

      await prisma.subreddit.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
