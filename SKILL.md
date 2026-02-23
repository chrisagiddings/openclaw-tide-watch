---
name: tide-watch
description: Proactive session capacity monitoring for OpenClaw. Get warned at 75%, 85%, 90%, and 95% capacity thresholds before context windows overflow. Supports session health checks, auto-backup before resets, and capacity reporting across all active sessions. Works with any model or provider.
homepage: https://github.com/chrisagiddings/openclaw-tide-watch
metadata:
  openclaw:
    emoji: "🌊"
    version: "1.0.0"
---

# Tide Watch 🌊

Proactive session capacity monitoring for OpenClaw.

## What It Does

Monitors your OpenClaw session context windows and warns you before they overflow:
- 🟡 **75%** — Heads up, consider wrapping up soon
- 🟠 **85%** — Recommend finishing current task and resetting
- 🔴 **90%** — Session will lock soon, ready to reset
- 🚨 **95%** — Critical! Save to memory NOW

## Installation

### Add Monitoring Directive

Copy the directive template from `AGENTS.md.template` and add it to your workspace `AGENTS.md` file:

```bash
# From your workspace root (~/clawd or similar)
cat skills/tide-watch/AGENTS.md.template >> AGENTS.md
```

Or manually add the monitoring section from the template.

### Configure Thresholds (Optional)

Default thresholds work for most users, but you can customize them in your `AGENTS.md`:

- Adjust warning percentages (75/85/90/95)
- Change check frequency (default: hourly)
- Customize warning messages
- Add channel-specific overrides

## Usage

Once installed, I will:

1. **Check capacity hourly** during active conversations
2. **Warn at thresholds** (75%, 85%, 90%, 95%)
3. **Suggest actions**:
   - Save important context to memory
   - Switch to lower-usage channels
   - Provide session reset commands
   - Generate context restoration prompts

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
2. Backup the session file
3. Provide a context restoration prompt
4. Reset the session

## How It Works

- **Monitoring**: Uses `session_status` tool to check token usage
- **Thresholds**: Configurable percentage-based warnings
- **Actions**: Suggests memory saves, channel switches, or resets
- **Model-agnostic**: Works with any provider (Anthropic, OpenAI, etc.)
- **Non-intrusive**: Silent checks, only speaks up at thresholds

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
