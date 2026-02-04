import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../utils/logger';

interface Persona {
  name: string;
  backgroundStory?: string | null;
  toneOfVoice: string;
  characterTraits: unknown;
  expertiseAreas: unknown;
  goals: unknown;
  writingGuidelines?: string | null;
  exampleResponses: unknown;
}

interface AnalysisResult {
  relevance_score: number;
  opportunity_type: string;
  reasoning: string;
  recommended_approach: string;
  should_engage: boolean;
  cautions: string[];
}

interface ProofreadResult {
  issues: string[];
  suggestions: string[];
  revised_text: string;
  approval_recommendation: boolean;
  confidence_score: number;
}

export type CommentLength = 'concise' | 'standard' | 'detailed';
export type CommentStyle = 'casual' | 'professional' | 'technical' | 'friendly';

export interface GenerationOptions {
  length?: CommentLength;
  style?: CommentStyle;
  brandVoice?: string;
  customInstructions?: string;
}

export interface RefinementOptions {
  action: 'shorten' | 'expand' | 'restyle';
  targetLength?: CommentLength;
  targetStyle?: CommentStyle;
  customInstructions?: string;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
}

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private google: GoogleGenerativeAI | null = null;
  private defaultProvider: 'openai' | 'anthropic' | 'google';
  private defaultModel: string;

  constructor() {
    this.defaultProvider = (process.env.AI_PROVIDER as 'openai' | 'anthropic' | 'google') || 'anthropic';
    this.defaultModel = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

    // Initialize clients if API keys are available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      this.google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
  }

  private getProvider(config?: AIConfig): 'openai' | 'anthropic' | 'google' {
    return config?.provider || this.defaultProvider;
  }

  private getModel(config?: AIConfig): string {
    return config?.model || this.defaultModel;
  }

  private getDefaultBrandContext(): string {
    return `
- CAROL Bike: AI-powered exercise bike using REHIT protocol
- REHIT: Reduced Exertion High-Intensity Training (2x20sec sprints)
- Key benefits: VO2max improvement, time efficiency (9-min workouts), science-backed
- Target audience: Busy professionals, biohackers, health-conscious adults 40+
- Differentiator: Based on University of Bath research, AI-personalized resistance
- Competitors: Peloton, NordicTrack, Echelon (position as science-focused alternative)
    `.trim();
  }

  private getLengthInstructions(length: CommentLength): string {
    switch (length) {
      case 'concise':
        return '- Keep response under 80 words - be brief and punchy\n- Get straight to the point, no filler';
      case 'detailed':
        return '- Response can be 200-300 words for comprehensive answers\n- Include relevant examples or explanations where helpful';
      case 'standard':
      default:
        return '- Keep response under 150 words\n- Balance conciseness with completeness';
    }
  }

  private getStyleInstructions(style: CommentStyle): string {
    switch (style) {
      case 'casual':
        return '- Use conversational, relaxed language\n- Contractions are fine, be approachable\n- Can use light humor if appropriate';
      case 'professional':
        return '- Use polished, business-appropriate language\n- Be articulate and measured\n- Avoid slang and casual expressions';
      case 'technical':
        return '- Use precise, technical terminology where appropriate\n- Include specifics, data, or research references\n- Assume reader has domain knowledge';
      case 'friendly':
      default:
        return '- Be warm and helpful\n- Show genuine interest\n- Encouraging and supportive tone';
    }
  }

  async analyzePost(post: {
    subreddit: string;
    title: string;
    content: string;
    score: number;
  }, config?: AIConfig): Promise<AnalysisResult> {
    const prompt = `
Analyze this Reddit post for engagement opportunity for CAROL Bike.

BRAND CONTEXT:
${this.getDefaultBrandContext()}

POST:
Subreddit: r/${post.subreddit}
Title: ${post.title}
Content: ${post.content}
Score: ${post.score}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "relevance_score": 1-10,
  "opportunity_type": "education|problem_solving|community|competitor|brand_mention",
  "reasoning": "Brief explanation of why this is/isn't relevant",
  "recommended_approach": "How to engage if relevant",
  "should_engage": true/false,
  "cautions": ["Any risks or considerations"]
}
    `.trim();

    const response = await this.complete(prompt, true, config);
    return JSON.parse(this.extractJson(response));
  }

  private extractJson(text: string): string {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
  }

  async generateResponse(params: {
    persona: Persona;
    subreddit: string;
    postTitle: string;
    postContent: string;
    options?: GenerationOptions;
    config?: AIConfig;
  }): Promise<string> {
    const { persona, subreddit, postTitle, postContent, options = {}, config } = params;

    const traits = Array.isArray(persona.characterTraits)
      ? persona.characterTraits.join(', ')
      : '';
    const areas = Array.isArray(persona.expertiseAreas)
      ? persona.expertiseAreas.join(', ')
      : '';
    const goals = Array.isArray(persona.goals)
      ? persona.goals.join(', ')
      : '';
    const examples = Array.isArray(persona.exampleResponses)
      ? persona.exampleResponses.map((ex, i) => `Example ${i + 1}: ${ex}`).join('\n')
      : '';

    const lengthInstructions = this.getLengthInstructions(options.length || 'standard');
    const styleInstructions = this.getStyleInstructions(options.style || 'friendly');
    const brandContext = options.brandVoice || this.getDefaultBrandContext();
    const customInstructions = options.customInstructions
      ? `\n=== CUSTOM INSTRUCTIONS ===\n${options.customInstructions}`
      : '';

    const prompt = `
You are writing a Reddit comment as the following persona:

=== PERSONA PROFILE ===
Name: ${persona.name}
Background: ${persona.backgroundStory || 'Not specified'}
Tone of Voice: ${persona.toneOfVoice}
Character Traits: ${traits}
Expertise Areas: ${areas}
Goals: ${goals}
Writing Guidelines: ${persona.writingGuidelines || 'None specified'}

=== EXAMPLE RESPONSES FROM THIS PERSONA ===
${examples}

=== BRAND CONTEXT ===
${brandContext}

=== LENGTH GUIDELINES ===
${lengthInstructions}

=== STYLE GUIDELINES ===
${styleInstructions}

=== ENGAGEMENT RULES ===
- Add genuine value FIRST; product mentions only if natural and relevant
- Maximum 80% value content, 20% product mention
- Respect subreddit r/${subreddit} rules
- Never sound promotional or like marketing copy
${customInstructions}

=== POST TO RESPOND TO ===
Subreddit: r/${subreddit}
Title: ${postTitle}
Content: ${postContent}

Write ONLY the comment text. Stay completely in character. Do not include any meta-commentary.
    `.trim();

    return this.complete(prompt, false, config);
  }

  async refineResponse(params: {
    currentDraft: string;
    subreddit: string;
    postTitle: string;
    persona?: Persona;
    options: RefinementOptions;
    config?: AIConfig;
  }): Promise<string> {
    const { currentDraft, subreddit, postTitle, persona, options, config } = params;

    let actionInstructions = '';
    switch (options.action) {
      case 'shorten':
        const targetLength = options.targetLength || 'concise';
        actionInstructions = `
Make this comment shorter and more concise.
${this.getLengthInstructions(targetLength)}
- Preserve the key message and value
- Remove filler words and unnecessary phrases
- Keep the same tone and persona voice`;
        break;
      case 'expand':
        actionInstructions = `
Expand this comment with more detail.
${this.getLengthInstructions('detailed')}
- Add relevant examples or explanations
- Keep the same tone and persona voice
- Don't make it feel padded`;
        break;
      case 'restyle':
        const targetStyle = options.targetStyle || 'friendly';
        actionInstructions = `
Rewrite this comment in a different style.
${this.getStyleInstructions(targetStyle)}
- Preserve the core message and information
- Adjust the tone and word choice
- Keep approximately the same length`;
        break;
    }

    const customInstructions = options.customInstructions
      ? `\nAdditional instructions: ${options.customInstructions}`
      : '';

    const prompt = `
You are refining a Reddit comment for r/${subreddit}.

=== ORIGINAL POST CONTEXT ===
Title: ${postTitle}

=== CURRENT DRAFT ===
${currentDraft}

=== REFINEMENT TASK ===
${actionInstructions}
${customInstructions}
${persona ? `\nMaintain the voice of persona "${persona.name}" with tone: ${persona.toneOfVoice}` : ''}

Write ONLY the refined comment text. No explanations or meta-commentary.
    `.trim();

    return this.complete(prompt, false, config);
  }

  async proofread(params: {
    draft: string;
    subreddit: string;
    persona?: Persona;
    config?: AIConfig;
  }): Promise<ProofreadResult> {
    const { draft, subreddit, persona, config } = params;

    const prompt = `
Review this Reddit comment draft for quality and brand safety.

PERSONA TONE: ${persona?.toneOfVoice || 'Casual, helpful'}
SUBREDDIT: r/${subreddit}

DRAFT:
${draft}

Check for:
1. Grammar and spelling errors
2. Tone consistency with persona
3. Promotional content ratio (should be max 20%)
4. Reddit etiquette compliance
5. Natural, human-like language
6. Any claims that need verification

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "issues": ["List of problems found"],
  "suggestions": ["Improvement suggestions"],
  "revised_text": "Improved version if needed",
  "approval_recommendation": true/false,
  "confidence_score": 1-10
}
    `.trim();

    const response = await this.complete(prompt, true, config);
    return JSON.parse(this.extractJson(response));
  }

  async complete(prompt: string, jsonMode: boolean, config?: AIConfig): Promise<string> {
    const provider = this.getProvider(config);
    const model = this.getModel(config);

    logger.info(`AI completion using provider: ${provider}, model: ${model}`);

    try {
      if (provider === 'anthropic') {
        if (!this.anthropic) {
          // Try to initialize if not already done
          if (process.env.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          } else {
            throw new Error('ANTHROPIC_API_KEY not configured');
          }
        }

        const response = await this.anthropic.messages.create({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = response.content.find(block => block.type === 'text');
        if (textBlock && 'text' in textBlock) {
          return textBlock.text;
        }
        return '';
      }

      if (provider === 'openai') {
        if (!this.openai) {
          if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          } else {
            throw new Error('OPENAI_API_KEY not configured');
          }
        }

        const response = await this.openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
          response_format: jsonMode ? { type: 'json_object' } : undefined,
        });

        return response.choices[0].message.content || '';
      }

      if (provider === 'google') {
        if (!this.google) {
          if (process.env.GOOGLE_AI_API_KEY) {
            this.google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
          } else {
            throw new Error('GOOGLE_AI_API_KEY not configured');
          }
        }

        const generativeModel = this.google.getGenerativeModel({ model });
        const result = await generativeModel.generateContent(prompt);
        const response = result.response;
        return response.text();
      }

      throw new Error('No AI provider configured');
    } catch (error) {
      logger.error('AI completion failed:', error);
      throw error;
    }
  }
}
