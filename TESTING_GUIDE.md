# 🧪 Timeline Engine - Testing Guide

**Version:** 2.7.1
**Status:** Ready for Testing

---

## 📋 PRE-REQUISITES

Before testing, ensure you have:

1. ✅ **WhatsApp Account** - Connected and authenticated
2. ✅ **Gemini API Key** - Set in Settings (get from https://aistudio.google.com/)
3. ✅ **WhatsApp Group** - At least one group to test with
4. ✅ **App Built** - Run `npm run build:all` (already done)

---

## 🚀 QUICK START TEST (5 Minutes)

### Step 1: Start the Application

```bash
cd C:\Dev\Statuz
START_WITH_LOGS.bat
```

**Watch for these startup logs:**
```
🚀 Electron app ready!
🔄 Initializing WhatsApp client...
⏳ This may take a few minutes on first run (downloading Chromium)
🚀 Initializing Timeline Engine...
⚙️  Debounce: 8000ms, Rate limit: 5000ms
✅ Timeline Engine initialized
✅ WhatsApp client initialization complete
```

### Step 2: Connect WhatsApp

1. **First Time Setup:**
   - App opens, shows QR code in terminal
   - Scan QR code with WhatsApp on your phone
   - Wait for "✅ CONNECTED" message

2. **Already Connected:**
   - App should auto-connect
   - Check status in Groups tab

### Step 3: Set Gemini API Key

1. Click **Settings** tab (gear icon)
2. Enter your Gemini API key
3. Click **Save**

**Expected Log:**
```
✅ Saved geminiApiKey to database
```

### Step 4: Select a Test Group

1. Go to **Groups** tab
2. Find a WhatsApp group (or create a test group)
3. Click **Watch** (toggle on)
4. Note the group name

### Step 5: Set Project Context

1. With group selected, click **Context** button
2. Enter a simple project context, for example:

```
Project: Website Redesign
Deadline: 2025-10-30
Team: 3 developers
Tasks:
- Design mockups
- Frontend development
- Backend API
- Testing
- Deployment
```

3. Click **Save**

**Expected Logs:**
```
📝 Context delta received for group 1234567890-1234567890@g.us
💾 Event logged to database
[wait 8 seconds]
🔄 Processing 1 events for group 1234567890-1234567890@g.us
   Context: Project: Website Redesign...
   Messages: 0 deltas
🤖 Calling AI for timeline update...
✅ Timeline updated for group 1234567890-1234567890@g.us
   Version: 1
```

### Step 6: Check the Result

1. Go to **Projects** tab
2. Find your project (should be auto-created if not exists)
3. Click to expand the **Project Timeline (Gantt Chart)** section

**What to Look For:**
- ✅ Gantt chart appears with tasks
- ✅ Green pulsing **"Live"** badge appears (top-right of project card)
- ✅ Chart shows tasks with dates and durations

### Step 7: Test Message Trigger

1. Go back to **Groups** tab
2. Send a test message to the WhatsApp group from your phone:
   ```
   "Started working on design mockups today"
   ```

**Expected Logs:**
```
📱 MESSAGE_RECEIVED event fired in WhatsApp client
📝 Message from chat: [Group Name], isGroup: true
💬 Message delta received for group 1234567890-1234567890@g.us
💾 Event logged to database
[wait 8 seconds]
🔄 Processing 1 events for group 1234567890-1234567890@g.us
🤖 Calling AI for timeline update...
✅ Timeline updated for group 1234567890-1234567890@g.us
   Version: 2
```

3. Go to **Projects** tab
4. **Refresh the page** or wait for auto-update
5. Expand Gantt chart - should see updates

**Expected:**
- ✅ Gantt chart updated
- ✅ **"Live"** badge appears again
- ✅ Version number increased

---

## 🔬 DETAILED TEST SCENARIOS

### Test 1: Debouncing (Batch Processing)

**Purpose:** Verify multiple events are batched into one AI call

**Steps:**
1. Start app, connect WhatsApp
2. Set context for a group (save)
3. Immediately send 5 messages to the group quickly:
   ```
   Message 1: "Starting task A"
   Message 2: "Task B in progress"
   Message 3: "Completed task C"
   Message 4: "Delayed task D"
   Message 5: "Need help with task E"
   ```
4. Watch terminal logs

**Expected Behavior:**
```
💬 Message delta received for group [groupId]
[repeated 5 times, one per message]

[8 seconds after LAST message]
🔄 Processing 6 events for group [groupId]  ← 1 context + 5 messages
   Messages: 5 deltas
🤖 Calling AI for timeline update...
✅ Timeline updated
```

**Success Criteria:**
- ✅ Only ONE AI call despite 6 events
- ✅ All 5 messages included in the batch
- ✅ 8-second wait after LAST event (not first)

---

### Test 2: Rate Limiting

**Purpose:** Verify minimum 5 seconds between AI calls per group

**Steps:**
1. Go to **Projects** tab
2. Find your test project
3. Click **Refresh Timeline** button
4. Immediately click **Refresh Timeline** again (within 1 second)
5. Watch terminal logs

**Expected Behavior:**
```
🔄 Force refresh requested for group [groupId]
🔄 Processing events...
🤖 Calling AI for timeline update...
✅ Timeline updated

[Second click]
🔄 Force refresh requested for group [groupId]
⏱️  Rate limit: waiting 4500ms for group [groupId]  ← Waits!
[after 4.5 seconds]
🔄 Processing events...
🤖 Calling AI for timeline update...
✅ Timeline updated
```

**Success Criteria:**
- ✅ First call processes immediately
- ✅ Second call waits ~5 seconds
- ✅ Both calls succeed

---

### Test 3: Circuit Breaker

**Purpose:** Verify circuit breaker activates after 3 failures

**Steps:**
1. Go to **Settings** tab
2. **Remove the Gemini API key** (clear the field)
3. Click **Save**
4. Go to **Groups** tab, select your test group
5. Click **Context**, modify context, click **Save**
6. Wait 8 seconds, repeat 2 more times (total 3 context saves)
7. Watch terminal logs

**Expected Behavior:**
```
[First attempt]
🔄 Processing 1 events for group [groupId]
🤖 Calling AI for timeline update...
❌ Timeline update failed: AI service not configured

[Second attempt]
🔄 Processing 1 events for group [groupId]
🤖 Calling AI for timeline update...
❌ Timeline update failed: AI service not configured

[Third attempt]
🔄 Processing 1 events for group [groupId]
🤖 Calling AI for timeline update...
❌ Timeline update failed: AI service not configured
🔴 Circuit breaker activated for group [groupId] after 3 failures

[Fourth attempt - within 60 seconds]
🔴 Circuit breaker active for group [groupId], skipping processing
```

**Success Criteria:**
- ✅ First 3 attempts try to call AI
- ✅ Circuit breaker activates after 3rd failure
- ✅ Subsequent calls are blocked for 60 seconds
- ✅ After 60 seconds, circuit breaker resets

**Cleanup:**
1. Go to **Settings**, add API key back
2. Click **Save**

---

### Test 4: Live Status Badge

**Purpose:** Verify "Live" badge appears and disappears correctly

**Steps:**
1. Note current time
2. Trigger a timeline update (save context)
3. Wait for AI to process (8s debounce + AI call ~2-3s)
4. Go to **Projects** tab
5. Observe the project card

**Expected Behavior:**
- **0-15 seconds after update:** ✅ Green pulsing **"Live"** badge visible
- **After 15 seconds:** ✅ Badge disappears

**Success Criteria:**
- ✅ Badge appears within 2 seconds of AI completion
- ✅ Badge is green with pulsing white dot
- ✅ Badge disappears exactly 15 seconds after `timelineUpdatedAt`

---

### Test 5: Force Refresh

**Purpose:** Verify manual refresh bypasses debounce

**Steps:**
1. Go to **Projects** tab
2. Note current Gantt chart content
3. Click **Refresh Timeline** button
4. Watch button and terminal

**Expected Behavior:**
- **Button changes to:** "Refreshing..." with spinning icon
- **Terminal shows:**
  ```
  🔄 Force refresh requested for group [groupId]
  🔄 Processing events...
  🤖 Calling AI for timeline update...
  ✅ Timeline updated
  ```
- **After 2-3 seconds:** Button returns to "Refresh"
- **Gantt chart:** May update (depending on if context changed)

**Success Criteria:**
- ✅ No 8-second debounce wait
- ✅ AI processes immediately
- ✅ Button shows loading state
- ✅ Timeline version increments

---

### Test 6: Multi-Group Isolation

**Purpose:** Verify each group has independent queues and timers

**Steps:**
1. Set context for **Group A**
2. Wait 4 seconds
3. Set context for **Group B**
4. Watch terminal logs

**Expected Behavior:**
```
[Group A context saved]
📝 Context delta received for group A
[4 seconds later]

[Group B context saved]
📝 Context delta received for group B
[wait 8 seconds from Group A's save]

🔄 Processing 1 events for group A
🤖 Calling AI for timeline update...
✅ Timeline updated for group A

[wait 4 more seconds - total 8 seconds from Group B's save]
🔄 Processing 1 events for group B
🤖 Calling AI for timeline update...
✅ Timeline updated for group B
```

**Success Criteria:**
- ✅ Group A processes 8 seconds after its event
- ✅ Group B processes 8 seconds after its event
- ✅ They don't interfere with each other

---

## 🎯 END-TO-END TEST (Complete Flow)

### Scenario: New Project with Live Updates

**Time Required:** 10 minutes

#### Setup (2 min)
1. ✅ Start app: `START_WITH_LOGS.bat`
2. ✅ Connect WhatsApp (scan QR if needed)
3. ✅ Set Gemini API key in Settings
4. ✅ Create or select a test WhatsApp group

#### Step 1: Initialize Project (2 min)
1. Go to **Groups** tab
2. Select test group, click **Watch**
3. Click **Context** button
4. Enter:
   ```
   Project: Mobile App Development
   Deadline: 2025-11-15
   Team: John (PM), Sarah (Dev), Mike (Designer)

   Phases:
   1. Discovery & Planning (2 weeks)
   2. UI/UX Design (3 weeks)
   3. Development (6 weeks)
   4. Testing (2 weeks)
   5. Launch (1 week)

   Current Status: Starting discovery phase
   ```
5. Click **Save**
6. Wait for logs:
   ```
   📝 Context delta received
   [8 seconds]
   🔄 Processing 1 events
   🤖 Calling AI for timeline update...
   ✅ Timeline updated - Version: 1
   ```

#### Step 2: Verify Initial Gantt (1 min)
1. Go to **Projects** tab
2. Find "Mobile App Development" project
3. Click to expand **Project Timeline (Gantt Chart)**
4. Verify:
   - ✅ Chart shows 5 phases
   - ✅ Dates are set appropriately
   - ✅ Green **"Live"** badge visible
   - ✅ Chart renders without errors

#### Step 3: Simulate Team Activity (3 min)
1. Send these messages to the group (from your phone):
   ```
   Message 1: "Just finished stakeholder interviews - John"
   Message 2: "Creating user personas now - Sarah"
   Message 3: "Started on wireframes - Mike"
   Message 4: "Discovery phase going well, on track for Nov 15"
   ```
2. Wait 8 seconds after last message
3. Check terminal:
   ```
   💬 Message delta received [x4]
   [8 seconds]
   🔄 Processing 4 events
   🤖 Calling AI for timeline update...
   ✅ Timeline updated - Version: 2
   ```

#### Step 4: Verify Updates (1 min)
1. Go to **Projects** tab
2. Refresh page or wait for auto-update
3. Expand Gantt chart
4. Verify:
   - ✅ Chart may show updated tasks/progress
   - ✅ **"Live"** badge appears again
   - ✅ Version is now 2 (check console logs)

#### Step 5: Force Refresh Test (1 min)
1. Still on **Projects** tab
2. Click **Refresh Timeline** button
3. Verify:
   - ✅ Button shows "Refreshing..." with spinner
   - ✅ Terminal shows immediate processing (no 8s wait)
   - ✅ Version increments to 3
   - ✅ Button returns to "Refresh"

#### Success Criteria:
- ✅ All 5 steps completed without errors
- ✅ Gantt chart created and updated
- ✅ Live badge appeared at appropriate times
- ✅ Timeline version incremented correctly
- ✅ No console errors in app or browser

---

## 🐛 TROUBLESHOOTING

### Issue: No Logs Appearing

**Possible Causes:**
1. App not started with `START_WITH_LOGS.bat`
2. Terminal closed

**Solution:**
1. Close app
2. Run: `START_WITH_LOGS.bat`
3. Watch for startup logs

---

### Issue: "AI service not configured"

**Error:**
```
❌ Timeline update failed: AI service not configured
```

**Solution:**
1. Go to **Settings** tab
2. Add Gemini API key
3. Click **Save**
4. Get key from: https://aistudio.google.com/app/apikey

---

### Issue: WhatsApp Not Connecting

**Error:**
```
❌ WhatsApp client initialization failed
```

**Solution:**
1. Delete: `C:\Users\[YourUser]\AppData\Roaming\Electron\data\`
2. Restart app
3. Scan QR code again

---

### Issue: No "Live" Badge Showing

**Possible Causes:**
1. Timeline not updating (check logs)
2. Polling not working
3. Browser cache issue

**Solution:**
1. Check if `timelineUpdatedAt` is set:
   - Open browser DevTools (F12)
   - Console tab
   - Type: `localStorage`
2. Hard refresh: `Ctrl+Shift+R`
3. Check if AI call succeeded in logs

---

### Issue: Gantt Chart Not Rendering

**Error:**
- Blank white box
- "Invalid syntax" message

**Solution:**
1. Check if `project.ganttChart` has valid Mermaid syntax
2. Open browser DevTools → Console tab
3. Look for Mermaid errors
4. Try Force Refresh

---

### Issue: Circuit Breaker Stuck

**Error:**
```
🔴 Circuit breaker active for group [groupId], skipping processing
```

**Solution:**
1. Wait 60 seconds (backoff duration)
2. Check logs for:
   ```
   ✅ Circuit breaker reset for group [groupId]
   ```
3. Try saving context again

---

## 📊 WHAT TO EXPECT

### Normal Behavior:

**Timeline Update:**
- Context save → 8s wait → AI call → Update
- Multiple messages → 8s wait after last → Single AI call → Update
- Force refresh → Immediate AI call → Update

**Live Badge:**
- Appears within 2s of AI completion
- Stays for 15 seconds
- Disappears automatically

**Version Tracking:**
- Starts at 0 or 1
- Increments with each AI update
- Never decreases

**AI Response Time:**
- Typically 2-5 seconds
- Depends on context complexity
- May be slower on first call

---

## ✅ VERIFICATION CHECKLIST

After testing, verify:

- [ ] Timeline engine initializes on startup
- [ ] Context saves trigger processing after 8s
- [ ] WhatsApp messages trigger processing after 8s
- [ ] Multiple events batch into single AI call
- [ ] Rate limiting prevents calls within 5s
- [ ] Circuit breaker activates after 3 failures
- [ ] AI generates valid Gantt charts
- [ ] Projects update with new charts
- [ ] Timeline version increments
- [ ] Live badge appears and disappears
- [ ] Force refresh works immediately
- [ ] No errors in terminal or browser console

---

## 🎉 SUCCESS!

If all tests pass, your Timeline Engine is working correctly!

**What You've Verified:**
- ✅ Event-driven architecture
- ✅ Intelligent debouncing
- ✅ Rate limiting
- ✅ Circuit breaker resilience
- ✅ AI integration
- ✅ Database updates
- ✅ UI live status
- ✅ Force refresh capability

**Next Steps:**
- Use with real projects
- Monitor AI call costs
- Gather feedback
- Report any issues on GitHub

---

**Need Help?**
- Check `TIMELINE_ENGINE_COMPLETE.md` for detailed documentation
- Review logs in terminal for debugging
- Check browser console (F12) for UI errors

---

*Generated with [Claude Code](https://claude.com/claude-code)*
