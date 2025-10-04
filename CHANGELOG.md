# Changelog

All notable changes to Statuz will be documented in this file.

## [2.3.1] - 2025-01-10

### 🔥 Critical Enhancement - Complete History Reset

#### Complete Data Deletion
- **Delete History now removes EVERYTHING** - not just messages
- When you delete history for a group, it now deletes:
  - ✅ All messages
  - ✅ All projects
  - ✅ All tasks (Epic, Story, Task, Subtask)
  - ✅ All risks
  - ✅ All decisions
  - ✅ All dependencies
- This allows you to **start completely fresh** when re-uploading chat history

#### Enhanced User Experience
- **Detailed confirmation dialog** warns about complete deletion
- **Comprehensive deletion summary** shows exactly what was removed:
  ```
  📧 Messages: 187
  📁 Projects: 2
  ✅ Tasks: 45
  ⚠️ Risks: 12
  🎯 Decisions: 8
  🔗 Dependencies: 3
  🗑️ Total: 257 items deleted
  ```
- **Transaction-based deletion** - all-or-nothing (prevents partial deletions)
- **Detailed console logging** for debugging

#### Technical Improvements
- Database transaction ensures atomic deletion
- Cascading delete order prevents foreign key violations:
  1. Dependencies (references tasks)
  2. Tasks (references messages)
  3. Risks (references messages)
  4. Decisions (references messages)
  5. Projects (references group)
  6. Messages
  7. Group history flags reset
- Improved error handling with rollback on failure
- Audit log entries include full deletion counts

#### Use Case
Perfect for testing or when you want to re-extract everything with updated AI:
1. Click "Delete History" on a group
2. Confirm the deletion (see warning about what will be deleted)
3. Everything gets wiped clean
4. Re-upload chat history
5. AI extracts fresh with latest v2.3.0 SAP expertise and SCRUM classification

### 📊 Example Output

**Console Log:**
```
🗑️  Deleting ALL data for group: NXSYS SAP Team
   This will delete: messages, projects, tasks, risks, decisions, dependencies
✅ Deletion complete:
   📧 Messages: 187
   📁 Projects: 2
   ✅ Tasks: 45
   ⚠️ Risks: 12
   🎯 Decisions: 8
   🔗 Dependencies: 3
✅ Reset history upload flag for group
✅ Successfully deleted all data for group
```

**Frontend Toast:**
```
✅ Successfully deleted all data:
📧 Messages: 187
📁 Projects: 2
✅ Tasks: 45
⚠️ Risks: 12
🎯 Decisions: 8
🔗 Dependencies: 3

🗑️ Total: 257 items deleted
```

### 🐛 Bug Fixes
- Fixed incomplete deletion leaving orphaned projects/tasks
- Fixed foreign key constraint errors during deletion
- Fixed group history flag not resetting properly

### ⚠️ Breaking Changes
None. This is an enhancement to existing delete functionality.

---

## [2.3.0] - 2025-01-10

### 🚀 Major Features - SAP-Powered SCRUM Project Management

This is a **transformative release** that turns Statuz into a proactive SAP project manager with deep domain expertise and SCRUM methodology.

#### Hierarchical SCRUM Task Structure
- **Epic → Story → Task → Subtask** hierarchy instead of flat tasks
- Story points for Agile estimation (Fibonacci: 1, 2, 3, 5, 8, 13)
- Sprint planning with sprint_id and sprint_name
- Acceptance criteria tracking
- Progress percentage calculation
- Dependencies and blockers counting

#### SAP Domain Expertise
- **Deep SAP knowledge** across all modules (FI, CO, MM, SD, PP, QM, PM, HR, BASIS, BW)
- **Transaction code recognition** (VA01, ME21N, FB50, ST22, SE80, etc.)
- **SAP object type tracking** (Programs, Reports, Functions, Tables)
- **Transport request management** (TR numbers like P01K905013)
- **Module-specific recommendations** based on SAP best practices

#### Proactive AI Recommendations
- **Project Advisor Agent** - New AI agent that actively manages projects
- **Automated risk detection** before issues escalate
- **Solution suggestions** using SAP expertise and world knowledge
- **Pattern recognition** across similar SAP issues
- **Best practice enforcement** based on SAP and SCRUM guidelines
- **Optimization recommendations** to improve team velocity

