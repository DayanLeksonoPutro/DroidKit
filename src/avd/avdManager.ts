import { exec } from 'child_process';
import * as vscode from 'vscode';
import { buildEnv, getSdkPaths } from '../utils/androidSdk';

export interface AvdInfo {
  name: string;
  running: boolean;
  api?: string;
  abi?: string;
}

function run(cmd: string): Promise<string> {
  const paths = getSdkPaths();
  return new Promise((resolve, reject) => {
    exec(cmd, { env: buildEnv(paths) }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

async function getRunningEmulators(): Promise<Set<string>> {
  const paths = getSdkPaths();
  try {
    const out = await run(`"${paths.adb}" devices`);
    const running = new Set<string>();
    const lines = out.trim().split('\n').slice(1);
    for (const line of lines) {
      if (!line.includes('emulator-')) continue;
      const serial = line.split('\t')[0].trim();
      try {
        const name = await run(`"${paths.adb}" -s ${serial} emu avd name`);
        running.add(name.split('\n')[0].trim());
      } catch {
        // emulator tidak response emu avd name, skip
      }
    }
    return running;
  } catch {
    return new Set();
  }
}

export async function listAvds(): Promise<AvdInfo[]> {
  const paths = getSdkPaths();
  const running = await getRunningEmulators();

  const out = await run(`"${paths.emulator}" -list-avds`);
  const names = out.trim().split('\n').filter(Boolean);

  return names.map(name => ({ name, running: running.has(name) }));
}

export function launchAvd(avdName: string): void {
  const paths = getSdkPaths();
  const terminal = vscode.window.createTerminal({
    name: `AVD: ${avdName}`,
    env: buildEnv(paths) as Record<string, string>,
  });
  terminal.sendText(`"${paths.emulator}" -avd "${avdName}"`);
  terminal.show();
}

export async function stopAvd(avdName: string): Promise<void> {
  const paths = getSdkPaths();
  const out = await run(`"${paths.adb}" devices`);
  const lines = out.trim().split('\n').slice(1);

  for (const line of lines) {
    if (!line.includes('emulator-')) continue;
    const serial = line.split('\t')[0].trim();
    try {
      const name = await run(`"${paths.adb}" -s ${serial} emu avd name`);
      if (name.split('\n')[0].trim() === avdName) {
        await run(`"${paths.adb}" -s ${serial} emu kill`);
        return;
      }
    } catch {
      continue;
    }
  }
  throw new Error(`Emulator "${avdName}" tidak ditemukan`);
}

export async function deleteAvd(avdName: string): Promise<void> {
  const paths = getSdkPaths();
  await run(`"${paths.avdManager}" delete avd -n "${avdName}"`);
}

export async function wipeAvd(avdName: string): Promise<void> {
  const paths = getSdkPaths();
  const terminal = vscode.window.createTerminal({
    name: `Wipe: ${avdName}`,
    env: buildEnv(paths) as Record<string, string>,
  });
  terminal.sendText(`"${paths.emulator}" -avd "${avdName}" -wipe-data`);
  terminal.show();
}

export async function createAvd(): Promise<void> {
  const paths = getSdkPaths();

  // Ambil list system images yang tersedia
  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Loading system images...' },
    async () => {
      let imagesOutput = '';
      try {
        imagesOutput = await run(`"${paths.avdManager}" list target -c`);
      } catch {
        vscode.window.showErrorMessage(
          'Gagal load system images. Pastikan JDK 17+ tersedia dan androidTools.javaHome sudah di-set.'
        );
        return;
      }

      const targets = imagesOutput.trim().split('\n').filter(Boolean);
      if (targets.length === 0) {
        vscode.window.showWarningMessage('Tidak ada system image. Install via SDK Manager dulu.');
        return;
      }

      const picked = await vscode.window.showQuickPick(targets, {
        placeHolder: 'Pilih Android target',
      });
      if (!picked) return;

      const name = await vscode.window.showInputBox({
        prompt: 'Nama AVD baru',
        value: `AVD_${picked.replace(/[^a-zA-Z0-9]/g, '_')}`,
      });
      if (!name) return;

      const terminal = vscode.window.createTerminal({
        name: 'Create AVD',
        env: buildEnv(paths) as Record<string, string>,
      });
      terminal.sendText(
        `echo no | "${paths.avdManager}" create avd -n "${name}" -k "${picked}" --force`
      );
      terminal.show();
    }
  );
}
