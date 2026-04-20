import * as path from 'path';
import * as vscode from 'vscode';

function getWorkspaceRoot(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  return folders ? folders[0].uri.fsPath : null;
}

function getPackageName(): string {
  const config = vscode.workspace.getConfiguration('androidTools');
  return config.get<string>('appPackage') || '';
}

function getMainActivity(): string {
  const config = vscode.workspace.getConfiguration('androidTools');
  return config.get<string>('mainActivity') || '.MainActivity';
}

function runGradle(taskLabel: string, gradleArgs: string, reuseTerminal = false): void {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Tidak ada workspace yang terbuka.');
    return;
  }

  const gradlew = path.join(root, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  const cmd = `"${gradlew}" ${gradleArgs}`;

  let terminal: vscode.Terminal | undefined;
  if (reuseTerminal) {
    terminal = vscode.window.terminals.find(t => t.name === taskLabel);
  }
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
  const pkg = getPackageName();
  const activity = getMainActivity();

  if (!pkg) {
    const input = await vscode.window.showInputBox({
      prompt: 'Package name aplikasi (e.g. com.example.app)',
      placeHolder: 'com.example.app',
    });
    if (!input) return;
    await vscode.workspace
      .getConfiguration('androidTools')
      .update('appPackage', input, vscode.ConfigurationTarget.Workspace);
  }

  const finalPkg = pkg || (await vscode.workspace.getConfiguration('androidTools').get<string>('appPackage')) || '';
  if (!finalPkg) return;

  const fullActivity = activity.startsWith('.') ? `${finalPkg}${activity}` : activity;

  // installDebug lalu launch via ADB
  const root = getWorkspaceRoot()!;
  const gradlew = path.join(root, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

  const terminal = vscode.window.createTerminal({ name: 'Gradle: Run', cwd: root });
  terminal.sendText(`"${gradlew}" installDebug && adb shell am start -n "${finalPkg}/${fullActivity}"`);
  terminal.show();
}

export function uninstallFromDevice(): void {
  const pkg = getPackageName();
  if (!pkg) {
    vscode.window.showErrorMessage('Set androidTools.appPackage di settings terlebih dahulu.');
    return;
  }
  const terminal = vscode.window.createTerminal({ name: 'ADB: Uninstall' });
  terminal.sendText(`adb uninstall "${pkg}"`);
  terminal.show();
}
