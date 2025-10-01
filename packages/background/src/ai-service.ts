import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message } from '@statuz/shared';

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

    // Use Gemini 2.5 Flash for fast responses
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent('Hello, this is a test. Please respond with "OK".');
      const response = result.response;
      return response.text().length > 0;
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }
}
