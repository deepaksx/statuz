# Statuz - WhatsApp Project Monitor

A desktop application that monitors specified WhatsApp groups and generates project status reports with milestone tracking, todo extraction, and progress analysis.

## Features

- **WhatsApp Integration**: Connect via QR code using whatsapp-web.js
- **Group Monitoring**: Select which WhatsApp groups to monitor
- **Smart Extraction**: AI-powered extraction of project signals from messages
- **Milestone Tracking**: Monitor project milestones with status updates
- **Snapshot Reports**: Generate structured status reports in Markdown/JSON
- **Privacy First**: All data stored locally, optional cloud LLM processing
- **Offline Capable**: Works without internet after initial setup

## Architecture

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Electron + Node.js + TypeScript
- **Database**: SQLite with better-sqlite3
- **WhatsApp**: whatsapp-web.js (headless Chromium)
- **Processing**: Rule-based + optional LLM enhancement

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- WhatsApp account (for QR login)

### Installation

1. Clone and install dependencies:
```bash
git clone <repo-url>
cd statuz
npm install
```

2. Set up environment (optional):
```bash
cp .env.example .env
# Edit .env with your LLM API keys if desired
```

3. Create project context:
```bash
# Copy sample context files
cp -r context-samples/ context/
# Or create your own YAML files in context/
```

4. Start development:
```bash
npm run dev
```

### Building for Production

```bash
# Build all packages
npm run build

# Create platform-specific binaries
npm run build:electron

# Output will be in dist-electron/
```

## Project Context Setup

Create these YAML files in the `context/` directory:

### 1. mission.yaml
```yaml
mission:
  statement: "Your project mission"
  goals:
    - "Goal 1"
    - "Goal 2"
```

### 2. targets.yaml
```yaml
targets:
  kpis:
    - name: "KPI Name"
      target: "Target Value"
      deadline: "2024-12-31"
```

### 3. milestones.yaml
```yaml
milestones:
  - id: "MILESTONE_1"
    title: "Milestone Title"
    description: "Description"
    owner: "Owner Name"
    dueDate: "2024-12-31"
    acceptanceCriteria: "Acceptance criteria"
```

### 4. glossary.yaml
```yaml
TERM1: "Definition 1"
TERM2: "Definition 2"
# Add project-specific terms and acronyms
```

## Usage Guide

### 1. Connect to WhatsApp

1. Launch the application
2. Scan the QR code with WhatsApp on your phone
3. Wait for "Connected" status

### 2. Configure Groups

1. Go to **Groups** tab
2. Click **Refresh Groups** to load your WhatsApp groups
3. Click **Watch** on groups you want to monitor
4. Only watched groups will be processed for signals

### 3. Monitor Messages

1. **Messages** tab shows incoming messages from watched groups
2. Toggle **Privacy Mode** to show/hide author names
3. Filter by specific groups or view all

### 4. View Signals

1. **Signals** tab shows extracted project information
2. Filter by signal type: Milestones, Todos, Risks, Decisions, Blockers
3. Signals are automatically extracted from incoming messages

### 5. Generate Reports

1. Go to **Dashboard**
2. Click **Generate Snapshot** to create a status report
3. Export as **Markdown** or **JSON**
4. Reports include:
   - Executive summary
   - Milestone status table
   - Action items by owner
   - Recent decisions

## Signal Extraction

The app automatically extracts these signal types from messages:

- **Milestone Updates**: Progress, status changes, completion percentages
- **Todos**: Action items with owners and due dates
- **Risks**: Identified risks with likelihood and impact
- **Decisions**: Project decisions with decision makers
- **Blockers**: Issues blocking progress
- **Info**: General project information

### Extraction Rules

The system looks for patterns like:

```
"MTO Strategy 50 is 70% complete"
→ Milestone Update: 70% progress

"@John please review the design by Friday"
→ Todo: Review design (Owner: John, Due: Friday)

"Risk: Database migration might fail"
→ Risk: Database migration failure

"Decided to use Option A for the integration"
→ Decision: Use Option A for integration

"Blocked by missing API documentation"
→ Blocker: Missing API documentation
```

## Privacy & Security

- **Local Storage**: All data stored in local SQLite database
- **No Cloud**: Messages never sent to external services by default
- **Privacy Mode**: Hide author names and phone numbers in UI
- **Optional LLM**: Cloud processing only with explicit opt-in and API key
- **Data Wipe**: Built-in function to delete all local data

## Configuration

### Environment Variables

```bash
# LLM Provider (optional)
LLM_PROVIDER=none|anthropic|openai

# API Keys (only if using LLM)
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### Settings Panel

- **Privacy Mode**: Toggle author name masking
- **LLM Provider**: Choose cloud processing provider
- **API Key**: Configure LLM service credentials
- **Data Management**: View stats and wipe data

## Development

### Project Structure

```
statuz/
├── apps/
│   ├── desktop/          # Electron main process
│   └── renderer/         # React frontend
├── packages/
│   ├── background/       # WhatsApp client & processing
│   ├── db/              # Database layer
│   └── shared/          # Types & schemas
├── context/             # Project context YAML files
└── sample_messages.json # Test data
```

### Scripts

```bash
npm run dev              # Start development
npm run build            # Build all packages
npm run lint             # Run linting
npm run typecheck        # Type checking
npm run test             # Run tests
```

### Adding New Signal Types

1. Add type to `packages/shared/src/types.ts`
2. Update schema in `packages/shared/src/schemas.ts`
3. Add extraction logic in `packages/background/src/extraction/extractor.ts`
4. Update UI components in `apps/renderer/src/`

## Testing

### Unit Tests

```bash
npm run test
```

### Manual Testing

1. Load sample messages: Import `sample_messages.json`
2. Test extraction: Verify signals are created correctly
3. Generate reports: Check snapshot output format
4. Privacy mode: Verify author masking works

### Sample Data

The `sample_messages.json` file contains realistic SAP project messages for testing:

- MTO Strategy updates
- RAR implementation progress
- Data migration issues
- MIGO workflow completion
- CK11N costing problems
- Security role conflicts

## Troubleshooting

### WhatsApp Connection Issues

- **QR Code not appearing**: Restart the app
- **Connection timeout**: Check internet connection
- **Authentication failed**: Clear app data and reconnect

### Signal Extraction Problems

- **No signals extracted**: Check project context YAML files
- **Wrong signals**: Adjust glossary terms
- **Missing milestones**: Verify milestone IDs in context

### Performance Issues

- **Slow startup**: Clear database or reduce message history
- **High memory usage**: Restart app periodically
- **Unresponsive UI**: Check for large message backlogs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check this README and code comments

---

**⚠️ Important Notes:**

1. **WhatsApp ToS**: Using whatsapp-web.js may violate WhatsApp's Terms of Service. Use at your own risk.
2. **Group Permissions**: Only monitor groups where you have permission to process messages.
3. **Data Privacy**: Ensure compliance with local privacy laws when processing group messages.
4. **Backup**: Regularly backup your project context files and exported reports.