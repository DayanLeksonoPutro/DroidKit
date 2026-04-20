# DroidKit — Android Development Toolkit for VS Code

[![Version](https://img.shields.io/visual-studio-marketplace/v/dayanleksonoputro.droidkit?color=blue)](https://marketplace.visualstudio.com/items?itemName=dayanleksonoputro.droidkit)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/dayanleksonoputro.droidkit)](https://marketplace.visualstudio.com/items?itemName=dayanleksonoputro.droidkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> Build, run, and manage Android emulators without ever opening Android Studio.

---

## Why DroidKit?

Android Studio is a powerful IDE — but it's also **heavy**. On machines with limited RAM, it competes with VS Code, the browser, and everything else you have open. For developers who already live in VS Code, opening Android Studio just to launch an emulator or check logcat is wasteful.

**DroidKit** was built on a simple belief: *you should be able to do 90% of your Android development workflow without leaving VS Code.*

The Android SDK already ships with excellent CLI tools — `emulator`, `avdmanager`, `adb`, `gradlew`. DroidKit is a thin, focused GUI wrapper around those tools. It doesn't reinvent anything; it just puts buttons on top of commands you'd otherwise type manually.

### Philosophy

- **Lightweight first.** DroidKit has zero runtime dependencies beyond the VS Code API and Node.js built-ins. No Electron overhead, no background services.
- **CLI is the source of truth.** Every action DroidKit performs is a transparent CLI call. You can always see what's happening in the integrated terminal.
- **Don't replace what works.** Gradle, ADB, and the emulator are mature tools. DroidKit surfaces them — not replaces them.
- **Open and simple.** The codebase is small enough to read in an afternoon. Contributions welcome.

---

## Features

### AVD Manager
Manage Android Virtual Devices directly from the VS Code sidebar.

- **List all AVDs** with live running/stopped status (auto-refreshes every 5 seconds)
- **Launch emulator** with one click
- **Stop running emulator** without hunting for the terminal
- **Create new AVD** via guided quick-pick (picks system image → set name)
- **Wipe AVD data** (fresh start without deleting the AVD)
- **Delete AVD** with confirmation dialog

### Build (Gradle)
Status bar buttons for the most common Gradle tasks.

| Button | Command | Gradle task |
|--------|---------|-------------|
| `$(tools) Build` | Build Debug | `./gradlew assembleDebug` |
| Build Release | — | `./gradlew assembleRelease` |
| Clean | — | `./gradlew clean` |

### Run on Device
`$(play) Run` — installs the debug APK and launches the app on the connected device/emulator in one step.

### Logcat
`$(list-unordered) Logcat` — streams logcat output to a dedicated VS Code Output Channel. Automatically filters by your app's PID if `androidTools.appPackage` is set.

- Start / stop logcat from the status bar
- Clear logcat buffer (both VS Code panel and device)
- Status bar button turns green while logcat is running

### ADB Commands
Quick access to common ADB operations via Command Palette (`Cmd+Shift+P` → type `ADB`):

| Command | Description |
|---------|-------------|
| `ADB: List Devices` | Show all connected devices/emulators |
| `ADB: Open Shell` | Open interactive ADB shell in terminal |
| `ADB: Screenshot` | Capture and open screenshot directly in VS Code |
| `ADB: Reboot Device` | Reboot selected device |
| `ADB: Connect Wireless` | Connect to device over Wi-Fi (enter IP address) |

---

## Requirements

- **VS Code** 1.85+
- **Android SDK** with `emulator` and `platform-tools` installed
- **JDK 17+** — required by `avdmanager` for AVD creation/deletion (not needed for launching or ADB)

---

## Setup

### 1. Install DroidKit
Search `DroidKit` in the VS Code Extensions panel, or install via CLI:
```bash
code --install-extension dayanleksonoputro.droidkit
```

### 2. Configure your Android SDK path (if not auto-detected)
DroidKit auto-detects the SDK from:
- `ANDROID_HOME` environment variable
- `ANDROID_SDK_ROOT` environment variable
- `~/Library/Android/sdk` (macOS default)
- `~/Android/sdk` (Linux default)

If your SDK is elsewhere, add this to your VS Code `settings.json`:
```json
{
  "androidTools.sdkPath": "/path/to/your/android/sdk"
}
```

### 3. Set your app package name (for Run & Logcat filter)
```json
{
  "androidTools.appPackage": "com.example.yourapp",
  "androidTools.mainActivity": ".MainActivity"
}
```

### 4. (Optional) Set JDK 17+ path for AVD management
```json
{
  "androidTools.javaHome": "/path/to/jdk17"
}
```

On macOS, you can find your JDK path with:
```bash
/usr/libexec/java_home -v 17
```

---

## Usage

### Status Bar
After opening an Android project (any folder containing `gradlew`), four buttons appear in the VS Code status bar:

```
[ $(tools) Build ]  [ $(play) Run ]  [ $(device-mobile) AVD ]  [ $(list-unordered) Logcat ]
```

### AVD Manager Sidebar
Click the Android icon in the Activity Bar (left sidebar) to open the AVD Manager panel. Right-click any AVD for context menu options.

### Command Palette
All commands are available via `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux). Search for:
- `Android: Build Debug`
- `Android: Run on Device`
- `Android: Start Logcat`
- `ADB: Screenshot`
- etc.

---

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `androidTools.sdkPath` | `""` | Path to Android SDK root (auto-detected if empty) |
| `androidTools.appPackage` | `""` | App package name (e.g. `com.example.app`) |
| `androidTools.mainActivity` | `".MainActivity"` | Main activity class name |
| `androidTools.javaHome` | `""` | Path to JDK 17+ home directory |

---

## Roadmap

- [ ] Layout Inspector (basic view hierarchy)
- [ ] APK size analyzer (wraps `apkanalyzer`)
- [ ] Build variant selector (debug / release / custom flavors)
- [ ] Device file explorer via ADB
- [ ] Run tests (`./gradlew test`, `connectedAndroidTest`)
- [ ] Multi-device deploy

---

## Contributing

DroidKit is intentionally small and readable. If you want to add a feature:

1. Fork this repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Submit a PR — describe what CLI command you're wrapping and why it belongs here

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

---

*Built by [Dayan Leksono Putro](https://github.com/dayanleksonoputro) — because Android Studio shouldn't be a requirement for Android development.*
