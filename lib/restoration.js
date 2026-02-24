#!/usr/bin/env node

/**
 * Session restoration prompt management
 * Helps recover context after session resets
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Default restoration prompts directory
 */
const DEFAULT_RESTORE_DIR = path.join(
  os.homedir(),
  '.openclaw',
  'agents',
  'main',
  'sessions',
  'restore-prompts'
);

/**
 * Get restoration prompt path for a session
 * @param {string} sessionId - Session identifier
 * @param {string} restoreDir - Restoration prompts directory
 * @returns {string} Path to restoration prompt file
 */
function getRestorePromptPath(sessionId, restoreDir = DEFAULT_RESTORE_DIR) {
  return path.join(restoreDir, `${sessionId}.md`);
}

/**
 * Get default restoration prompt path
 * @param {string} restoreDir - Restoration prompts directory
 * @returns {string} Path to default restoration prompt file
 */
function getDefaultRestorePromptPath(restoreDir = DEFAULT_RESTORE_DIR) {
  return path.join(restoreDir, 'default.md');
}

/**
 * Check if restoration prompt exists for session
 * @param {string} sessionId - Session identifier
 * @param {string} restoreDir - Restoration prompts directory
 * @returns {boolean} True if prompt exists
 */
function hasRestorePrompt(sessionId, restoreDir = DEFAULT_RESTORE_DIR) {
  const promptPath = getRestorePromptPath(sessionId, restoreDir);
  return fs.existsSync(promptPath);
}

/**
 * Load restoration prompt for session
 * @param {string} sessionId - Session identifier
 * @param {string} restoreDir - Restoration prompts directory
 * @returns {string|null} Restoration prompt content, or null if not found
 */
function loadRestorePrompt(sessionId, restoreDir = DEFAULT_RESTORE_DIR) {
  // Try session-specific prompt first
  const sessionPromptPath = getRestorePromptPath(sessionId, restoreDir);
  if (fs.existsSync(sessionPromptPath)) {
    return fs.readFileSync(sessionPromptPath, 'utf8');
  }
  
  // Fall back to default prompt
  const defaultPromptPath = getDefaultRestorePromptPath(restoreDir);
  if (fs.existsSync(defaultPromptPath)) {
    return fs.readFileSync(defaultPromptPath, 'utf8');
  }
  
  return null;
}

/**
 * Save restoration prompt for session
 * @param {string} sessionId - Session identifier
 * @param {string} content - Prompt content
 * @param {string} restoreDir - Restoration prompts directory
 */
function saveRestorePrompt(sessionId, content, restoreDir = DEFAULT_RESTORE_DIR) {
  // Ensure directory exists
  if (!fs.existsSync(restoreDir)) {
    fs.mkdirSync(restoreDir, { recursive: true });
  }
  
  const promptPath = getRestorePromptPath(sessionId, restoreDir);
  fs.writeFileSync(promptPath, content, 'utf8');
}

/**
 * Delete restoration prompt for session
 * @param {string} sessionId - Session identifier
 * @param {string} restoreDir - Restoration prompts directory
 * @returns {boolean} True if deleted, false if didn't exist
 */
function deleteRestorePrompt(sessionId, restoreDir = DEFAULT_RESTORE_DIR) {
  const promptPath = getRestorePromptPath(sessionId, restoreDir);
  
  if (!fs.existsSync(promptPath)) {
    return false;
  }
  
  fs.unlinkSync(promptPath);
  return true;
}

/**
 * List all restoration prompts
 * @param {string} restoreDir - Restoration prompts directory
 * @returns {Array} Array of {sessionId, path, size, modified}
 */
function listRestorePrompts(restoreDir = DEFAULT_RESTORE_DIR) {
  if (!fs.existsSync(restoreDir)) {
    return [];
  }
  
  const files = fs.readdirSync(restoreDir);
  const prompts = [];
  
  for (const file of files) {
    if (!file.endsWith('.md')) {
      continue;
    }
    
    const filePath = path.join(restoreDir, file);
    const stats = fs.statSync(filePath);
    const sessionId = file === 'default.md' ? 'default' : path.basename(file, '.md');
    
    prompts.push({
      sessionId,
      path: filePath,
      size: stats.size,
      modified: stats.mtime
    });
  }
  
  return prompts.sort((a, b) => b.modified - a.modified);
}

