---
name: tide-watch
description: Proactive session capacity monitoring and management for OpenClaw. Prevents context window lockups by warning at configurable thresholds (75%, 85%, 90%, 95%), automatically backing up sessions before resets, and managing session resumption prompts. Use when working on long-running projects, managing multiple conversation channels (Discord, Telegram, webchat), or preventing lost work from full context windows. Includes CLI tools for capacity checks, cross-session dashboards, archive management, and session resumption. Supports any model or provider.
author: Chris Giddings
homepage: https://github.com/chrisagiddings/openclaw-tide-watch
repository: https://github.com/chrisagiddings/openclaw-tide-watch
metadata:
  openclaw:
    emoji: "🌊"
    version: "1.0.2"
    disable-model-invocation: false
    capabilities:
      - session-monitoring
      - capacity-warnings
      - session-backup
      - session-restoration
      - file-operations-local
    requires:
      bins:
        - node
        - npm
      config:
        - "~/.openclaw/agents/main/sessions/"
    install:
      type: hybrid
      modes:
        - name: directives-only
          description: "AGENTS.md/HEARTBEAT.md directives for automatic monitoring"
          requires: []
          code-execution: false
          files-modified: 
            - "~/clawd/AGENTS.md"
            - "~/clawd/HEARTBEAT.md"
        - name: cli-tools
          description: "Optional Node.js CLI for manual capacity checks and management"
          requires: 
            - node
            - npm
          code-execution: true
          install-command: "npm link"
          files-installed:
            - "bin/tide-watch"
            - "lib/capacity.js"
            - "lib/resumption.js"
    credentials:
      required: false
      types: []
      notes: "No external credentials required. Operates on local OpenClaw session files only."
---

# Tide Watch 🌊

Proactive session capacity monitoring for OpenClaw.

## ⚠️ Security & Architecture Notice

**Tide Watch is a HYBRID SKILL with two operational modes:**

### Mode 1: Directives-Only (Recommended for Most Users)
**Description:** AGENTS.md and HEARTBEAT.md directives only  
**Code Execution:** **NONE** - Pure instructions, no executable code  
**File Access:** Reads OpenClaw session files via agent's built-in tools  
**Installation:** Copy template directives to workspace config files  
**Security:** Lowest risk - no code installation required

**What it does:**
- ✅ Monitors session capacity via `session_status` tool
- ✅ Warns at thresholds (75%, 85%, 90%, 95%)
- ✅ Auto-loads resumption prompts on session reset
- ✅ All operations through OpenClaw's native tools

### Mode 2: CLI Tools (Optional)
**Description:** Node.js command-line tools for manual management  
**Code Execution:** **YES** - Executable JavaScript code  
**File Access:** Direct read/write to `~/.openclaw/agents/main/sessions/`  
**Installation:** `git clone` + `npm link` (requires Node.js)  
**Security:** Moderate risk - requires code inspection before install

**What it does:**
- CLI commands: `tide-watch status`, `tide-watch dashboard`, etc.
- Manual capacity checks
- Session archive management
- Resumption prompt editing (⚠️ see CVE-2026-001 below)

### 🚨 CRITICAL SECURITY NOTICE: CVE-2026-001

**Vulnerability:** Shell injection in `editResumePrompt` function  
**Affected Version:** v1.0.0 ONLY  
**Current Version:** v1.0.1 (PATCHED)  
**Severity:** HIGH (CVSS 7.8)  
**Status:** ✅ FIXED

**Summary:** v1.0.0 contained a shell injection vulnerability in the CLI's `resume-prompt edit` command. An attacker who could control the `--session` parameter could execute arbitrary commands. **This has been fixed in v1.0.1** by replacing `execSync` with `spawnSync`.

**If you installed v1.0.0:** **Update immediately** to v1.0.1.

**Full disclosure:** See [SECURITY-ADVISORY-CVE-2026-001.md](./SECURITY-ADVISORY-CVE-2026-001.md)

### Security Best Practices

**For Directives-Only Mode (Safest):**
1. ✅ Copy AGENTS.md.template and HEARTBEAT.md.template to workspace
2. ✅ No code installation required
3. ✅ No npm dependencies
4. ✅ Lowest security surface

