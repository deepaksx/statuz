# 🔄 Statuz - One-Click Restore Guide

## Version 2.2.0

This guide will help you restore Statuz from scratch with a single command.

---

## 📋 Prerequisites

Before restoring, ensure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Git** - [Download here](https://git-scm.com/)
3. **Windows 10/11** (for .bat launchers)

---

## 🚀 One-Click Restore

### Method 1: Using START_HERE.bat (Recommended)

```bash
# Clone the repository
git clone https://github.com/deepaksx/statuz.git
cd statuz

# Checkout the specific version
git checkout v2.2.0

# Run the launcher (Windows)
START_HERE.bat
```

The `START_HERE.bat` script will:
- ✅ Install all dependencies
- ✅ Build all packages
- ✅ Start the development server
- ✅ Launch Electron app

### Method 2: Manual Restore

```bash
# Clone the repository
git clone https://github.com/deepaksx/statuz.git
cd statuz

# Checkout the specific version
git checkout v2.2.0

# Install dependencies
npm install

# Build all packages
npm run build

# Start the app
npm run dev
```

---

## 📦 What Gets Restored

### Application Components
- ✅ Electron Desktop App
- ✅ React Frontend (Vite)
- ✅ Background Service (WhatsApp Integration)
- ✅ Parser Agent (AI-powered extraction)
- ✅ Database Layer (SQLite)
- ✅ Event Bus System

### Features Included in v2.2.0
- ✅ WhatsApp Group Monitoring
- ✅ AI-Powered Project/Task Extraction
- ✅ Chat History Upload & Delete
- ✅ Real-time Message Processing
- ✅ Project & Task Management
- ✅ Risk & Conflict Detection
- ✅ AI Chat Assistant
- ✅ Auto-Response System
- ✅ Team Member Management
- ✅ Group Context & Reports

---

## ⚙️ Configuration After Restore

### 1. Set Up Google Gemini API Key

1. Open the app (it should launch automatically)
2. Go to **Settings** page
3. Under **LLM Provider**, select **Google Gemini**
4. Enter your API key
5. Click **Test API** to verify
6. Click **Save Settings**

### 2. Connect WhatsApp (Optional)

The app works in standalone mode by default. To connect WhatsApp:

1. The app will automatically try to connect
2. Scan the QR code with WhatsApp mobile app
3. Wait for connection to establish

### 3. Import Chat History

1. Go to **Groups** page
2. Click **Add Group** (if needed)
3. Click **Upload History** on any group
4. Export chat from WhatsApp and paste the content
5. Click **Upload**

The AI will automatically extract projects, tasks, and risks!

---

## 📂 Project Structure

```
statuz/
├── apps/
│   ├── desktop/           # Electron main process
│   └── renderer/          # React frontend (Vite)
├── packages/
│   ├── agents/            # AI Parser Agent
│   ├── background/        # Background service
│   ├── db/                # Database layer
│   ├── event-bus/         # Event system
│   └── shared/            # Shared types
├── START_HERE.bat         # One-click launcher
├── QUICK_START.bat        # Alternative launcher
└── package.json           # Root config
```

---

## 🔧 Troubleshooting

### App Won't Start?

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
npm run dev
```

### Electron Window Not Visible?

The app is configured to:
- Show on top when launched
- Center on screen
- Auto-focus

If still not visible, check your taskbar.

### Database Errors?

Delete the database and restart:
```bash
# Windows
del "%APPDATA%\aipm\data\statuz.db"

# Then restart the app
npm run dev
```

### Build Errors?

Rebuild all packages:
```bash
npm run build
```

---

## 📊 Data Backup & Restore

### Backup Your Data

Your data is stored in:
```
Windows: %APPDATA%\aipm\data\
  ├── statuz.db          # Main database
  └── .wwebjs_auth/      # WhatsApp session
```

To backup:
1. Close the app
2. Copy the entire `data` folder
3. Store it safely

### Restore Your Data

1. Install Statuz using the restore guide above
2. Close the app
3. Replace the `data` folder with your backup
4. Restart the app

---

## 🎯 Version Information

- **Version**: 2.2.0
- **Release Date**: January 2025
- **Model**: Gemini 2.5 Flash Lite
- **Database**: SQLite 3
- **Framework**: Electron + React + TypeScript

---

## 🆘 Getting Help

- **Issues**: https://github.com/deepaksx/statuz/issues
- **Discussions**: https://github.com/deepaksx/statuz/discussions
- **Documentation**: See README.md

---

## ✅ Verification Checklist

After restoration, verify:

- [ ] App launches successfully
- [ ] Settings page loads
- [ ] Groups page displays
- [ ] Projects page works
- [ ] Tasks page works
- [ ] Can add/upload group history
- [ ] AI parsing works (with API key)
- [ ] Database operations succeed

---

**Happy Restoring! 🚀**
