// Enhanced Express server with SQLite database for handling thousands of messages
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3001;

// Enable CORS for your frontend - allow all localhost ports
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept text files and any file type (WhatsApp exports are usually .txt)
    cb(null, true);
  }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Initialize SQLite database
const db = new sqlite3.Database('./statuz_history.db');

// Create tables if they don't exist
db.serialize(() => {
  // Messages table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    groupId TEXT NOT NULL,
    author TEXT NOT NULL,
    authorName TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    text TEXT NOT NULL,
    raw TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  // Groups table
  db.run(`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    isWatched INTEGER DEFAULT 1,
    hasHistoryUploaded INTEGER DEFAULT 0,
    historyUploadedAt INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  // Milestones table
  db.run(`CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT,
    dueDate TEXT,
    acceptanceCriteria TEXT,
    status TEXT DEFAULT 'NOT_STARTED',
    lastUpdateTs INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  // Create indexes for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_group_timestamp ON messages (groupId, timestamp DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp DESC)`);
});

// Database migration to add missing columns
db.serialize(() => {
  // Check if hasHistoryUploaded column exists and add it if missing
  db.all("PRAGMA table_info(groups)", (err, columns) => {
    if (err) {
      console.error('Error checking groups table structure:', err);
      return;
    }

    const hasHistoryUploadedExists = columns.some(col => col.name === 'hasHistoryUploaded');
    const historyUploadedAtExists = columns.some(col => col.name === 'historyUploadedAt');
    const contextExists = columns.some(col => col.name === 'context');
    const contextUpdatedAtExists = columns.some(col => col.name === 'contextUpdatedAt');

    if (!hasHistoryUploadedExists) {
      db.run("ALTER TABLE groups ADD COLUMN hasHistoryUploaded INTEGER DEFAULT 0", (err) => {
        if (err) {
          console.error('Error adding hasHistoryUploaded column:', err);
        } else {
          console.log('✅ Added hasHistoryUploaded column to groups table');
        }
      });
    }

    if (!historyUploadedAtExists) {
      db.run("ALTER TABLE groups ADD COLUMN historyUploadedAt INTEGER", (err) => {
        if (err) {
          console.error('Error adding historyUploadedAt column:', err);
        } else {
          console.log('✅ Added historyUploadedAt column to groups table');
        }
      });
    }

    if (!contextExists) {
      db.run("ALTER TABLE groups ADD COLUMN context TEXT", (err) => {
        if (err) {
          console.error('Error adding context column:', err);
        } else {
          console.log('✅ Added context column to groups table');
        }
      });
    }

    if (!contextUpdatedAtExists) {
      db.run("ALTER TABLE groups ADD COLUMN contextUpdatedAt INTEGER", (err) => {
        if (err) {
          console.error('Error adding contextUpdatedAt column:', err);
        } else {
          console.log('✅ Added contextUpdatedAt column to groups table');
        }
      });
    }
  });
});

// Demo data removed - database starts empty
// Use real WhatsApp data or upload chat history via the UI

// function initializeSampleData() {
//   const groups = [
//     { id: 'live_1', name: 'Real Project Team Alpha', isWatched: 1 },
//     { id: 'live_2', name: 'Client Communications', isWatched: 1 },
//     { id: 'live_3', name: 'Development Updates', isWatched: 0 },
//     { id: 'live_4', name: 'QA & Testing', isWatched: 1 },
//     { id: 'live_5', name: 'Management Dashboard', isWatched: 0 }
//   ];
// 
//   const milestones = [
//     {
//       id: 'LIVE_PROJ_001',
//       title: 'Backend API Development',
//       description: 'Complete REST API for real-time messaging',
//       owner: 'Development Team',
//       dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
//       acceptanceCriteria: 'All endpoints tested and documented',
//       status: 'IN_PROGRESS',
//       lastUpdateTs: Date.now()
//     },
//     {
//       id: 'LIVE_PROJ_002',
//       title: 'Real-time Message Processing',
//       description: 'Implement live message ingestion and processing',
//       owner: 'AI Team',
//       dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
//       acceptanceCriteria: 'Real-time message processing working',
//       status: 'NOT_STARTED',
//       lastUpdateTs: Date.now()
//     }
//   ];
// 
//   // Insert groups
//   const groupStmt = db.prepare("INSERT INTO groups (id, name, isWatched) VALUES (?, ?, ?)");
//   groups.forEach(group => {
//     groupStmt.run(group.id, group.name, group.isWatched);
//   });
//   groupStmt.finalize();
// 
//   // Insert milestones
//   const milestoneStmt = db.prepare("INSERT INTO milestones (id, title, description, owner, dueDate, acceptanceCriteria, status, lastUpdateTs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
//   milestones.forEach(milestone => {
//     milestoneStmt.run(milestone.id, milestone.title, milestone.description, milestone.owner, milestone.dueDate, milestone.acceptanceCriteria, milestone.status, milestone.lastUpdateTs);
//   });
//   milestoneStmt.finalize();
// 
//   // Generate historical messages (simulate thousands of past messages)
//   generateHistoricalMessages();
// }
// 
// function generateHistoricalMessages() {
//   console.log('📚 Generating historical message data...');
// 
//   const messageTemplates = [
//     { author: 'sarah@team.com', name: 'Sarah Chen', texts: [
//       'API endpoints for user authentication completed and tested',
//       'Database migration successful - no data loss detected',
//       'BLOCKER: Third-party service integration failing',
//       'Sprint review completed - 8 out of 10 stories done',
//       'TODO: @Mike please review the security implementation',
//       'Fixed critical bug in payment processing',
//       'Integration tests passing at 95%',
//       'RISK: Performance degradation under load',
//       'Code review completed for authentication module',
//       'DECISION: Moving to microservices architecture'
//     ]},
//     { author: 'mike@team.com', name: 'Mike Johnson', texts: [
//       'Load testing shows system handles 5K concurrent users',
//       'RISK: Server costs exceeding budget by 20%',
//       'Feature deployment scheduled for Friday 3PM',
//       'Code review found 2 critical security issues',
//       'DECISION: Using Redis for session management',
//       'Performance optimization reduced response time by 40%',
//       'TODO: Update documentation for new API endpoints',
//       'BLOCKER: Database connection pooling issues',
//       'Successfully migrated legacy data',
//       'MILESTONE: User management system 100% complete'
//     ]},
//     { author: 'emma@team.com', name: 'Emma Rodriguez', texts: [
//       'Mobile app performance improved by 35%',
//       'User feedback: New UI is much more intuitive',
//       'QA testing revealed 5 minor bugs - all fixed',
//       'MILESTONE: Payment integration 90% complete',
//       'Client demo scheduled for next Tuesday',
//       'RISK: Timeline slipping due to scope creep',
//       'TODO: @Sarah prepare production deployment checklist',
//       'DECISION: Adopting automated testing framework',
//       'Bug fix deployed to production successfully',
//       'Integration with external API working perfectly'
//     ]},
//     { author: 'alex@team.com', name: 'Alex Chen', texts: [
//       'Infrastructure scaling completed',
//       'BLOCKER: SSL certificate renewal failed',
//       'Monitoring dashboard shows all systems green',
//       'RISK: Dependency vulnerability discovered',
//       'TODO: Update all production servers to latest OS',
//       'Backup system tested and verified',
//       'DECISION: Implementing blue-green deployment',
//       'Performance metrics improved by 25%',
//       'MILESTONE: CI/CD pipeline fully automated',
//       'Security audit completed with minor findings'
//     ]}
//   ];
// 
//   const groupIds = ['live_1', 'live_2', 'live_3', 'live_4', 'live_5'];
//   const messageStmt = db.prepare("INSERT INTO messages (id, groupId, author, authorName, timestamp, text, raw) VALUES (?, ?, ?, ?, ?, ?, ?)");
// 
//   // Generate messages over the last 90 days
//   const now = Date.now();
//   const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
// 
//   for (let i = 0; i < 2000; i++) { // Generate 2000 historical messages
//     const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
//     const text = template.texts[Math.floor(Math.random() * template.texts.length)];
//     const groupId = groupIds[Math.floor(Math.random() * groupIds.length)];
// 
//     // Random timestamp within the last 90 days
//     const timestamp = ninetyDaysAgo + Math.random() * (now - ninetyDaysAgo);
// 
//     const messageId = `hist_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
// 
//     messageStmt.run(messageId, groupId, template.author, template.name, Math.floor(timestamp), text, JSON.stringify({ text, timestamp }));
//   }
// 
//   messageStmt.finalize();
// 
//   console.log('✅ Generated 2000 historical messages');
// }
// 
// 
// // Continue generating new real-time messages
// setInterval(() => {
//   const messageTemplates = [
//     { author: 'sarah@team.com', name: 'Sarah Chen', texts: [
//       'New feature branch created for analytics dashboard',
//       'BLOCKER: Payment gateway API returning 500 errors',
//       'Code coverage increased to 85%',
//       'TODO: @Mike review the new authentication flow'
//     ]},
//     { author: 'mike@team.com', name: 'Mike Johnson', texts: [
//       'Database optimization reduced query time by 60%',
//       'RISK: Third-party service deprecating API v2',
//       'DECISION: Implementing caching layer with Redis',
//       'Load balancer configuration updated'
//     ]},
//     { author: 'emma@team.com', name: 'Emma Rodriguez', texts: [
//       'User acceptance testing completed successfully',
//       'MILESTONE: Mobile app deployment ready',
//       'Client feedback incorporated into design',
//       'TODO: @Alex update production SSL certificates'
//     ]}
//   ];
// 
//   const groupIds = ['live_1', 'live_2', 'live_3', 'live_4', 'live_5'];
//   const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
//   const text = template.texts[Math.floor(Math.random() * template.texts.length)];
//   const groupId = groupIds[Math.floor(Math.random() * groupIds.length)];
//   const timestamp = Date.now();
// 
//   const messageId = `live_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
// 
//   const messageStmt = db.prepare("INSERT INTO messages (id, groupId, author, authorName, timestamp, text, raw) VALUES (?, ?, ?, ?, ?, ?, ?)");
//   messageStmt.run(messageId, groupId, template.author, template.name, timestamp, text, JSON.stringify({ text, timestamp }));
//   messageStmt.finalize();
// 
//   console.log(`📨 New live message: ${text.substring(0, 50)}...`);
// }, 45000); // New message every 45 seconds
// 
// // API Endpoints with pagination and filtering

app.get('/api/connection-state', (req, res) => {
  res.json({
    status: 'CONNECTED',
    message: 'Live backend connected • Real-time updates enabled'
  });
});
// 
app.get('/api/groups', (req, res) => {
  db.all("SELECT * FROM groups ORDER BY name", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const groups = rows.map(row => ({
      id: row.id,
      name: row.name,
      isWatched: Boolean(row.isWatched),
      hasHistoryUploaded: Boolean(row.hasHistoryUploaded),
      historyUploadedAt: row.historyUploadedAt,
      context: row.context,
      contextUpdatedAt: row.contextUpdatedAt
    }));

    res.json(groups);
  });
});

