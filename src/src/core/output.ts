import * as Vscode from 'vscode';

export class Output {
    static instance: Output | undefined;
    output: Vscode.OutputChannel;

    constructor() {
        this.output = Vscode.window.createOutputChannel("astator");
    }

    static getInstance(): Output {
        if (!Output.instance) {
            Output.instance = new Output();
        }
        return Output.instance;
    }

    appendLine(value: string): void {
        this.output.appendLine(value);
    }

    append(value: string): void {
        this.output.append(value);
    }

    clear(): void {
        this.output.clear();
    }


    show(preserveFocus?: boolean): void {
        this.output.show(preserveFocus);
    }

    hide(): void {
        this.output.hide();
    }

    dispose(): void {
        this.output.dispose();
    }
}