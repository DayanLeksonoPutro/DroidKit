import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export interface SdkPaths {
  sdkRoot: string;
  emulator: string;
  avdManager: string;
  adb: string;
  javaHome: string | null;
}

function findJava17(): string | null {
  const candidates = [
    '/Library/Java/JavaVirtualMachines',
    `${os.homedir()}/.sdkman/candidates/java`,
  ];

  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    const entries = fs.readdirSync(base).sort().reverse();
    for (const entry of entries) {
      const javaExe = path.join(base, entry, 'Contents', 'Home', 'bin', 'java');
      const javaExeLinux = path.join(base, entry, 'bin', 'java');
      if (fs.existsSync(javaExe)) return path.join(base, entry, 'Contents', 'Home');
      if (fs.existsSync(javaExeLinux)) return path.join(base, entry);
    }
  }
  return null;
}

export function getSdkPaths(): SdkPaths {
  const config = vscode.workspace.getConfiguration('androidTools');

  const sdkRoot =
    config.get<string>('sdkPath') ||
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    path.join(os.homedir(), 'Library', 'Android', 'sdk') ||
    path.join(os.homedir(), 'Android', 'sdk');

  const javaHome =
    config.get<string>('javaHome') ||
    process.env.JAVA_HOME ||
    findJava17();

  return {
    sdkRoot,
    emulator:    path.join(sdkRoot, 'emulator', 'emulator'),
    avdManager:  path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'avdmanager'),
    adb:         path.join(sdkRoot, 'platform-tools', 'adb'),
    javaHome,
  };
}

export function validateSdk(paths: SdkPaths): string | null {
  if (!fs.existsSync(paths.emulator)) {
    return `Emulator tidak ditemukan: ${paths.emulator}. Set androidTools.sdkPath di settings.`;
  }
  if (!fs.existsSync(paths.adb)) {
    return `ADB tidak ditemukan: ${paths.adb}`;
  }
  return null;
}

export function buildEnv(paths: SdkPaths): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ANDROID_HOME: paths.sdkRoot, ANDROID_SDK_ROOT: paths.sdkRoot };
  if (paths.javaHome) {
    env.JAVA_HOME = paths.javaHome;
    env.PATH = `${path.join(paths.javaHome, 'bin')}:${process.env.PATH}`;
  }
  return env;
}