// Add or update a group
app.post('/api/groups', (req, res) => {
  const { id, name, isWatched = false } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'Group id and name are required' });
  }

  // Insert or replace group (upsert)
  db.run(`
    INSERT OR REPLACE INTO groups (id, name, isWatched)
    VALUES (?, ?, ?)
  `, [id, name, isWatched], function(err) {
    if (err) {
      console.error('Error adding group:', err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`✅ Group synced: ${name} (${id})`);
    res.json({
      success: true,
      id: id,
      name: name,
      isWatched: isWatched
    });
  });
});

app.get('/api/messages', (req, res) => {
  const { groupId, since, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT m.*, g.name as groupName
    FROM messages m
    LEFT JOIN groups g ON m.groupId = g.id
    WHERE 1=1
  `;
  const params = [];

  if (groupId) {
    sql += ' AND m.groupId = ?';
    params.push(groupId);
  }

  if (since) {
    sql += ' AND m.timestamp >= ?';
    params.push(parseInt(since));
  }

  sql += ' ORDER BY m.timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const messages = rows.map(row => ({
      id: row.id,
      groupId: row.groupId,
      author: row.author,
      authorName: row.authorName,
      timestamp: row.timestamp,
      text: row.text,
      raw: row.raw,
      groupName: row.groupName
    }));

    res.json(messages);
  });
});

// Get message count for a specific group
app.get('/api/messages/count', (req, res) => {
  const { groupId } = req.query;

  if (!groupId) {
    return res.status(400).json({ error: 'groupId parameter is required' });
  }

  const sql = 'SELECT COUNT(*) as count FROM messages WHERE groupId = ?';

  db.get(sql, [groupId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ count: row.count });
  });
});

// Add a new message
app.post('/api/messages', (req, res) => {
  const { id, groupId, author, authorName, timestamp, text, raw } = req.body;

  if (!id || !groupId || !author || !text) {
    return res.status(400).json({ error: 'Message id, groupId, author, and text are required' });
  }

  // Insert or replace message (upsert)
  db.run(`
    INSERT OR REPLACE INTO messages (id, groupId, author, authorName, timestamp, text, raw)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, groupId, author, authorName || 'Unknown', timestamp || Date.now(), text, raw], function(err) {
    if (err) {
      console.error('Error adding message:', err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`💬 Message saved: ${text.substring(0, 50)}...`);
    res.json({
      success: true,
      id: id,
      groupId: groupId
    });
  });
});


