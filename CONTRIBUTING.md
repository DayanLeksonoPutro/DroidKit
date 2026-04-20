# Contributing to DroidKit

Thank you for considering contributing! DroidKit is intentionally small — the goal is to keep it readable and focused.

## Ground rules

- Every feature must wrap a real Android CLI tool (`adb`, `emulator`, `avdmanager`, `gradlew`). No reimplementing what the SDK already does.
- No runtime npm dependencies. Only `@types/vscode` and TypeScript as dev dependencies.
- Keep each module focused: `avdManager` only knows about AVDs, `adbManager` only knows about ADB, etc.

## Getting started

```bash
git clone https://github.com/DayanLeksonoPutro/DroidKit.git
cd DroidKit
npm install
```

Open in VS Code and press `F5` to launch the Extension Development Host.

## Adding a feature

1. Identify which CLI command you're wrapping
2. Add the logic to the appropriate module (`src/android/` or `src/avd/`)
3. Register the command in `src/extension.ts`
4. Add the command to `package.json` under `contributes.commands` (and `menus` if needed)
5. Update `README.md` feature table
6. Add an entry to `CHANGELOG.md` under `[Unreleased]`

## Submitting a PR

- Branch name: `feature/your-feature` or `fix/your-fix`
- PR title: short imperative ("Add device file explorer", "Fix logcat crash on Windows")
- Describe what CLI command you're wrapping and why it belongs in DroidKit

## Reporting bugs

Use the [GitHub issue tracker](https://github.com/DayanLeksonoPutro/DroidKit/issues). Include:
- macOS / Linux / Windows
- Android SDK version
- What you did, what you expected, what happened
