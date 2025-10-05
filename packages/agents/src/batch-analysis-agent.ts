import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message } from '@aipm/shared';

export interface BatchStory {
  id: string;
  title: string;
  description: string;
  storyPoints: number;
  acceptanceCriteria: string[];
  priority: 1 | 2 | 3 | 4;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  sapModule?: string;
  sapTcode?: string;
  tasks: BatchTask[];
}

export interface BatchTask {
  id: string;
  title: string;
  description: string;
  workItemType: 'task' | 'subtask';
  ownerAlias?: string;
  ownerPhone?: string;
  deadline?: number;
  priority: 1 | 2 | 3 | 4;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  sapModule?: string;
  sapTcode?: string;
  sapTransportRequest?: string;
  aiRecommendation?: string;
  dependencies?: string[]; // IDs of tasks this depends on
  subtasks?: BatchTask[];
}

export interface BatchAnalysisResult {
  projectName: string;
  projectDescription: string;
  stories: BatchStory[];
  risks: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    probability: 'low' | 'medium' | 'high';
    mitigation?: string;
  }>;
  decisions: Array<{
    title: string;
    description: string;
    rationale: string;
    madeBy?: string;
    madeAt?: number;
  }>;
  aiInsights: string;
}

/**
 * BatchAnalysisAgent - Holistic analysis of entire chat history
 *
 * This agent analyzes complete conversation history in ONE query to:
 * - Extract comprehensive Story/Task/Subtask structure
 * - Identify dependencies and relationships
 * - Assign tasks to team members
 * - Determine status and criticality
 * - Apply SAP domain knowledge
 * - Create foundational project framework
 */
export class BatchAnalysisAgent {
  private genAI!: GoogleGenerativeAI;
  private model: any;
  private isEnabled: boolean = false;

