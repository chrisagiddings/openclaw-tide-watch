#!/usr/bin/env node

/**
 * Capacity monitoring core logic for Tide Watch
 * Parses OpenClaw session files and calculates token usage
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Default OpenClaw session directory
 */
const DEFAULT_SESSION_DIR = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');

/**
 * Parse a session JSONL file and extract capacity data
 * @param {string} sessionPath - Path to the session .jsonl file
 * @returns {Object} Session capacity data
 */
function parseSession(sessionPath) {
  try {
    const content = fs.readFileSync(sessionPath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return null;
    }

    // Find the last message with usage data (totalTokens)
    // User messages don't have usage, so we need to scan backwards
    let tokensUsed = 0;
    let breakdown = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    let sessionId = null;
    let channel = 'unknown';
    let model = 'unknown';
    let lastTimestamp = null;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        const usage = entry.message?.usage || entry.usage || {};
        
        // Update metadata
        sessionId = sessionId || entry.sessionKey || path.basename(sessionPath, '.jsonl');
        channel = channel === 'unknown' ? (entry.channel || 'unknown') : channel;
        model = model === 'unknown' ? (entry.message?.model || entry.model || 'unknown') : model;
        lastTimestamp = lastTimestamp || entry.timestamp;
        
        // Use totalTokens from first message with usage data we find (scanning backwards)
        if (usage.totalTokens && tokensUsed === 0) {
          tokensUsed = usage.totalTokens;
          breakdown = {
            input: usage.input || 0,
            output: usage.output || 0,
            cacheRead: usage.cacheRead || 0,
            cacheWrite: usage.cacheWrite || 0
          };
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    // If no metadata found, use session file name
    sessionId = sessionId || path.basename(sessionPath, '.jsonl');
    lastTimestamp = lastTimestamp || new Date().toISOString();
    const tokensMax = getModelMaxTokens(model);
    const percentage = tokensMax > 0 ? (tokensUsed / tokensMax) * 100 : 0;
    
    return {
      sessionId,
      channel,
      model,
      tokensUsed,
      tokensMax,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      status: getStatus(percentage),
      lastActivity: lastTimestamp,
      messageCount: lines.length,
      breakdown
    };
  } catch (error) {
    console.error(`Error parsing session ${sessionPath}:`, error.message);
    return null;
  }
}

/**
 * Get maximum tokens for a model
 * @param {string} model - Model identifier
 * @returns {number} Max tokens
 */
function getModelMaxTokens(model) {
  // Common model context windows
  const modelLimits = {
    'anthropic/claude-sonnet-4-5': 200000,
    'anthropic/claude-opus-4-5': 200000,
    'anthropic/claude-opus-4-6': 200000,
    'anthropic/claude-haiku-4-5': 200000,
    'openai/gpt-4': 128000,
    'openai/gpt-4-turbo': 128000,
    'openai/gpt-5.2': 200000,
    'openai/o1': 200000,
    'deepseek/deepseek-chat': 64000,
  };
  
  // Check exact match
  if (modelLimits[model]) {
    return modelLimits[model];
  }
  
  // Check partial match (e.g., "claude-sonnet" matches "anthropic/claude-sonnet-4-5")
  for (const [key, value] of Object.entries(modelLimits)) {
    if (key.includes(model) || model.includes(key)) {
      return value;
    }
  }
  
  // Default to 200k for unknown models
  return 200000;
}

/**
 * Get status emoji/text based on percentage
 * @param {number} percentage - Capacity percentage
 * @returns {string} Status indicator
 */
function getStatus(percentage) {
  if (percentage >= 95) return '🚨 CRITICAL';
  if (percentage >= 90) return '🔴 HIGH';
  if (percentage >= 85) return '🟠 ELEVATED';
  if (percentage >= 75) return '🟡 WARNING';
  return '✅ OK';
}

/**
 * Get all sessions from the OpenClaw sessions directory
 * @param {string} sessionDir - Path to sessions directory
 * @returns {Array} Array of session objects
 */
function getAllSessions(sessionDir = DEFAULT_SESSION_DIR) {
  try {
    if (!fs.existsSync(sessionDir)) {
      console.error(`Session directory not found: ${sessionDir}`);
      return [];
    }

    const files = fs.readdirSync(sessionDir);
    const sessions = [];

    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const sessionPath = path.join(sessionDir, file);
        const session = parseSession(sessionPath);
        if (session) {
          sessions.push(session);
        }
      }
    }

    return sessions;
  } catch (error) {
    console.error('Error reading sessions:', error.message);
    return [];
  }
}

