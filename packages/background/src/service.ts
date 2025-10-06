import { EventEmitter } from 'events';
import { join } from 'path';
import { existsSync } from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { StatuzDatabase } from '@aipm/db';
import { WhatsAppClient } from './whatsapp-client.js';
import { WhatsAppWebSimple } from './whatsapp-web-simple.js';
import { ContextLoader } from './context/loader.js';
import { SnapshotGenerator } from './snapshot/generator.js';
import { parseWhatsAppChat } from './utils/whatsapp-parser.js';
import { AIService } from './ai-service.js';
import type {
  WhatsAppConnectionState,
  Group,
  Message,
  ProjectContext,
  SnapshotReport,
  AppConfig
} from '@aipm/shared';
import { eventBus } from '@aipm/event-bus';
import { ParserAgent, BatchAnalysisAgent } from '@aipm/agents';
import type { BatchAnalysisResult } from '@aipm/agents';
import { v4 as uuidv4 } from 'uuid';

export interface BackgroundServiceEvents {
  connectionStateChanged: (state: WhatsAppConnectionState) => void;
  messageProcessed: (message: Message) => void;
  groupsUpdated: (groups: Group[]) => void;
  contextUpdated: (context: ProjectContext) => void;
  error: (error: Error) => void;
}

export class BackgroundService extends EventEmitter {
  private db: StatuzDatabase;
  private whatsappClient: WhatsAppClient | WhatsAppWebSimple;
  private contextLoader: ContextLoader;
  private snapshotGenerator: SnapshotGenerator;
  private aiService: AIService;
  private parserAgent: ParserAgent | null = null;
  private batchAnalysisAgent: BatchAnalysisAgent | null = null;
  private config: AppConfig;
  private isRunning = false;
  private contextChecksum = '';
  private whatsappServiceProcess: ChildProcess | null = null;
  private whatsappServicePort = 3002;
  private contactsCache: Map<string, { alias: string; role?: string }> | null = null;
  private contactsCacheTime = 0;

