import { Router, Request, Response } from 'express';
import { Zone, AIChatRequestSchema } from '../types';
import { chatWithGemini } from '../services/gemini';
import { validateBody } from '../middleware/validation';
import { aiLimiter } from '../middleware/rate-limiter';

export function createAIRoutes(getZones: () => Zone[]): Router {
  const router = Router();

  // POST /api/ai/chat — chat with AI assistant
  router.post('/chat', aiLimiter, validateBody(AIChatRequestSchema), async (req: Request, res: Response) => {
    try {
      const { message, role } = req.body;
      const zones = getZones();
      const userRole = role ?? req.user?.role ?? 'attendee';

      const response = await chatWithGemini(message, zones, userRole);

      res.json({ success: true, data: response, timestamp: Date.now() });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'AI service temporarily unavailable',
        timestamp: Date.now(),
      });
    }
  });

  return router;
}
