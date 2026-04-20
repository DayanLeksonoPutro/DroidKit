import { exec } from 'child_process';
import * as vscode from 'vscode';
import { getSdkPaths } from '../utils/androidSdk';

function adb(): string {
  return `"${getSdkPaths().adb}"`;
}

function run(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

async function pickDevice(): Promise<string | undefined> {
  const out = await run(`${adb()} devices`);
  const lines = out.split('\n').slice(1).filter(l => l.includes('\t'));
  const devices = lines.map(l => l.split('\t')[0].trim());

  if (devices.length === 0) {
    vscode.window.showWarningMessage('Tidak ada device/emulator yang terhubung.');
    return undefined;
  }
  if (devices.length === 1) return devices[0];

  return vscode.window.showQuickPick(devices, { placeHolder: 'Pilih device' });
}

export async function listDevices(): Promise<void> {
  try {
    const out = await run(`${adb()} devices -l`);
    vscode.window.showInformationMessage(out || 'Tidak ada device terhubung.', { modal: false });
  } catch (err: any) {
    vscode.window.showErrorMessage(`ADB error: ${err.message}`);
  }
}

export async function openShell(): Promise<void> {
  const device = await pickDevice();
  if (!device) return;

  const terminal = vscode.window.createTerminal({ name: `ADB Shell: ${device}` });
  terminal.sendText(`${adb()} -s ${device} shell`);
  terminal.show();
}

export async function takeScreenshot(): Promise<void> {
  const device = await pickDevice();
  if (!device) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const remotePath = `/sdcard/screenshot_${timestamp}.png`;
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? process.env.HOME!;
  const localPath = `${workspaceRoot}/screenshot_${timestamp}.png`;

  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Capturing screenshot...' },
    async () => {
      try {
        await run(`${adb()} -s ${device} shell screencap -p "${remotePath}"`);
        await run(`${adb()} -s ${device} pull "${remotePath}" "${localPath}"`);
        await run(`${adb()} -s ${device} shell rm "${remotePath}"`);
        const uri = vscode.Uri.file(localPath);
        await vscode.commands.executeCommand('vscode.open', uri);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Screenshot gagal: ${err.message}`);
      }
    }
  );
}

export async function rebootDevice(): Promise<void> {
  const device = await pickDevice();
  if (!device) return;

  const confirm = await vscode.window.showWarningMessage(
    `Reboot device ${device}?`, 'Ya', 'Tidak'
  );
  if (confirm !== 'Ya') return;

  try {
    await run(`${adb()} -s ${device} reboot`);
    vscode.window.showInformationMessage(`Device ${device} sedang reboot.`);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Reboot gagal: ${err.message}`);
  }
}

export async function connectWireless(): Promise<void> {
  const ip = await vscode.window.showInputBox({
    prompt: 'IP Address device (format: 192.168.x.x atau 192.168.x.x:5555)',
    placeHolder: '192.168.1.100',
  });
  if (!ip) return;

  const address = ip.includes(':') ? ip : `${ip}:5555`;

  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Connecting to ${address}...` },
    async () => {
      try {
        const out = await run(`${adb()} connect ${address}`);
        vscode.window.showInformationMessage(out);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Connect gagal: ${err.message}`);
      }
    }
  );
}