#### AI Enhancements
- **SAP pattern recognition**: Detects TR numbers, tcodes, modules, objects
- **Work item classification**: Automatically classifies into Epic/Story/Task/Subtask
- **Confidence-based extraction**: Only extracts high-confidence entities (≥0.5)
- **Expert recommendations**: Each extracted entity includes AI suggestions
- **Similar issue resolution**: Leverages SAP knowledge base for solutions

### 📊 Database Schema Enhancements

#### New SCRUM Fields (Migration 011)
- `work_item_type`: epic | story | task | subtask
- `story_points`: Integer (1-13 Fibonacci)
- `sprint_id`: Sprint identifier
- `sprint_name`: Human-readable sprint name
- `acceptance_criteria`: JSON array of acceptance criteria
- `progress_percentage`: 0-100 completion percentage
- `dependencies_count`: Number of dependent tasks
- `blockers_count`: Number of blocking issues

#### New SAP Fields
- `sap_module`: FI | CO | MM | SD | PP | QM | PM | HR | ABAP | BASIS | BW
- `sap_tcode`: Transaction code (VA01, ME21N, etc.)
- `sap_object_type`: Program | Report | Function | Table | etc.
- `sap_transport_request`: TR number (P01K905013)

#### New AI Fields
- `ai_recommendation`: AI-generated resolution suggestion
- `ai_risk_assessment`: AI analysis of associated risks
- `ai_similar_issues`: JSON array of similar issues with solutions
- `ai_confidence_level`: low | medium | high

#### Database Views
- `task_hierarchy`: Recursive view for Epic → Story → Task → Subtask navigation
- Includes full path traversal and depth tracking

### 🤖 New AI Agent - Project Advisor

**ProjectAdvisorAgent** - Proactive SAP project management

#### Capabilities
1. **SAP Context Analysis**
   - Detects SAP modules from conversations
   - Identifies transaction codes
   - Classifies issue types (dumps, transports, performance)
   - Maps to SAP knowledge base

2. **Proactive Recommendations**
   - Risk identification before escalation
   - Solution suggestions with SAP context
   - Optimization opportunities
   - Best practice enforcement
   - Priority-based action items

3. **SCRUM Classification**
   - Intelligent Epic/Story/Task/Subtask classification
   - Story point estimation
   - Complexity analysis
   - Reasoning and confidence scores

4. **SAP Expertise**
   - Module-specific recommendations
   - Transaction code guidance
   - SAP Note references
   - Best practice application

### 🔧 Parser Agent Enhancements

#### SAP Domain Knowledge
- Comprehensive SAP module knowledge (FI, CO, MM, SD, PP, QM, PM, HR, ABAP, BASIS)
- Transaction code database
- Common SAP issue patterns
- SAP Note references
- Best practice solutions

#### Enhanced Extraction
- **SCRUM classification** for every task
- **SAP module detection** from context
- **Transaction code extraction** from messages
- **Transport request tracking**
- **AI recommendations** for each entity

#### Improved Prompting
- Expert SAP consultant persona
- SCRUM Master methodology
- Pattern recognition for SAP objects
- Confidence scoring for technical tasks
- Proactive solution suggestions

### 📈 Examples of Enhanced Extraction

**Before v2.3.0**:
```json
{
  "type": "task",
  "title": "Import TR to production",
  "priority": 1,
  "confidence": 0.8
}
```

**After v2.3.0**:
```json
{
  "type": "task",
  "title": "Import TR P01K905013 to PRD",
  "description": "Import transport request for invoice fix",
  "owner": "Adeel Imtiaz",
  "priority": 1,
  "workItemType": "task",
  "sapModule": "SD",
  "sapTcode": "STMS",
  "sapObjectType": "Transport",
  "sapTransportRequest": "P01K905013",
  "aiRecommendation": "Verify transport layer, check dependent objects, test in QA first. Use STMS_IMPORT to import. Check return code in STMS. Verify in SE09 after import.",
  "confidence": 0.9
}
```

### 🎯 Benefits

#### For SAP Projects
- **Faster issue resolution** with AI-recommended solutions
- **Proactive risk management** before problems escalate
- **Best practice enforcement** automatically
- **Transport tracking** across all environments
- **Module-specific guidance** for all SAP areas

