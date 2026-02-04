import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError } from '../middleware/errorHandler';

const personaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  toneOfVoice: z.string().min(1),
  goals: z.array(z.string()).default([]),
  characterTraits: z.array(z.string()).default([]),
  backgroundStory: z.string().optional(),
  expertiseAreas: z.array(z.string()).default([]),
  writingGuidelines: z.string().optional(),
  exampleResponses: z.array(z.string()).default([]),
});

export class PersonasController {
  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personas = await prisma.persona.findMany({
        include: {
          _count: {
            select: { redditAccounts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(personas);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const persona = await prisma.persona.findUnique({
        where: { id },
        include: {
          redditAccounts: {
            select: {
              id: true,
              username: true,
              status: true,
            },
          },
        },
      });

      if (!persona) {
        throw new NotFoundError('Persona not found');
      }

      res.json(persona);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = personaSchema.parse(req.body);

      const persona = await prisma.persona.create({
        data,
      });

      res.status(201).json(persona);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = personaSchema.partial().parse(req.body);

      const existing = await prisma.persona.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Persona not found');
      }

      const persona = await prisma.persona.update({
        where: { id },
        data,
      });

      res.json(persona);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await prisma.persona.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Persona not found');
      }

      await prisma.persona.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
