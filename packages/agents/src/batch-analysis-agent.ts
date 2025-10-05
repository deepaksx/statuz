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
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.3, // Lower temperature for more structured output
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });
      this.isEnabled = true;
      console.log('✅ [BatchAnalysisAgent] Initialized with Gemini 2.0 Flash');
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
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
    this.isEnabled = true;
    console.log('✅ [BatchAnalysisAgent] API key updated and re-initialized');
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

    try {
      console.log(`🔍 [BatchAnalysisAgent] Analyzing ${messages.length} messages...`);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Strip markdown code blocks if present
      const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
      }

      const analysisResult: BatchAnalysisResult = JSON.parse(text);
      console.log(`✅ [BatchAnalysisAgent] Extracted ${analysisResult.stories.length} stories`);

      return analysisResult;
    } catch (error) {
      console.error('❌ [BatchAnalysisAgent] Analysis failed:', error);
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

## 📋 PROJECT CONTEXT (Epic Definition)
${context || 'No context provided - infer from conversation'}

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
  "projectDescription": "Brief description inferred from context and conversation",
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
2. **Context Matters**: Use the project context to guide classification
3. **SAP Expertise**: Apply deep SAP knowledge to understand technical discussions
4. **Smart Inference**: Infer status, priority, assignments from conversation flow
5. **Dependencies**: Identify task relationships and blockers
6. **Realistic Estimates**: Story points should reflect actual effort discussed
7. **Team Members**: Extract names and phone numbers from sender metadata

## 🚀 BEGIN ANALYSIS
Analyze the conversation and return comprehensive JSON structure.`;
  }
}
