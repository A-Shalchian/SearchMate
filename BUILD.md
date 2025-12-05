# SearchMate - Build & Versioning Guide

## Current Version
Check `package.json` → `"version"` field (currently `1.0.0`)

---

## Versioning (Semantic Versioning)

Format: `MAJOR.MINOR.PATCH`

| Type | When to use | Example |
|------|-------------|---------|
| **PATCH** | Bug fixes, small tweaks | `1.0.0` → `1.0.1` |
| **MINOR** | New features, backwards compatible | `1.0.1` → `1.1.0` |
| **MAJOR** | Breaking changes, major rewrites | `1.1.0` → `2.0.0` |

### Bump Version Commands
```bash
npm run version:patch    # 1.0.0 → 1.0.1
npm run version:minor    # 1.0.0 → 1.1.0
npm run version:major    # 1.0.0 → 2.0.0
```

These commands automatically:
1. Update `package.json` version
2. Create a git commit with the version
3. Create a git tag (e.g., `v1.0.1`)

---

## Building for Windows

### Prerequisites
```bash
npm install
```

### Build Commands

| Command | Output | Use Case |
|---------|--------|----------|
| `npm run build` | Both installer + portable | Full release |
| `npm run build:installer` | `.exe` installer | Users who want to install |
| `npm run build:portable` | Single `.exe` file | No install needed, run anywhere |

## Running Without VS Code

### Option 1: Portable Build (Recommended)
1. Run `npm run build:portable`
2. Copy `dist/SearchMate-X.X.X-portable.exe` anywhere
3. Double-click to run - no install needed

### Option 2: Installer
1. Run `npm run build:installer`
2. Run `dist/SearchMate Setup X.X.X.exe`
3. Install to your preferred location
4. Launch from Start Menu or Desktop shortcut

### Option 3: Auto-start with Windows
After installing, add to startup:
1. Press `Win + R`, type `shell:startup`
2. Create shortcut to SearchMate in that folder

---

## Icon Requirements
- Location: `src/icon.png`
- Minimum size: 256x256 (for best quality)
- Format: PNG with transparency
- Used for: Tray icon, window icon, installer icon