/**
 * Get a specific session by key
 * @param {string} sessionKey - Session identifier
 * @param {string} sessionDir - Path to sessions directory
 * @returns {Object|null} Session object or null
 */
function getSession(sessionKey, sessionDir = DEFAULT_SESSION_DIR) {
  const sessionPath = path.join(sessionDir, `${sessionKey}.jsonl`);
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  return parseSession(sessionPath);
}

/**
 * Filter sessions by threshold
 * @param {Array} sessions - Array of session objects
 * @param {number} threshold - Minimum percentage to include
 * @returns {Array} Filtered sessions
 */
function filterByThreshold(sessions, threshold) {
  return sessions.filter(s => s.percentage >= threshold);
}

/**
 * Sort sessions by percentage (descending)
 * @param {Array} sessions - Array of session objects
 * @returns {Array} Sorted sessions
 */
function sortByCapacity(sessions) {
  return sessions.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Format session data as a table row
 * @param {Object} session - Session object
 * @returns {string} Formatted table row
 */
function formatTableRow(session) {
  const sessionId = session.sessionId.substring(0, 8);
  const channel = session.channel.padEnd(12);
  const capacity = `${session.percentage.toFixed(1)}%`.padStart(6);
  const tokens = `${session.tokensUsed.toLocaleString()}/${session.tokensMax.toLocaleString()}`.padStart(20);
  const status = session.status.padEnd(15);
  
  return `${sessionId}  ${channel}  ${capacity}  ${tokens}  ${status}`;
}

/**
 * Format sessions as a table
 * @param {Array} sessions - Array of session objects
 * @returns {string} Formatted table
 */
function formatTable(sessions) {
  const header = 'Session   Channel       Cap %              Tokens  Status';
  const separator = '-'.repeat(header.length);
  
  const rows = sessions.map(formatTableRow);
  
  return [header, separator, ...rows].join('\n');
}

/**
 * Format sessions as JSON
 * @param {Array} sessions - Array of session objects
 * @param {boolean} pretty - Pretty print JSON
 * @returns {string} JSON string
 */
function formatJSON(sessions, pretty = false) {
  return pretty ? JSON.stringify(sessions, null, 2) : JSON.stringify(sessions);
}

/**
 * Get capacity indicator emoji
 * @param {number} percentage - Capacity percentage
 * @returns {string} Emoji indicator
 */
function getCapacityEmoji(percentage) {
  if (percentage >= 95) return '🔴';
  if (percentage >= 85) return '🟠';
  if (percentage >= 75) return '🟡';
  return '🟢';
}

/**
 * Create a visual capacity bar
 * @param {number} percentage - Capacity percentage
 * @param {number} width - Width of the bar in characters
 * @returns {string} Visual capacity bar
 */
function getCapacityBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return bar;
}

/**
 * Generate recommendations based on session capacities
 * @param {Array} sessions - Array of session objects
 * @returns {Array} Array of recommendation strings
 */