  constructor(config: AppConfig) {
    super();
    this.config = config;

    // Initialize database
    const dbPath = join(config.dataDirectory, 'statuz.db');
    this.db = new StatuzDatabase(dbPath);

    // Initialize WhatsApp client
    const sessionPath = join(config.dataDirectory, '.wwebjs_auth');
    this.whatsappClient = new WhatsAppClient(sessionPath);
    console.log('✅ WhatsApp client initialized with session path:', sessionPath);

    // Initialize other components
    this.contextLoader = new ContextLoader(join(process.cwd(), 'context'));
    this.snapshotGenerator = new SnapshotGenerator(this.db);
    this.aiService = new AIService();

    // Initialize AI Agents if Gemini API key is available
    if (config.geminiApiKey) {
      this.parserAgent = new ParserAgent(config.geminiApiKey);
      this.batchAnalysisAgent = new BatchAnalysisAgent(config.geminiApiKey);
      this.setupEventBusListeners();
    } else {
      console.warn('⚠️  AI Agents not initialized - No Gemini API key provided');
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // WhatsApp connection state changes
    this.whatsappClient.on('connectionStateChanged', (state: WhatsAppConnectionState) => {
      this.emit('connectionStateChanged', state);
    });

    // New messages from WhatsApp
    this.whatsappClient.on('message', async (message: Message) => {
      await this.processMessage(message);
    });

    // Groups updated
    this.whatsappClient.on('groupsUpdated', async (groups: Group[]) => {
      // Update database with new groups
      for (const group of groups) {
        await this.db.upsertGroup(group);
      }
      // Emit groups from database to preserve watch status and other fields
      const dbGroups = await this.db.getGroups();
      this.emit('groupsUpdated', dbGroups);
    });
  }

  private setupEventBusListeners() {
    // Listen for task:created events from Parser Agent
    eventBus.subscribe('task:created', async (payload) => {
      try {
        const { entity, sourceMessage } = payload.data;
        console.log(`📋 [BackgroundService] Task extracted: ${entity.title}`);

        // Find the project ID for this message's group
        const groups = await this.db.getGroups();
        const group = groups.find(g => g.id === sourceMessage.groupId);

        if (!group) {
          console.error(`❌ Group not found for message: ${sourceMessage.groupId}`);
          return;
        }

        // Check if project exists for this group, create if not
        const projects = await this.db.getProjects({ status: 'active' });
        let project = projects.find(p => p.whatsappGroupId === group.id);

        if (!project) {
          // Auto-create project from WhatsApp group
          const projectId = uuidv4();
          await this.db.insertProject({
            id: projectId,
            name: group.name,
            whatsappGroupId: group.id,
            status: 'active',
            priority: 3,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          console.log(`📁 Auto-created project: ${group.name}`);
          project = { id: projectId, name: group.name } as any;
        }

        // Insert task into database
        const taskId = uuidv4();
        await this.db.insertTask({
          id: taskId,
          projectId: project!.id,
          title: entity.title,
          description: entity.description,
          status: 'todo',
          priority: entity.priority || 3,
          ownerPhone: entity.owner,
          deadline: entity.deadline ? new Date(entity.deadline).getTime() : undefined,
          extractedFromMessageId: sourceMessage.id,
          confidenceScore: entity.confidence,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        console.log(`✅ Task stored in database: ${entity.title} (confidence: ${entity.confidence})`);
      } catch (error) {
        console.error('❌ Error storing extracted task:', error);
      }
    });

    // Listen for risk:identified events from Parser Agent
    eventBus.subscribe('risk:identified', async (payload) => {
      try {
        const { entity, sourceMessage } = payload.data;
        console.log(`⚠️  [BackgroundService] Risk extracted: ${entity.title}`);

        // Find the project ID for this message's group
        const groups = await this.db.getGroups();
        const group = groups.find(g => g.id === sourceMessage.groupId);

        if (!group) {
          console.error(`❌ Group not found for message: ${sourceMessage.groupId}`);
          return;
        }

        // Check if project exists for this group
        const projects = await this.db.getProjects({ status: 'active' });
        let project = projects.find(p => p.whatsappGroupId === group.id);

        if (!project) {
          // Auto-create project from WhatsApp group
          const projectId = uuidv4();
          await this.db.insertProject({
            id: projectId,
            name: group.name,
            whatsappGroupId: group.id,
            status: 'active',
            priority: 3,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          console.log(`📁 Auto-created project: ${group.name}`);
          project = { id: projectId, name: group.name } as any;
        }

        // Insert risk into database
        const riskId = uuidv4();
        await this.db.insertRisk({
          id: riskId,
          projectId: project!.id,
          title: entity.title,
          description: entity.description,
          severity: entity.severity || 'medium',
          probability: entity.probability || 'possible',
          status: 'open',
          extractedFromMessageId: sourceMessage.id,
          confidenceScore: entity.confidence,
          identifiedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        console.log(`✅ Risk stored in database: ${entity.title} (severity: ${entity.severity}, confidence: ${entity.confidence})`);
      } catch (error) {
        console.error('❌ Error storing extracted risk:', error);
      }
    });

    console.log('✅ Event bus listeners configured');
  }

  private async startWhatsAppService() {
    if (this.whatsappServiceProcess) {
      console.log('WhatsApp service already running');
      return;
    }

    console.log('🚀 Starting WhatsApp standalone service...');

    const servicePath = join(__dirname, 'whatsapp-service.js');

    this.whatsappServiceProcess = spawn('node', [servicePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        WHATSAPP_SERVICE_PORT: String(this.whatsappServicePort)
      }
    });

    this.whatsappServiceProcess.stdout?.on('data', (data) => {
      console.log(`[WhatsApp Service] ${data.toString().trim()}`);
    });

    this.whatsappServiceProcess.stderr?.on('data', (data) => {
      console.error(`[WhatsApp Service Error] ${data.toString().trim()}`);
    });

    this.whatsappServiceProcess.on('exit', (code) => {
      console.log(`WhatsApp service exited with code ${code}`);
      this.whatsappServiceProcess = null;
    });

    // Wait for service to be ready
    await this.waitForService();

    // Initialize WhatsApp in the service
    const sessionPath = join(this.config.dataDirectory, '.wwebjs_auth');
    await this.callServiceAPI('/start', 'POST', { sessionPath });

    // Start polling for connection state
    this.startConnectionStatePolling();
  }

  private async stopWhatsAppService() {
    if (!this.whatsappServiceProcess) {
      return;
    }

    console.log('⏹️  Stopping WhatsApp standalone service...');

    try {
      await this.callServiceAPI('/stop', 'POST');
    } catch (error) {
      console.error('Failed to stop service gracefully:', error);
    }

    this.whatsappServiceProcess.kill();
    this.whatsappServiceProcess = null;
  }

  private async waitForService(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.whatsappServicePort}/health`);
        if (response.ok) {
          console.log('✅ WhatsApp service is ready');
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('WhatsApp service failed to start');
  }

  private async callServiceAPI(endpoint: string, method = 'GET', body?: any) {
    const url = `http://localhost:${this.whatsappServicePort}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Service API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private connectionStatePolling: NodeJS.Timeout | null = null;

  private startConnectionStatePolling() {
    if (this.connectionStatePolling) {
      return;
    }

    this.connectionStatePolling = setInterval(async () => {
      try {
        const state = await this.callServiceAPI('/connection-state');
        this.emit('connectionStateChanged', state);
      } catch (error) {
        // Service might be down
      }
    }, 2000); // Poll every 2 seconds
  }

  private stopConnectionStatePolling() {
    if (this.connectionStatePolling) {
      clearInterval(this.connectionStatePolling);
      this.connectionStatePolling = null;
    }
  }

  async start() {
    if (this.isRunning) return;

    try {
      this.isRunning = true;

      // Load project context (non-blocking - continue if it fails)
      try {
        await this.loadProjectContext();
      } catch (error) {
        console.warn('Failed to load project context:', error);
        // Continue anyway - context is optional
      }

      // Initialize WhatsApp client
      await this.whatsappClient.initialize();

      this.db.auditLog('SERVICE_START', 'Background service started');
    } catch (error) {
      this.isRunning = false;
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async stop() {
    if (!this.isRunning) return;

    try {
      this.isRunning = false;

      // Stop connection state polling
      this.stopConnectionStatePolling();

      // Stop WhatsApp standalone service
      await this.stopWhatsAppService();

      // Stop WhatsApp client
      await this.whatsappClient.destroy();

      // Close database
      this.db.close();

      this.db.auditLog('SERVICE_STOP', 'Background service stopped');
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async loadProjectContext() {
    try {
      const context = await this.contextLoader.loadContext();
      const checksum = await this.contextLoader.getContextChecksum();

      if (checksum !== this.contextChecksum) {
        this.contextChecksum = checksum;
        // Signal extraction has been removed - context setting no longer needed

        // Update milestones in database
        for (const milestoneData of context.milestones) {
          const milestone = {
            ...milestoneData,
            status: 'NOT_STARTED' as const,
            lastUpdateTs: Date.now()
          };
          await this.db.upsertMilestone(milestone);
        }

        this.emit('contextUpdated', context);
        this.db.auditLog('CONTEXT_LOADED', `Context loaded with ${context.milestones.length} milestones`);
      }
    } catch (error) {
      console.error('Failed to load project context:', error);
    }
  }

  private async processMessage(message: Message) {
    try {
      console.log(`📨 Processing message from group: ${message.groupId}`);

      // Check if the message is from a watched group
      const groups = await this.db.getGroups();
      const group = groups.find(g => g.id === message.groupId && g.isWatched);

      if (!group) {
        console.log(`⏭️  Skipping message - group ${message.groupId} is not watched`);
        return;
      }

      console.log(`💾 Storing message from watched group: ${group.name}`);

      // Store message in database
      const inserted = await this.db.insertMessage(message);
      if (!inserted) {
        console.log(`⏭️  Message already exists, skipping`);
        return; // Message already exists
      }

      console.log(`✅ Message stored and emitting messageProcessed event`);
      this.emit('messageProcessed', message);

      // Parse message with Parser Agent if enabled
      if (this.parserAgent && this.parserAgent.isReady()) {
        console.log(`🧠 Parsing message with Parser Agent...`);
        await this.parserAgent.parseMessage(message, {
          groupName: group.name,
          projectName: group.name
        });
      }

      // Check for auto-response trigger
      await this.checkAndRespondToMessage(message, group);
    } catch (error) {
      console.error('Failed to process message:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async checkAndRespondToMessage(message: Message, group: Group) {
    try {
      console.log(`🔍 Checking auto-response for group: ${group.name}, enabled: ${group.autoResponseEnabled}`);

      // Check if auto-response is enabled for this group
      if (!group.autoResponseEnabled) {
        console.log(`⏭️  Auto-response not enabled for group: ${group.name}`);
        return;
      }

      // Check if message contains trigger keyword
      const trigger = group.autoResponseTrigger || 'NXSYS_AI';
      const messageText = message.text.trim();

      console.log(`🔍 Checking message for trigger "${trigger}": "${messageText}"`);

      if (!messageText.toUpperCase().includes(trigger.toUpperCase())) {
        console.log(`⏭️  Message does not contain trigger: "${trigger}"`);
        return;
      }

      console.log(`🤖 Auto-response triggered in group: ${group.name}`);

      // Extract question after trigger
      const triggerIndex = messageText.toUpperCase().indexOf(trigger.toUpperCase());
      const question = messageText.substring(triggerIndex + trigger.length).trim();

      if (!question) {
        console.log(`⚠️  No question found after trigger`);
        return;
      }

      // Check if we have API key configured
      if (!this.config.geminiApiKey && !this.aiService.hasApiKey()) {
        console.log(`⚠️  Auto-response skipped: No API key configured`);
        return;
      }

      console.log(`🔍 Processing auto-response question: "${question}"`);

      // Get AI response directly without context
      console.log(`🤖 Getting direct AI answer for question`);
      const answer = await this.getDirectAIAnswer(question, this.config.geminiApiKey);
      console.log(`✅ Got AI response: ${answer.substring(0, 50)}...`);

      // Get author name for @mention
      const authorName = message.authorName || message.author;
      console.log(`👤 Author for mention: ${authorName}`);

      // Format response with @mention
      const responseMessage = `@${authorName} ${answer}`;

      // Send response to group
      console.log(`📤 Sending auto-response to group: ${group.name}`);
      await this.sendMessage(group.id, responseMessage);
      console.log(`✅ Auto-response sent successfully!`);

      this.db.auditLog('AUTO_RESPONSE', `Responded to ${authorName} in ${group.name}`);
    } catch (error) {
      console.error('❌ Failed to auto-respond:', error);
      console.error('Error details:', error instanceof Error ? error.stack : error);
      // Don't throw - just log the error
    }
  }

  // Public API methods

  getConnectionState(): WhatsAppConnectionState {
    return this.whatsappClient.getConnectionState();
  }

  async getGroups(): Promise<Group[]> {
    return this.db.getGroups();
  }

  async updateGroupWatchStatus(groupId: string, isWatched: boolean): Promise<boolean> {
    const success = await this.db.updateGroupWatchStatus(groupId, isWatched);
    if (success) {
      const groups = await this.db.getGroups();
      this.emit('groupsUpdated', groups);
    }
    return success;
  }

  async updateGroupAutoResponse(groupId: string, enabled: boolean, trigger?: string): Promise<boolean> {
    const success = await this.db.updateGroupAutoResponse(groupId, enabled, trigger);
    if (success) {
      const groups = await this.db.getGroups();
      this.emit('groupsUpdated', groups);
    }
    return success;
  }

  async getMessages(groupId?: string, since?: number, limit?: number): Promise<Message[]> {
    return this.db.getMessages(groupId, since, limit);
  }

  async getGroupMembers(groupId: string) {
    // Get all messages for this group
    const messages = await this.db.getMessages(groupId, undefined, 100000);

    // Process messages to get unique members with their stats
    const memberMap = new Map();

    messages.forEach((message: Message) => {
      const memberKey = message.author;
      if (memberMap.has(memberKey)) {
        const existing = memberMap.get(memberKey);
        existing.messageCount++;
        existing.lastSeen = Math.max(existing.lastSeen, message.timestamp);
      } else {
        memberMap.set(memberKey, {
          author: message.author,
          authorName: message.authorName || message.author,
          messageCount: 1,
          lastSeen: message.timestamp,
          role: ''
        });
      }
    });

    // Convert map to array and sort by message count
    const members = Array.from(memberMap.values()).sort((a, b) => b.messageCount - a.messageCount);

    return members;
  }

  async uploadChatHistory(groupId: string, content: string) {
    try {
      console.log(`📤 [STEP 1] Uploading chat history for group: ${groupId}`);
      console.log(`📄 Content length: ${content.length} characters`);

      // Parse WhatsApp chat export
      const parsedMessages = parseWhatsAppChat(content);
      console.log(`✅ Parsed ${parsedMessages.length} messages`);

      // Get group info
      const groups = await this.db.getGroups();
      const group = groups.find(g => g.id === groupId);

      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }

      let messagesInserted = 0;

      // Insert all messages into database
      console.log(`💾 Inserting ${parsedMessages.length} messages into database...`);
      for (const parsed of parsedMessages) {
        const message: Message = {
          id: `${groupId}_${parsed.timestamp}_${parsed.author}`,
          groupId,
          author: parsed.author,
          authorName: parsed.authorName,
          timestamp: parsed.timestamp,
          text: parsed.text,
          raw: JSON.stringify({ imported: true, originalTimestamp: parsed.timestamp })
        };

        const inserted = await this.db.insertMessage(message);
        if (inserted) {
          messagesInserted++;
        }
      }
      console.log(`✅ Inserted ${messagesInserted} messages`);

      // Mark group as having history uploaded
      await this.db.updateGroupHistoryStatus(groupId, true);

      this.db.auditLog('CHAT_HISTORY_UPLOADED', `Uploaded ${messagesInserted} messages for group ${groupId}`);

      // Emit event to refresh groups in UI
      const updatedGroups = await this.db.getGroups();
      this.emit('groupsUpdated', updatedGroups);

      return {
        success: true,
        messagesProcessed: parsedMessages.length,
        messagesInserted
      };
    } catch (error) {
      console.error('❌ Failed to upload chat history:', error);
      throw error;
    }
  }

  async extractProjectData(groupId: string) {
    try {
      console.log(`🧠 [STEP 2] Extracting project data for group: ${groupId}`);

      // Get group info
      const groups = await this.db.getGroups();
      const group = groups.find(g => g.id === groupId);

      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }

      // Get all messages for this group
      const messages = await this.db.getMessages(groupId);
      console.log(`📨 Found ${messages.length} messages to analyze`);

      if (messages.length === 0) {
        throw new Error('No messages found. Please upload chat history first.');
      }

      // Perform batch analysis if group is watched and batch agent is ready
      let storiesCreated = 0;
      let tasksCreated = 0;
      let risksCreated = 0;
      let decisionsCreated = 0;

      // Check prerequisites for extraction
      if (!group.isWatched) {
        throw new Error('Group must be watched to extract project data. Please enable "Watch" for this group first.');
      }

      if (!this.batchAnalysisAgent) {
        throw new Error('AI extraction not available. Please set your Gemini API key in Settings first.');
      }

      if (!this.batchAnalysisAgent.isReady()) {
        throw new Error('AI extraction agent not ready. Please check your Gemini API key in Settings.');
      }

      console.log(`🧠 Performing holistic batch analysis...`);

      // Get group context (Epic definition)
      const groupContext = group.context || '';
      console.log(`📋 Context: ${groupContext ? 'Available' : 'Not set - AI will infer'}`);

      // Analyze entire history in ONE AI call
      const analysisResult: BatchAnalysisResult = await this.batchAnalysisAgent.analyzeHistory(
        messages,
        groupContext,
        group.name
      );

      console.log(`✅ Batch analysis complete!`);
      console.log(`   - Stories: ${analysisResult.stories.length}`);
      console.log(`   - Risks: ${analysisResult.risks.length}`);
      console.log(`   - Decisions: ${analysisResult.decisions.length}`);

      // Step 3: Create/Update Project (Epic) from context
      const allProjects = await this.db.getProjects({});
      const existingProjects = allProjects.filter(p => p.whatsappGroupId === group.id);
      let project;

      if (existingProjects.length > 0) {
        // Update existing project
        project = existingProjects[0];
        console.log(`📁 Updating existing project: ${project.name}`);
      } else {
        // Create new project (Epic) from context
        console.log(`📁 Creating new project from context...`);
        const projectId = uuidv4();
        await this.db.insertProject({
          id: projectId,
          whatsappGroupId: group.id,
          name: analysisResult.projectName,
          description: analysisResult.projectDescription || groupContext,
          status: 'active',
          priority: 2,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        const updatedProjects = await this.db.getProjects({});
        project = updatedProjects.find(p => p.id === projectId);
      }

      if (!project) {
        throw new Error('Failed to create/find project');
      }

      // Step 4: Insert all stories, tasks, subtasks
      for (const story of analysisResult.stories) {
        console.log(`📖 Creating story: ${story.title}`);

        const storyId = uuidv4();
        await this.db.insertTask({
          id: storyId,
          projectId: project.id,
          title: story.title,
          description: story.description,
          workItemType: 'story',
          storyPoints: story.storyPoints,
          acceptanceCriteria: story.acceptanceCriteria,
          priority: story.priority,
          status: story.status,
          sapModule: story.sapModule,
          sapTcode: story.sapTcode,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        storiesCreated++;

        // Insert tasks for this story
        for (const task of story.tasks) {
          console.log(`  ✓ Creating task: ${task.title}`);

          const taskId = uuidv4();
          await this.db.insertTask({
            id: taskId,
            projectId: project.id,
            parentTaskId: storyId,
            title: task.title,
            description: task.description,
            workItemType: task.workItemType,
            ownerAlias: task.ownerAlias,
            ownerPhone: task.ownerPhone,
            deadline: task.deadline,
            priority: task.priority,
            status: task.status,
            sapModule: task.sapModule,
            sapTcode: task.sapTcode,
            sapTransportRequest: task.sapTransportRequest,
            aiRecommendation: task.aiRecommendation,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });

          tasksCreated++;

          // Insert subtasks
          if (task.subtasks && task.subtasks.length > 0) {
            for (const subtask of task.subtasks) {
              console.log(`    · Creating subtask: ${subtask.title}`);

              await this.db.insertTask({
                id: uuidv4(),
                projectId: project.id,
                parentTaskId: taskId,
                title: subtask.title,
                description: subtask.description,
                workItemType: 'subtask',
                ownerAlias: subtask.ownerAlias,
                priority: subtask.priority,
                status: subtask.status,
                createdAt: Date.now(),
                updatedAt: Date.now()
              });

              tasksCreated++;
            }
          }
        }
      }

      // Step 5: Insert risks
      for (const risk of analysisResult.risks) {
        // Map probability values
        const probabilityMap: Record<string, 'very_likely' | 'likely' | 'possible' | 'unlikely'> = {
          'high': 'very_likely',
          'medium': 'likely',
          'low': 'unlikely'
        };

        await this.db.insertRisk({
          id: uuidv4(),
          projectId: project.id,
          title: risk.title,
          description: risk.description,
          severity: risk.severity,
          probability: probabilityMap[risk.probability] || 'possible',
          mitigationPlan: risk.mitigation,
          status: 'open',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        risksCreated++;
      }

      // Step 6: Insert decisions (skipped - no insertDecision method yet)
      // TODO: Implement insertDecision in database.ts
      decisionsCreated = 0;
      console.log(`⚠️  Skipping ${analysisResult.decisions.length} decisions (not implemented yet)`);

      console.log(`✅ Batch analysis results saved:`);
      console.log(`   - Stories: ${storiesCreated}`);
      console.log(`   - Tasks: ${tasksCreated}`);
      console.log(`   - Risks: ${risksCreated}`);
      console.log(`   - Decisions: ${decisionsCreated}`);

      // Step 7: Generate Gantt Chart
      console.log(`📊 Generating Gantt chart...`);
      try {
        const allTasks = await this.db.getTasks({ projectId: project.id });
        const ganttResult = await this.aiService.generateGanttChart({
          context: groupContext || analysisResult.projectDescription || '',
          groupName: group.name,
          tasks: allTasks,
          projects: [project]
        });

        // Update project with Gantt chart
        await this.db.updateProject(project.id, { ganttChart: ganttResult.mermaidSyntax });
        console.log(`✅ Gantt chart generated and saved`);
      } catch (ganttError) {
        console.error(`⚠️  Failed to generate Gantt chart:`, ganttError);
        // Continue even if Gantt chart generation fails
      }

      this.db.auditLog('PROJECT_DATA_EXTRACTED', `Extracted ${storiesCreated} stories, ${tasksCreated} tasks, ${risksCreated} risks for group ${groupId}`);

      // Emit event to refresh groups in UI
      const updatedGroups = await this.db.getGroups();
      this.emit('groupsUpdated', updatedGroups);

      return {
        success: true,
        storiesCreated,
        tasksCreated,
        risksCreated,
        decisionsCreated
      };
    } catch (error) {
      console.error('❌ Failed to extract project data:', error);
      throw error;
    }
  }

  async deleteGroupHistory(groupId: string) {
    try {
      console.log(`🗑️  Deleting ALL data for group: ${groupId}`);
      console.log(`   This will delete: messages, projects, tasks, risks, decisions, dependencies`);

      const result = await this.db.deleteGroupMessages(groupId);

      console.log(`✅ Deletion complete:`);
      console.log(`   📧 Messages: ${result.deletedMessages}`);
      console.log(`   📁 Projects: ${result.deletedProjects}`);
      console.log(`   ✅ Tasks: ${result.deletedTasks}`);
      console.log(`   ⚠️  Risks: ${result.deletedRisks}`);
      console.log(`   🎯 Decisions: ${result.deletedDecisions}`);
      console.log(`   🔗 Dependencies: ${result.deletedDependencies}`);

      const totalDeleted = result.deletedMessages + result.deletedProjects + result.deletedTasks +
                          result.deletedRisks + result.deletedDecisions + result.deletedDependencies;

      this.db.auditLog(
        'CHAT_HISTORY_DELETED',
        `Deleted all data for group ${groupId}: ${result.deletedMessages} messages, ${result.deletedProjects} projects, ${result.deletedTasks} tasks, ${result.deletedRisks} risks, ${result.deletedDecisions} decisions, ${result.deletedDependencies} dependencies`
      );

      // Emit event to refresh groups in UI
      const groups = await this.db.getGroups();
      this.emit('groupsUpdated', groups);

      return {
        success: true,
        ...result,
        totalDeleted
      };
    } catch (error) {
      console.error('❌ Failed to delete group data:', error);
      throw error;
    }
  }

  async getMilestones() {
    return this.db.getMilestones();
  }

  async generateSnapshot(since?: number): Promise<SnapshotReport> {
    // Reload context if it has changed
    await this.loadProjectContext();

    return this.snapshotGenerator.generateSnapshot(since);
  }

  async exportSnapshot(report: SnapshotReport, format: 'json' | 'markdown'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else {
      return this.snapshotGenerator.formatAsMarkdown(report);
    }
  }

  getStats() {
    return this.db.getStats();
  }

  getAuditLogs(limit = 100) {
    return this.db.getAuditLogs(limit);
  }

  async refreshGroups(): Promise<Group[]> {
    if (this.whatsappClient.isConnected()) {
      const groups = await this.whatsappClient.getGroups();
      for (const group of groups) {
        await this.db.upsertGroup(group);
      }
      // Return groups from database to include all fields (history status, etc.)
      const dbGroups = await this.db.getGroups();
      this.emit('groupsUpdated', dbGroups);
      return dbGroups;
    }
    return await this.db.getGroups();
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  async getGroupContext(groupId: string) {
    return await this.db.getGroupContext(groupId);
  }

  async updateGroupContext(groupId: string, context: string) {
    return await this.db.updateGroupContext(groupId, context);
  }

  async deleteGroupContext(groupId: string) {
    return await this.db.deleteGroupContext(groupId);
  }

  async generateGroupReport(groupId: string, timeframe: number = 30) {
    // Stub for now - can implement AI-powered reports later
    const messages = await this.db.getMessages(groupId, Date.now() - (timeframe * 24 * 60 * 60 * 1000), 1000);
    return {
      groupId,
      timeframe,
      messageCount: messages.length,
      summary: `${messages.length} messages in the last ${timeframe} days`
    };
  }

  // AI Chat methods

  async chatWithAI(groupId: string, question: string, apiKey?: string) {
    // Set API key if provided
    if (apiKey && apiKey !== this.config.geminiApiKey) {
      this.aiService.setApiKey(apiKey);
    } else if (this.config.geminiApiKey) {
      this.aiService.setApiKey(this.config.geminiApiKey);
    }

    if (!this.aiService.hasApiKey()) {
      throw new Error('AI service not configured. Please provide a Gemini API key in settings.');
    }

    // Get group messages - reduced to 30 for faster response
    const messages = await this.db.getMessages(groupId, undefined, 30);

    // Get group context
    const contextData = await this.db.getGroupContext(groupId);

    // Get contacts with caching (5 minute cache)
    const now = Date.now();
    if (!this.contactsCache || now - this.contactsCacheTime > 300000) {
      const contacts = await this.db.getContacts();
      this.contactsCache = new Map(
        contacts.map(c => [c.phoneNumber, { alias: c.alias, role: c.role }])
      );
      this.contactsCacheTime = now;
    }

    return await this.aiService.chat({
      question,
      context: contextData.context,
      groupMessages: messages,
      apiKey,
      contacts: this.contactsCache
    });
  }

  async testAIConnection(apiKey?: string) {
    if (apiKey) {
      this.aiService.setApiKey(apiKey);
    } else if (this.config.geminiApiKey) {
      this.aiService.setApiKey(this.config.geminiApiKey);
    }

    return await this.aiService.testConnection();
  }

  async generateGanttChart(groupId: string, apiKey?: string) {
    // Set API key if provided
    if (apiKey && apiKey !== this.config.geminiApiKey) {
      this.aiService.setApiKey(apiKey);
    } else if (this.config.geminiApiKey) {
      this.aiService.setApiKey(this.config.geminiApiKey);
    }

    if (!this.aiService.hasApiKey()) {
      throw new Error('AI service not configured. Please provide a Gemini API key in settings.');
    }

    // Get group info
    const groups = await this.db.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Get group context
    const contextData = await this.db.getGroupContext(groupId);
    if (!contextData || !contextData.context) {
      throw new Error('No context found for this group. Please set the project context first.');
    }

    // Get projects for this group
    const allProjects = await this.db.getProjects();
    const projects = allProjects.filter(p => p.whatsappGroupId === groupId);

    // Get tasks for those projects
    let tasks: any[] = [];
    for (const project of projects) {
      const projectTasks = await this.db.getTasks({ projectId: project.id });
      tasks = tasks.concat(projectTasks);
    }

    return await this.aiService.generateGanttChart({
      context: contextData.context,
      groupName: group.name,
      tasks,
      projects
    });
  }

  setGeminiApiKey(apiKey: string) {
    this.aiService.setApiKey(apiKey);
    this.config.geminiApiKey = apiKey;

    // Update or initialize Parser Agent with new API key
    if (this.parserAgent) {
      this.parserAgent.updateApiKey(apiKey);
    } else {
      this.parserAgent = new ParserAgent(apiKey);
      this.setupEventBusListeners();
    }

    // Update or initialize Batch Analysis Agent with new API key
    if (this.batchAnalysisAgent) {
      this.batchAnalysisAgent.updateApiKey(apiKey);
    } else {
      this.batchAnalysisAgent = new BatchAnalysisAgent(apiKey);
    }

    console.log('✅ AI agents updated with new API key');
  }

  async sendMessage(groupId: string, message: string): Promise<boolean> {
    if (!this.whatsappClient.isConnected()) {
      throw new Error('WhatsApp is not connected. Please connect first.');
    }

    this.db.auditLog('MESSAGE_SENT', `Sent message to group ${groupId}: ${message.substring(0, 50)}...`);
    return await this.whatsappClient.sendMessage(groupId, message);
  }

  // Contacts Management
  async getContacts() {
    return await this.db.getContacts();
  }

  async getContact(phoneNumber: string) {
    return await this.db.getContact(phoneNumber);
  }

  async upsertContact(contact: { phoneNumber: string; alias: string; role?: string; notes?: string }) {
    // Invalidate cache when contacts are modified
    this.contactsCache = null;
    return await this.db.upsertContact(contact);
  }

  async deleteContact(phoneNumber: string) {
    // Invalidate cache when contacts are modified
    this.contactsCache = null;
    return await this.db.deleteContact(phoneNumber);
  }

  async getAuthorsFromWatchedGroups() {
    return await this.db.getAuthorsFromWatchedGroups();
  }

  private async getDirectAIAnswer(question: string, apiKey?: string): Promise<string> {
    try {
      // Use the AI service to get a direct answer without context
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey || this.config.geminiApiKey || '');
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

      const result = await model.generateContent(question);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Failed to get direct AI answer:', error);
      throw error;
    }
  }

  // ==================== AIPM PROJECT MANAGEMENT API ====================

  async getProjects(filter?: { status?: string }) {
    return await this.db.getProjects(filter);
  }

  async createProject(project: any) {
    const projectId = uuidv4();
    await this.db.insertProject({
      id: projectId,
      ...project,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return { id: projectId };
  }

  async getTasks(filter?: { projectId?: string; status?: string; ownerPhone?: string }) {
    return await this.db.getTasks(filter);
  }

  async createTask(task: any) {
    const taskId = uuidv4();
    await this.db.insertTask({
      id: taskId,
      ...task,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return { id: taskId };
  }

  async updateTask(taskId: string, updates: any) {
    await this.db.updateTask({
      id: taskId,
      ...updates
    });
    return { success: true };
  }

  async getRisks(filter?: { projectId?: string }) {
    return await this.db.getRisks(filter);
  }

  async getConflicts() {
    return await this.db.getConflicts();
  }
}