app.get('/api/milestones', (req, res) => {
  db.all("SELECT * FROM milestones ORDER BY dueDate", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/stats', (req, res) => {
  const queries = {
    watchedGroups: "SELECT COUNT(*) as count FROM groups WHERE isWatched = 1",
    totalMessages: "SELECT COUNT(*) as count FROM messages",
    totalMilestones: "SELECT COUNT(*) as count FROM milestones",
    completedMilestones: "SELECT COUNT(*) as count FROM milestones WHERE status = 'DONE'",
    messagesByGroup: "SELECT g.name, COUNT(m.id) as count FROM groups g LEFT JOIN messages m ON g.id = m.groupId GROUP BY g.id, g.name"
  };

  const stats = {};
  let completedQueries = 0;
  const totalQueries = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, sql]) => {
    db.all(sql, (err, rows) => {
      if (!err) {
        if (key === 'messagesByGroup') {
          stats[key] = rows;
        } else {
          stats[key] = rows[0].count;
        }
      }

      completedQueries++;
      if (completedQueries === totalQueries) {
        res.json(stats);
      }
    });
  });
});

// Configuration endpoints
app.get('/api/config', (req, res) => {
  // Get config from a simple JSON file storage
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, 'config.json');

  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      res.json(config);
    } else {
      // Return default config
      const defaultConfig = {
        privacyMode: false,
        llmProvider: 'none',
        dataDirectory: '/live/data'
      };
      res.json(defaultConfig);
    }
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

