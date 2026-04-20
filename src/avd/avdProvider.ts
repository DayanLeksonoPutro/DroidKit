import * as vscode from 'vscode';
import { AvdInfo, listAvds } from './avdManager';

export class AvdProvider implements vscode.TreeDataProvider<AvdItem | EmptyItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<AvdItem | EmptyItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private autoRefreshInterval: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // Auto-refresh tiap 5 detik untuk update status running/stopped
    this.autoRefreshInterval = setInterval(() => this._onDidChangeTreeData.fire(), 5000);
  }

  dispose() {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AvdItem | EmptyItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<(AvdItem | EmptyItem)[]> {
    try {
      const avds = await listAvds();
      if (avds.length === 0) {
        return [new EmptyItem()];
      }
      return avds.map(avd => new AvdItem(avd));
    } catch (err: any) {
      vscode.window.showErrorMessage(`Gagal load AVD list: ${err.message}`);
      return [];
    }
  }
}

export class AvdItem extends vscode.TreeItem {
  constructor(public readonly avd: AvdInfo) {
    super(avd.name, vscode.TreeItemCollapsibleState.None);

    this.contextValue = avd.running ? 'avdRunning' : 'avdStopped';
    this.tooltip = avd.running ? `${avd.name} — Running` : `${avd.name} — Stopped`;
    this.description = avd.running ? '● Running' : '○ Stopped';
    this.iconPath = new vscode.ThemeIcon(
      avd.running ? 'vm-running' : 'vm',
      new vscode.ThemeColor(avd.running ? 'terminal.ansiGreen' : 'foreground')
    );
  }
}

class EmptyItem extends vscode.TreeItem {
  constructor() {
    super('Tidak ada AVD. Klik + untuk membuat.', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
    this.contextValue = 'empty';
  }
}
