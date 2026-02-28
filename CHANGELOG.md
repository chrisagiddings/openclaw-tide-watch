# Changelog

All notable changes to Tide Watch will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-02-28

### Fixed
- Live dashboard refresh UX - eliminated screen flashing (Fixes #25)
  - Replaced console.clear() with ANSI cursor positioning
  - Smooth in-place updates without visible flicker
  - 0.5-2.5 second gap eliminated

### Added
- Real-time change tracking and visual highlighting in live dashboard (Refs #25)
  - Color-coded trend indicators: 🔴 Red ↑ (increasing), 🟢 Green ↓ (decreasing), 🟡 Yellow (new)
  - Shows capacity delta percentage (+X.X% / -X.X%)
  - Track session state between refreshes
  - New Trend column in dashboard output
  - Makes live monitoring actually useful for tracking progress

### Changed
- Dashboard watch mode now professional-grade terminal UI
- ANSI escape sequences for smooth rendering
- Differential updates show only what changed

## [1.1.1] - 2026-02-28

### Fixed
- Metadata/documentation inconsistency flagged by ClawHub security scan (Fixes #24)
  - Removed `node` and `npm` from mandatory `requires.bins`
  - Added `anyBins: ["node"]` for optional CLI detection
  - Updated install spec label to clarify Node.js requirement
  - Added mode comparison table to SKILL.md
  - Clarified Directives-Only mode uses built-in tools (no CLI)
- Added deprecation notice to outdated SECURITY-ANALYSIS.md

### Changed
- Node.js is now truly optional (Directives-Only mode requires nothing)
- Documentation accurately reflects hybrid skill architecture
- Expected ClawHub scan result: BENIGN (high confidence)

## [1.1.0] - 2026-02-28

### Added
- Model display in session listings (Fixes #22)
  - Table format now shows model name for each session
  - Dashboard format includes model column (25 char width)
  - Helps track which sessions are using paid vs. free models
- Gateway status indicator (Fixes #23)
  - Dashboard now shows OpenClaw gateway online/offline status
  - Visual indicator: 🟢 Online / 🔴 Offline
  - Helps diagnose connection issues faster

### Changed
- Dashboard width increased from 95 to 120 characters to accommodate model column
- Table header updated to include Model column

## [1.0.7] - 2026-02-25

### Fixed
- Added `.js` extension to bin/tide-watch.js for ClawHub compatibility
- Added postinstall script to set executable permissions
- Achieved Benign/Benign security rating on ClawHub

## [1.0.0 - 1.0.6] - 2026-02-23 to 2026-02-25

### Added
- Initial release
- Session capacity monitoring
- Resumption prompt management
- Session archiving
- Dashboard and report views
