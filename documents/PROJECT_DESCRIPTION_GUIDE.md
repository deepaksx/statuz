# 📋 Finding the AI-Inferred Project Description

## Where to Look

### Step-by-Step:

1. **Open the app**
2. **Click "Projects"** in the left sidebar (folder icon 📁)
3. **Look for the gray box** under the project name

## Visual Location

```
┌─────────────────────────────────────────────────┐
│ Projects Page                                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │ 🟦 Your Project Name          [GOLD]   │    │ ← Project card
│  │ ─────────────────────────────────────  │    │
│  │                                         │    │
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │    │
│  │ ┃ Project Description (AI Inferred): ┃  │    │ ← LOOK HERE!
│  │ ┃                                     ┃  │    │ (Gray box)
│  │ ┃ This is what the AI understood     ┃  │    │
│  │ ┃ your project to be about from the  ┃  │    │
│  │ ┃ chat messages and context.         ┃  │    │
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │    │
│  │                                         │    │
│  │ Priority: High                          │    │
│  │ ────────────────                        │    │
│  │ Progress: [████░░░░░░] 45%             │    │
│  │                                         │    │
│  │ ┌─────┬─────────┬──────┐              │    │
│  │ │ 12  │   5     │  8   │              │    │
│  │ │Todo │Progress │ Done │              │    │
│  │ └─────┴─────────┴──────┘              │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

## The Description Box Looks Like:

- **Background:** Dark gray (slightly darker than card)
- **Border:** Thin gray border
- **Label:** "Project Description (AI Inferred):" in small gray text
- **Content:** The actual description in light gray text

## If You DON'T See the Box:

### Possibility 1: No Project Created Yet

**Check:**
- Do you see ANY project cards on the Projects page?
- If it says "No projects found" → You haven't extracted yet

**Solution:**
1. Go to **Groups** page
2. Find your WhatsApp group
3. Make sure it's **watched** (green Watch button)
4. Make sure **history is uploaded**
5. Click **"Extract"** button
6. Wait for success message
7. Go back to **Projects** page

### Possibility 2: Project Exists But No Description

The project was created but AI didn't generate a description.

**Check:**
- Do you see a project card?
- Do you see project name, priority, progress bars?
- But NO gray description box?

**This means:** The `project.description` field is empty/null.

**Why this happens:**
- Extraction failed partway through
- AI didn't include description in response
- Very old extraction before description was added

**Solution:**
1. Go to **Groups** page
2. Click **"Delete History"** for that group
3. Re-upload chat history
4. Click **"Extract"** again
5. Check **Projects** page again

### Possibility 3: App Not Restarted

The new code (v2.5.1) isn't loaded yet.

**Solution:**
1. Close the app **completely** (not just minimize)
2. Restart: `npm start` or `START_HERE.bat`
3. Wait for app to fully load
4. Go to Projects page
5. Description box should now appear

## Check Database Directly

If you want to verify the project exists in the database:

```bash
node check-db.cjs
```

Then run SQL:
```sql
SELECT id, name, description, whatsappGroupId FROM projects;
```

This shows:
- **id:** Project ID
- **name:** Project name
- **description:** What you should see in the box
- **whatsappGroupId:** Which WhatsApp group it came from

If `description` is NULL or empty → That's why you don't see the box!

## Example: What It Looks Like

When working correctly, you'll see something like:

```
┌────────────────────────────────────────┐
│ SAP SD Implementation                   │
│ ──────────────────────────────────────  │
│                                         │
│ ╔═══════════════════════════════════╗  │
│ ║ Project Description (AI Inferred):║  │
│ ║                                   ║  │
│ ║ Implementation of SAP Sales &     ║  │
│ ║ Distribution module including     ║  │
│ ║ order management, billing, and    ║  │
│ ║ shipping processes. Integrates    ║  │
│ ║ with MM and FI modules.           ║  │
│ ╚═══════════════════════════════════╝  │
│                                         │
│ Priority: High                          │
└────────────────────────────────────────┘
```

## Still Can't Find It?

1. **Take a screenshot** of your Projects page
2. **Share it** - I'll tell you exactly what's missing
3. Or **describe what you see** - Number of project cards, their names, etc.

---

**Current Version:** v2.5.1
**Feature Added:** October 5, 2025