/**
 * Open restoration prompt in editor
 * @param {string} sessionId - Session identifier
 * @param {string} restoreDir - Restoration prompts directory
 * @returns {boolean} True if editor opened successfully
 */
function editRestorePrompt(sessionId, restoreDir = DEFAULT_RESTORE_DIR) {
  // Ensure directory exists
  if (!fs.existsSync(restoreDir)) {
    fs.mkdirSync(restoreDir, { recursive: true });
  }
  
  const promptPath = getRestorePromptPath(sessionId, restoreDir);
  
  // Create template if doesn't exist
  if (!fs.existsSync(promptPath)) {
    const template = generateRestorePromptTemplate(sessionId);
    fs.writeFileSync(promptPath, template, 'utf8');
  }
  
  // Determine editor
  const editor = process.env.VISUAL || process.env.EDITOR || 'nano';
  
  try {
    execSync(`${editor} "${promptPath}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to open editor: ${error.message}`);
    return false;
  }
}

/**
 * Generate restoration prompt template
 * @param {string} sessionId - Session identifier
 * @returns {string} Template content
 */
function generateRestorePromptTemplate(sessionId) {
  return `# Session Restoration Prompt

**Session ID:** ${sessionId}
**Created:** ${new Date().toISOString().split('T')[0]}

## Project Context

**Project Name:** [Your project name]
**Description:** [Brief description]

## Technical Details

**Tech Stack:** [Technologies, languages, frameworks]
**Environment:** [Development environment, tools]

## Current Focus

**Phase:** [Current project phase]
**Last Completed:** [What was recently finished]
**Next Steps:** [What's coming up]

## Important Files & Locations

**Code:** [Path to code directory]
**Docs:** [Path to documentation]
**Data:** [Path to data/assets]

## Active Work

**Current Tasks:**
- [Task 1]
- [Task 2]
- [Task 3]

**Blockers:** [Any current blockers or dependencies]

## Team & Communication

**Team Members:** [If applicable]
**Communication Channels:** [Discord, Slack, etc.]
**Schedule:** [Stand-ups, meetings, etc.]

## Custom Instructions

[Any specific instructions for how the agent should behave in this session]

---

**Tips:**
- Keep this updated as your project evolves
- Be concise but thorough (aim for < 1000 tokens)
- Include only essential context for quick recovery
- Update after major project milestones
`;
}

/**
 * Get restoration prompt metadata
 * @param {string} sessionId - Session identifier
 * @param {string} restoreDir - Restoration prompts directory
 * @returns {Object|null} Metadata or null if not found
 */
function getRestorePromptInfo(sessionId, restoreDir = DEFAULT_RESTORE_DIR) {
  const promptPath = getRestorePromptPath(sessionId, restoreDir);
  
  if (!fs.existsSync(promptPath)) {
    return null;
  }
  
  const stats = fs.statSync(promptPath);
  const content = fs.readFileSync(promptPath, 'utf8');
  
  // Estimate token count (rough approximation: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(content.length / 4);
  
  return {
    sessionId,
    path: promptPath,
    size: stats.size,
    lines: content.split('\n').length,
    estimatedTokens,
    modified: stats.mtime,
    created: stats.birthtime
  };
}

/**
 * Format restoration prompt info for display
 * @param {Object} info - Prompt metadata
 * @returns {string} Formatted display text
 */
function formatRestorePromptInfo(info) {
  const lines = [];
  
  lines.push(`Session: ${info.sessionId}`);
  lines.push(`Path: ${info.path}`);
  lines.push(`Size: ${info.size} bytes (${info.lines} lines)`);
  lines.push(`Estimated tokens: ~${info.estimatedTokens}`);
  lines.push(`Modified: ${info.modified.toLocaleString()}`);
  
  if (info.estimatedTokens > 1000) {
    lines.push('');
    lines.push('⚠️  Warning: Prompt is large (>1000 tokens). Consider shortening for better efficiency.');
  }
  
  return lines.join('\n');
}

module.exports = {
  DEFAULT_RESTORE_DIR,
  getRestorePromptPath,
  getDefaultRestorePromptPath,
  hasRestorePrompt,
  loadRestorePrompt,
  saveRestorePrompt,
  deleteRestorePrompt,
  listRestorePrompts,
  editRestorePrompt,
  generateRestorePromptTemplate,
  getRestorePromptInfo,
  formatRestorePromptInfo
};
