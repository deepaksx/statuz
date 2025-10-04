# Changelog

All notable changes to Statuz will be documented in this file.

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
