import { GoogleGenerativeAI } from '@google/generative-ai';
import { eventBus } from '@aipm/event-bus';
import type { Message } from '@aipm/shared';

export interface ExtractedEntity {
  type: 'task' | 'risk' | 'decision' | 'dependency';
  title: string;
  description?: string;
  owner?: string;
  deadline?: string;
  priority?: number;
  severity?: string;
  probability?: string;
  rationale?: string;
  dependsOn?: string;
  confidence: number;
  [key: string]: any;
}

export interface ParseResult {
  entities: ExtractedEntity[];
}

/**
 * ParserAgent - Extracts structured PM entities from WhatsApp messages
 *
 * Uses Google Gemini API with JSON schema to extract:
 * - Tasks (with owner, deadline, priority)
 * - Risks (with severity, probability)
 * - Decisions (with rationale)
 * - Dependencies (task relationships)
 */
export class ParserAgent {
  private genAI!: GoogleGenerativeAI;
  private model: any;
  private isEnabled: boolean = false;

  constructor(apiKey?: string) {
    if (!apiKey) {
      console.warn('⚠️  [ParserAgent] No API key provided - agent disabled');
      this.isEnabled = false;
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.1, // Low temp for structured extraction
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048
      }
    });
    this.isEnabled = true;
    console.log('✅ [ParserAgent] Initialized with Gemini API');
  }

  /**
   * Build system prompt for extraction
   */
  private buildSystemPrompt(context: {
    currentDate: string;
    currentTime: string;
    groupName: string;
    projectName?: string;
  }): string {
    return `You are a PM Parser Agent. Extract project management entities from WhatsApp messages.

CONTEXT:
- Timezone: Asia/Dubai (Gulf Standard Time)
- Today: ${context.currentDate}
- Current time: ${context.currentTime}
- Group: ${context.groupName}
- Project: ${context.projectName || 'Unknown'}

EXTRACTION RULES:

1. TASKS - Any commitment, action item, or deliverable
   Examples:
   - "John will complete API by Friday"
   - "Need to review the design docs"
   - "Deploy to staging tonight"
   - "I'll handle the database migration"

   Extract: title, owner (if mentioned), deadline (if mentioned), priority (1-4)

2. RISKS - Concerns, blockers, potential issues
   Examples:
   - "We might miss the deadline due to resource shortage"
   - "Database migration could fail"
   - "Worried about the integration complexity"

   Extract: title, description, severity (critical|high|medium|low), probability (very_likely|likely|possible|unlikely)

3. DECISIONS - Choices made, approvals given
   Examples:
   - "We'll use PostgreSQL instead of MySQL"
   - "Approved budget increase"
   - "Decision: proceed with option B"

   Extract: title, description, rationale (if mentioned)

4. DEPENDENCIES - Task relationships
   Examples:
   - "Can't start testing until dev is done"
   - "Backend must be ready before frontend"
   - "Waiting for API completion to begin integration"

   Extract: task_title, depends_on_title

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "entities": [
    {
      "type": "task",
      "title": "Complete API integration",
      "description": "Detailed description if available",
      "owner": "John" or phone number if mentioned,
      "deadline": "ISO 8601 string or null",
      "priority": 1-4 (1=critical, 4=low),
      "confidence": 0.0-1.0
    },
    {
      "type": "risk",
      "title": "Brief risk title",
      "description": "Risk description",
      "severity": "critical|high|medium|low",
      "probability": "very_likely|likely|possible|unlikely",
      "confidence": 0.0-1.0
    },
    {
      "type": "decision",
      "title": "Decision summary",
      "description": "Details",
      "rationale": "Why this was decided",
      "confidence": 0.0-1.0
    },
    {
      "type": "dependency",
      "task_title": "Task that is blocked",
      "depends_on_title": "Task that must complete first",
      "confidence": 0.0-1.0
    }
  ]
}

If no entities found, return: {"entities": []}

DATE PARSING RULES:
- "Friday" → next Friday from ${context.currentDate}
- "tomorrow" → tomorrow's date
- "end of week" → next Sunday
- "5 PM" / "17:00" → today at 17:00 Asia/Dubai
- "EOD" → today at 18:00 Asia/Dubai
- "next week" → 7 days from today

PRIORITY INFERENCE:
- "urgent", "ASAP", "critical" → priority 1
- "important", "high priority" → priority 2
- "normal", no mention → priority 3
- "low priority", "when possible" → priority 4

CONFIDENCE SCORING:
- Explicit commitment with owner and deadline → 0.9-1.0
- Clear action with owner but no deadline → 0.7-0.9
- Implied task or vague commitment → 0.5-0.7
- Uncertain or question-based → 0.3-0.5
- Very ambiguous → below 0.3 (don't extract)

IMPORTANT:
- Only extract entities with confidence >= 0.5
- Be conservative - it's better to miss an entity than create false positives
- If a message is just casual chat, return empty entities array
- Preserve the original language/tone in titles and descriptions`;
  }

  /**
   * Parse a WhatsApp message and extract PM entities
   */
  async parseMessage(
    message: Message,
    context: {
      groupName: string;
      projectName?: string;
    }
  ): Promise<ParseResult> {
    if (!this.isEnabled) {
      console.log('⚠️  [ParserAgent] Agent disabled - skipping parsing');
      return { entities: [] };
    }

    try {
      const now = new Date();

      // Format dates for Dubai timezone
      const dubaiTime = now.toLocaleString('en-US', {
        timeZone: 'Asia/Dubai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const prompt = this.buildSystemPrompt({
        currentDate: now.toISOString().split('T')[0],
        currentTime: dubaiTime,
        groupName: context.groupName,
        projectName: context.projectName
      });

      const fullPrompt = `${prompt}

MESSAGE TO ANALYZE:
Author: ${message.authorName || message.author}
Timestamp: ${new Date(message.timestamp).toISOString()}
Text: ${message.text}

Extract entities (return JSON only):`;

      console.log('🧠 [ParserAgent] Analyzing message:', message.text.substring(0, 100) + '...');

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      let parsed: ParseResult;
      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ [ParserAgent] Failed to parse JSON response:', text);
        return { entities: [] };
      }

      // Filter out low-confidence entities
      const highConfidenceEntities = parsed.entities.filter(e => e.confidence >= 0.5);

      console.log(`✅ [ParserAgent] Extracted ${highConfidenceEntities.length} entities (${parsed.entities.length - highConfidenceEntities.length} filtered out)`);

      // Publish events for each high-confidence entity
      for (const entity of highConfidenceEntities) {
        const eventType =
          entity.type === 'task' ? 'task:created' :
          entity.type === 'risk' ? 'risk:identified' :
          entity.type === 'decision' ? 'decision:made' :
          'task:created'; // dependency creates a task link

        eventBus.publish(eventType, 'parser-agent', {
          entity,
          sourceMessage: message,
          extractedAt: Date.now()
        });

        console.log(`📢 [ParserAgent] Published ${eventType}: ${entity.title} (confidence: ${entity.confidence})`);
      }

      return { entities: highConfidenceEntities };

    } catch (error) {
      console.error('❌ [ParserAgent] Error during parsing:', error);

      // Check for specific Gemini errors
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          console.error('❌ [ParserAgent] Invalid API key');
        } else if (error.message.includes('503')) {
          console.error('⚠️  [ParserAgent] Gemini API overloaded, try again later');
        } else if (error.message.includes('quota')) {
          console.error('❌ [ParserAgent] API quota exceeded');
        }
      }

      return { entities: [] };
    }
  }

  /**
   * Parse multiple messages in batch
   */
  async parseMessages(
    messages: Message[],
    context: {
      groupName: string;
      projectName?: string;
    }
  ): Promise<ParseResult[]> {
    console.log(`🧠 [ParserAgent] Batch parsing ${messages.length} messages...`);

    const results: ParseResult[] = [];

    for (const message of messages) {
      const result = await this.parseMessage(message, context);
      results.push(result);

      // Small delay to avoid rate limiting
      if (messages.length > 5) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const totalEntities = results.reduce((sum, r) => sum + r.entities.length, 0);
    console.log(`✅ [ParserAgent] Batch complete: ${totalEntities} total entities extracted`);

    return results;
  }

  /**
   * Check if agent is enabled and ready
   */
  isReady(): boolean {
    return this.isEnabled;
  }

  /**
   * Update API key and re-initialize
   */
  updateApiKey(apiKey: string): void {
    if (!apiKey) {
      this.isEnabled = false;
      console.warn('⚠️  [ParserAgent] API key removed - agent disabled');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048
      }
    });
    this.isEnabled = true;
    console.log('✅ [ParserAgent] API key updated - agent re-enabled');
  }
}
