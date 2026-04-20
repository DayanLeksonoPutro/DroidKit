import { ChildProcess, spawn } from 'child_process';
import * as vscode from 'vscode';
import { getSdkPaths } from '../utils/androidSdk';

let logcatProcess: ChildProcess | undefined;
let outputChannel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Android Logcat');
  }
  return outputChannel;
}

function getPackageName(): string {
  return vscode.workspace.getConfiguration('androidTools').get<string>('appPackage') || '';
}

export async function startLogcat(): Promise<void> {
  if (logcatProcess) {
    vscode.window.showInformationMessage('Logcat sudah berjalan. Stop dulu jika ingin restart.');
    getChannel().show();
    return;
  }

  const paths = getSdkPaths();
  const pkg = getPackageName();
  const channel = getChannel();

  channel.clear();
  channel.show(true);
  channel.appendLine(`[Android Tools] Logcat started — ${new Date().toLocaleString()}`);
  if (pkg) channel.appendLine(`[Android Tools] Filter: ${pkg}`);
  channel.appendLine('─'.repeat(60));

  // Cari PID jika ada package name (filter lebih bersih)
  const args = ['-s', paths.adb.replace(/"/g, ''), 'logcat', '-v', 'time'];
  if (pkg) {
    try {
      const { execSync } = await import('child_process');
      const pidOut = execSync(`"${paths.adb}" shell pidof "${pkg}"`).toString().trim();
      if (pidOut) {
        args.push('--pid', pidOut);
        channel.appendLine(`[Android Tools] PID: ${pidOut}`);
      }
    } catch {
      // app belum running, logcat semua dulu
    }
  }

  logcatProcess = spawn(paths.adb, args.slice(1), {
    env: { ...process.env, ANDROID_HOME: paths.sdkRoot },
  });

  logcatProcess.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) channel.appendLine(line);
    }
  });

  logcatProcess.stderr?.on('data', (data: Buffer) => {
    channel.appendLine(`[ERROR] ${data.toString()}`);
  });

  logcatProcess.on('close', (code) => {
    channel.appendLine(`\n[Android Tools] Logcat stopped (exit code: ${code})`);
    logcatProcess = undefined;
  });

  vscode.window.setStatusBarMessage('$(list-unordered) Logcat running', 3000);
}

export function stopLogcat(): void {
  if (!logcatProcess) {
    vscode.window.showInformationMessage('Logcat tidak sedang berjalan.');
    return;
  }
  logcatProcess.kill();
  logcatProcess = undefined;
}

export function clearLogcat(): void {
  const channel = getChannel();
  channel.clear();

  // Clear logcat buffer di device juga
  const paths = getSdkPaths();
  const { exec } = require('child_process');
  exec(`"${paths.adb}" logcat -c`, () => {
    channel.appendLine(`[Android Tools] Logcat buffer cleared — ${new Date().toLocaleString()}`);
  });
}

export function isRunning(): boolean {
  return !!logcatProcess;
}

export function dispose(): void {
  stopLogcat();
  outputChannel?.dispose();
}
