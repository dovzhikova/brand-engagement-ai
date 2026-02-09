import { AIService, BrandContext } from '../ai/ai.service';
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
   * Build brand context string for prompts
   */
  private buildBrandContextString(brand: BrandContext): string {
    const differentiators = Array.isArray(brand.keyDifferentiators) && brand.keyDifferentiators.length > 0
      ? brand.keyDifferentiators.join(', ')
      : 'Not specified';

    return `
- Brand: ${brand.name}
- Product/Service: ${brand.productDescription || brand.description || 'Not specified'}
- Target Audience: ${brand.targetAudience || 'Not specified'}
- Key Differentiators: ${differentiators}
    `.trim();
  }

  /**
   * Analyze a YouTube channel for relevance to your brand
   * @param channel - Channel data to analyze
   * @param videos - Recent videos from the channel
   * @param brand - Brand context (required)
   */
  async analyzeChannel(channel: ChannelData, videos: VideoData[], brand: BrandContext): Promise<ChannelAnalysis> {
    if (!brand || (!brand.productDescription && !brand.description)) {
      throw new Error('Brand settings required. Please configure your brand (product description, target audience) in Brand Settings before analyzing YouTube channels.');
    }

    const brandContext = this.buildBrandContextString(brand);
    const videoTitles = videos.map((v) => v.title).join('\n- ');
    const videoDescriptions = videos
      .filter((v) => v.description)
      .slice(0, 3) // Limit to first 3 for context length
      .map((v) => v.description!.substring(0, 200))
      .join('\n\n');

    const prompt = `
Analyze this YouTube channel for potential collaboration or monitoring for your brand.

=== BRAND CONTEXT ===
${brandContext}

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
   * @param video - Video data to analyze
   * @param brand - Brand context (required)
   */
  async analyzeVideoRelevance(video: VideoData, brand: BrandContext): Promise<number> {
    if (!brand || (!brand.productDescription && !brand.description)) {
      throw new Error('Brand settings required. Please configure your brand in Brand Settings before analyzing videos.');
    }

    const prompt = `
Rate how relevant this YouTube video is to the following brand on a scale of 1-10.

Brand: ${brand.name}
Product/Service: ${brand.productDescription || brand.description || 'Not specified'}
Target Audience: ${brand.targetAudience || 'Not specified'}

Video Title: ${video.title}
Description: ${video.description?.substring(0, 500) || 'No description'}

Consider:
- Is the content relevant to the brand's product/service?
- Would the video's audience be interested in this brand?
- Does it align with the brand's target audience?

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
