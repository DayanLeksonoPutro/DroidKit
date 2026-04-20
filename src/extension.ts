import * as vscode from 'vscode';
import { createAvd, deleteAvd, launchAvd, stopAvd, wipeAvd } from './avd/avdManager';
import { AvdItem, AvdProvider } from './avd/avdProvider';
import { connectWireless, listDevices, openShell, rebootDevice, takeScreenshot } from './android/adbManager';
import { buildDebug, buildRelease, cleanProject, runOnDevice, uninstallFromDevice } from './android/gradleManager';
import * as logcat from './android/logcatManager';
import { AndroidStatusBar } from './ui/statusBar';
import { getSdkPaths, validateSdk } from './utils/androidSdk';

export function activate(context: vscode.ExtensionContext) {
  // Validasi SDK saat pertama kali aktif
  const sdkError = validateSdk(getSdkPaths());
  if (sdkError) {
    vscode.window.showWarningMessage(`Android Tools: ${sdkError}`);
  }

  // AVD TreeView
  const avdProvider = new AvdProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('avdManager', avdProvider),
    { dispose: () => avdProvider.dispose() }
  );

  // Status bar
  const statusBar = new AndroidStatusBar();
  statusBar.activate(context);

  // ── AVD commands ──────────────────────────────────────────────
  const reg = (cmd: string, fn: (...args: any[]) => any) =>
    context.subscriptions.push(vscode.commands.registerCommand(cmd, fn));

  reg('android.avd.refresh', () => avdProvider.refresh());

  reg('android.avd.create', async () => {
    await createAvd();
    setTimeout(() => avdProvider.refresh(), 3000);
  });

  reg('android.avd.launch', async (item?: AvdItem) => {
    const name = item?.avd.name ?? await pickAvdName(avdProvider, false);
    if (!name) return;
    launchAvd(name);
    setTimeout(() => avdProvider.refresh(), 5000);
  });

  reg('android.avd.stop', async (item?: AvdItem) => {
    const name = item?.avd.name ?? await pickAvdName(avdProvider, true);
    if (!name) return;
    try {
      await stopAvd(name);
      avdProvider.refresh();
    } catch (err: any) {
      vscode.window.showErrorMessage(err.message);
    }
  });

  reg('android.avd.delete', async (item?: AvdItem) => {
    const name = item?.avd.name;
    if (!name) return;
    const confirm = await vscode.window.showWarningMessage(
      `Hapus AVD "${name}"? Tindakan ini tidak bisa dibatalkan.`, { modal: true }, 'Hapus'
    );
    if (confirm !== 'Hapus') return;
    try {
      await deleteAvd(name);
      avdProvider.refresh();
      vscode.window.showInformationMessage(`AVD "${name}" berhasil dihapus.`);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Gagal hapus AVD: ${err.message}`);
    }
  });

  reg('android.avd.wipe', async (item?: AvdItem) => {
    const name = item?.avd.name;
    if (!name) return;
    const confirm = await vscode.window.showWarningMessage(
      `Wipe data AVD "${name}"?`, { modal: true }, 'Wipe'
    );
    if (confirm !== 'Wipe') return;
    await wipeAvd(name);
  });

  // ── Build commands ────────────────────────────────────────────
  reg('android.build.debug',   () => buildDebug());
  reg('android.build.release', () => buildRelease());
  reg('android.build.clean',   () => cleanProject());

  // ── Run commands ──────────────────────────────────────────────
  reg('android.run.debug',     () => runOnDevice());
  reg('android.run.uninstall', () => uninstallFromDevice());

  // ── Logcat commands ───────────────────────────────────────────
  reg('android.logcat.start',  () => logcat.startLogcat());
  reg('android.logcat.clear',  () => logcat.clearLogcat());

  // ── ADB commands ──────────────────────────────────────────────
  reg('android.adb.devices',    () => listDevices());
  reg('android.adb.shell',      () => openShell());
  reg('android.adb.screenshot', () => takeScreenshot());
  reg('android.adb.reboot',     () => rebootDevice());
  reg('android.adb.wireless',   () => connectWireless());

  context.subscriptions.push({ dispose: () => logcat.dispose() });

  vscode.window.setStatusBarMessage('$(check) Android Tools ready', 3000);
}

export function deactivate() {
  logcat.dispose();
}

async function pickAvdName(provider: AvdProvider, onlyRunning: boolean): Promise<string | undefined> {
  const children = await provider.getChildren();
  const items = (children as AvdItem[])
    .filter(c => 'avd' in c && (!onlyRunning || c.avd.running))
    .map(c => (c as AvdItem).avd.name);

  if (items.length === 0) {
    vscode.window.showWarningMessage(onlyRunning ? 'Tidak ada emulator yang running.' : 'Tidak ada AVD.');
    return undefined;
  }
  return vscode.window.showQuickPick(items, { placeHolder: 'Pilih AVD' });
}
