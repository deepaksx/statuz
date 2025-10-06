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

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        maxOutputTokens: 2048, // Increase output limit for Gantt charts
        temperature: 0.1, // Lower temperature for more consistent output
      }
    });

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

    const prompt = `You are an expert project management AI. Generate a concise Mermaid Gantt chart based on the following project context.

${contextInfo}

IMPORTANT: Keep task names SHORT (max 50 characters). Generate 8-10 tasks maximum to keep output concise.

CRITICAL SYNTAX REQUIREMENTS - EVERY TASK MUST FOLLOW THIS EXACT FORMAT:
Task Name         :status, taskid, YYYY-MM-DD, duration

MANDATORY RULES:
1. Task names MUST NOT contain colons - use dashes or hyphens instead
2. EVERY task line MUST have ALL 4 components separated by commas:
   - Task Name (text before colon, NO COLONS ALLOWED IN NAME)
   - Status (done/active/crit or leave blank)
   - Task ID (unique identifier like task1, task2)
   - Start Date (YYYY-MM-DD format, use actual dates)
   - Duration (like 14d, 3w, 2m)
3. NEVER write incomplete tasks (missing date or duration)
4. NEVER use "after taskX" - always use real dates
5. NO comments (no %% lines)
6. NO empty sections
7. Timeline should be realistic (today: ${new Date().toISOString().split('T')[0]})
8. Include 8-10 tasks MAXIMUM across 2-3 sections
9. Keep task names SHORT (under 50 chars)

CORRECT EXAMPLE:
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Planning          :done, task1, 2024-01-01, 14d
    Requirements      :done, task2, 2024-01-15, 21d
    Design            :active, task3, 2024-02-05, 30d
    section Phase 2
    Development       :task4, 2024-03-07, 60d
    Testing           :task5, 2024-05-06, 30d
    Deployment        :task6, 2024-07-05, 14d

WRONG EXAMPLES (DO NOT DO THIS):
❌ Task Name :
❌ Task Name : 2024-01-01, 14d
❌ Task Name : active, after task1, 14d
❌ Task Name : active, task1
❌ Story 1: System Readiness :active, story1, 2025-10-19, 10d (colon in task name!)

CORRECT VERSION OF LAST EXAMPLE:
✅ Story 1 - System Readiness :active, story1, 2025-10-19, 10d

Generate ONLY the Mermaid Gantt chart with complete task definitions:`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      let mermaidSyntax = response.text().trim();

      console.log(`🤖 AI RAW RESPONSE (length: ${mermaidSyntax.length} chars):`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(mermaidSyntax);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Clean up the response - remove markdown code blocks if present
      mermaidSyntax = mermaidSyntax
        .replace(/^```mermaid\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Remove any lines that start with %% (comments)
      mermaidSyntax = mermaidSyntax
        .split('\n')
        .filter(line => !line.trim().startsWith('%%'))
        .join('\n');

      // Validate and clean task lines
      const lines = mermaidSyntax.split('\n');
      const cleanedLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Keep gantt, title, dateFormat, axisFormat lines
        if (trimmedLine.startsWith('gantt') ||
            trimmedLine.startsWith('title') ||
            trimmedLine.startsWith('dateFormat') ||
            trimmedLine.startsWith('axisFormat') ||
            trimmedLine === '') {
          cleanedLines.push(line);
          continue;
        }

        // If this is a section header
        if (trimmedLine.startsWith('section ')) {
          // We'll add it later if it has valid tasks
          cleanedLines.push(line);
          continue;
        }

        // If this is a task line (contains colon)
        if (trimmedLine.includes(':')) {
          // Check if line ends abruptly (likely truncated - no closing date/duration)
          const colonIndex = trimmedLine.indexOf(':');
          const afterColon = trimmedLine.substring(colonIndex + 1).trim();

          // If nothing after colon, or very short, skip it
          if (!afterColon || afterColon.length < 5) {
            console.warn(`Skipping truncated/empty task: ${trimmedLine}`);
            continue;
          }

          // Check if line looks incomplete (ends without proper duration like "20" instead of "20d")
          if (afterColon.length < 20 || !afterColon.includes(',')) {
            console.warn(`Skipping incomplete/truncated task: ${trimmedLine}`);
            continue;
          }

          // Validate task has all required parts: :status, taskid, date, duration
          const parts = trimmedLine.split(':');
          if (parts.length >= 2) {
            const taskDef = parts[1].trim();
            const components = taskDef.split(',').map(s => s.trim());

            // Valid task must have at least 3 components (taskid, date, duration)
            // or 4 if status is included
            if (components.length >= 3) {
              // Check if it has a date pattern (YYYY-MM-DD)
              const hasDate = components.some(c => /\d{4}-\d{2}-\d{2}/.test(c));
              // Check if it has a duration pattern (Xd, Xw, Xm)
              const hasDuration = components.some(c => /\d+[dwm]/.test(c));

              if (hasDate && hasDuration) {
                cleanedLines.push(line);
              } else {
                console.warn(`Skipping incomplete task (missing date/duration): ${trimmedLine}`);
              }
            } else {
              console.warn(`Skipping malformed task (too few components): ${trimmedLine}`);
            }
          }
        } else {
          // Keep other lines as-is
          cleanedLines.push(line);
        }
      }

      // Remove sections with no tasks
      const finalLines: string[] = [];
      for (let i = 0; i < cleanedLines.length; i++) {
        const line = cleanedLines[i];
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('section ')) {
          // Check if next non-empty line is also a section or end
          let hasTask = false;
          for (let j = i + 1; j < cleanedLines.length; j++) {
            const nextLine = cleanedLines[j].trim();
            if (nextLine === '') continue;
            if (nextLine.startsWith('section ')) break;
            if (nextLine.includes(':')) {
              hasTask = true;
              break;
            }
          }
          if (hasTask) {
            finalLines.push(line);
          }
        } else {
          finalLines.push(line);
        }
      }

      mermaidSyntax = finalLines.join('\n').trim();

      // Ensure it starts with 'gantt'
      if (!mermaidSyntax.toLowerCase().startsWith('gantt')) {
        throw new Error('AI did not return valid Mermaid Gantt chart syntax');
      }

      // Count valid tasks
      const taskCount = finalLines.filter(line => {
        const trimmed = line.trim();
        return trimmed.includes(':') &&
               !trimmed.startsWith('gantt') &&
               !trimmed.startsWith('title') &&
               !trimmed.startsWith('dateFormat') &&
               !trimmed.startsWith('axisFormat') &&
               !trimmed.startsWith('section');
      }).length;

      if (taskCount === 0) {
        throw new Error('AI generated Gantt chart with no valid tasks. All tasks were incomplete or malformed.');
      }

      console.log(`✅ Gantt chart validated: ${taskCount} valid tasks`);
      console.log(`📊 FINAL MERMAID SYNTAX TO BE SAVED:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(mermaidSyntax);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

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
