# 🔧 Fix Missing Project Description

## Your Situation

✅ **You have a project** (you see project name, priority, progress)
❌ **But NO gray description box**

**Why:** The project was created without a description field being populated.

---

## Quick Fix (Recommended)

### Step 1: Delete Old Data

1. Go to **Groups** page
2. Find your WhatsApp group
3. Click **"Delete History"** button (trash icon)
4. **Confirm deletion** when prompted

This will delete:
- All messages
- All projects
- All tasks/stories
- All risks
- All decisions

(Don't worry - you can re-upload and re-extract!)

### Step 2: Re-Upload Chat History

1. Still on **Groups** page
2. Click **"Upload History"** button
3. Select your WhatsApp chat export file (.txt)
4. Wait for upload to complete

You'll see a message like:
```
✅ Successfully uploaded chat history
📧 Messages processed: 150
```

### Step 3: Re-Extract with Latest Version

1. Make sure app is restarted (to have v2.5.1+)
2. Still on **Groups** page
3. Click **"Extract"** button
4. Confirm when prompted
5. Wait for extraction (may take 30 seconds to 2 minutes)

You'll see:
```
✅ Project data extracted successfully:
📖 Stories: X
✅ Tasks: Y
⚠️ Risks: Z
🎯 Decisions: W
```

### Step 4: Check Projects Page

1. Go to **Projects** page
2. **You should now see the gray description box!**

---

## Alternative: Check Database First

If you want to verify before deleting, check what's in the database:

```bash
node check-db.cjs
```

Then run:
```sql
SELECT id, name, description FROM projects;
```

**If `description` column is NULL or empty** → That's why you don't see the box!

---

## Why This Happened

The project was created either:
- Before the description feature was added (before v2.5.1)
- During an extraction that didn't populate descriptions
- With an older AI model that didn't include descriptions

The latest version (v2.5.1+) ensures descriptions are always captured from AI analysis.

---

## Expected Result After Re-Extraction

On the Projects page, you should see:

```
┌────────────────────────────────────────┐
│ Your Project Name              [GOLD]  │
├────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Project Description (AI Inferred):  ││ ← THIS WILL APPEAR
│ │                                     ││
│ │ [AI's understanding of project     ││
│ │  from your chat messages]          ││
│ └─────────────────────────────────────┘│
│                                         │
│ Priority: High                          │
│ Progress: [████░░░░] 45%               │
└────────────────────────────────────────┘
```

---

## Need Help?

If after re-extracting you still don't see the description box:

1. **Check the terminal/console** for error messages during extraction
2. **Verify app version** in the footer (should be v2.5.1 or higher)
3. **Share the error message** if extraction fails

---

**Ready to fix it? Start with Step 1 above!** 🚀
