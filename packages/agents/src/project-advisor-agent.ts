/**
 * Project Advisor Agent
 *
 * Proactive AI agent that:
 * - Analyzes project status and provides recommendations
 * - Uses SAP domain expertise to suggest solutions
 * - Identifies patterns and risks before they become blockers
 * - Provides actionable guidance for project managers
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message } from '@aipm/shared';

export interface ProjectAdvisorRecommendation {
  type: 'risk' | 'solution' | 'optimization' | 'best_practice';
  title: string;
  description: string;
  actionItems: string[];
  priority: 1 | 2 | 3 | 4;
  sapRelevance?: {
    modules: string[];
    tcodes: string[];
    relatedObjects: string[];
  };
  confidence: number;
}

export interface SAPContextAnalysis {
  detectedModules: string[];
  detectedTcodes: string[];
  detectedIssueTypes: string[];
  recommendedSolutions: string[];
  similarIssues: Array<{
    issue: string;
    resolution: string;
    source: string;
  }>;
}

export class ProjectAdvisorAgent {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isEnabled: boolean = false;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn('⚠️  [ProjectAdvisor] No API key provided - agent disabled');
      this.isEnabled = false;
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.3, // Slightly creative for recommendations
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096
      }
    });
    this.isEnabled = true;
    console.log('✅ [ProjectAdvisor] Initialized with SAP expertise');
  }

  isReady(): boolean {
    return this.isEnabled && this.model !== null;
  }

  /**
   * Analyze SAP-specific context from messages
   */
  async analyzeSAPContext(messages: Message[]): Promise<SAPContextAnalysis> {
    if (!this.isReady()) {
      throw new Error('Project Advisor Agent not initialized');
    }

    const conversationContext = messages
      .slice(-50) // Last 50 messages
      .map(m => `[${m.authorName || m.author}]: ${m.text}`)
      .join('\n');

    const prompt = `You are an expert SAP consultant with deep knowledge of SAP ERP, ABAP, BASIS, and all SAP modules.

Analyze this SAP project conversation and extract:

1. SAP Modules mentioned (FI, CO, MM, SD, PP, QM, PM, HR, ABAP, BASIS, BW, etc.)
2. Transaction codes (VA01, ME21N, FB50, etc.)
3. Issue types (transport issues, dumps, performance, configuration, etc.)
4. Recommended solutions based on SAP best practices
5. Similar issues and their resolutions from SAP knowledge base

Conversation:
${conversationContext}

Return ONLY valid JSON:
{
  "detectedModules": ["MM", "SD"],
  "detectedTcodes": ["VA01", "ME21N"],
  "detectedIssueTypes": ["transport_issue", "dump"],
  "recommendedSolutions": [
    "Check transport layer configuration",
    "Verify package assignment"
  ],
  "similarIssues": [
    {
      "issue": "TR movement failure for ZABAP objects",
      "resolution": "Create new TR in Z001, verify package namespace",
      "source": "SAP Note 1234567"
    }
  ]
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Strip markdown if present
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('❌ [ProjectAdvisor] Failed to parse SAP context:', text);
      return {
        detectedModules: [],
        detectedTcodes: [],
        detectedIssueTypes: [],
        recommendedSolutions: [],
        similarIssues: []
      };
    }
  }

  /**
   * Generate proactive recommendations for a project
   */
  async generateRecommendations(context: {
    projectName: string;
    recentMessages: Message[];
    openTasks: any[];
    openRisks: any[];
    projectContext?: string;
  }): Promise<ProjectAdvisorRecommendation[]> {
    if (!this.isReady()) {
      throw new Error('Project Advisor Agent not initialized');
    }

    const messagesText = context.recentMessages
      .slice(-30)
      .map(m => `[${m.authorName || m.author}] ${new Date(m.timestamp).toISOString()}: ${m.text}`)
      .join('\n');

    const tasksText = context.openTasks
      .map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority}, Owner: ${t.owner_alias || t.owner_phone || 'unassigned'})`)
      .join('\n');

    const risksText = context.openRisks
      .map(r => `- [${r.severity}] ${r.title}: ${r.description}`)
      .join('\n');

    const prompt = `You are a proactive SAP project manager AI with expertise in:
- SAP ERP (all modules: FI, CO, MM, SD, PP, QM, PM, HR)
- ABAP development and debugging
- SAP BASIS administration
- SAP transport management
- SAP best practices and optimization
- Agile/SCRUM methodologies

Project: ${context.projectName}

${context.projectContext ? `Project Context:\n${context.projectContext}\n` : ''}

Recent Conversation:
${messagesText || 'No recent messages'}

Open Tasks:
${tasksText || 'No open tasks'}

Open Risks:
${risksText || 'No open risks'}

As a proactive project manager, analyze the situation and provide:
1. **Risks** you foresee based on patterns
2. **Solutions** to current blockers using SAP expertise
3. **Optimizations** to improve team velocity
4. **Best Practices** being violated or should be implemented

For each recommendation:
- Be specific and actionable
- Reference SAP transaction codes, notes, or best practices
- Assign realistic priority
- Provide concrete action items

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "type": "risk|solution|optimization|best_practice",
      "title": "Brief title",
      "description": "Detailed explanation with SAP context",
      "actionItems": [
        "Specific action 1",
        "Specific action 2"
      ],
      "priority": 1-4,
      "sapRelevance": {
        "modules": ["MM", "SD"],
        "tcodes": ["ME21N"],
        "relatedObjects": ["ZMATERIAL_CREATE"]
      },
      "confidence": 0.0-1.0
    }
  ]
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Strip markdown if present
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(text);
      return parsed.recommendations || [];
    } catch (error) {
      console.error('❌ [ProjectAdvisor] Failed to parse recommendations:', text);
      return [];
    }
  }

  /**
   * Classify work item into SCRUM hierarchy (Epic, Story, Task, Subtask)
   */
  async classifyWorkItem(item: {
    title: string;
    description?: string;
    context?: string;
  }): Promise<{
    workItemType: 'epic' | 'story' | 'task' | 'subtask';
    confidence: number;
    reasoning: string;
    suggestedStoryPoints?: number;
  }> {
    if (!this.isReady()) {
      return {
        workItemType: 'task',
        confidence: 0.5,
        reasoning: 'Agent not initialized, defaulting to task'
      };
    }

    const prompt = `You are an expert Agile/SCRUM coach.

