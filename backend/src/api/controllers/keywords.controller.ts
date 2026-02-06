import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError } from '../middleware/errorHandler';

const keywordSchema = z.object({
  keyword: z.string().min(1).max(100),
  category: z.enum(['core', 'competitor', 'broad', 'brand']).optional(),
  priority: z.number().min(1).max(3).default(2),
  searchVariants: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export class KeywordsController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keywords = await prisma.keyword.findMany({
        where: {
          brandId: req.brandId!,
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      res.json(keywords);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = keywordSchema.parse(req.body);

      const keyword = await prisma.keyword.create({
        data: {
          ...data,
          brandId: req.brandId!,
        },
      });

      res.status(201).json(keyword);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = keywordSchema.partial().parse(req.body);

      const existing = await prisma.keyword.findFirst({
        where: {
          id,
          brandId: req.brandId!,
        },
      });
      if (!existing) {
        throw new NotFoundError('Keyword not found');
      }

      const keyword = await prisma.keyword.update({
        where: { id },
        data,
      });

      res.json(keyword);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await prisma.keyword.findFirst({
        where: {
          id,
          brandId: req.brandId!,
        },
      });
      if (!existing) {
        throw new NotFoundError('Keyword not found');
      }

      await prisma.keyword.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
