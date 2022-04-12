import * as Vscode from 'vscode';

export class Output {
    static outputChannel: Vscode.OutputChannel;

    static getChannel() {
        if (this.outputChannel === undefined || this.outputChannel === null) {
            this.outputChannel = Vscode.window.createOutputChannel("astator调试");
            this.outputChannel.show();
        }
        return this.outputChannel;
    }

    static appendLine(value: string) {
        this.getChannel()?.appendLine(value);
    }

    static append(value: string) {
        this.getChannel()?.append(value);
    }

    static staticclear() {
        this.getChannel()?.clear();
    }


    static show(preserveFocus?: boolean) {
        this.getChannel()?.show(preserveFocus);
    }

    static hide() {
        this.getChannel()?.hide();
    }

    static dispose() {
        this.getChannel()?.dispose();
    }
}