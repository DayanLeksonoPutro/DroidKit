import * as vscode from 'vscode';
import { isRunning } from '../android/logcatManager';

interface StatusBarButton {
  item: vscode.StatusBarItem;
  dispose(): void;
}

function makeButton(
  text: string,
  tooltip: string,
  command: string,
  priority: number,
  color?: string
): StatusBarButton {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);
  item.text = text;
  item.tooltip = tooltip;
  item.command = command;
  if (color) item.color = color;
  item.show();
  return { item, dispose: () => item.dispose() };
}

export class AndroidStatusBar {
  private buttons: StatusBarButton[] = [];
  private logcatBtn!: StatusBarButton;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;

  activate(context: vscode.ExtensionContext) {
    this.buttons.push(
      makeButton('$(tools) Build',   'Build Debug (assembleDebug)',       'android.build.debug',   100),
      makeButton('$(play) Run',      'Install & Run on Device',           'android.run.debug',      99),
      makeButton('$(device-mobile) AVD', 'Open AVD Manager',             'android.avd.refresh',    98),
    );

    this.logcatBtn = makeButton('$(list-unordered) Logcat', 'Start Logcat', 'android.logcat.start', 97);
    this.buttons.push(this.logcatBtn);

    // Update warna tombol Logcat sesuai status
    this.refreshTimer = setInterval(() => this.updateLogcatButton(), 2000);

    context.subscriptions.push({ dispose: () => this.dispose() });
  }

  private updateLogcatButton() {
    if (isRunning()) {
      this.logcatBtn.item.text = '$(list-unordered) Logcat $(primitive-dot)';
      this.logcatBtn.item.tooltip = 'Logcat running — klik untuk stop';
      this.logcatBtn.item.command = 'android.logcat.clear';
      this.logcatBtn.item.color = new vscode.ThemeColor('terminal.ansiGreen');
    } else {
      this.logcatBtn.item.text = '$(list-unordered) Logcat';
      this.logcatBtn.item.tooltip = 'Start Logcat';
      this.logcatBtn.item.command = 'android.logcat.start';
      this.logcatBtn.item.color = undefined;
    }
  }

  dispose() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    for (const btn of this.buttons) btn.dispose();
  }
}
