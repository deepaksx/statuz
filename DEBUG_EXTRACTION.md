# 🔍 Debug Extraction Failure

## Quick Checklist

Before we dive into logs, verify these prerequisites:

### 1. ✅ App Restarted After Fix
- [ ] **Close the app completely** (not just minimize)
- [ ] **Rebuild all packages:** `npm run build`
- [ ] **Restart:** `npm start` or `START_HERE.bat`

The fix won't work unless you restart the app!

### 2. ✅ API Key Is Set
- [ ] Go to **Settings** page
- [ ] Verify **Gemini API Key** field shows your key (not empty)
- [ ] Click **Test Connection** button
- [ ] Should show "✅ Connected to Gemini successfully"

### 3. ✅ Group Is Watched
- [ ] Go to **Groups** page
- [ ] Find your group
- [ ] **Watch button should be GREEN** (not gray)
- [ ] If gray, click "Watch" to enable it

### 4. ✅ Messages Uploaded
- [ ] Go to **Groups** page
- [ ] Check if group shows **"History: Uploaded"**
- [ ] If not, click **Upload History** and select your WhatsApp chat export

---

## How to Find the Error

### Option 1: Check Developer Console (Renderer)

1. **Open Developer Tools:**
   - Press `Ctrl + Shift + I` (Windows/Linux)
   - Or `Cmd + Option + I` (Mac)

2. **Go to Console tab**

3. **Click "Extract" button again**

4. **Look for red error messages** that say:
   ```
   Extract project data error: Error: ...
   ```

5. **Copy the full error message** and share it with me

### Option 2: Check Main Process Console

1. **Look at the terminal/command prompt** where you started the app

2. **Click "Extract" button**

3. **Look for messages starting with:**
   ```
   🧠 [STEP 2] Extracting project data for group: ...
   ```
   OR
   ```
   ❌ Failed to extract project data: ...
   ```

4. **Copy the full output** and share it with me

---

## Common Errors and Solutions

### Error: "Group must be watched to extract project data"

**Solution:**
- Go to Groups page
- Click the gray "Watch" button to turn it green
- Try Extract again

### Error: "AI extraction not available. Please set your Gemini API key"

**Solution:**
- Go to Settings page
- Enter your Gemini API key
- Click Save
- Restart the app
- Try Extract again

### Error: "No messages found. Please upload chat history first"

**Solution:**
- Go to Groups page
- Click "Upload History" button
- Select your WhatsApp chat export file (.txt)
- Wait for upload to complete
- Try Extract again

### Error: "AI extraction agent not ready"

**Solution:**
- Go to Settings
- Verify API key is correct
- Click "Test Connection"
- If test fails, check your API key
- Restart the app
- Try Extract again

### Error: "Failed to parse JSON response"

**Solution:**
- This is an AI parsing issue
- The Gemini API might have returned invalid JSON
- Try Extract again (sometimes AI responses vary)
- Check your internet connection

---

## Full Debugging Steps

### Step 1: Verify Everything is Built

```bash
# From project root
npm run build
```

Wait for "Build complete" message.

### Step 2: Restart the App

```bash
# Close app completely (Ctrl+C in terminal)
# Then restart
npm start
```

### Step 3: Check API Key

1. Open app → Settings
2. Enter Gemini API key: `AIza...`
3. Click "Test Connection"
4. Should show: ✅ Connected to Gemini successfully
5. **Look at the console** - should show:
   ```
   ✅ AI agents updated with new API key
   ```

### Step 4: Prepare Group

1. Go to Groups page
2. Find your group
3. Make sure it's **watched** (green button)
4. Make sure **history is uploaded**

### Step 5: Check Console Before Extract

Open DevTools (Ctrl+Shift+I) and keep Console tab open.

### Step 6: Click Extract

1. Click the "Extract" button
2. **Watch the console carefully**
3. You should see:
   ```
   🧠 [STEP 2] Extracting project data for group: YourGroupName
   📨 Found X messages to analyze
   🧠 Performing holistic batch analysis...
   📋 Context: Available (or Not set - AI will infer)
   ```

### Step 7: Note the Error

If it fails, you'll see:
```
❌ Failed to extract project data: Error: [ACTUAL ERROR MESSAGE]
```

**Copy that full error** and share it.

---

## If Still Failing

Please provide me with:

1. **The exact error message** from console
2. **Output from main process** (terminal)
3. **Screenshots** of:
   - Settings page (blur your API key)
   - Groups page showing the group
   - DevTools console with error

---

## Quick Test Script

Run this in DevTools Console (Renderer):

```javascript
// Check if extraction is available
window.electron.invoke('get-config').then(config => {
  console.log('Config:', {
    hasApiKey: !!config.geminiApiKey,
    apiKeyLength: config.geminiApiKey?.length
  });
});

// Check group status
window.electron.invoke('get-groups').then(groups => {
  console.log('Groups:', groups.map(g => ({
    name: g.name,
    isWatched: g.isWatched,
    hasHistory: g.hasHistoryUploaded
  })));
});
```

This will show if API key and groups are configured correctly.

---

## Contact

If you've tried all of the above and it still fails, share:
- The error message
- Console output
- Whether prerequisites are met

I'll help debug further!
