import * as path from 'path';
import * as vscode from 'vscode';
import { GradleTask, GradleTaskGroup, buildTaskGroups } from '../utils/flavorDetector';

// ── Tree item types ──────────────────────────────────────────────

export class TaskGroupItem extends vscode.TreeItem {
  constructor(public readonly group: GradleTaskGroup) {
    super(group.label, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon(group.icon);
    this.contextValue = 'taskGroup';
  }
}

export class TaskItem extends vscode.TreeItem {
  constructor(public readonly task: GradleTask) {
    super(task.label, vscode.TreeItemCollapsibleState.None);
    this.description = task.description ?? task.command;
    this.tooltip = `./gradlew ${task.command}`;
    this.iconPath = new vscode.ThemeIcon('play-circle');
    this.contextValue = 'gradleTask';

    // Klik langsung jalankan task
    this.command = {
      command: 'android.gradle.runTask',
      title: 'Run',
      arguments: [task],
    };
  }
}

// ── Provider ─────────────────────────────────────────────────────

type TreeNode = TaskGroupItem | TaskItem | NoProjectItem;

export class GradleTaskProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private groups: GradleTaskGroup[] = [];

  constructor() {
    this.reload();

    // Watch build.gradle untuk reload otomatis jika ada perubahan
    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/build.gradle{,.kts}',
      false, false, false
    );
    watcher.onDidChange(() => this.reload());
    watcher.onDidCreate(() => this.reload());
  }

  reload() {
    this.groups = buildTaskGroups();
    this._onDidChangeTreeData.fire();
  }

  refresh() {
    this.reload();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      // Root: kembalikan semua group
      if (this.groups.length === 0) {
        return [new NoProjectItem()];
      }
      return this.groups.map(g => new TaskGroupItem(g));
    }

    if (element instanceof TaskGroupItem) {
      return element.group.tasks.map(t => new TaskItem(t));
    }

    return [];
  }
}

class NoProjectItem extends vscode.TreeItem {
  constructor() {
    super('Buka project Android untuk melihat task', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
  }
}

// ── Run handler ──────────────────────────────────────────────────

export async function runGradleTask(task: GradleTask): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!root) {
    vscode.window.showErrorMessage('Tidak ada workspace yang terbuka.');
    return;
  }

  const gradlew = path.join(root, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  const terminalName = `Gradle: ${task.command}`;

  // Reuse terminal yang sama jika masih ada
  let terminal = vscode.window.terminals.find(t => t.name === terminalName);
  if (!terminal) {
    terminal = vscode.window.createTerminal({ name: terminalName, cwd: root });
  }

  terminal.sendText(`"${gradlew}" ${task.command}`);
  terminal.show();
}
