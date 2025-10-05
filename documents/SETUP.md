# 🚀 Quick Setup Guide for Windows

## Option 1: Easy Setup (Recommended for Development)

Since you're on Windows and encountered the Visual Studio/node-gyp issue, here's the easiest way to get started:

### 1. Install Build Tools
```bash
# Install Windows Build Tools (as Administrator)
npm install -g windows-build-tools

# OR install Visual Studio Build Tools manually:
# Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
```

### 2. Alternative: Use Docker (No Build Tools Required)
```bash
# Run the app in Docker container
docker build -t statuz .
docker run -p 5173:5173 -p 3000:3000 statuz
```

### 3. Alternative: Use WSL2 (Linux environment on Windows)
```bash
# Install WSL2 and Ubuntu
wsl --install

# Then run inside WSL2:
cd /mnt/c/Dev/Statuz
npm install
npm run dev
```

## Option 2: Manual Setup (After Installing Build Tools)

### 1. Clean and Reinstall
```bash
# Clean everything
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json
rm -rf apps/*/node_modules apps/*/package-lock.json

# Install dependencies
npm install
```

### 2. Install Package Dependencies
```bash
# Install all workspace dependencies
cd packages/shared && npm install
cd ../db && npm install
cd ../background && npm install
cd ../../apps/desktop && npm install
cd ../renderer && npm install
cd ../..
```

### 3. Build Packages
```bash
npm run build:shared
npm run build:db
npm run build:background
npm run build:main
```

### 4. Start Development
```bash
npm run dev
```

## Option 3: Simplified Development Mode

If you're having persistent issues with SQLite compilation, you can run in mock mode:

### 1. Create Mock Database
Create a simple JSON-based mock for development:

```bash
# Create a simple file-based storage for testing
mkdir dev-data
echo '{"groups":[],"messages":[],"signals":[],"milestones":[]}' > dev-data/mock.json
```

### 2. Run Frontend Only
```bash
cd apps/renderer
npm install
npm run dev
```

This will start the React app on http://localhost:5173 with mock data.

## Next Steps After Setup

### 1. WhatsApp Connection
- Launch the app
- You'll see a QR code in the console
- Scan with your WhatsApp mobile app
- Wait for "Connected" status

### 2. Configure Project Context
```bash
# The context files are already created in context/
# You can edit them for your specific project:
notepad context/mission.yaml
notepad context/targets.yaml
notepad context/milestones.yaml
notepad context/glossary.yaml
```

### 3. Test with Sample Data
```bash
# Load sample messages (for testing without WhatsApp)
# The app includes sample_messages.json with realistic SAP project data
```

### 4. Start Monitoring
1. Go to Groups tab
2. Click "Watch" on groups you want to monitor
3. Messages will be processed automatically
4. Generate snapshots from the Dashboard

## Troubleshooting

### Visual Studio Error
```bash
# If you get VS2017/VS2019 not found:
npm install -g @electron/rebuild
npm install -g node-gyp
```

### Python Error
```bash
# Install Python 3.8-3.11 (not 3.12+)
# Add to PATH during installation
```

### Permission Errors
```bash
# Run PowerShell as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Node Version Issues
```bash
# Use Node 18 LTS (not Node 22)
nvm install 18
nvm use 18
```

## Success Indicators

✅ All packages install without errors
✅ `npm run dev` starts without crashes
✅ Browser opens to http://localhost:5173
✅ Electron window appears
✅ WhatsApp QR code displays in console
✅ You can navigate between app sections

Once you see these indicators, you're ready to start using Statuz!