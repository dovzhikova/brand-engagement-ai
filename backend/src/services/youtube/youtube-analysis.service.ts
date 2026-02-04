import { AIService } from '../ai/ai.service';
import { logger } from '../../utils/logger';

interface ChannelData {
  name: string;
  description: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
}

interface VideoData {
  title: string;
  description: string | null;
  viewCount: number | null;
}

interface ChannelAnalysis {
  relevanceScore: number;
  category: 'influencer' | 'competitor' | 'opportunity' | 'low_fit';
  reasoning: string;
  contentTopics: string[];
  audienceAlignment: string;
  collaborationPotential: string;
  cautions: string[];
}

export class YouTubeAnalysisService {
  private aiService = new AIService();

  /**
   * Analyze a YouTube channel for relevance to your brand
   */
  async analyzeChannel(channel: ChannelData, videos: VideoData[]): Promise<ChannelAnalysis> {
    const videoTitles = videos.map((v) => v.title).join('\n- ');
    const videoDescriptions = videos
      .filter((v) => v.description)
      .slice(0, 3) // Limit to first 3 for context length
      .map((v) => v.description!.substring(0, 200))
      .join('\n\n');

    const prompt = `
Analyze this YouTube channel for potential collaboration or monitoring for your brand.

=== BRAND CONTEXT ===
- your brand: AI-powered exercise bike using REHIT protocol
- REHIT: Reduced Exertion High-Intensity Training (2x20sec sprints)
- Key benefits: VO2max improvement, time efficiency (9-min workouts), science-backed
- Target audience: Busy professionals, biohackers, health-conscious adults 40+
- Differentiator: Based on University of Bath research, AI-personalized resistance

=== CHANNEL INFO ===
Name: ${channel.name}
Description: ${channel.description || 'No description'}
Subscribers: ${channel.subscriberCount?.toLocaleString() || 'Hidden'}
Video Count: ${channel.videoCount || 'Unknown'}

=== RECENT VIDEO TITLES ===
- ${videoTitles || 'No videos available'}

=== SAMPLE VIDEO DESCRIPTIONS ===
${videoDescriptions || 'No descriptions available'}

=== ANALYSIS TASK ===
Evaluate this channel's relevance to your brand for:
1. Influencer outreach (potential sponsorship/collaboration)
2. Competitor monitoring (competing products/messaging)
3. Content opportunities (educational content, reviews)

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "relevance_score": 1-10,
  "category": "influencer|competitor|opportunity|low_fit",
  "reasoning": "Brief explanation of relevance",
  "content_topics": ["list", "of", "main", "topics"],
  "audience_alignment": "How well their audience matches your brand's target",
  "collaboration_potential": "What type of collaboration might work",
  "cautions": ["Any risks or considerations"]
}
    `.trim();

    try {
      const response = await this.aiService.complete(prompt, true);
      const parsed = this.parseResponse(response);

      return {
        relevanceScore: parsed.relevance_score,
        category: parsed.category,
        reasoning: parsed.reasoning,
        contentTopics: parsed.content_topics || [],
        audienceAlignment: parsed.audience_alignment,
        collaborationPotential: parsed.collaboration_potential,
        cautions: parsed.cautions || [],
      };
    } catch (error) {
      logger.error('Failed to analyze YouTube channel:', error);

      // Return default analysis on error
      return {
        relevanceScore: 0,
        category: 'low_fit',
        reasoning: 'Analysis failed',
        contentTopics: [],
        audienceAlignment: 'Unknown',
        collaborationPotential: 'Unknown',
        cautions: ['Analysis could not be completed'],
      };
    }
  }

  /**
   * Analyze individual video relevance
   */
  async analyzeVideoRelevance(video: VideoData): Promise<number> {
    const prompt = `
Rate how relevant this YouTube video is to your brand (AI-powered REHIT exercise bike) on a scale of 1-10.

Video Title: ${video.title}
Description: ${video.description?.substring(0, 500) || 'No description'}

Consider:
- Is it about fitness, exercise, or health?
- Does it discuss exercise bikes, home workouts, or HIIT?
- Would the audience be interested in an AI exercise bike?

Respond with ONLY a number from 1-10.
    `.trim();

    try {
      const response = await this.aiService.complete(prompt, false);
      const score = parseInt(response.trim(), 10);
      return isNaN(score) ? 5 : Math.min(10, Math.max(1, score));
    } catch (error) {
      logger.error('Failed to analyze video relevance:', error);
      return 5; // Default middle score
    }
  }

  private parseResponse(response: string): {
    relevance_score: number;
    category: 'influencer' | 'competitor' | 'opportunity' | 'low_fit';
    reasoning: string;
    content_topics: string[];
    audience_alignment: string;
    collaboration_potential: string;
    cautions: string[];
  } {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    return JSON.parse(cleaned.trim());
  }
}
