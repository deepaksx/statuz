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
  // SCRUM fields
  workItemType?: 'epic' | 'story' | 'task' | 'subtask';
  storyPoints?: number;
  acceptanceCriteria?: string[];
  // SAP fields
  sapModule?: string;
  sapTcode?: string;
  sapObjectType?: string;
  sapTransportRequest?: string;
  aiRecommendation?: string;
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
   * Build system prompt for extraction with SAP expertise and SCRUM classification
   */
  private buildSystemPrompt(context: {
    currentDate: string;
    currentTime: string;
    groupName: string;
    projectName?: string;
  }): string {
    return `You are an expert SAP Project Manager and SCRUM Master AI. Extract entities from WhatsApp messages using SAP domain knowledge and SCRUM principles.

CONTEXT:
- Timezone: Asia/Dubai (Gulf Standard Time)
- Today: ${context.currentDate}
- Current time: ${context.currentTime}
- Group: ${context.groupName}
- Project: ${context.projectName || 'Unknown'}

🎯 SAP DOMAIN EXPERTISE:
You have deep knowledge of:
- SAP ERP (all modules: FI, CO, MM, SD, PP, QM, PM, HR, PS)
- ABAP development, debugging, and performance tuning
- SAP BASIS administration, transport management
- SAP S/4HANA, BW/4HANA, Fiori
- Transaction codes (VA01, ME21N, FB50, etc.)
- Common SAP issues and best practice solutions

🏃 SCRUM CLASSIFICATION:
Classify each task into SCRUM hierarchy:
- **Epic**: Large strategic initiative (3+ months, multiple stories)
  Examples: "S/4HANA Migration", "Implement full O2C process"
- **Story**: User-facing feature (1-4 weeks, delivers value)
  Examples: "Enable PO approval workflow", "Create custom invoice report"
- **Task**: Technical work item (1-5 days, part of story)
  Examples: "Develop ABAP function for validation", "Configure ME21N fields"
- **Subtask**: Small work unit (<1 day)
  Examples: "Write unit test", "Update documentation"

EXTRACTION RULES:

1. TASKS - Commitments, action items, deliverables
   SAP Examples:
   - "Please import TR P01K905013 to PRD"
   - "Check dump in ST22 for quotation issue"
   - "Create transport for ZABAP objects in Z001"
   - "Approve TR to production"

   Extract:
   - title, description, owner, deadline, priority (1-4)
   - workItemType (epic|story|task|subtask)
   - storyPoints (1-13 Fibonacci, for stories only)
   - sapModule (FI|CO|MM|SD|PP|QM|PM|HR|ABAP|BASIS|BW)
   - sapTcode (VA01, ME21N, etc if mentioned)
   - sapObjectType (Program, Report, Function, Table, etc)
   - sapTransportRequest (TR number like P01K905013)
   - aiRecommendation (your expert suggestion to resolve/improve)

2. RISKS - Issues, blockers, concerns
   SAP Examples:
   - "TR movement failing for ZABAP package"
   - "Dump in VA22 when deleting quotation lines"
   - "Performance issues in custom report"
   - "Customer exposure might change"

   Extract: title, description, severity, probability, sapModule, aiRecommendation

3. DECISIONS - Approvals, choices
   Examples: "Approved TR", "Use Z001 package", "Raise SAP incident"

4. DEPENDENCIES - Task relationships
   Examples: "Can't import until approved", "Need BASIS fix first"

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "entities": [
    {
      "type": "task",
      "title": "Import TR P01K905013 to PRD",
      "description": "Import transport request for invoice fix",
      "owner": "Adeel Imtiaz",
      "deadline": null,
      "priority": 1,
      "workItemType": "task",
      "storyPoints": null,
      "sapModule": "SD",
      "sapTcode": "STMS",
      "sapObjectType": "Transport",
      "sapTransportRequest": "P01K905013",
      "aiRecommendation": "Verify transport layer, check dependent objects, test in QA first",
      "confidence": 0.9
    },
    {
      "type": "risk",
      "title": "TR movement issue for ZABAP objects",
      "description": "Transport failing for Z-package objects",
      "severity": "high",
      "probability": "likely",
      "sapModule": "BASIS",
      "aiRecommendation": "Check package assignment (SE80), verify transport layer (SE03), ensure namespace is Z or Y, check authorization (S_TRANSPRT)",
      "confidence": 0.8
    }
  ]
}

If no entities found, return: {"entities": []}

🔍 SAP PATTERN RECOGNITION:
- TR numbers: P01K905013, D01K123456
- Tcodes: VA01, ME21N, FB50, ST22, SE80, etc.
- Modules: FI, CO, MM, SD, PP, QM, PM
- Issues: dumps, performance, transport, authorization
- Objects: programs, reports, function modules, tables

DATE PARSING RULES:
- "Friday" → next Friday from ${context.currentDate}
- "tomorrow" → tomorrow's date
- "EOD" → today at 18:00 Asia/Dubai

PRIORITY INFERENCE:
- Production issues, "urgent", "ASAP" → 1
- Important, approvals needed → 2
- Normal work → 3
- Low priority, "when possible" → 4

WORK ITEM TYPE CLASSIFICATION:
- Multiple stories/months → epic
- User value, 1-4 weeks → story (add storyPoints 1-13)
- Technical work, days → task
- Hours of work → subtask

AI RECOMMENDATIONS:
For each entity, provide expert SAP advice:
- Root cause analysis
- Step-by-step resolution
- SAP Note references when applicable
- Transaction codes to use
- Best practices to follow

CONFIDENCE SCORING:
- Explicit SAP task with TR/Tcode → 0.9-1.0
- Clear SAP action with module → 0.7-0.9
- General task with SAP context → 0.5-0.7
- Vague or unclear → below 0.5 (don't extract)

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
      let text = response.text();

      // Strip markdown code blocks if present (```json ... ```)
      const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
      }

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