  constructor(apiKey?: string) {
    if (!apiKey) {
      console.warn('⚠️  [BatchAnalysisAgent] No API key provided - agent disabled');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0.3, // Lower temperature for more structured output
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });
      this.isEnabled = true;
      console.log('✅ [BatchAnalysisAgent] Initialized with Gemini 2.5 Flash Lite');
    } catch (error) {
      console.error('❌ [BatchAnalysisAgent] Failed to initialize:', error);
    }
  }

  isReady(): boolean {
    return this.isEnabled;
  }

  /**
   * Update API key and re-initialize
   */
  updateApiKey(apiKey: string): void {
    if (!apiKey) {
      this.isEnabled = false;
      console.warn('⚠️  [BatchAnalysisAgent] API key removed - agent disabled');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
    this.isEnabled = true;
    console.log('✅ [BatchAnalysisAgent] API key updated and re-initialized with Gemini 2.5 Flash Lite');
  }

  /**
   * Analyze entire conversation history holistically
   * @param messages - Complete chat history
   * @param context - Project context/Epic definition
   * @param groupName - Name of the WhatsApp group
   */
  async analyzeHistory(
    messages: Message[],
    context: string,
    groupName: string
  ): Promise<BatchAnalysisResult> {
    if (!this.isEnabled) {
      throw new Error('BatchAnalysisAgent not enabled - missing API key');
    }

    // Sort messages chronologically
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

    // Format conversation for AI
    const conversation = this.formatConversation(sortedMessages);

    const prompt = this.buildBatchAnalysisPrompt(conversation, context, groupName);

    let rawText = '';
    try {
      console.log(`🔍 [BatchAnalysisAgent] Analyzing ${messages.length} messages...`);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      rawText = response.text();

      console.log(`📄 [BatchAnalysisAgent] Raw AI response (first 200 chars): ${rawText.substring(0, 200)}`);

      // Clean the text for JSON parsing
      let text = rawText.trim();

      // Try multiple strategies to extract JSON from markdown

      // Strategy 1: Match standard markdown code blocks with optional backticks before
      let codeBlockMatch = text.match(/^`*```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
        console.log(`🔧 [BatchAnalysisAgent] Stripped markdown code block (strategy 1)`);
      }
      // Strategy 2: If still starts with backticks, try to find JSON object
      else if (text.includes('```')) {
        // Remove all backticks and "json" keywords, then find the JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          text = jsonMatch[0];
          console.log(`🔧 [BatchAnalysisAgent] Extracted JSON object (strategy 2)`);
        }
      } else {
        console.log(`ℹ️  [BatchAnalysisAgent] No code block found, using raw text`);
      }

      console.log(`📝 [BatchAnalysisAgent] Text to parse (first 200 chars): ${text.substring(0, 200)}`);

      const analysisResult: BatchAnalysisResult = JSON.parse(text);
      console.log(`✅ [BatchAnalysisAgent] Extracted ${analysisResult.stories.length} stories`);

      return analysisResult;
    } catch (error) {
      console.error('❌ [BatchAnalysisAgent] Analysis failed:', error);
      if (error instanceof Error && error.message.includes('JSON')) {
        console.error('📄 [BatchAnalysisAgent] Failed to parse response. Full response was:');
        console.error(rawText);
      }
      throw error;
    }
  }

  private formatConversation(messages: Message[]): string {
    return messages
      .map((msg) => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        const sender = msg.authorName || msg.author || 'Unknown';
        return `[${timestamp}] ${sender}: ${msg.text}`;
      })
      .join('\n');
  }

  private buildBatchAnalysisPrompt(
    conversation: string,
    context: string,
    groupName: string
  ): string {
    return `You are an expert SAP Project Manager and SCRUM Master AI performing holistic analysis of a complete WhatsApp project conversation.

## 🎯 YOUR MISSION
Analyze the ENTIRE conversation history as ONE document and create a comprehensive project framework with Stories, Tasks, and Subtasks. This is a ONE-TIME foundational analysis.

## 📋 PROJECT CONTEXT (Epic Definition - Use as Guide, Not to Copy)
${context || 'No context provided - infer from conversation'}

${context ? `
⚠️ IMPORTANT: The context above is the HIGH-LEVEL EPIC/GOAL. Do NOT just repeat it.
Instead:
1. READ the actual conversation to understand WHAT IS REALLY HAPPENING
2. SYNTHESIZE your own project description based on the messages
3. ADD SAP-specific insights you observe (modules, tcodes, technical challenges)
4. ENHANCE the understanding with your expertise
5. The context guides you, but YOU analyze and describe what you actually see in the messages
` : ''}

## 💬 COMPLETE CONVERSATION HISTORY
${conversation}

## 🏗️ SAP DOMAIN EXPERTISE
You have deep knowledge of:
- **SAP ERP Modules**: FI (Finance), CO (Controlling), MM (Materials Management), SD (Sales & Distribution), PP (Production Planning), QM (Quality Management), PM (Plant Maintenance), HR (Human Resources), PS (Project System)
- **ABAP Development**: Programming, debugging, performance tuning, transport management
- **SAP BASIS**: System administration, landscape management, upgrades
- **Transaction Codes**: VA01, VA02, VA03 (Sales), ME21N, ME22N (Purchasing), FB50, FB60 (Finance), STMS (Transport), SE80 (ABAP Workbench), etc.
- **Common SAP Issues**: Transport errors, authorization problems, interface failures, performance bottlenecks, data inconsistencies

## 🎯 SCRUM CLASSIFICATION RULES
- **Story**: User-facing feature or business capability (1-4 weeks effort)
  - Must deliver business value
  - Can be tested and accepted
  - Story points: 1, 2, 3, 5, 8, 13 (Fibonacci)

- **Task**: Technical implementation work (1-5 days effort)
  - Part of a story or standalone technical work
  - Can be assigned to team member
  - Has clear completion criteria

- **Subtask**: Small unit of work (<1 day effort)
  - Part of a larger task
  - Usually a specific step or component

## 📊 ANALYSIS REQUIREMENTS

### 1. Extract Stories
- Identify all user-facing features or business capabilities discussed
- Each story should have:
  - Clear title and description
  - Story points (1, 2, 3, 5, 8, 13)
  - Acceptance criteria
  - Priority (1=Critical, 2=High, 3=Normal, 4=Low)
  - Status based on conversation (todo/in_progress/blocked/done)
  - SAP module if applicable

### 2. Extract Tasks and Subtasks
- For each story, identify technical tasks
- Break down complex tasks into subtasks
- Assign to team members based on conversation
- Extract deadlines mentioned in messages
- Determine status from conversation context
- Identify SAP transaction codes, transport requests

### 3. Identify Dependencies
- Find task dependencies mentioned in conversation
- Use task IDs to reference dependencies

### 4. Extract Risks
- Business risks, technical risks, SAP-specific risks
- Assess severity and probability
- Suggest mitigation if discussed

### 5. Extract Decisions
- Key decisions made in conversations
- Rationale and who made them

### 6. AI Insights
- Provide overall project health assessment
- Highlight critical items needing attention
- SAP-specific recommendations

## 🎨 OUTPUT FORMAT (JSON)
Return ONLY valid JSON matching this structure:

{
  "projectName": "${groupName}",
  "projectDescription": "YOUR synthesized understanding of what this project is about - based on ANALYZING the messages. Include: SAP modules involved, technical scope, key deliverables observed in conversation. This should be YOUR analysis, not just repeating the context.",

  /** EXAMPLE projectDescription:
   * ❌ BAD (just repeating context): "Implementation of SAP MM procurement module"
   * ✅ GOOD (your analysis): "SAP MM procurement enhancement focusing on vendor master data automation (ME21N, ME22N). Team is integrating with external vendor portal via IDocs, handling transport P01K905013. Main challenges: authorization issues in QA and performance concerns with batch jobs. Three developers actively working on ABAP programs and two basis team members supporting transport management."
   */

  "stories": [
    {
      "id": "STORY-001",
      "title": "Story title",
      "description": "What needs to be done",
      "storyPoints": 5,
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "priority": 2,
      "status": "in_progress",
      "sapModule": "MM",
      "sapTcode": "ME21N",
      "tasks": [
        {
          "id": "TASK-001",
          "title": "Task title",
          "description": "Technical work to do",
          "workItemType": "task",
          "ownerAlias": "Alice",
          "ownerPhone": "+1234567890",
          "deadline": 1735689600000,
          "priority": 1,
          "status": "todo",
          "sapModule": "MM",
          "sapTcode": "ME21N",
          "sapTransportRequest": "P01K905013",
          "aiRecommendation": "Consider testing in QA first",
          "dependencies": ["TASK-002"],
          "subtasks": [
            {
              "id": "SUBTASK-001",
              "title": "Subtask title",
              "description": "Small unit of work",
              "workItemType": "subtask",
              "ownerAlias": "Alice",
              "priority": 2,
              "status": "done"
            }
          ]
        }
      ]
    }
  ],
  "risks": [
    {
      "title": "Risk title",
      "description": "What could go wrong",
      "severity": "high",
      "probability": "medium",
      "mitigation": "How to prevent or reduce impact"
    }
  ],
  "decisions": [
    {
      "title": "Decision title",
      "description": "What was decided",
      "rationale": "Why this decision was made",
      "madeBy": "Bob",
      "madeAt": 1735689600000
    }
  ],
  "aiInsights": "Overall assessment, critical items, recommendations"
}

## ⚡ KEY PRINCIPLES
1. **Holistic Analysis**: Consider the ENTIRE conversation, not individual messages
2. **Context as Guide, Not to Copy**: The Epic context shows the high-level goal. YOU must analyze the actual messages to create a rich, detailed project description with SAP-specific insights
3. **SAP Expertise**: Apply deep SAP knowledge to understand technical discussions - identify modules, transaction codes, technical patterns
4. **Smart Inference**: Infer status, priority, assignments from conversation flow
5. **Dependencies**: Identify task relationships and blockers
6. **Realistic Estimates**: Story points should reflect actual effort discussed
7. **Team Members**: Extract names and phone numbers from sender metadata
8. **Value-Add Analysis**: Your projectDescription should ADD VALUE beyond the context - include what modules are involved, technical scope, challenges observed, team dynamics

## 🚀 BEGIN ANALYSIS
Analyze the conversation and return comprehensive JSON structure.`;
  }
}
