const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Electron', 'data', 'statuz.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

// Check groups
db.all('SELECT * FROM groups', (err, groups) => {
  if (err) {
    console.error('Error fetching groups:', err);
  } else {
    console.log('\n=== GROUPS ===');
    console.log(`Total groups: ${groups.length}`);
    groups.forEach(g => {
      console.log(`- ${g.name} (watched: ${g.is_watched}, auto-response: ${g.auto_response_enabled})`);
    });
  }
});

// Check messages
db.all('SELECT COUNT(*) as count FROM messages', (err, result) => {
  if (err) {
    console.error('Error counting messages:', err);
  } else {
    console.log('\n=== MESSAGES ===');
    console.log(`Total messages: ${result[0].count}`);
  }
});

// Check recent messages
db.all('SELECT m.*, g.name as group_name FROM messages m LEFT JOIN groups g ON m.group_id = g.id ORDER BY m.timestamp DESC LIMIT 10', (err, messages) => {
  if (err) {
    console.error('Error fetching recent messages:', err);
  } else {
    console.log('\n=== RECENT MESSAGES ===');
    messages.forEach(m => {
      const date = new Date(m.timestamp);
      console.log(`[${date.toLocaleString()}] ${m.group_name}: ${m.author_name} - ${m.text.substring(0, 50)}...`);
    });
  }

  db.close();
});
