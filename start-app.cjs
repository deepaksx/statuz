#!/usr/bin/env node

/**
 * Statuz - One-Click Launcher
 * This script handles everything needed to run the app
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Statuz...\n');

// Check if node_modules exists
const hasNodeModules = fs.existsSync(path.join(__dirname, 'node_modules'));

if (!hasNodeModules) {
  console.log('📦 First time setup - Installing dependencies...');
  console.log('   This may take a few minutes...\n');

  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Dependencies installed!\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    console.error('   Please run: npm install');
    process.exit(1);
  }
}

// Check if context directory exists, create with defaults if not
const contextDir = path.join(__dirname, 'context');
if (!fs.existsSync(contextDir)) {
  console.log('📁 Creating default project context...');
  fs.mkdirSync(contextDir, { recursive: true });

  // Create minimal default context files
  const defaultMission = `mission:
  statement: "Monitor project progress through WhatsApp groups"
  goals:
    - "Track team communications"
    - "Generate status reports"
`;

  const defaultTargets = `targets:
  kpis:
    - name: "Weekly Updates"
      target: "1 per week"
      deadline: "2024-12-31"
`;

  const defaultMilestones = `milestones:
  - id: "SETUP"
    title: "Initial Setup"
    description: "Get Statuz running"
    owner: "Team"
    dueDate: "2024-12-31"
    acceptanceCriteria: "App is connected to WhatsApp"
`;

  const defaultGlossary = `# Project Glossary
STATUZ: Status monitoring application
WIP: Work in Progress
`;

  fs.writeFileSync(path.join(contextDir, 'mission.yaml'), defaultMission);
  fs.writeFileSync(path.join(contextDir, 'targets.yaml'), defaultTargets);
  fs.writeFileSync(path.join(contextDir, 'milestones.yaml'), defaultMilestones);
  fs.writeFileSync(path.join(contextDir, 'glossary.yaml'), defaultGlossary);

  console.log('✅ Default context created!\n');
}

console.log('🔧 Building packages...\n');

// Build all packages in correct order
const buildCommands = [
  'cd packages/shared && npm run build',
  'cd packages/db && npm run build',
  'cd packages/background && npm run build',
  'cd apps/desktop && npm run build'
];

for (const cmd of buildCommands) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd: __dirname, shell: true });
  } catch (error) {
    console.error(`❌ Build failed: ${cmd}`);
    process.exit(1);
  }
}

console.log('\n✅ Build complete!\n');
console.log('🌐 Starting development servers...\n');

// Start the renderer dev server
const renderer = spawn('npm', ['run', 'dev:renderer'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Wait a bit for renderer to start, then launch electron
setTimeout(() => {
  console.log('\n⚡ Launching Electron...\n');
  const electron = spawn('npm', ['run', 'dev:electron'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electron.on('close', (code) => {
    console.log('\n👋 Shutting down...');
    renderer.kill();
    process.exit(code);
  });
}, 5000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  renderer.kill();
  process.exit(0);
});
