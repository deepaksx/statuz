# 🔍 Quick Check: Do You Have a Project?

Run this to check if projects exist in your database:

## Option 1: Use the Database Checker

```bash
node check-db.cjs
```

Then in the SQLite prompt, run:

```sql
-- See all projects
SELECT * FROM projects;

-- See just names and descriptions
SELECT name, description, whatsappGroupId FROM projects;

-- Count projects
SELECT COUNT(*) as project_count FROM projects;
```

## Option 2: Check What You Should See

### If You Have a Project:

You'll see on the Projects page:
- ✅ At least one project card
- ✅ Project name as heading
- ✅ **Gray box with description** (if description exists)
- ✅ Priority, Progress bar, Task counts
- ✅ "Synced from WhatsApp" at bottom

### If You DON'T Have a Project:

You'll see:
- ❌ "No projects found"
- ❌ Message: "Projects are automatically created from WhatsApp groups when tasks are extracted"

## The Workflow to Create a Project:

```
Step 1: Upload Chat History
  ↓
Step 2: Click "Extract" Button
  ↓
Step 3: AI Analyzes Messages
  ↓
Step 4: Project Created ✅
  ↓
Step 5: Go to Projects Page to See It
```

## Quick Test:

1. Open app
2. Go to **Projects** page
3. What do you see?

### Scenario A: "No projects found"
→ You need to extract data first!
→ Go to Groups → Upload History → Extract

### Scenario B: You see project cards
→ Great! Projects exist!
→ **Look for the gray box under project name**
→ That's where the description is

### Scenario C: Project cards but no gray box
→ Project exists but description is empty
→ Need to re-extract to get description

---

## Right Now, Tell Me:

**What do you see when you go to Projects page?**

A) "No projects found"
B) Project card(s) but no gray description box
C) Project card(s) WITH gray description box
D) Something else

This will tell us what step to take next!