**For CLI Tools Mode (If Needed):**
1. ⚠️ **Verify version 1.0.1 or later** (`tide-watch --version`)
2. ⚠️ **Inspect code before installing:**
   - Review `lib/capacity.js` and `lib/resumption.js`
   - Check `package.json` for install hooks (should have none)
   - Run `npm test` to verify behavior (113 tests)
3. ⚠️ **Only use UUID session IDs** with `--session` flag
4. ⚠️ **Avoid untrusted input** to CLI commands
5. ⚠️ **Review backups location** (`~/.openclaw/agents/main/sessions/archive/`)

**Operation Types:**

**Read-Only Operations** (✅ Safe, no modifications):
- `tide-watch status` - Check current session count
- `tide-watch check --session <id>` - View specific session capacity
- `tide-watch dashboard` - Visual capacity overview
- `tide-watch report` - List sessions above threshold
- `tide-watch resume-prompt show --session <id>` - View resumption prompt

**Modifying Operations** (⚠️ Moves/creates files):
- `tide-watch archive --older-than <time>` - Moves sessions to archive/
- `tide-watch resume-prompt edit --session <id>` - Opens editor (CVE patched in v1.0.1)
- `tide-watch resume-prompt delete --session <id>` - Deletes resumption prompt file

**File System Access:**
- Reads: `~/.openclaw/agents/main/sessions/*.jsonl` (session data)
- Writes: `~/.openclaw/agents/main/sessions/resume-prompts/*.md` (resumption prompts)
- Moves: `~/.openclaw/agents/main/sessions/archive/` (archived sessions)

**Network Activity:** **NONE** - All operations are local filesystem only.

### Recommendation

**Most users should use Directives-Only Mode.** This provides automatic capacity monitoring without installing any code. Only install CLI tools if you specifically need manual capacity management features.

## What It Does

Monitors your OpenClaw session context windows and warns you before they overflow:
- 🟡 **75%** — Heads up, consider wrapping up soon
- 🟠 **85%** — Recommend finishing current task and resetting
- 🔴 **90%** — Session will lock soon, ready to reset
- 🚨 **95%** — Critical! Save to memory NOW

## Installation

### Step 1: Add Monitoring Directive to AGENTS.md

Copy the directive template from `AGENTS.md.template` and add it to your workspace `AGENTS.md` file:

```bash
# From your workspace root (~/clawd or similar)
cat skills/tide-watch/AGENTS.md.template >> AGENTS.md
```

Or manually add the monitoring section from the template.

This tells me (your agent) what to look for and when to warn you.

### Step 2: Add Heartbeat Task to HEARTBEAT.md

Copy the heartbeat template from `HEARTBEAT.md.template` and add it to your workspace `HEARTBEAT.md` file:

```bash
# From your workspace root (~/clawd or similar)
cat skills/tide-watch/HEARTBEAT.md.template >> HEARTBEAT.md
```

Or manually add the Tide Watch heartbeat section from the template.

This tells me to check capacity automatically on a schedule.

### Step 3: Configure Settings (Optional)

Default settings work for most users, but you can customize in your `AGENTS.md`:

**Warning thresholds** (when to warn):
- Adjust percentages (default: 75/85/90/95)
- Range: 50-99%, ascending order, 2-6 thresholds

**Check frequency** (how often to monitor):
- Adjust interval (default: Every 1 hour)
- Options: 15min, 30min, 1hr, 2hr, or 'manual'
- Range: 5 minutes to 6 hours

**Auto-backup**:
- Enable/disable automatic backups (default: enabled)
- Set which thresholds trigger backups (default: [90, 95])
- Configure retention (default: 7 days)
- Enable compression to save disk space (default: off)

**Channel-specific overrides** (advanced):
- Different settings per channel (Discord vs. webchat vs. DM)

## Usage

Once installed, I will:

1. **Check capacity hourly** during active conversations
2. **Warn at thresholds** (75%, 85%, 90%, 95%)
3. **Suggest actions**:
   - Save important context to memory
   - Switch to lower-usage channels
   - Provide session reset commands
   - Generate session resumption prompts

### Manual Check

Ask me to check session status anytime:
```
What's my current session capacity?
Check context usage
Run session_status
```

### Reset Session with Context Preservation

When warned about high capacity:
```
Help me reset this session and preserve context
```

