import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';

const AVAILABLE_MODELS: Record<'anthropic' | 'openai' | 'google', string[]> = {
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-haiku-20240307'],
  openai: ['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
};

const updateSettingsSchema = z.object({
  aiProvider: z.enum(['anthropic', 'openai', 'google']).optional(),
  aiModel: z.string().optional(),
}).refine((data) => {
  if (data.aiProvider && data.aiModel) {
    const validModels = AVAILABLE_MODELS[data.aiProvider];
    return validModels.includes(data.aiModel);
  }
  return true;
}, {
  message: 'Invalid model for the selected provider',
});

export class SettingsController {
  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;

      let preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      // Return defaults if no preferences exist
      if (!preferences) {
        res.json({
          aiProvider: 'anthropic',
          aiModel: 'claude-sonnet-4-20250514',
          availableModels: AVAILABLE_MODELS,
        });
        return;
      }

      res.json({
        aiProvider: preferences.aiProvider,
        aiModel: preferences.aiModel,
        availableModels: AVAILABLE_MODELS,
      });
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = updateSettingsSchema.parse(req.body);

      // If only provider is changed, set default model for that provider
      let aiModel = data.aiModel;
      if (data.aiProvider && !data.aiModel) {
        aiModel = AVAILABLE_MODELS[data.aiProvider][0];
      }

      const preferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          ...(data.aiProvider && { aiProvider: data.aiProvider }),
          ...(aiModel && { aiModel }),
        },
        create: {
          userId,
          aiProvider: data.aiProvider || 'anthropic',
          aiModel: aiModel || 'claude-sonnet-4-20250514',
        },
      });

      res.json({
        aiProvider: preferences.aiProvider,
        aiModel: preferences.aiModel,
        availableModels: AVAILABLE_MODELS,
      });
    } catch (error) {
      next(error);
    }
  };
}