Classify this work item into the correct SCRUM hierarchy level:

Title: ${item.title}
Description: ${item.description || 'N/A'}
Context: ${item.context || 'N/A'}

SCRUM Hierarchy Rules:
1. **Epic**: Large body of work (3+ months), multiple stories, strategic goal
   Examples: "Migrate SAP to S/4HANA", "Implement complete Order-to-Cash process"

2. **Story**: User-facing feature (1-4 weeks), deliverable value
   Examples: "As a user, I want to create purchase orders", "Enable approval workflow for invoices"

3. **Task**: Technical work item (1-5 days), part of a story
   Examples: "Create ABAP function module for PO validation", "Configure ME21N screen layout"

4. **Subtask**: Small work unit (<1 day), part of a task
   Examples: "Write unit test for validation function", "Update documentation"

Return ONLY valid JSON:
{
  "workItemType": "epic|story|task|subtask",
  "confidence": 0.0-1.0,
  "reasoning": "Why this classification",
  "suggestedStoryPoints": 1-13 (Fibonacci, only for stories)
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Strip markdown if present
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('❌ [ProjectAdvisor] Failed to parse classification:', text);
      return {
        workItemType: 'task',
        confidence: 0.5,
        reasoning: 'Failed to classify, defaulting to task'
      };
    }
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string) {
    if (!apiKey) {
      this.isEnabled = false;
      console.warn('⚠️  [ProjectAdvisor] API key removed - agent disabled');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096
      }
    });
    this.isEnabled = true;
    console.log('✅ [ProjectAdvisor] API key updated - agent re-enabled');
  }
}
