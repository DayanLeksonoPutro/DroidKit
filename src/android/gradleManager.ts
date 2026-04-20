import * as path from 'path';
import * as vscode from 'vscode';
import { resolveMainActivity, resolvePackageName } from '../utils/projectDetector';
import { getSdkPaths } from '../utils/androidSdk';

function getWorkspaceRoot(): string | null {
  return vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? null;
}

function gradlewPath(root: string): string {
  return path.join(root, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
}

function runGradle(taskLabel: string, gradleArgs: string, reuseTerminal = false): void {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Tidak ada workspace yang terbuka.');
    return;
  }

  const cmd = `"${gradlewPath(root)}" ${gradleArgs}`;
  let terminal = reuseTerminal
    ? vscode.window.terminals.find(t => t.name === taskLabel)
    : undefined;

  if (!terminal) {
    terminal = vscode.window.createTerminal({ name: taskLabel, cwd: root });
  }
  terminal.sendText(cmd);
  terminal.show();
}

export function buildDebug(): void {
  runGradle('Gradle: Build Debug', 'assembleDebug', true);
}

export function buildRelease(): void {
  runGradle('Gradle: Build Release', 'assembleRelease', true);
}

export function cleanProject(): void {
  runGradle('Gradle: Clean', 'clean', true);
}

export async function runOnDevice(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Tidak ada workspace yang terbuka.');
    return;
  }

  // Auto-detect package name dari build.gradle / manifest
  const pkg = await resolvePackageName();
  if (!pkg) return;

  // Auto-detect main activity dari manifest
  const activityShort = await resolveMainActivity(pkg);
  const fullActivity = activityShort.startsWith('.')
    ? `${pkg}${activityShort}`
    : activityShort;

  const { adb } = getSdkPaths();
  const terminal = vscode.window.createTerminal({ name: 'Gradle: Run', cwd: root });
  terminal.sendText(
    `"${gradlewPath(root)}" installDebug && "${adb}" shell am start -n "${pkg}/${fullActivity}"`
  );
  terminal.show();
}

export async function uninstallFromDevice(): Promise<void> {
  const pkg = await resolvePackageName();
  if (!pkg) return;

  const { adb } = getSdkPaths();
  const terminal = vscode.window.createTerminal({ name: 'ADB: Uninstall' });
  terminal.sendText(`"${adb}" uninstall "${pkg}"`);
  terminal.show();
}
