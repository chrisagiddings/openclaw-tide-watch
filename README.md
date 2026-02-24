# Tide Watch 🌊

**Proactive session capacity monitoring for OpenClaw.**

> ⚠️ **Pre-release:** This skill is undergoing security scanning and testing. Not yet published to ClawHub. Track progress in [issue #10](https://github.com/chrisagiddings/openclaw-tide-watch/issues/10).

Never lose work to a full context window again. Tide Watch monitors your OpenClaw sessions and warns you before capacity limits lock you out.

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-blue)](https://openclaw.ai)
[![ClawHub](https://img.shields.io/badge/ClawHub-tide--watch-orange)](https://clawhub.ai/chrisagiddings/tide-watch)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 🎯 What It Does

Get warned **before** your session context fills up:

- 🟡 **75%** — "Heads up, consider wrapping up soon"
- 🟠 **85%** — "Recommend finishing and resetting"
- 🔴 **90%** — "Session will lock soon!"
- 🚨 **95%** — "CRITICAL: Save to memory NOW"

## 📦 Installation

### Via ClawHub (Recommended)

```bash
clawhub install tide-watch
```

### Manual Installation

1. Clone this repo into your OpenClaw skills folder:
```bash
cd ~/clawd/skills  # or your skills directory
git clone https://github.com/chrisagiddings/openclaw-tide-watch tide-watch
```

2. Add the monitoring directive to your `AGENTS.md`:
```bash
cat tide-watch/AGENTS.md.template >> ../AGENTS.md
```

3. Add the heartbeat task to your `HEARTBEAT.md`:
```bash
cat tide-watch/HEARTBEAT.md.template >> ../HEARTBEAT.md
```

## 🚀 Quick Start

Once installed, Tide Watch automatically:
1. **Monitors** your session capacity hourly
2. **Warns** you at threshold percentages
3. **Suggests** actions (save to memory, switch channels, reset)

### Manual Capacity Check

Ask your agent anytime:
```
What's my current session capacity?
Check context usage
```

### CLI Tool

Tide Watch includes a command-line tool for checking session capacity directly:

**Quick Status:**
```bash
tide-watch status
```

**Check Specific Session:**
```bash
tide-watch check --session <session-id>
```

**List All Sessions:**
```bash
tide-watch report --all              # All sessions
tide-watch report                     # Above 75% (default threshold)
tide-watch report --threshold 90      # Above 90%
tide-watch report --json --pretty     # JSON output
```

**Example Output:**
```
Tide Watch Report 🌊

Session   Channel       Cap %              Tokens  Status
---------------------------------------------------------
2b1bf1ef  discord       87.9%       175,755/200,000  🟠 ELEVATED    
a595325f  webchat       81.4%       162,702/200,000  🟡 WARNING     
6eff94ac  telegram      80.1%       160,230/200,000  🟡 WARNING     

Total: 3 session(s) above 75%
```

**Installation:**
```bash
cd ~/clawd/skills/tide-watch  # or wherever you cloned it
npm link                       # Creates global tide-watch command
```

### Reset with Context Preservation

When warned about high capacity:
```
Help me reset this session and preserve context
```

Your agent will:
1. Save current work to memory
2. Backup the session file
3. Provide a context restoration prompt
4. Reset the session

## 💾 Automatic Backups

Tide Watch automatically backs up your session when capacity crosses configured thresholds.

### How Backups Work

1. **Triggered by thresholds:** When capacity crosses a backup trigger (default: 90%, 95%)
2. **One backup per threshold:** Won't duplicate backups at the same level
3. **Stored safely:** `~/.openclaw/agents/main/sessions/backups/`
4. **Named clearly:** `<session-id>-<threshold>-<timestamp>.jsonl`
5. **Auto-cleanup:** Old backups removed after retention period (default: 7 days)

### Example Timeline

```
Session starts at 10%
→ [75% reached] 🟡 Warning issued, no backup yet
→ [85% reached] 🟠 Warning issued, no backup yet
→ [90% reached] 🔴 Warning + backup created: 6eff94ac-90-20260223-170500.jsonl
→ [95% reached] 🚨 Critical + backup created: 6eff94ac-95-20260223-171200.jsonl
```

### Restore from Backup

If your session becomes corrupted or you need to revert:

```
Show me available backups for this session
Restore session from 90% backup
```

Your agent will:
1. List all available backups with timestamps and sizes
2. Restore the selected backup
3. Guide you through reloading the session

### Why This Matters

**Scenario:** Your session hits 97% and locks mid-task.

**Without backups:** You lose all context, must manually recreate conversation state.

**With backups:** Restore from 90% or 95% backup, losing only the last few messages instead of the entire conversation.

## ⚙️ Configuration

Tide Watch **parses your configuration dynamically** from `AGENTS.md`. Changes take effect on the next check—no need to restart OpenClaw!

Default settings work for most users. To customize, edit the Tide Watch section in your `AGENTS.md`:

### Customize Configuration

Edit the Tide Watch section in your `AGENTS.md`:

**1. Warning Thresholds** (when to warn):
```markdown
**Warning thresholds:**
- **60%**: 🟡 Early warning
- **80%**: 🟠 Action recommended
- **95%**: 🚨 Critical
```

**2. Check Frequency** (how often to monitor):
```markdown
**Monitoring schedule:**
- Check frequency: Every 30 minutes  # 15min, 30min, 1hr, 2hr, or 'manual'
```
- **Aggressive:** 15 minutes (tight feedback loop)
- **Moderate:** 1 hour (default, balanced)
- **Relaxed:** 2 hours (minimal overhead)
- **Manual:** Disable heartbeat, check only when asked

**3. Auto-Backup Triggers**:
```markdown
**Auto-backup:**
- Enabled: true  # Enable automatic session backups
- Trigger at thresholds: [90, 95]  # Subset of warning thresholds
- Retention: 7 days  # Auto-delete backups older than this
- Compress: false  # Set true to save disk space
```
- **Conservative:** `[75, 85, 90, 95]` (backup at every warning)
- **Moderate:** `[90, 95]` (default, key thresholds)
- **Aggressive:** `[95]` (last-chance only)
- **Disabled:** `Enabled: false` (no automatic backups, manual backup only)

**Backup locations:**
- Path: `~/.openclaw/agents/main/sessions/backups/`
- Format: `<session-id>-<threshold>-<timestamp>.jsonl`
- Example: `6eff94ac-90-20260223-170500.jsonl`

### Channel-Specific Settings

Override settings per channel (advanced):
```markdown
**Discord channels:**
- Thresholds: 75%, 85%, 90%, 95%
- Frequency: Every 1 hour

**Webchat:**
- Thresholds: 85%, 95% (lighter warnings)
- Frequency: Every 2 hours
```

### How Configuration Parsing Works

Tide Watch dynamically reads your `AGENTS.md` configuration every time it checks capacity:

- ✅ **Changes take effect immediately** (no restart needed)
- ✅ **Validation with fallbacks** (invalid config = use defaults)
- ✅ **Dynamic severity assignment** (first threshold = 🟡, last = 🚨)
- ✅ **Flexible formats** (accommodates different threshold counts)

**Detailed parsing documentation:** See [PARSING.md](PARSING.md) for validation rules, fallback behavior, and troubleshooting.

## 🎭 Real-World Example

**Problem** (2026-02-23):
- Discord #navi-code-yatta hit 97% capacity
- Session locked mid-task
- Lost conversation context
- Manual reset required

**With Tide Watch**:
- 🟡 Warning at 75% (150k tokens) — "Consider wrapping up"
- 🟠 Warning at 85% (170k tokens) — "Finish task and reset"
- 🔴 Warning at 90% (180k tokens) — "Ready to help you reset"
- Context saved to memory before reset
- Clean restoration prompt generated

## 🔧 How It Works

### Automatic Monitoring (Heartbeat Mode)

Once configured in `HEARTBEAT.md`, Tide Watch runs automatically:

1. **Schedule**: Checks capacity at configured interval (default: hourly)
2. **Check**: Uses OpenClaw's `session_status` tool to read token usage
3. **Calculate**: Determines percentage: `(tokens_used / tokens_max) * 100`
4. **Compare**: Checks against your configured thresholds
5. **Warn**: Issues warning if threshold crossed (once per threshold)
6. **Suggest**: Provides actions (save to memory, switch channels, reset)
7. **Silent**: Returns `HEARTBEAT_OK` when nothing needs attention

### Manual Mode

Disable heartbeat and check only when explicitly asked:
```
What's my current session capacity?
Check context usage
```

### Features

- **Percentage-based**: Works with any context size (200k, 1M, etc.)
- **Model-agnostic**: Anthropic, OpenAI, DeepSeek, or any provider
- **Stateful**: Tracks which thresholds warned, resets when session resets
- **Non-intrusive**: Silent monitoring, only speaks up at thresholds

## 🌟 Features

### Current
- ✅ Hourly capacity monitoring (configurable frequency)
- ✅ Four-tier warning system (customizable thresholds)
- ✅ **CLI tool** for manual capacity checks (`tide-watch` command)
- ✅ **Automatic session backups** at configured thresholds
- ✅ **Backup restoration** from any saved checkpoint
- ✅ **Retention management** (auto-cleanup old backups)
- ✅ Memory save suggestions
- ✅ Session reset assistance
- ✅ Context restoration prompts
- ✅ Model/provider agnostic
- ✅ Heartbeat integration

### Planned
- [ ] Historical capacity tracking
- [ ] Cross-session capacity dashboard
- [ ] Email/Discord notifications
- [ ] Smart session rotation
- [ ] Compression for backups (space-saving)

## 📊 Who Benefits

- **Multi-channel users** (Discord, Telegram, Slack, webchat)
- **Project-focused work** (long conversations with code/docs)
- **Team deployments** (shared OpenClaw instances)
- **Anyone** who's lost work to a full context window

## 🤝 Contributing

Issues and PRs welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- **GitHub**: https://github.com/chrisagiddings/openclaw-tide-watch
- **ClawHub**: https://clawhub.ai/chrisagiddings/tide-watch
- **OpenClaw Docs**: https://docs.openclaw.ai
- **Issues**: https://github.com/chrisagiddings/openclaw-tide-watch/issues

## 💡 Inspiration

Created after a real incident where a Discord channel session hit 97% capacity and locked mid-task, resulting in lost context and manual intervention. Tide Watch ensures this never happens again.

---

**Made with 🌊 for the OpenClaw community**
