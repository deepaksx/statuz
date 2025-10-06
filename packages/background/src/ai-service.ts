import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message } from '@aipm/shared';

export interface AIChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AIChatRequest {
  question: string;
  context?: string;
  groupMessages?: Message[];
  apiKey?: string;
  contacts?: Map<string, { alias: string; role?: string }>;
}

export interface AIChatResponse {
  answer: string;
  tokensUsed?: number;
}

export interface GanttChartRequest {
  context: string;
  groupName: string;
  tasks?: any[];
  projects?: any[];
}

export interface GanttChartResponse {
  mermaidSyntax: string;
}

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  hasApiKey(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    if (!this.genAI || !this.apiKey) {
      throw new Error('AI service not configured. Please provide an API key.');
    }

    // Use Gemini 2.5 Flash Lite for fast responses
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Build context from group messages if provided
    let contextText = '';
    if (request.groupMessages && request.groupMessages.length > 0) {
      contextText = '\n\nRecent group messages:\n';
      // Use all provided messages (already limited by caller)
      for (const msg of request.groupMessages) {
        const date = new Date(msg.timestamp).toLocaleString();

        // Use alias from contacts if available
        let displayName = msg.authorName || msg.author;
        let roleInfo = '';
        if (request.contacts) {
          const contact = request.contacts.get(msg.author);
          if (contact) {
            displayName = contact.alias;
            roleInfo = contact.role ? ` (${contact.role})` : '';
          }
        }

        contextText += `[${date}] ${displayName}${roleInfo}: ${msg.text}\n`;
      }
    }

    // Add custom context if provided
    if (request.context) {
      contextText += `\n\nGroup Context:\n${request.context}\n`;
    }

    // Build the full prompt
    const prompt = `You are an AI assistant helping to analyze WhatsApp group conversations.
${contextText}

User Question: ${request.question}

Please provide a helpful and concise answer based on the context provided.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const answer = response.text();

      return {
        answer,
        tokensUsed: undefined // Gemini doesn't provide token counts in the same way
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      if (error instanceof Error) {
        throw new Error(`AI request failed: ${error.message}`);
      }
      throw new Error('AI request failed with unknown error');
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.genAI || !this.apiKey) {
      return false;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const result = await model.generateContent('Hello, this is a test. Please respond with "OK".');
      const response = result.response;
      return response.text().length > 0;
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }

  async generateGanttChart(request: GanttChartRequest): Promise<GanttChartResponse> {
    if (!this.genAI || !this.apiKey) {
      throw new Error('AI service not configured. Please provide an API key.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Build context information
    let contextInfo = `Group: ${request.groupName}\n\nProject Context:\n${request.context}\n`;

    if (request.tasks && request.tasks.length > 0) {
      contextInfo += `\nExisting Tasks (${request.tasks.length}):\n`;
      request.tasks.forEach((task, idx) => {
        contextInfo += `- ${task.title} (Status: ${task.status}, Priority: ${task.priority})`;
        if (task.deadline) {
          contextInfo += ` - Due: ${new Date(task.deadline).toLocaleDateString()}`;
        }
        contextInfo += '\n';
      });
    }

    if (request.projects && request.projects.length > 0) {
      contextInfo += `\nExisting Projects (${request.projects.length}):\n`;
      request.projects.forEach((project) => {
        contextInfo += `- ${project.name}`;
        if (project.description) {
          contextInfo += `: ${project.description}`;
        }
        contextInfo += '\n';
      });
    }

    const prompt = `You are an expert project management AI. Based on the following project context and data, generate a Mermaid Gantt chart that visualizes the project timeline, milestones, and tasks.

${contextInfo}

Instructions:
1. Analyze the context to identify key phases, milestones, and deliverables
2. Create a logical project timeline with realistic durations
3. Use Mermaid Gantt chart syntax
4. Include sections for major project phases
5. Add dependencies between tasks where appropriate
6. Make the chart comprehensive but readable (max 15-20 tasks)
7. Use task statuses: done, active, or leave blank for future tasks

Mermaid Gantt Chart Syntax Reference:
\`\`\`
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1           :done, task1, 2024-01-01, 30d
    Task 2           :active, task2, after task1, 20d
    Task 3           :task3, after task2, 15d
\`\`\`

IMPORTANT: Return ONLY the Mermaid syntax without any markdown code blocks or explanations. Start directly with "gantt".

Generate the Mermaid Gantt chart:`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      let mermaidSyntax = response.text().trim();

      // Clean up the response - remove markdown code blocks if present
      mermaidSyntax = mermaidSyntax
        .replace(/^```mermaid\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Ensure it starts with 'gantt'
      if (!mermaidSyntax.toLowerCase().startsWith('gantt')) {
        throw new Error('AI did not return valid Mermaid Gantt chart syntax');
      }

      return {
        mermaidSyntax
      };
    } catch (error) {
      console.error('Gantt Chart Generation Error:', error);
      if (error instanceof Error) {
        throw new Error(`Gantt chart generation failed: ${error.message}`);
      }
      throw new Error('Gantt chart generation failed with unknown error');
    }
  }
}
