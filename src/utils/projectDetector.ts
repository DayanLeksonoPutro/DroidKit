import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface ProjectInfo {
  applicationId: string | null;
  mainActivity: string | null;
  sdkDir: string | null;
}

function getWorkspaceRoot(): string | null {
  return vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? null;
}

// Baca local.properties → sdk.dir
export function detectSdkDirFromLocalProperties(): string | null {
  const root = getWorkspaceRoot();
  if (!root) return null;

  const localProps = path.join(root, 'local.properties');
  if (!fs.existsSync(localProps)) return null;

  const content = fs.readFileSync(localProps, 'utf-8');
  const match = content.match(/^sdk\.dir\s*=\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// Cari file build.gradle atau build.gradle.kts untuk app module
function findAppBuildGradle(root: string): string | null {
  // Cari di app/build.gradle, app/build.gradle.kts, atau modul lain
  const candidates = [
    path.join(root, 'app', 'build.gradle.kts'),
    path.join(root, 'app', 'build.gradle'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Fallback: cari di semua subdirektori (satu level)
  try {
    const dirs = fs.readdirSync(root, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
      .map(d => d.name);

    for (const dir of dirs) {
      for (const fname of ['build.gradle.kts', 'build.gradle']) {
        const candidate = path.join(root, dir, fname);
        if (fs.existsSync(candidate)) {
          const content = fs.readFileSync(candidate, 'utf-8');
          if (content.includes('applicationId')) return candidate;
        }
      }
    }
  } catch {
    // skip
  }

  return null;
}

// Extract applicationId dari build.gradle / build.gradle.kts
function parseApplicationId(buildGradlePath: string): string | null {
  const content = fs.readFileSync(buildGradlePath, 'utf-8');

  // Kotlin DSL:  applicationId = "com.example.app"
  // Groovy DSL:  applicationId "com.example.app"
  //              applicationId("com.example.app")
  const patterns = [
    /applicationId\s*=\s*["']([^"']+)["']/,
    /applicationId\s*["']([^"']+)["']/,
    /applicationId\(["']([^"']+)["']\)/,
  ];

  for (const re of patterns) {
    const match = content.match(re);
    if (match) return match[1];
  }
  return null;
}

// Extract package dari AndroidManifest.xml (fallback)
function parseManifestPackage(root: string): string | null {
  const candidates = [
    path.join(root, 'app', 'src', 'main', 'AndroidManifest.xml'),
    path.join(root, 'src', 'main', 'AndroidManifest.xml'),
  ];

  for (const manifestPath of candidates) {
    if (!fs.existsSync(manifestPath)) continue;
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const match = content.match(/package\s*=\s*["']([^"']+)["']/);
    if (match) return match[1];
  }
  return null;
}

// Extract main activity dari AndroidManifest.xml
function parseMainActivity(root: string, applicationId: string | null): string | null {
  const candidates = [
    path.join(root, 'app', 'src', 'main', 'AndroidManifest.xml'),
    path.join(root, 'src', 'main', 'AndroidManifest.xml'),
  ];

  for (const manifestPath of candidates) {
    if (!fs.existsSync(manifestPath)) continue;
    const content = fs.readFileSync(manifestPath, 'utf-8');

    // Cari activity yang punya MAIN + LAUNCHER intent filter
    // Match blok <activity ...> ... </activity> yang mengandung MAIN action
    const activityBlocks = content.match(/<activity[\s\S]*?<\/activity>/g) ?? [];
    for (const block of activityBlocks) {
      if (
        block.includes('android.intent.action.MAIN') &&
        block.includes('android.intent.category.LAUNCHER')
      ) {
        const nameMatch = block.match(/android:name\s*=\s*["']([^"']+)["']/);
        if (nameMatch) return nameMatch[1];
      }
    }
  }
  return null;
}

// Entry point: deteksi semua info project
export function detectProjectInfo(): ProjectInfo {
  const root = getWorkspaceRoot();
  if (!root) return { applicationId: null, mainActivity: null, sdkDir: null };

  const sdkDir = detectSdkDirFromLocalProperties();

  const buildGradlePath = findAppBuildGradle(root);
  const applicationId = buildGradlePath
    ? parseApplicationId(buildGradlePath)
    : parseManifestPackage(root);

  const mainActivity = parseMainActivity(root, applicationId);

  return { applicationId, mainActivity, sdkDir };
}

// Resolve package name: config → auto-detect → prompt user
export async function resolvePackageName(): Promise<string | null> {
  const config = vscode.workspace.getConfiguration('androidTools');
  const fromConfig = config.get<string>('appPackage');
  if (fromConfig) return fromConfig;

  const detected = detectProjectInfo();
  if (detected.applicationId) {
    // Simpan ke workspace settings supaya tidak deteksi ulang terus
    await config.update('appPackage', detected.applicationId, vscode.ConfigurationTarget.Workspace);
    vscode.window.setStatusBarMessage(`$(check) DroidKit: package terdeteksi → ${detected.applicationId}`, 4000);
    return detected.applicationId;
  }

  // Gagal auto-detect → tanya user
  const input = await vscode.window.showInputBox({
    prompt: 'Package name tidak terdeteksi. Masukkan manual (e.g. com.example.app)',
    placeHolder: 'com.example.app',
  });
  if (input) {
    await config.update('appPackage', input, vscode.ConfigurationTarget.Workspace);
  }
  return input ?? null;
}

// Resolve main activity: config → auto-detect → default
export async function resolveMainActivity(applicationId: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('androidTools');
  const fromConfig = config.get<string>('mainActivity');
  if (fromConfig && fromConfig !== '.MainActivity') return fromConfig;

  const detected = detectProjectInfo();
  if (detected.mainActivity) {
    const activity = detected.mainActivity.startsWith('.')
      ? detected.mainActivity
      : detected.mainActivity.startsWith(applicationId)
        ? detected.mainActivity.replace(applicationId, '')
        : detected.mainActivity;

    await config.update('mainActivity', activity, vscode.ConfigurationTarget.Workspace);
    return activity;
  }

  return '.MainActivity';
}
