# 🔧 Troubleshoot: Electron Window Not Appearing

## Problem
App builds successfully, Vite starts, but Electron window never appears.

## Quick Fixes

### Fix 1: Kill Everything and Restart

1. **Close the START_HERE.bat window** (click X or Ctrl+C)
2. **Kill any stuck processes:**

```bash
# Open new Command Prompt and run:
taskkill /F /IM electron.exe
taskkill /F /IM node.exe
```

3. **Wait 5 seconds**
4. **Try again:** Double-click `START_HERE.bat`

---

### Fix 2: Use DIRECT_START.bat Instead

This bypasses the wait-on check and launches directly:

1. Close START_HERE.bat
2. **Double-click `DIRECT_START.bat`**
3. Window should appear in 5-10 seconds

---

### Fix 3: Manual Launch (Most Reliable)

Open **TWO separate Command Prompt windows**:

#### Window 1 - Start Vite:
```bash
cd C:\Dev\Statuz
cd apps\renderer
npm run dev
```

Wait until you see: `➜  Local:   http://127.0.0.1:5173/`

#### Window 2 - Start Electron:
```bash
cd C:\Dev\Statuz
set NODE_ENV=development
npx electron dist/main/main.js
```

Electron should launch immediately!

---

### Fix 4: Check for Port Conflicts

```bash
# Check if port 5173 is in use:
netstat -ano | findstr :5173
```

If something is using it, kill that process or use a different port.

---

### Fix 5: Restart Computer

Sometimes Windows gets processes stuck. A full restart clears everything.

---

## Most Common Causes

1. **wait-on timing out** - Vite takes too long, wait-on gives up
2. **Electron already running** - Previous instance blocking new one
3. **Port conflict** - 5173 occupied by another app
4. **Windows Defender/Firewall** - Blocking Electron

---

## Recommended Right Now

Try **Fix 2** first - Use `DIRECT_START.bat`

It's designed to handle launch issues better than START_HERE.bat.
