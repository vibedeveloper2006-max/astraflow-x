import { GoogleGenerativeAI } from '@google/generative-ai';
import { Zone, AIChatResponse } from '../types';
import { logger } from '../utils/logger';
import { getPredictionConfidence } from './prediction-engine';

let genAI: GoogleGenerativeAI | null = null;

/** In-memory cache for AI responses to improve efficiency and reduce API costs. */
const responseCache = new Map<string, { response: AIChatResponse; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Initializes the Gemini AI service.
 * Falls back to mock mode if the API key is absent or is a placeholder.
 */
export function initGemini(): void {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_gemini_api_key') {
    genAI = new GoogleGenerativeAI(apiKey);
    logger.info('Gemini AI: Service initialized');
  } else {
    logger.warn('Gemini AI: API key missing — running in mock mode');
  }
}

/**
 * Generates a fingerprint for the current zone state for cache key derivation.
 * Rounds occupancy to buckets of 50 to reduce cache misses from minor fluctuations.
 */
function getZoneStateFingerprint(zones: Zone[]): string {
  return zones
    .map((z) => `${z.id}:${z.status}:${Math.round(z.currentOccupancy / 50)}`)
    .join('|');
}

/**
 * Constructs the AI system prompt containing live zone data.
 */
function buildSystemPrompt(zones: Zone[], role: string): string {
  const zoneData = zones.map((z) => ({
    name: z.name,
    id: z.id,
    status: z.status,
    predictedStatus: z.predictedStatus,
    occupancy: `${z.currentOccupancy}/${z.capacity}`,
    predicted: `${z.predictedOccupancy}/${z.capacity}`,
    waitTime: `${z.waitTime} min`,
    predictedWait: `${z.predictedWaitTime} min`,
    trend: z.congestionTrend,
    risk: z.riskScore,
  }));

  return `You are AstraFlow X — the AI crowd intelligence assistant for Sawai Mansingh Stadium, Jaipur.

ROLE: You are assisting a ${role}.
CURRENT TIME: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

LIVE ZONE DATA:
${JSON.stringify(zoneData, null, 2)}

INSTRUCTIONS:
- Answer questions about crowd conditions, wait times, routes, and predictions.
- For attendees: Be friendly, give practical navigation advice. Recommend least crowded alternatives.
- For staff: Be precise, give data-driven recommendations with confidence percentages. Suggest crowd redirect actions.
- Always reference actual data from the zones above.
- When suggesting routes, mention specific zone names.
- Highlight zones with "rising" trend as potential future problems.
- Keep responses concise but actionable (under 200 words).
- If asked about predictions, explain the trend direction and risk score.
- Format key info with bullet points for clarity.`;
}

/**
 * Removes stale entries from the response cache to prevent unbounded growth.
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, val] of responseCache.entries()) {
    if (now - val.timestamp > CACHE_TTL) responseCache.delete(key);
  }
}

/**
 * Main chat interface with Gemini AI.
 * Includes caching logic to improve efficiency and reduce API costs.
 * Falls back to a rule-based mock response if Gemini is unavailable.
 *
 * @param message - The user's message.
 * @param zones - Current live zone state.
 * @param role - User role: 'attendee' or 'staff'.
 */