#### For Agile Teams
- **Hierarchical planning** with Epic → Story → Task → Subtask
- **Story point estimation** for velocity tracking
- **Sprint management** with built-in fields
- **Acceptance criteria** tracking per story
- **Progress visibility** at all hierarchy levels

#### For Project Managers
- **Proactive recommendations** instead of reactive tracking
- **Risk forecasting** based on patterns
- **Automated status updates** from chat
- **Expert guidance** on complex SAP issues
- **Velocity optimization** suggestions

### 🔄 Migration Notes

The new database fields are **backward compatible**:
- Existing tasks remain unchanged
- New fields default to sensible values
- Migration 011 is **non-destructive**
- No data loss during upgrade

To apply new schema:
1. Restart the app (migrations run automatically)
2. Existing tasks will have `work_item_type = 'task'` by default
3. New extractions will include full SAP and SCRUM metadata

### 📚 Technical Details

#### New Files
- `packages/db/src/migrations/011_add_scrum_hierarchy.sql`
- `packages/agents/src/project-advisor-agent.ts`

#### Modified Files
- `packages/agents/src/parser-agent.ts` - Enhanced with SAP expertise
- `packages/agents/src/index.ts` - Export ProjectAdvisorAgent

#### API Additions
- `ProjectAdvisorAgent.analyzeSAPContext(messages)`
- `ProjectAdvisorAgent.generateRecommendations(context)`
- `ProjectAdvisorAgent.classifyWorkItem(item)`

### ⚠️ Breaking Changes

None. This is a fully backward-compatible enhancement.

---

## [2.2.1] - 2025-01-10

### 🐛 Critical Bug Fix

#### Parser Agent JSON Parsing
- **CRITICAL FIX**: Parser Agent now correctly parses JSON responses wrapped in markdown code blocks
- Gemini API was returning responses like ` ```json {...} ``` ` instead of pure JSON
- Added regex to strip markdown code blocks before JSON.parse()
- This fixes the issue where uploaded chat history wasn't extracting projects/tasks
- All entities are now properly extracted and saved to database

**Impact**: This was preventing all AI extraction from working. Users uploading chat history would see "Failed to parse JSON response" errors and no projects/tasks would be created.

**Fix**: Added markdown stripping logic in parser-agent.ts:
```typescript
const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
if (codeBlockMatch) {
  text = codeBlockMatch[1].trim();
}
```

### 📊 Testing

Verified with actual WhatsApp chat export:
- ✅ Tasks extracted correctly
- ✅ Risks identified properly
- ✅ Owners assigned accurately
- ✅ Projects populated in database

---

## [2.2.0] - 2025-01-10

### 🎉 New Features

#### Delete Chat History
- Added "Delete History" button to Groups page
- Allows complete removal of chat history for any group
- Resets upload flag so history can be re-uploaded
- Includes confirmation dialog to prevent accidental deletion
- Database method: `deleteGroupMessages()`
- Service method: `deleteGroupHistory()`
- Frontend integration with toast notifications

#### AI-Powered Chat History Processing
- **MAJOR**: Uploaded chat history now automatically processed by AI
- Parser Agent extracts projects, tasks, and risks from historical messages
- Real-time progress tracking during upload
- Batch processing of large chat exports
- Intelligent entity extraction from past conversations
- Automatic linking of tasks to projects

### 🔄 Improvements

#### AI Model Update
- **Upgraded to Gemini 2.5 Flash Lite** from Gemini 2.0 Flash Exp
- Faster response times
- More cost-effective processing
- Better structured output
- Updated across all AI services:
  - Parser Agent (entity extraction)
  - AI Chat (group conversations)
  - API connection tests
  - Direct AI answers

#### User Experience
- Enhanced upload feedback with detailed message counts
- Improved error handling during chat history upload
- Better loading states and progress indicators
- More informative toast notifications
- Clearer success/error messages

### 🐛 Bug Fixes

#### TypeScript Compilation
- Fixed implicit 'any' type error in database.ts
- Properly typed error handlers in deleteGroupMessages
- Resolved build issues in db package

#### Chat History Upload
- Fixed issue where uploaded messages weren't processed by AI
- Ensured watched groups trigger Parser Agent
- Corrected message parsing for entity extraction
- Fixed group context loading during upload

