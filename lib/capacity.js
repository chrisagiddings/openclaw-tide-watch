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
 * Load session registry from sessions.json
 * @param {string} sessionDir - Path to sessions directory
 * @returns {Object} Session registry mapping sessionId -> metadata
 */
function loadSessionRegistry(sessionDir = DEFAULT_SESSION_DIR) {
  const registryPath = path.join(sessionDir, 'sessions.json');
  
  try {
    if (!fs.existsSync(registryPath)) {
      return {};
    }
    
    const content = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(content);
    
    // Build a reverse map: sessionId -> metadata
    const sessionMap = {};
    for (const [key, value] of Object.entries(registry)) {
      if (value.sessionId) {
        // Extract channel from multiple possible locations
        const channel = value.channel || 
                       value.deliveryContext?.channel || 
                       value.lastChannel || 
                       'unknown';
        
        // Extract label from groupChannel or origin.label
        const label = value.groupChannel || value.origin?.label || null;
        
        sessionMap[value.sessionId] = {
          channel,
          label,
          displayName: value.displayName || null
        };
      }
    }
    
    return sessionMap;
  } catch (error) {
    console.error('Error loading session registry:', error.message);
    return {};
  }
}

/**
 * Parse a session JSONL file and extract capacity data
 * @param {string} sessionPath - Path to the session .jsonl file
 * @param {Object} registry - Optional session registry from sessions.json
 * @returns {Object} Session capacity data
 */