function getRecommendations(sessions) {
  const recommendations = [];
  
  const critical = sessions.filter(s => s.percentage >= 95);
  const high = sessions.filter(s => s.percentage >= 90 && s.percentage < 95);
  const elevated = sessions.filter(s => s.percentage >= 85 && s.percentage < 90);
  
  // Critical sessions
  if (critical.length > 0) {
    critical.forEach(s => {
      const id = s.sessionId.substring(0, 8);
      recommendations.push(`🚨 URGENT: Reset ${s.channel}/${id} immediately (${s.percentage}%)`);
    });
  }
  
  // High capacity sessions
  if (high.length > 0) {
    high.forEach(s => {
      const id = s.sessionId.substring(0, 8);
      recommendations.push(`🔴 Reset ${s.channel}/${id} soon (${s.percentage}%)`);
    });
  }
  
  // Elevated sessions
  if (elevated.length > 0) {
    elevated.forEach(s => {
      const id = s.sessionId.substring(0, 8);
      recommendations.push(`🟠 Consider wrapping up ${s.channel}/${id} (${s.percentage}%)`);
    });
  }
  
  // Suggest switching to low-capacity session
  const lowCapacity = sessions.filter(s => s.percentage < 50).sort((a, b) => a.percentage - b.percentage);
  if (lowCapacity.length > 0 && (critical.length > 0 || high.length > 0)) {
    const best = lowCapacity[0];
    const id = best.sessionId.substring(0, 8);
    recommendations.push(`💡 Switch active work to ${best.channel}/${id} (${best.percentage}%)`);
  }
  
  // All good
  if (recommendations.length === 0) {
    recommendations.push('✅ All sessions have healthy capacity');
  }
  
  return recommendations;
}

/**
 * Format sessions as a dashboard
 * @param {Array} sessions - Array of session objects
 * @returns {string} Formatted dashboard
 */
function formatDashboard(sessions) {
  const sorted = sortByCapacity(sessions);
  
  const lines = [];
  lines.push('');
  lines.push('TIDE WATCH DASHBOARD 🌊');
  lines.push('─'.repeat(70));
  lines.push('Session ID  Channel       Capacity                    Tokens        Status');
  lines.push('─'.repeat(70));
  
  sorted.forEach(session => {
    const id = session.sessionId.substring(0, 10).padEnd(10);
    const channel = session.channel.padEnd(12);
    const emoji = getCapacityEmoji(session.percentage);
    const bar = getCapacityBar(session.percentage, 10);
    const pct = `${session.percentage.toFixed(1)}%`.padStart(6);
    const tokens = `${session.tokensUsed.toLocaleString()}/${session.tokensMax.toLocaleString()}`.padStart(13);
    
    lines.push(`${id}  ${channel}  ${emoji} ${bar} ${pct}  ${tokens}`);
  });
  
  lines.push('─'.repeat(70));
  
  // Summary
  const critical = sorted.filter(s => s.percentage >= 95).length;
  const high = sorted.filter(s => s.percentage >= 90 && s.percentage < 95).length;
  const elevated = sorted.filter(s => s.percentage >= 85 && s.percentage < 90).length;
  const warning = sorted.filter(s => s.percentage >= 75 && s.percentage < 85).length;
  
  const summary = [];
  if (critical > 0) summary.push(`${critical} critical`);
  if (high > 0) summary.push(`${high} high`);
  if (elevated > 0) summary.push(`${elevated} elevated`);
  if (warning > 0) summary.push(`${warning} warning`);
  
  if (summary.length > 0) {
    lines.push(`⚠️  ${summary.join(', ')}`);
  } else {
    lines.push('✅ All sessions healthy');
  }
  
  lines.push('');
  
  // Recommendations
  const recommendations = getRecommendations(sorted);
  if (recommendations.length > 0) {
    lines.push('RECOMMENDED ACTIONS:');
    recommendations.forEach(rec => lines.push(`  ${rec}`));
    lines.push('');
  }
  
  return lines.join('\n');
}

module.exports = {
  parseSession,
  getAllSessions,
  getSession,
  filterByThreshold,
  sortByCapacity,
  formatTable,
  formatJSON,
  formatDashboard,
  getRecommendations,
  getCapacityEmoji,
  getCapacityBar,
  DEFAULT_SESSION_DIR
};
