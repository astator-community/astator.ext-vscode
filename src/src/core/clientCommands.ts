import * as mqtt from "mqtt";
import { Output } from './output';
import { PackData } from './packData';
import * as Vscode from 'vscode';
import * as Path from 'path';
import * as AdmZip from 'adm-zip';
import * as Fs from "fs";

export class ClientCommands {
    static client: mqtt.MqttClient;
    static isConnected: boolean;

    public static async connectAsync(ip: string) {
        this.client?.end();

        let options:mqtt.IClientOptions = {
            host:ip,
            protocol:"tcp",
            rejectUnauthorized: false
        };

        this.client = mqtt.connect(options);

        this.client.on("connect", (packet) => {
            this.isConnected = true;
            this.client.subscribe(["server/init", "server/logging"]);
            this.client.publish("client/init", "");
        });

        this.client.on("disconnect", (packet) => {
            Output.appendLine("断开连接");
            this.client.unsubscribe(["server/init", "server/logging"]);
            this.client.end();
            this.isConnected = false;
        });

        this.client.on("message", ClientCommands.onMessageReceivedAsync);
    }

    private static async onMessageReceivedAsync(topic: string, payload: Buffer, packet: mqtt.IPublishPacket) {
        var pack = PackData.parse(payload);
        if (pack === null) {
            return;
        }

        switch (topic) {
            case "server/init":
                Output.appendLine(`连接设备成功: ${pack.key} ${pack.description}`);
                break;
            case "server/logging":
                Output.appendLine(`${pack.key} ${pack.buffer.toString("utf8")}`);
                break;
            default:
                break;
        }
    }

    public static checkIsConnected() {
        if (!this.isConnected || !(this.client?.connected ?? false)) {
            return false;
        }
        else {
            return true;
        }
    }

    public static async sendProjectAsync(topic: string, desc: string = "") {
        let editors = Vscode.window.visibleTextEditors;
        editors.forEach(editor => {
            editor.document.save();
        });
        let folders = Vscode.workspace.workspaceFolders;
        if (folders !== undefined) {
            let directory = folders[0].uri.fsPath;

            Fs.readdir(directory, "utf8", (_err, list) => {
                let zip = new AdmZip();
                list.forEach(name => {
                    if (name !== ".vscode" 
                    && name !== "vs" 
                    && name !== "git" 
                    && name !== "bin" 
                    && name !== "obj") {
                        let temp = Path.join(directory, name);
                        let stat = Fs.lstatSync(temp);
                        if (stat.isDirectory()) {
                            zip.addLocalFolder(temp, name);
                        }
                        else {
                            zip.addLocalFile(temp);
                        }
                    }
                });

                let buffer = zip.toBuffer();

                let dirArr = directory.split(Path.sep);
                let id = dirArr[dirArr.length - 1];

                let packData: PackData = new PackData(id, desc, buffer);
                this.client.publish(topic, packData.makeBuffer());
            });
        }
    }

    public static runProject(){
        this.sendProjectAsync("client/run-project");
    }

    public static runScript(){
        let activeEditorFileName = Vscode.window.activeTextEditor?.document.fileName;
        if (activeEditorFileName === undefined || !activeEditorFileName.endsWith(".cs")) {
            Vscode.window.showErrorMessage("活动编辑器不存在或不是cs文件!");
            return;
        }
        let scriptFileName = Path.basename(activeEditorFileName);
        this.sendProjectAsync("client/run-script",scriptFileName);
    }

    public static saveProject(){
        this.sendProjectAsync("client/save-project");
    }

}