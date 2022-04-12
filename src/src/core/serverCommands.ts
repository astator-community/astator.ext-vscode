import * as aedes from "aedes";
import { Output } from './output';
import { PackData } from './packData';
import * as Vscode from 'vscode';
import * as Path from 'path';
import * as AdmZip from 'adm-zip';
import * as Fs from "fs";
import * as net from "net";

export class ServerCommands {
    static aedesServer: aedes.Aedes;
    static server: net.Server;
    static clientCount: number;


    public static async startAsync() {
        this.aedesServer = aedes.Server({ heartbeatInterval: 360000 });

        this.server = net.createServer(this.aedesServer.handle);
        this.server.listen(1883);

        this.aedesServer.subscribe("server/init", (packet, callback) => {
            let pack = PackData.parse(packet.payload as Buffer);
            if (pack === null) {
                return;
            }
            Output.appendLine(`连接设备成功: ${pack.key} ${pack.description}`);
        }, () => { });

        this.aedesServer.subscribe("server/logging", (packet, callback) => {
            let pack = PackData.parse(packet.payload as Buffer);
            if (pack === null) {
                return;
            }
            Output.appendLine(`${pack.key} ${pack.buffer.toString("utf8")}`);
        }, () => { });

        this.aedesServer.on("client", (client) => {
            this.clientCount++;
        });

        this.aedesServer.on("clientDisconnect", (client) => {
            this.clientCount--;


        });
    }

    public static checkIsConnected() {
        if (this.clientCount <= 0 || this.aedesServer?.connectedClients <= 0) {
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

                var packet: aedes.PublishPacket = {
                    cmd: "publish",
                    qos: 0,
                    dup: false,
                    retain: false,
                    topic: topic,
                    payload: packData.makeBuffer()
                };

                this.aedesServer.publish(packet, () => { });
            });
        }
    }

    public static runProject() {
        this.sendProjectAsync("client/run-project");
    }

    public static runScript() {
        let activeEditorFileName = Vscode.window.activeTextEditor?.document.fileName;
        if (activeEditorFileName === undefined || !activeEditorFileName.endsWith(".cs")) {
            Vscode.window.showErrorMessage("活动编辑器不存在或不是cs文件!");
            return;
        }
        let scriptFileName = Path.basename(activeEditorFileName);
        this.sendProjectAsync("client/run-script", scriptFileName);
    }

    public static saveProject() {
        this.sendProjectAsync("client/save-project");
    }

}