export async function chatWithGemini(
  message: string,
  zones: Zone[],
  role: string = 'attendee'
): Promise<AIChatResponse> {
  const fingerprint = getZoneStateFingerprint(zones);
  const cacheKey = `${role}:${fingerprint}:${message.toLowerCase().trim()}`;

  // Return cached response if still fresh
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('Gemini AI: Serving response from cache');
    return cached.response;
  }

  if (!genAI) {
    return generateMockResponse(message, zones, role);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const systemPrompt = buildSystemPrompt(zones, role);

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User question: ${message}` },
    ]);

    const reply = result.response.text();

    // Extract zone IDs that are mentioned in the reply
    const relatedZones = zones
      .filter((z) => reply.toLowerCase().includes(z.name.toLowerCase()) || reply.includes(z.id))
      .map((z) => z.id);

    // Use data-driven confidence based on history depth for the primary zone
    const confidence = getPredictionConfidence(zones[0]?.id ?? 'zone-1');

    const response: AIChatResponse = {
      reply,
      confidence,
      relatedZones,
      suggestions: generateSuggestions(zones, role),
    };

    responseCache.set(cacheKey, { response, timestamp: Date.now() });

    // Periodically clean up stale cache entries
    if (responseCache.size > 100) {
      cleanupCache();
    }

    return response;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Gemini AI: API error', { error: errMsg });
    return generateMockResponse(message, zones, role);
  }
}

/**
 * Rule-based fallback response generator used when Gemini is unavailable.
 * Covers the most common query types: queues, predictions, routes, staff actions.
 */
function generateMockResponse(message: string, zones: Zone[], role: string): AIChatResponse {
  const msg = message.toLowerCase();
  const sortedByWait = [...zones].sort((a, b) => a.waitTime - b.waitTime);
  const criticalZones = zones.filter((z) => z.status === 'critical' || z.predictedStatus === 'critical');
  const clearZones = zones.filter((z) => z.status === 'clear');

  let reply: string;
  const relatedZones: string[] = [];

  if (
    msg.includes('queue') ||
    msg.includes('wait') ||
    msg.includes('shortest') ||
    msg.includes('least') ||
    msg.includes('crowded') ||
    msg.includes('busy') ||
    msg.includes('free')
  ) {
    let filteredZones = zones;
    let subject = 'zone';

    if (msg.includes('food') || msg.includes('court')) {
      filteredZones = zones.filter((z) => z.type === 'food_court');
      subject = 'food court';
    } else if (msg.includes('restroom') || msg.includes('bathroom') || msg.includes('toilet')) {
      filteredZones = zones.filter((z) => z.type === 'restroom');
      subject = 'restroom';
    } else if (msg.includes('gate') || msg.includes('entry') || msg.includes('exit')) {
      filteredZones = zones.filter((z) => z.type === 'entry_gate' || z.type === 'exit_gate');
      subject = 'gate';
    }

    const sortedFiltered = [...filteredZones].sort((a, b) => a.waitTime - b.waitTime);
    if (sortedFiltered.length === 0) {
      // Fallback if none match
      sortedFiltered.push(...sortedByWait);
    }

    const best = sortedFiltered[0];
    relatedZones.push(best.id);
    reply = `🎯 **Least crowded ${subject} right now:** ${best.name} with only ${best.waitTime} min wait time (${best.currentOccupancy}/${best.capacity} occupancy).\n\n`;
    
    if (sortedFiltered.length > 1) {
      reply += `**Alternatives:**\n`;
      for (const z of sortedFiltered.slice(1, 4)) {
        reply += `• ${z.name}: ~${z.waitTime} min wait\n`;
        relatedZones.push(z.id);
      }
    }
  } else if (msg.includes('predict') || msg.includes('future') || msg.includes('expect')) {
    const risingZones = zones.filter((z) => z.congestionTrend === 'rising');
    reply = `📊 **Crowd Predictions (next 15 min):**\n\n`;
    if (criticalZones.length > 0) {
      reply += `⚠️ **Zones approaching critical:**\n`;
      for (const z of criticalZones) {
        reply += `• ${z.name}: ${z.currentOccupancy} → ${z.predictedOccupancy} (risk: ${Math.round(z.riskScore * 100)}%)\n`;
        relatedZones.push(z.id);
      }
    }
    if (risingZones.length > 0) {
      reply += `\n📈 **Zones with rising congestion:**\n`;
      for (const z of risingZones.slice(0, 3)) {
        reply += `• ${z.name}: trending up\n`;
      }
    }
  } else if (msg.includes('route') || msg.includes('path') || msg.includes('navigate') || msg.includes('go')) {
    reply = `🗺️ **Best routes right now:**\n\n`;
    reply += `• **Least congested path:** Use ${clearZones.map((z) => z.name).join(' → ')}\n`;
    reply += `• **Avoid:** ${criticalZones.map((z) => z.name).join(', ') || 'No critical zones currently'}\n`;
    reply += `\n💡 **Tip:** ${clearZones[0]?.name || 'West Corridor'} has the lowest congestion right now.`;
  } else if (role === 'staff' && (msg.includes('recommend') || msg.includes('action') || msg.includes('redirect'))) {
    reply = `📋 **Staff Recommendations:**\n\n`;
    if (criticalZones.length > 0) {
      for (const z of criticalZones) {
        const alt = clearZones[0];
        reply += `• **Redirect** traffic from ${z.name} → ${alt?.name || 'alternative gates'} (${Math.round(z.riskScore * 100)}% confidence)\n`;
        relatedZones.push(z.id);
      }
    } else {
      reply += `✅ All zones are operating within normal parameters. No immediate action required.`;
    }
  } else {
    const totalOccupancy = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
    const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
    const sortedByRisk = [...zones].sort((a, b) => b.riskScore - a.riskScore);
    reply = `🏟️ **Stadium Overview:**\n\n`;
    reply += `• **Total occupancy:** ${totalOccupancy.toLocaleString()}/${totalCapacity.toLocaleString()} (${Math.round((totalOccupancy / totalCapacity) * 100)}%)\n`;
    reply += `• **Critical zones:** ${criticalZones.length}\n`;
    reply += `• **Clear zones:** ${clearZones.length}\n`;
    reply += `• **Highest risk:** ${sortedByRisk[0]?.name || 'None'}\n\n`;
    reply += `💬 Try asking about queues, predictions, routes, or specific zones!`;
  }

  return {
    reply,
    confidence: 0.85,
    relatedZones,
    suggestions: generateSuggestions(zones, role),
  };
}

/**
 * Generates context-aware follow-up suggestions based on user role.
 */
function generateSuggestions(_zones: Zone[], role: string): string[] {
  if (role === 'staff') {
    return [
      'Show crowd redirect recommendations',
      'Which zones need attention?',
      'Predict congestion for next 15 minutes',
      'Generate crowd management report',
    ];
  }
  return [
    'Where is the shortest queue?',
    'What is the best route to my seat?',
    'Will crowds get worse?',
    'Which food court is least crowded?',
  ];
}