function parseSession(sessionPath, registry = null) {
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
    let label = null;
    let model = 'unknown';
    let lastTimestamp = null;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        const usage = entry.message?.usage || entry.usage || {};
        
        // Update metadata
        sessionId = sessionId || entry.sessionKey || path.basename(sessionPath, '.jsonl');
        channel = channel === 'unknown' ? (entry.channel || 'unknown') : channel;
        label = label || entry.label || null;
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
    
    // Override with registry data if available (more reliable than JSONL)
    if (registry && registry[sessionId]) {
      channel = registry[sessionId].channel || channel;
      label = registry[sessionId].label || label;
    }
    
    const tokensMax = getModelMaxTokens(model);
    const percentage = tokensMax > 0 ? (tokensUsed / tokensMax) * 100 : 0;
    
    return {
      sessionId,
      channel,
      label,
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

    // Load session registry for metadata enrichment
    const registry = loadSessionRegistry(sessionDir);

    const files = fs.readdirSync(sessionDir);
    const sessions = [];

    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const sessionPath = path.join(sessionDir, file);
        const session = parseSession(sessionPath, registry);
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
 * Resolve session identifier to full session ID
 * Supports:
 * - Full session ID (UUID)
 * - Session label (#channel-name)
 * - Channel name (discord, webchat, etc.)
 * - Channel/label combo (discord/#channel-name)
 * 
 * @param {string} input - Session identifier (ID, label, or channel)
 * @param {string} sessionDir - Path to sessions directory
 * @returns {Object} Resolution result { sessionId, matches, ambiguous, error }
 */
function resolveSessionId(input, sessionDir = DEFAULT_SESSION_DIR) {
  // If it looks like a UUID (starts with hex pattern), use as-is
  if (/^[0-9a-f]{8}-/.test(input)) {
    return { sessionId: input, matches: null, ambiguous: false };
  }
  
  // Load session registry
  const registry = loadSessionRegistry(sessionDir);
  const allSessions = getAllSessions(sessionDir);
  
  // Build a searchable index
  const matches = [];
  
  for (const session of allSessions) {
    const sessionData = registry[session.sessionId] || {};
    
    // Match by exact label
    if (session.label && session.label === input) {
      matches.push({
        sessionId: session.sessionId,
        channel: session.channel,
        label: session.label,
        matchType: 'exact-label'
      });
      continue;
    }
    
    // Match by channel
    if (session.channel === input) {
      matches.push({
        sessionId: session.sessionId,
        channel: session.channel,
        label: session.label,
        matchType: 'channel'
      });
      continue;
    }
    
    // Match by channel/label combo
    const combo = session.label ? `${session.channel}/${session.label}` : session.channel;
    if (combo === input || combo.includes(input)) {
      matches.push({
        sessionId: session.sessionId,
        channel: session.channel,
        label: session.label,
        matchType: 'combo'
      });
      continue;
    }
    
    // Match by display name
    if (sessionData.displayName && sessionData.displayName.includes(input)) {
      matches.push({
        sessionId: session.sessionId,
        channel: session.channel,
        label: session.label,
        matchType: 'display-name'
      });
    }
  }
  
  // Handle results
  if (matches.length === 0) {
    return {
      sessionId: null,
      matches: null,
      ambiguous: false,
      error: `No sessions found matching: ${input}`
    };
  }
  
  if (matches.length === 1) {
    return {
      sessionId: matches[0].sessionId,
      matches: matches,
      ambiguous: false
    };
  }
  
  // Multiple matches - ambiguous
  return {
    sessionId: null,
    matches: matches,
    ambiguous: true,
    error: `Multiple sessions match "${input}". Please be more specific.`
  };
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
  
  // Load session registry for metadata enrichment
  const registry = loadSessionRegistry(sessionDir);
  
  return parseSession(sessionPath, registry);
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
 * Filter sessions by activity age
 * @param {Array} sessions - Array of session objects
 * @param {number} hours - Maximum age in hours
 * @returns {Array} Filtered sessions
 */
function filterByActivityAge(sessions, hours) {
  const cutoffMs = Date.now() - (hours * 60 * 60 * 1000);
  return sessions.filter(s => new Date(s.lastActivity).getTime() >= cutoffMs);
}

/**
 * Get sessions older than specified age
 * @param {Array} sessions - Array of session objects
 * @param {number} hours - Minimum age in hours
 * @returns {Array} Sessions older than threshold
 */
function getSessionsOlderThan(sessions, hours) {
  const cutoffMs = Date.now() - (hours * 60 * 60 * 1000);
  return sessions.filter(s => new Date(s.lastActivity).getTime() < cutoffMs);
}

/**
 * Archive sessions to archive directory
 * @param {Array} sessions - Array of session objects to archive
 * @param {string} sessionDir - Session directory path
 * @param {boolean} dryRun - If true, don't actually move files
 * @returns {Object} Archive results
 */
function archiveSessions(sessions, sessionDir = DEFAULT_SESSION_DIR, dryRun = false) {
  const archiveDir = path.join(sessionDir, 'archive', new Date().toISOString().split('T')[0]);
  
  const results = {
    archived: [],
    failed: [],
    dryRun
  };
  
  if (!dryRun) {
    // Create archive directory
    try {
      fs.mkdirSync(archiveDir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create archive directory: ${error.message}`);
      return results;
    }
  }
  
  for (const session of sessions) {
    const sourcePath = path.join(sessionDir, `${session.sessionId}.jsonl`);
    const targetPath = path.join(archiveDir, `${session.sessionId}.jsonl`);
    
    if (!fs.existsSync(sourcePath)) {
      results.failed.push({
        sessionId: session.sessionId,
        reason: 'File not found'
      });
      continue;
    }
    
    if (!dryRun) {
      try {
        // Move file to archive
        fs.renameSync(sourcePath, targetPath);
        
        // Update sessions.json registry
        updateSessionRegistry(sessionDir, session.sessionId, 'remove');
        
        results.archived.push({
          sessionId: session.sessionId,
          channel: session.channel,
          label: session.label,
          lastActivity: session.lastActivity,
          capacity: session.percentage,
          archivedTo: targetPath
        });
      } catch (error) {
        results.failed.push({
          sessionId: session.sessionId,
          reason: error.message
        });
      }
    } else {
      // Dry run - just record what would happen
      results.archived.push({
        sessionId: session.sessionId,
        channel: session.channel,
        label: session.label,
        lastActivity: session.lastActivity,
        capacity: session.percentage,
        wouldArchiveTo: targetPath
      });
    }
  }
  
  return results;
}

/**
 * Update sessions.json registry (remove or update entry)
 * @param {string} sessionDir - Session directory path
 * @param {string} sessionId - Session ID to update
 * @param {string} action - Action to perform ('remove')
 */
function updateSessionRegistry(sessionDir, sessionId, action) {
  const registryPath = path.join(sessionDir, 'sessions.json');
  
  try {
    if (!fs.existsSync(registryPath)) {
      return;
    }
    
    const content = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(content);
    
    if (action === 'remove') {
      // Find and remove entries with this sessionId
      for (const key in registry) {
        if (registry[key].sessionId === sessionId) {
          delete registry[key];
        }
      }
      
      // Write back
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    }
  } catch (error) {
    console.error(`Warning: Could not update sessions.json: ${error.message}`);
  }
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
 * Format channel and label for display
 * @param {string} channel - Channel name
 * @param {string|null} label - Optional label
 * @returns {string} Formatted channel/label string
 */
function formatChannelLabel(channel, label) {
  if (label) {
    return `${channel}/${label}`;
  }
  return channel;
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago", "3 days ago")
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/**
 * Parse time string to hours (e.g., "4d" -> 96, "2w" -> 336)
 * @param {string} timeStr - Time string (e.g., "4d", "2w", "1mo", "1y")
 * @returns {number} Hours
 */
function parseTimeString(timeStr) {
  const match = timeStr.match(/^(\d+)(m|h|d|w|mo|y)$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}. Use format like: 4d, 2w, 1mo, 1y`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const hoursPerUnit = {
    'm': 1/60,      // minutes
    'h': 1,         // hours
    'd': 24,        // days
    'w': 24 * 7,    // weeks
    'mo': 24 * 30,  // months (approximate)
    'y': 24 * 365   // years (approximate)
  };
  
  return value * hoursPerUnit[unit];
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
  lines.push('─'.repeat(95));
  lines.push('Session ID  Channel/Label     Capacity                    Tokens        Last Active');
  lines.push('─'.repeat(95));
  
  sorted.forEach(session => {
    const id = session.sessionId.substring(0, 10).padEnd(10);
    const channelLabel = formatChannelLabel(session.channel, session.label).substring(0, 16).padEnd(16);
    const emoji = getCapacityEmoji(session.percentage);
    const bar = getCapacityBar(session.percentage, 10);
    const pct = `${session.percentage.toFixed(1)}%`.padStart(6);
    const tokens = `${session.tokensUsed.toLocaleString()}/${session.tokensMax.toLocaleString()}`.padStart(13);
    const lastActive = formatRelativeTime(session.lastActivity).padStart(10);
    
    lines.push(`${id}  ${channelLabel}  ${emoji} ${bar} ${pct}  ${tokens}  ${lastActive}`);
  });
  
  lines.push('─'.repeat(95));
  
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
  loadSessionRegistry,
  parseSession,
  getAllSessions,
  getSession,
  resolveSessionId,
  filterByThreshold,
  filterByActivityAge,
  getSessionsOlderThan,
  sortByCapacity,
  formatTable,
  formatJSON,
  formatDashboard,
  formatChannelLabel,
  formatRelativeTime,
  parseTimeString,
  archiveSessions,
  updateSessionRegistry,
  getRecommendations,
  getCapacityEmoji,
  getCapacityBar,
  DEFAULT_SESSION_DIR
};