app.post('/api/config', (req, res) => {
  // Update config in JSON file
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, 'config.json');

  try {
    const updates = req.body;
    let currentConfig = {
      privacyMode: false,
      llmProvider: 'none',
      dataDirectory: '/live/data'
    };

    // Read existing config if it exists
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      currentConfig = JSON.parse(configData);
    }

    // Merge updates with current config
    const newConfig = { ...currentConfig, ...updates };

    // Write back to file
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

    res.json(newConfig);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Historical analysis endpoints
app.get('/api/analysis/trends', (req, res) => {
  const { days = 30 } = req.query;
  const cutoffTime = Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000);

  const sql = `
    SELECT
      DATE(timestamp/1000, 'unixepoch') as date,
      COUNT(*) as messageCount,
      COUNT(DISTINCT groupId) as activeGroups
    FROM messages
    WHERE timestamp >= ?
    GROUP BY DATE(timestamp/1000, 'unixepoch')
    ORDER BY date DESC
  `;

  db.all(sql, [cutoffTime], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});


app.post('/api/groups/:id/watch', (req, res) => {
  const groupId = req.params.id;
  const { isWatched } = req.body;

  db.run("UPDATE groups SET isWatched = ?, updated_at = ? WHERE id = ?", [isWatched ? 1 : 0, Math.floor(Date.now() / 1000), groupId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes > 0) {
      console.log(`🔄 Group ${groupId} ${isWatched ? 'watched' : 'unwatched'}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Group not found' });
    }
  });
});

// Get group context
app.get('/api/groups/:id/context', (req, res) => {
  const groupId = req.params.id;

  db.get("SELECT context, contextUpdatedAt FROM groups WHERE id = ?", [groupId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({
      context: row.context || '',
      contextUpdatedAt: row.contextUpdatedAt
    });
  });
});

// Update group context
app.put('/api/groups/:id/context', (req, res) => {
  const groupId = req.params.id;
  const { context } = req.body;

  if (typeof context !== 'string') {
    return res.status(400).json({ error: 'Context must be a string' });
  }

  // Validate context length (10 pages = ~50,000 characters)
  const maxLength = 50000;
  if (context.length > maxLength) {
    return res.status(400).json({
      error: `Context is too long. Maximum ${maxLength} characters allowed (approximately 10 pages).`
    });
  }

  const contextUpdatedAt = Date.now();

  db.run(
    "UPDATE groups SET context = ?, contextUpdatedAt = ? WHERE id = ?",
    [context || null, contextUpdatedAt, groupId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes > 0) {
        console.log(`📝 Group context updated: ${groupId}`);
        res.json({
          success: true,
          context: context,
          contextUpdatedAt: contextUpdatedAt
        });
      } else {
        res.status(404).json({ error: 'Group not found' });
      }
    }
  );
});

// Delete group context
app.delete('/api/groups/:id/context', (req, res) => {
  const groupId = req.params.id;

  db.run("UPDATE groups SET context = NULL, contextUpdatedAt = NULL WHERE id = ?", [groupId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes > 0) {
      console.log(`🗑️ Group context deleted: ${groupId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Group not found' });
    }
  });
});

// Generate AI-powered group report
app.post('/api/groups/:id/generate-report', async (req, res) => {
  const groupId = req.params.id;
  const { timeframe = 30 } = req.body; // days to look back, default 30

  try {
    // Get group info and context
    const group = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM groups WHERE id = ?", [groupId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get recent messages for the group
    const cutoffTime = Math.floor(Date.now() / 1000) - (timeframe * 24 * 60 * 60);
    const messages = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM messages WHERE groupId = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT 1000",
        [groupId, cutoffTime],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Check if LLM is configured (this would check for API keys)
    const hasLLMConfig = false; // For now, always use mock report

    if (hasLLMConfig) {
      // TODO: Implement actual LLM integration
      // This would call OpenAI/Anthropic API with context + messages
      // and generate a comprehensive project status report
    }

    // Mock report generation removed - will implement with real AI
    const report = { error: 'Report generation not yet implemented without demo data' };

    res.json({
      success: true,
      report,
      generatedAt: Date.now(),
      timeframe,
      messageCount: messages.length
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// function generateMockReport(group, messages, timeframe) {
//   const messageCount = messages.length;
//   const uniqueAuthors = new Set(messages.map(m => m.author)).size;
//   const avgMsgPerDay = messageCount / timeframe;
//   const hasContext = !!group.context;
// 
//   // Analyze message patterns
//   const dailyActivity = {};
//   messages.forEach(msg => {
//     const date = new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000);
//     const day = date.toISOString().split('T')[0];
//     dailyActivity[day] = (dailyActivity[day] || 0) + 1;
//   });
// 
//   const activeDays = Object.keys(dailyActivity).length;
//   const peakDay = Object.entries(dailyActivity).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);
// 
//   // Extract project-specific content
//   const projectAnalysis = analyzeProjectContent(messages, group);
//   const personActivity = analyzePersonActivity(messages);
//   const taskProgress = analyzeTaskProgress(messages);
//   const technicalUpdates = analyzeTechnicalContent(messages);
// 
//   return {
//     // Executive Summary with actual project insights
//     executiveSummary: `PROJECT STATUS ANALYSIS: ${group.name}
// 
// CURRENT PROJECT STATE: ${projectAnalysis.summary}
// 
// TEAM ACTIVITY BREAKDOWN: ${personActivity.summary}
// 
// KEY DELIVERABLES STATUS: ${taskProgress.summary}
// 
// TECHNICAL PROGRESS: ${technicalUpdates.summary}`,
// 
//     // Who is doing what analysis
//     teamActivityBreakdown: {
//       title: "WHO IS DOING WHAT",
//       individuals: personActivity.individuals,
//       summary: personActivity.detailedBreakdown
//     },
// 
//     // Task and progress analysis
//     projectProgress: {
//       title: "WHERE WE ARE ON TASKS & TARGETS",
//       activeTasks: taskProgress.activeTasks,
//       completedTasks: taskProgress.completedTasks,
//       blockers: taskProgress.blockers,
//       upcomingDeadlines: taskProgress.upcomingDeadlines,
//       progressSummary: taskProgress.progressAnalysis
//     },
// 
//     // Technical work updates
//     technicalWork: {
//       title: "TECHNICAL UPDATES & DEVELOPMENTS",
//       recentWork: technicalUpdates.recentWork,
//       systemUpdates: technicalUpdates.systemUpdates,
//       configurationChanges: technicalUpdates.configChanges,
//       issuesResolved: technicalUpdates.resolvedIssues,
//       technicalSummary: technicalUpdates.technicalAnalysis
//     },
// 
//     // Recent critical communications
//     criticalUpdates: projectAnalysis.criticalMessages.map(msg => ({
//       author: msg.authorName || msg.author,
//       timestamp: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString(),
//       message: msg.text,
//       importance: msg.importance,
//       category: msg.category
//     })),
// 
//     // Action items and next steps
//     actionItems: {
//       immediate: projectAnalysis.immediateActions,
//       thisWeek: projectAnalysis.weeklyActions,
//       upcoming: projectAnalysis.upcomingActions
//     },
// 
//     // Project health metrics
//     projectMetrics: {
//       totalMessages: messageCount,
//       activeContributors: uniqueAuthors,
//       averageDailyActivity: avgMsgPerDay.toFixed(1),
//       peakActivityDate: peakDay[0] || 'No peak identified',
//       activeDaysRatio: `${((activeDays / timeframe) * 100).toFixed(1)}%`,
//       taskCompletionRate: taskProgress.completionRate,
//       technicalIssueResolutionRate: technicalUpdates.resolutionRate,
//       projectVelocity: projectAnalysis.velocity
//     }
//   };
// }
// 
// // Content analysis functions
// function analyzeProjectContent(messages, group) {
//   const criticalMessages = [];
//   const immediateActions = [];
//   const weeklyActions = [];
//   const upcomingActions = [];
//   let velocity = 'Moderate';
// 
//   messages.forEach(msg => {
//     const text = msg.text.toLowerCase();
//     const originalText = msg.text;
// 
//     // Identify critical project communications
//     if (text.includes('urgent') || text.includes('asap') || text.includes('immediate') ||
//         text.includes('critical') || text.includes('blocker') || text.includes('issue')) {
//       criticalMessages.push({
//         ...msg,
//         importance: 'High',
//         category: 'Urgent'
//       });
//     }
// 
//     // Extract action items
//     if (text.includes('need to') || text.includes('should') || text.includes('must') ||
//         text.includes('todo') || text.includes('action') || text.includes('@')) {
//       immediateActions.push(originalText);
//     }
// 
//     // Look for deadlines and timelines
//     if (text.includes('deadline') || text.includes('due') || text.includes('by ') ||
//         text.includes('target') || text.includes('timeline')) {
//       upcomingActions.push(originalText);
//     }
//   });
// 
//   // Determine project velocity based on message patterns
//   const recentMessages = messages.slice(0, 50);
//   const hasUrgentActivity = recentMessages.some(m =>
//     m.text.toLowerCase().includes('urgent') || m.text.toLowerCase().includes('asap')
//   );
// 
//   if (hasUrgentActivity) velocity = 'High';
//   else if (messages.length > 500) velocity = 'High';
//   else if (messages.length > 200) velocity = 'Moderate';
//   else velocity = 'Low';
// 
//   return {
//     summary: `Project showing ${velocity.toLowerCase()} activity levels with ${criticalMessages.length} urgent items identified.`,
//     criticalMessages: criticalMessages.slice(0, 10),
//     immediateActions: immediateActions.slice(0, 5),
//     weeklyActions: weeklyActions.slice(0, 5),
//     upcomingActions: upcomingActions.slice(0, 5),
//     velocity
//   };
// }
// 
// function analyzePersonActivity(messages) {
//   const personMap = new Map();
//   const recentDays = 7;
//   const cutoffTime = Date.now() - (recentDays * 24 * 60 * 60 * 1000);
// 
//   messages.forEach(msg => {
//     const person = msg.authorName || msg.author;
//     const timestamp = msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000;
// 
//     if (!personMap.has(person)) {
//       personMap.set(person, {
//         name: person,
//         totalMessages: 0,
//         recentMessages: 0,
//         lastSeen: timestamp,
//         recentWork: [],
//         keyActivities: []
//       });
//     }
// 
//     const personData = personMap.get(person);
//     personData.totalMessages++;
//     personData.lastSeen = Math.max(personData.lastSeen, timestamp);
// 
//     if (timestamp > cutoffTime) {
//       personData.recentMessages++;
//       if (personData.recentWork.length < 3) {
//         personData.recentWork.push(msg.text);
//       }
//     }
// 
//     // Identify work activities
//     const text = msg.text.toLowerCase();
//     if (text.includes('completed') || text.includes('done') || text.includes('finished')) {
//       personData.keyActivities.push(`Completed: ${msg.text.substring(0, 50)}...`);
//     } else if (text.includes('working on') || text.includes('implementing') || text.includes('developing')) {
//       personData.keyActivities.push(`Working on: ${msg.text.substring(0, 50)}...`);
//     } else if (text.includes('issue') || text.includes('problem') || text.includes('error')) {
//       personData.keyActivities.push(`Issue: ${msg.text.substring(0, 50)}...`);
//     }
//   });
// 
//   const individuals = Array.from(personMap.values())
//     .sort((a, b) => b.recentMessages - a.recentMessages)
//     .slice(0, 10)
//     .map(person => ({
//       name: person.name,
//       recentActivity: `${person.recentMessages} messages in last ${recentDays} days`,
//       lastSeen: new Date(person.lastSeen).toLocaleDateString(),
//       currentWork: person.recentWork.slice(0, 2),
//       keyContributions: person.keyActivities.slice(0, 2)
//     }));
// 
//   const summary = `${individuals.length} active team members with ${individuals[0]?.name || 'Unknown'} leading recent activity.`;
// 
//   const detailedBreakdown = individuals.map(person =>
//     `${person.name}: ${person.recentActivity}, last active ${person.lastSeen}`
//   ).join('\n');
// 
//   return { individuals, summary, detailedBreakdown };
// }
// 
// function analyzeTaskProgress(messages) {
//   const activeTasks = [];
//   const completedTasks = [];
//   const blockers = [];
//   const upcomingDeadlines = [];
// 
//   messages.forEach(msg => {
//     const text = msg.text.toLowerCase();
//     const originalText = msg.text;
// 
//     // Identify completed tasks
//     if (text.includes('completed') || text.includes('done') || text.includes('finished') ||
//         text.includes('resolved') || text.includes('fixed') || text.includes('closed')) {
//       completedTasks.push({
//         task: originalText,
//         completedBy: msg.authorName || msg.author,
//         date: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString()
//       });
//     }
// 
//     // Identify active tasks
//     if (text.includes('working on') || text.includes('implementing') || text.includes('developing') ||
//         text.includes('in progress') || text.includes('currently') || text.includes('testing')) {
//       activeTasks.push({
//         task: originalText,
//         assignee: msg.authorName || msg.author,
//         status: 'In Progress',
//         lastUpdate: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString()
//       });
//     }
// 
//     // Identify blockers
//     if (text.includes('blocked') || text.includes('blocker') || text.includes('stuck') ||
//         text.includes('issue') || text.includes('problem') || text.includes('error')) {
//       blockers.push({
//         issue: originalText,
//         reportedBy: msg.authorName || msg.author,
//         date: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString()
//       });
//     }
// 
//     // Identify deadlines
//     if (text.includes('deadline') || text.includes('due') || text.includes('target') ||
//         text.includes('timeline') || text.includes('delivery')) {
//       upcomingDeadlines.push({
//         deadline: originalText,
//         owner: msg.authorName || msg.author,
//         mentioned: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString()
//       });
//     }
//   });
// 
//   const completionRate = completedTasks.length > 0 ?
//     `${Math.round((completedTasks.length / (completedTasks.length + activeTasks.length)) * 100)}%` : 'No data';
// 
//   const progressAnalysis = `${activeTasks.length} active tasks, ${completedTasks.length} completed, ${blockers.length} blockers identified.`;
// 
//   return {
//     activeTasks: activeTasks.slice(0, 10),
//     completedTasks: completedTasks.slice(0, 10),
//     blockers: blockers.slice(0, 5),
//     upcomingDeadlines: upcomingDeadlines.slice(0, 5),
//     completionRate,
//     progressAnalysis,
//     summary: `${activeTasks.length} ongoing tasks with ${blockers.length} current blockers.`
//   };
// }
// 
// function analyzeTechnicalContent(messages) {
//   const recentWork = [];
//   const systemUpdates = [];
//   const configChanges = [];
//   const resolvedIssues = [];
// 
//   messages.forEach(msg => {
//     const text = msg.text.toLowerCase();
//     const originalText = msg.text;
// 
//     // Technical work patterns
//     if (text.includes('tcode') || text.includes('system') || text.includes('config') ||
//         text.includes('deployment') || text.includes('server') || text.includes('database')) {
//       recentWork.push({
//         work: originalText,
//         engineer: msg.authorName || msg.author,
//         date: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString()
//       });
//     }
// 
//     // System updates
//     if (text.includes('update') || text.includes('upgrade') || text.includes('patch') ||
//         text.includes('release') || text.includes('version')) {
//       systemUpdates.push({
//         update: originalText,
//         implementedBy: msg.authorName || msg.author,
//         date: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString()
//       });
//     }
// 
//     // Configuration changes
//     if (text.includes('config') || text.includes('setting') || text.includes('parameter') ||
//         text.includes('setup') || text.includes('configure')) {
//       configChanges.push({
//         change: originalText,
//         changedBy: msg.authorName || msg.author,
//         date: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString()
//       });
//     }
// 
//     // Resolved technical issues
//     if ((text.includes('fixed') || text.includes('resolved') || text.includes('rectified')) &&
//         (text.includes('issue') || text.includes('error') || text.includes('problem'))) {
//       resolvedIssues.push({
//         issue: originalText,
//         resolvedBy: msg.authorName || msg.author,
//         date: new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000).toLocaleDateString()
//       });
//     }
//   });
// 
//   const resolutionRate = resolvedIssues.length > 0 ? `${resolvedIssues.length} issues resolved` : 'No issues tracked';
// 
//   const technicalAnalysis = `${recentWork.length} technical activities, ${systemUpdates.length} system updates, ${resolvedIssues.length} issues resolved.`;
// 
//   return {
//     recentWork: recentWork.slice(0, 10),
//     systemUpdates: systemUpdates.slice(0, 5),
//     configChanges: configChanges.slice(0, 5),
//     resolvedIssues: resolvedIssues.slice(0, 5),
//     resolutionRate,
//     technicalAnalysis,
//     summary: `${recentWork.length} technical tasks with ${resolvedIssues.length} resolved issues.`
//   };
// }
// 
// // Debug route to test if routes are working
// app.get('/api/debug/test', (req, res) => {
//   res.json({ message: 'Debug route working' });
// });
// 
// // Upload chat history for a group
app.post('/api/groups/:id/upload-history', upload.single('chatHistory'), (req, res) => {
  const groupId = req.params.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // First, ensure the group exists in the database
    db.get("SELECT * FROM groups WHERE id = ?", [groupId], (err, group) => {
      if (err) {
        console.error('Error checking for group:', err);
        fs.unlinkSync(file.path);
        return res.status(500).json({ error: 'Database error while checking group' });
      }

      // If group doesn't exist, create it
      if (!group) {
        // Extract group name from groupId or use a default
        const groupName = groupId.includes('@') ? groupId.split('@')[0] : groupId;

        db.run("INSERT INTO groups (id, name, isWatched) VALUES (?, ?, ?)",
          [groupId, groupName, 1],
          function(insertErr) {
            if (insertErr) {
              console.error('Error creating group:', insertErr);
              fs.unlinkSync(file.path);
              return res.status(500).json({ error: 'Failed to create group' });
            }
            console.log(`📝 Created new group: ${groupName} (${groupId})`);
            processUpload();
          });
      } else {
        processUpload();
      }
    });

    function processUpload() {
      // Read and parse the uploaded WhatsApp chat file
      const chatContent = fs.readFileSync(file.path, 'utf8');
      const messages = parseWhatsAppChat(chatContent, groupId);

    if (messages.length === 0) {
      return res.status(400).json({ error: 'No valid messages found in the uploaded file' });
    }

    // Insert messages into database
    const messageStmt = db.prepare("INSERT OR IGNORE INTO messages (id, groupId, author, authorName, timestamp, text, raw) VALUES (?, ?, ?, ?, ?, ?, ?)");

    let insertedMessages = 0;

    messages.forEach((message, index) => {
      const messageId = `uploaded_${groupId}_${message.timestamp}_${index}`;

      const result = messageStmt.run(messageId, groupId, message.author, message.authorName, message.timestamp, message.text, message.raw);
      if (result.changes > 0) {
        insertedMessages++;
      }
    });

    messageStmt.finalize();

    // Update group to mark history as uploaded
    db.run("UPDATE groups SET hasHistoryUploaded = 1, historyUploadedAt = ?, updated_at = ? WHERE id = ?",
      [Date.now(), Math.floor(Date.now() / 1000), groupId], function(err) {
        if (err) {
          console.error('Error updating group history status:', err);
        }
      });

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    console.log(`📚 History uploaded for group ${groupId}: ${insertedMessages} messages`);

    res.json({
      success: true,
      messagesProcessed: messages.length,
      messagesInserted: insertedMessages,
      groupId: groupId
    });
    }

  } catch (error) {
    console.error('Error processing uploaded file:', error);

    // Clean up uploaded file on error
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.status(500).json({ error: 'Failed to process uploaded file: ' + error.message });
  }
});

// Cleanup endpoint to remove demo groups
app.delete('/api/cleanup/demo-groups', (req, res) => {
  try {
    // Delete messages for demo groups first (to maintain referential integrity)
    db.run("DELETE FROM messages WHERE groupId LIKE 'live_%'", function(err) {
      if (err) {
        console.error('Error deleting demo messages:', err);
        return res.status(500).json({ error: 'Failed to delete demo messages' });
      }

      const deletedMessages = this.changes;

      // Delete demo groups
      db.run("DELETE FROM groups WHERE id LIKE 'live_%' OR id LIKE 'test_group_%'", function(err) {
        if (err) {
          console.error('Error deleting demo groups:', err);
          return res.status(500).json({ error: 'Failed to delete demo groups' });
        }

        const deletedGroups = this.changes;

        console.log(`🧹 Cleanup completed: Removed ${deletedGroups} demo groups and ${deletedMessages} messages`);

        res.json({
          success: true,
          deletedGroups: deletedGroups,
          deletedMessages: deletedMessages,
          message: 'Demo groups and associated data removed successfully'
        });
      });
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Cleanup failed: ' + error.message });
  }
});


// Parse WhatsApp chat export format
function parseWhatsAppChat(content, groupId) {
  const messages = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // WhatsApp export format: [DD/MM/YYYY, HH:MM:SS] Contact Name: Message text
    // Also supports: DD/MM/YYYY, HH:MM - Contact Name: Message text
    const patterns = [
      /^\[(\d{1,2}\/\d{1,2}\/\d{4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\]\s(.+?):\s(.+)$/,
      /^(\d{1,2}\/\d{1,2}\/\d{4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\s-\s(.+?):\s(.+)$/
    ];

    let match = null;
    for (const pattern of patterns) {
      match = line.match(pattern);
      if (match) break;
    }

    if (match) {
      const [, dateStr, timeStr, authorName, text] = match;

      try {
        // Parse date and time
        const [day, month, year] = dateStr.split('/');
        const [hours, minutes, seconds = '00'] = timeStr.split(':');

        const date = new Date(year, month - 1, day, hours, minutes, seconds);
        const timestamp = date.getTime();

        if (isNaN(timestamp)) {
          console.warn(`Invalid timestamp for line: ${line}`);
          continue;
        }

        // Generate a unique author ID from the name
        const author = `${authorName.toLowerCase().replace(/\s+/g, '_')}@whatsapp.import`;

        messages.push({
          author,
          authorName: authorName.trim(),
          timestamp,
          text: text.trim(),
          raw: JSON.stringify({ originalLine: line, imported: true })
        });
      } catch (error) {
        console.warn(`Error parsing line: ${line}`, error);
      }
    } else {
      // Handle multi-line messages (continuation of previous message)
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        lastMessage.text += '\n' + line;
        lastMessage.raw = JSON.stringify({
          originalLine: JSON.parse(lastMessage.raw).originalLine + '\n' + line,
          imported: true
        });
      }
    }
  }

  return messages;
}

// Gemini AI Chat endpoint
app.post('/api/groups/:id/chat', async (req, res) => {
  const groupId = req.params.id;
  const { question, geminiApiKey } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  if (!geminiApiKey) {
    return res.status(400).json({ error: 'Gemini API key is required' });
  }

  try {
    // Get group info and context
    const group = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM groups WHERE id = ?", [groupId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get all messages for the group (last 1000 for context)
    const messages = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM messages WHERE groupId = ? ORDER BY timestamp DESC LIMIT 1000",
        [groupId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    // Prepare context for Gemini
    const context = `
PROJECT CONTEXT:
Group Name: ${group.name}
Group Context: ${group.context || 'No context provided'}

MESSAGE HISTORY (${messages.length} messages):
${messages.reverse().map(msg => {
      const date = new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000);
      return `[${date.toLocaleDateString()} ${date.toLocaleTimeString()}] ${msg.authorName || msg.author}: ${msg.text}`;
    }).join('\n')}

You are a project management AI assistant analyzing WhatsApp group communications. Answer the user's question based on the project context and message history above. Focus on project status, team activities, tasks, deadlines, issues, and any relevant project information.
    `;

    const prompt = `${context}\n\nUser Question: ${question}\n\nPlease provide a detailed answer based on the project context and message history:`;

    // Get response from Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      answer: text,
      messageCount: messages.length,
      hasContext: !!group.context
    });

  } catch (error) {
    console.error('Error with Gemini AI:', error);
    res.status(500).json({
      error: 'Failed to get AI response',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Enhanced Statuz Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database-powered message history and analysis`);
  console.log(`📈 Supporting thousands of messages with efficient querying`);
  console.log(`💡 Real-time message generation with historical context`);
});