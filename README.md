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

## ⚙️ Configuration

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

**3. Auto-Backup Triggers** (future feature):
```markdown
**Auto-backup:**
- Enabled: true
- Trigger at thresholds: [90, 95]  # Subset of warning thresholds
```
- **Conservative:** `[75, 85, 90, 95]` (backup at every warning)
- **Moderate:** `[90, 95]` (default, key thresholds)
- **Aggressive:** `[95]` (last-chance only)

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
- ✅ Hourly capacity monitoring
- ✅ Four-tier warning system (75/85/90/95%)
- ✅ Memory save suggestions
- ✅ Session reset assistance
- ✅ Context restoration prompts
- ✅ Model/provider agnostic

### Planned
- [ ] CLI tool for capacity reports
- [ ] Automatic session backups at thresholds
- [ ] Historical capacity tracking
- [ ] Cross-session capacity dashboard
- [ ] Heartbeat integration
- [ ] Email/Discord notifications
- [ ] Smart session rotation

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