I'll:
1. Save current work to memory
2. Backup the session file (if not already backed up)
3. Provide a session resumption prompt
4. Reset the session

### Restore from Backup

If you need to restore a previous session state:

```
Show me available backups for this session
Restore session from 90% backup
```

I'll:
1. List available backups with timestamps and sizes
2. Restore the selected backup
3. Guide you through reconnecting to load the restored session

**Backup locations:**
- Path: `~/.openclaw/agents/main/sessions/backups/`
- Format: `<session-id>-<threshold>-<timestamp>.jsonl[.gz]`
- Retention: Configurable (default: 7 days)

## How It Works

### Automatic Monitoring (Heartbeat)

When you add Tide Watch to your `HEARTBEAT.md`, I automatically:

1. **Parse your configuration** (from AGENTS.md)
   - Check frequency: How often to monitor
   - Warning thresholds: When to warn you
   - Backup settings: When to backup, retention, compression
   - See [PARSING.md](PARSING.md) for detailed parsing logic

2. **Check capacity on schedule** (default: every hour)
   - Run `session_status` to get token usage
   - Calculate percentage: `(tokens_used / tokens_max) * 100`

3. **Compare against your thresholds**
   - Use your configured thresholds (not hardcoded defaults)
   - Determine which threshold(s) have been crossed
   - Assign severity dynamically based on position (first=🟡, last=🚨)

3. **Warn you (once per threshold)**
   - Issue warning message for new threshold crossings
   - Track which thresholds already warned this session
   - Don't repeat warnings if capacity stays at same level

4. **Auto-backup (if enabled and triggered)**
   - Check if capacity crossed any backup trigger thresholds
   - Create backup: `~/.openclaw/agents/main/sessions/backups/<session-id>-<threshold>-<timestamp>.jsonl`
   - Verify backup integrity
   - Log backup completion
   - Track which thresholds backed up (don't duplicate)

5. **Suggest actions**
   - Save context to memory
   - Switch to lower-usage channel
   - Provide session reset commands
   - Generate session resumption prompts

6. **Cleanup old backups**
   - Remove backups older than retention period (default: 7 days)

7. **Return to silent mode**
   - If capacity is below all thresholds, return `HEARTBEAT_OK`
   - No output, no interruption

### Manual Checks

You can also ask me to check anytime:
```
What's my current session capacity?
Check context usage
Run session_status
```

### Key Features

- **Model-agnostic**: Works with any provider (Anthropic, OpenAI, DeepSeek, etc.)
- **Non-intrusive**: Silent checks, only speaks up at thresholds
- **Configurable**: Adjust thresholds, frequency, and actions to your workflow
- **Stateful**: Tracks which thresholds warned, resets tracking when session resets

## Why You Need This

**Problem**: Context windows fill up silently. Once at 100%, sessions lock and stop responding. You lose work mid-task.

**Solution**: Proactive monitoring catches capacity issues early, giving you time to save work, switch channels, or reset cleanly.

**Real incident**: Discord #navi-code-yatta hit 97% capacity and locked mid-task (2026-02-23). Had to manually reset, losing conversation context.

## Configuration Examples

### Conservative (early warnings)
```markdown
Warning thresholds: 60%, 70%, 80%, 90%
Check frequency: Every 30 minutes
```

### Aggressive (maximize usage)
```markdown
Warning thresholds: 85%, 92%, 96%, 98%
Check frequency: Every 2 hours
```

### Channel-specific
```markdown
Discord channels: 75%, 85%, 90%, 95% (default)
Webchat: 85%, 95% (lighter warnings)
DM: 90%, 95% (minimal warnings)
```

## Future Features

- [ ] CLI tool for capacity reports
- [ ] Automatic session backups at thresholds
- [ ] Historical capacity tracking
- [ ] Cross-session capacity reports
- [ ] Integration with heartbeat monitoring
- [ ] Email/notification warnings
- [ ] Smart session rotation suggestions

## Requirements

- OpenClaw with `session_status` tool support
- Workspace with `AGENTS.md` file
- Active monitoring directive in agent instructions

## Support

- **Repo**: https://github.com/chrisagiddings/openclaw-tide-watch
- **Issues**: https://github.com/chrisagiddings/openclaw-tide-watch/issues
- **ClawHub**: https://clawhub.ai/chrisagiddings/tide-watch

## License

MIT
