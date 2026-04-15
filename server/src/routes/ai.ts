import { Router, Request, Response } from 'express';
import { Zone, AIChatRequestSchema } from '../types';
import { chatWithGemini } from '../services/gemini';
import { validateBody } from '../middleware/validation';
import { aiLimiter } from '../middleware/rate-limiter';
import { sanitizeText } from '../utils/sanitize';
import { logger } from '../utils/logger';

/**
 * Creates the AI chat route.
 * Applies rate limiting, request validation, and input sanitization
 * before forwarding to the Gemini service.
 *
 * @param getZones - Getter for current in-memory zone state.
 */
export function createAIRoutes(getZones: () => Zone[]): Router {
  const router = Router();

  /**
   * POST /api/ai/chat
   * Chat with the AstraFlow X AI assistant.
   * Body: { message: string, role?: 'attendee' | 'staff' }
   */
  router.post('/chat', aiLimiter, validateBody(AIChatRequestSchema), async (req: Request, res: Response) => {
    try {
      const { message, role } = req.body as { message: string; role?: string };
      const zones = getZones();
      const userRole = role ?? req.user?.role ?? 'attendee';

      // Sanitize user message before passing to AI to prevent prompt injection
      const safeMessage = sanitizeText(message, 1000);

      const response = await chatWithGemini(safeMessage, zones, userRole);

      res.json({ success: true, data: response, timestamp: Date.now() });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('AI route error', { error: errMsg });
      res.status(500).json({
        success: false,
        error: 'AI service temporarily unavailable',
        timestamp: Date.now(),
      });
    }
  });

  return router;
}