#### Window Visibility
- Improved Electron window focus management
- Better handling of always-on-top behavior
- Enhanced window centering on startup
- Fixed window positioning issues

### 🏗️ Technical Changes

#### Database Layer (`packages/db`)
- Added `deleteGroupMessages()` method
- Automatic reset of `has_history_uploaded` flag on delete
- Improved transaction handling
- Better error logging

#### Background Service (`packages/background`)
- Enhanced `uploadChatHistory()` with AI processing
- Added message parsing loop for historical data
- Improved error recovery during batch processing
- Better event emission for UI updates

#### Parser Agent (`packages/agents`)
- Model upgrade to gemini-2.5-flash-lite
- Consistent configuration across init and update
- Optimized temperature settings (0.1 for structured extraction)
- Enhanced logging for debugging

#### Frontend (`apps/renderer`)
- New delete history handler with confirmation
- Updated Groups.tsx with delete button UI
- Improved AppContext with deleteGroupHistory method
- Better error handling in upload workflow

### 📦 Dependencies

No new dependencies added. Updated model configurations only.

### 🔧 Configuration

#### Model Configuration
```typescript
model: "gemini-2.5-flash-lite"
generationConfig: {
  temperature: 0.1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048
}
```

### 📝 API Changes

#### New Methods

**Database (packages/db/src/database.ts)**
```typescript
deleteGroupMessages(groupId: string): Promise<{ deletedCount: number }>
```

**Background Service (packages/background/src/service.ts)**
```typescript
async deleteGroupHistory(groupId: string): Promise<{
  success: boolean;
  deletedCount: number;
}>
```

**App Context (apps/renderer/src/contexts/AppContext.tsx)**
```typescript
deleteGroupHistory: (groupId: string) => Promise<{
  success: boolean;
  deletedCount: number;
}>
```

#### Enhanced Methods

**Background Service - uploadChatHistory**
- Now returns `messagesParsed` count
- Processes messages with Parser Agent if group is watched
- Better error handling for individual message failures

```typescript
async uploadChatHistory(groupId: string, content: string): Promise<{
  success: boolean;
  messagesProcessed: number;
  messagesInserted: number;
  messagesParsed: number;  // NEW
}>
```

### 🎯 Migration Notes

No database migrations required. The schema remains compatible with v2.1.0.

To upgrade from v2.1.0 to v2.2.0:
1. Pull latest code
2. Run `npm install`
3. Run `npm run build`
4. Restart the app

Your existing data will work seamlessly.

### ⚠️ Breaking Changes

None. This is a backward-compatible release.

### 🔐 Security

- No security vulnerabilities fixed in this release
- API keys continue to be stored securely in local database
- No external data transmission beyond Gemini API calls

### 📊 Performance

- **Faster AI responses** with Gemini 2.5 Flash Lite
- **Reduced API costs** while maintaining quality
- **Better batch processing** for large chat histories
- **Optimized database operations** for delete operations

### 🧪 Testing

Tested features:
- ✅ Delete chat history workflow
- ✅ Re-upload after deletion
- ✅ AI processing of uploaded history
- ✅ Model update compatibility
- ✅ Entity extraction accuracy
- ✅ Error handling edge cases

### 📖 Documentation

- Added comprehensive RESTORE.md
- Updated README with new features
- Improved inline code documentation
- Better error messages

### 🙏 Contributors

- Deepak (Development)
- Claude (AI Assistant)

---

## [2.1.0] - 2025-01-09

### 🎉 Phase 2 Complete: AI-Powered Intelligence Layer

- Parser Agent for entity extraction
- Real-time message processing
- AI Chat assistant
- Auto-response system
- Risk and conflict detection
- Group reports and snapshots

---

## [2.0.0] - 2025-01-08

### 🎉 Phase 1 Foundation

- Database layer with SQLite
- Event Bus system
- Basic WhatsApp integration
- Message storage
- Group management

---

## [1.0.0] - 2025-01-07

### 🎉 Initial Release

- Basic WhatsApp monitoring
- Group tracking
- Message history viewing
- Electron desktop app

---

**Note**: This changelog follows [Keep a Changelog](https://keepachangelog.com/) format.
