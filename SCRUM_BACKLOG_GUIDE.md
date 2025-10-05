# 📋 SCRUM Backlog Guide

## How to Access

The SCRUM Backlog is accessible via the **"Tasks"** menu item:

1. Look at the **left sidebar navigation**
2. Click on **"Tasks"** (tree/list icon 📋)
3. This opens the hierarchical SCRUM Backlog view

---

## What You'll See

### Hierarchical Work Item Structure

The backlog displays work items in a **4-level SCRUM hierarchy**:

```
Epic (Project)
  └── Story (User Story with story points)
      └── Task (Development task)
          └── Subtask (Granular work item)
```

### Work Item Types

Each item is color-coded by type:

- 🟣 **Epic** - Purple badge (strategic initiatives)
- 🔵 **Story** - Blue badge with story points (e.g., "Story (5)")
- 🟢 **Task** - Green badge (technical work)
- ⚪ **Subtask** - Gray badge (small units of work)

---

## Information Displayed

For each work item, you can see:

### Basic Info
- **Title** - What needs to be done
- **Description** - Detailed explanation
- **Work Item Type** - Epic/Story/Task/Subtask
- **Priority** - 1 (Highest) to 4 (Lowest)
- **Status** - Todo, In Progress, Blocked, Done

### SCRUM Fields
- **Story Points** - Fibonacci scale (1, 2, 3, 5, 8, 13) for Stories
- **Sprint** - Current sprint assignment
- **Acceptance Criteria** - Definition of Done for Stories
- **Progress** - Percentage completion

### SAP Fields (if applicable)
- 📦 **SAP Module** - FI, CO, MM, SD, PP, QM, PM, HR, ABAP, BASIS, BW
- 🔧 **Transaction Code** - VA01, ME21N, FB50, ST22, SE80, etc.
- 🚚 **Transport Request** - TR number (e.g., P01K905013)

### AI Insights
- 🤖 **AI Recommendation** - Expandable section with expert suggestions
- **Risk Assessment** - AI-identified risks
- **Similar Issues** - Previously solved related problems

### Assignment & Timing
- **Owner** - Person responsible
- **Deadline** - Due date
- **Dependencies** - Number of dependent tasks
- **Blockers** - Number of blocking issues

---

## How Data Gets Here

### 1. Upload Chat History (Step 1)
```
Groups → Select Group → Upload History → Choose WhatsApp export file
```

This uploads all chat messages to the database.

### 2. Extract Project Data (Step 2)
```
Groups → Select Group → Extract → Confirm
```

This uses AI to analyze messages and create:
- **Stories** - User stories extracted from conversations
- **Tasks & Subtasks** - Action items with owners
- **Risks** - Identified project risks
- **Decisions** - Key decisions made

The AI automatically:
- ✅ Classifies items into Epic/Story/Task/Subtask
- ✅ Estimates story points
- ✅ Detects SAP modules and transaction codes
- ✅ Assigns tasks to team members
- ✅ Identifies dependencies and blockers
- ✅ Provides expert recommendations

---

## Filtering & Viewing

### Filter by Project
Use the dropdown to show tasks for a specific project only.

### Filter by Work Item Type
- All Items
- Epics only
- Stories only
- Tasks only
- Subtasks only

### Filter by Status
- All
- Todo
- In Progress
- Blocked
- Done

### Filter by Owner
Show tasks assigned to specific team members.

---

## Example SCRUM Backlog Item

```
[Story (5)] [High] Implement billing document creation in SD module

📦 SD  🔧 VA01

Owner: Adeel Imtiaz
Deadline: 2025-01-15
Status: In Progress

Acceptance Criteria:
✓ User can create billing documents from delivery
✓ Pricing automatically calculated
✓ Output type triggers PDF generation

🤖 AI Recommendation ▼
  Use VA01 for billing document creation. Ensure pricing
  conditions are maintained in VK11. Configure output
  types in NACE for PDF generation. Test in QA before
  production deployment.

Tasks (3):
  [Task] Configure pricing condition records in VK11
  [Task] Set up output determination in NACE
  [Task] Create user exit for custom logic
```

---

## Common Workflows

### 1. Plan Sprint
1. Go to Tasks page
2. Filter by "Todo" status
3. Select tasks for the sprint
4. Update status to "In Progress"

### 2. Track Progress
1. Open Tasks page
2. See all "In Progress" items
3. Check progress percentages
4. Review blockers

### 3. Review Completed Work
1. Filter by "Done" status
2. See what's been accomplished
3. Verify acceptance criteria met

### 4. SAP-Specific Work
1. Filter by SAP module (e.g., "SD")
2. See all Sales & Distribution tasks
3. Group by transaction code

---

## Tips

### For Project Managers
- Use **Story Points** for velocity tracking
- Monitor **Blockers** count to identify bottlenecks
- Review **AI Recommendations** for risk mitigation
- Track **Progress %** for sprint burndown

### For Developers
- Check **Dependencies** before starting work
- Review **SAP Transaction Codes** for context
- Read **AI Recommendations** for implementation guidance
- Update **Status** as you progress

### For SAP Consultants
- Filter by **SAP Module** to focus on your area
- Use **Transaction Codes** to understand scope
- Check **Transport Requests** for deployment tracking
- Review **AI Recommendations** for SAP best practices

---

## Troubleshooting

### Backlog is Empty

**Reason:** No data extracted yet.

**Solution:**
1. Upload chat history first (Groups → Upload History)
2. Then extract project data (Groups → Extract)
3. Check Tasks page again

### Missing SAP Fields

**Reason:** AI didn't detect SAP context in messages.

**Solution:**
- Messages should mention SAP transaction codes (VA01, ME21N, etc.)
- Reference SAP modules (SD, MM, FI, etc.)
- Include transport request numbers
- Re-extract after adding more detailed messages

### No Story Points

**Reason:** Item is not a Story, or AI couldn't estimate complexity.

**Solution:**
- Only Stories get story points
- Ensure messages describe complexity/effort
- Can be manually updated in database if needed

---

## Keyboard Shortcuts

(Future enhancement - not yet implemented)

- `E` - Filter Epics
- `S` - Filter Stories
- `T` - Filter Tasks
- `D` - Filter Done
- `P` - Filter In Progress

---

## Version

Current SCRUM Backlog features available in: **v2.4.9+**

---

**Happy Sprint Planning!** 🚀
