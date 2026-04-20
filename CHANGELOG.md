# Changelog

All notable changes to DroidKit will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.2.1] - 2026-04-20
### Fixed
- Flavor detection: balanced brace extractor — tidak salah parse nested `{}` di build.gradle
- Flavor dimensions: generate cartesian product kombinasi antar dimensi
- Kotlin DSL: support `create("flavorName")` dan `dimension = "env"` syntax
- Multi-dimension task name: `installDevFreeDebug`, `installProdPaidDebug`, dst

## [0.2.0] - 2026-04-20
### Fixed
- Hapus badge shields.io yang deprecated dari README

## [0.1.0] - 2026-04-20

### Added
- AVD Manager sidebar with live running/stopped status
- Launch, stop, create, delete, and wipe AVD
- Build Debug / Build Release / Clean via Gradle
- Run on Device (installDebug + ADB launch)
- Logcat output channel with PID filtering
- ADB: List Devices, Shell, Screenshot, Reboot, Wireless Connect
- Status bar buttons: Build, Run, AVD, Logcat
- Auto-detect Android SDK path (ANDROID_HOME, macOS default, Linux default)
- Auto-detect JDK 17+ for avdmanager
- Settings: `androidTools.sdkPath`, `appPackage`, `mainActivity`, `javaHome`
