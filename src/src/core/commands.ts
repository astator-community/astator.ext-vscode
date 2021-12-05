/* eslint-disable @typescript-eslint/naming-convention */
import * as Vscode from 'vscode';
import * as Fs from "fs";
import * as FsExtra from "fs-extra";
import * as Path from 'path';
import * as AdmZip from 'adm-zip';
import * as net from 'net';
import { Output } from './output';
import { MaxBodyLen, Stick } from "@lvgithub/stick";

interface PackData {
    key: string,
    description: string,
    buffer: Buffer
}

export class Commands {

    extContext: Vscode.ExtensionContext;
    tcpClient: net.Socket;
    output: Output;
    stick: Stick;
    isConnected:boolean;

    constructor(extContext: Vscode.ExtensionContext) {
        this.extContext = extContext;
        this.output = Output.getInstance();
        this.output.show();
        this.tcpClient = new net.Socket();
        this.stick = new Stick(1024);
        this.stick.setMaxBodyLen(MaxBodyLen['2048M']);
        this.isConnected = false;
    }

    public async connect(): Promise<void> {
        let deviceList = this.extContext.globalState.get<string[]>("deviceList", []);
        if (deviceList.length >= 15) {
            deviceList.splice(15, deviceList.length - 15);
        }

        deviceList.push("输入设备ip");
        deviceList.push("清空历史记录");

        let result = await Vscode.window.showQuickPick(deviceList, { title: "选择设备" });
        if (result) {
            let temp = result;
            if (result === "输入设备ip") {
                Vscode.window.showInputBox({
                    "title": "请输入设备ip"
                }).then(ip => {
                    if (ip !== undefined) {
                        temp = ip;
                        deviceList.pop();
                        deviceList.pop();
                        deviceList.unshift(temp);
                        this.extContext.globalState.update("deviceList", deviceList);
                    }
                });
            }
            else if (result === "清空历史记录") {
                var arr: string[] = [];
                this.extContext.globalState.update("deviceList", arr);
            }
            this.tcpClient = new net.Socket();

            this.tcpClient.connect(1024, temp);

            this.stick = new Stick(1024);
            this.stick.setMaxBodyLen(MaxBodyLen['2048M']);

            this.stick.onBody((body: Buffer) => {
                var pack: PackData = JSON.parse(body.toString());
                switch (pack.key) {
                    case "init":
                        this.output.appendLine("连接成功: " + pack.description);
                        this.isConnected = true;
                        break;
                    case "showMessage":
                        this.output.appendLine(pack.description);
                        break;
                    default:
                        break;
                }
            });

            this.tcpClient.on("data", (data) => {
                this.stick.putData(data);
            });

            this.tcpClient.on("close", (_data) => {
                this.isConnected = false;
            });

            this.tcpClient.on('error', (error) => {
                this.output.appendLine(error.message);
                this.isConnected = false;
            });
        }
    }

    public runProject(): void {
        if (!this.isConnected) {
            Vscode.window.showErrorMessage("请先连接设备!");
            return;
        }
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
                    if (name !== ".vscode" && name !== "bin" && name !== "obj" && name !== "runtime") {
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

                let packData: PackData = {
                    key: "runProject",
                    description: id,
                    buffer: buffer
                };

                let data = this.stick.makeData(JSON.stringify(packData));
                this.tcpClient.write(data);
            });
        }
    }

    public async runScript(): Promise<void> {

    }

    public async saveProject(): Promise<void> {
        let editors = Vscode.window.visibleTextEditors;
        editors.forEach(editor => {
            editor.document.save();
        });
        let folders = Vscode.workspace.workspaceFolders;
        if (folders !== undefined) {
            let directory = folders[0].uri.fsPath;

            Fs.readdir(directory, "utf8", (err, list) => {
                let zip = new AdmZip();
                list.forEach(name => {
                    if (name !== ".vscode" && name !== "bin" && name !== "obj") {
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

                let packData: PackData = {
                    key: "saveProject",
                    description: id,
                    buffer: buffer
                };

                let data = this.stick.makeData(JSON.stringify(packData));
                this.tcpClient.write(data);
            });
        }
    }

    public createProject(): void {
        Vscode.window.showOpenDialog({
            "openLabel": "选择路径",
            "canSelectFiles": false,
            "canSelectFolders": true,
        }).then(uriList => {
            if (uriList && uriList.length > 0) {
                Vscode.window.showInformationMessage("请输入项目名称");
                Vscode.window.showInputBox({
                    "title": "输入项目名称"
                }).then(project => {
                    if (!project) {
                        return;
                    }
                    let uri: string = Path.join(uriList[0].fsPath, project);

                    Fs.mkdir(uri, { recursive: true }, (err) => {
                        if (err) {
                            this.output.appendLine(err.message);
                        }
                    });

                    let templatePath = Path.join(__dirname, "../../assets/template");

                    FsExtra.copy(templatePath, uri, err => {
                        if (err) {
                            this.output.appendLine(err.message);
                        }
                    });

                    let programCode = `
using System;   
using System.Collections.Generic;
using System.Linq;
using System.Text;               
using astator.Core;

namespace ${project}
{
    public class Program
    {
        public void Main(ScriptRuntime runtime)
        {
            Runtime.Instance = runtime;
        }
    }
}
`;

                    let runtimeCode = `
using System;   
using System.Collections.Generic;
using System.Linq;
using System.Text;    
using astator.Core;
using astator.Core.UI;
using astator.Core.UI.Floaty;
using astator.Core.Threading;
using static astator.Core.Globals.Permission;

namespace ${project}
{
    public static class Runtime
    {
        public static ScriptRuntime Instance { get; set; }

        public static string ScriptId { get => Instance.ScriptId; }

        public static UiManager Ui { get => Instance.Ui; }

        public static FloatyManager Floatys { get => Instance.Floatys; }

        public static ScriptThreadManager Threads { get => Instance.Threads; }

        public static ScriptTaskManager Tasks { get => Instance.Tasks; }

        public static CaptureOrientation CaptureOrientation { get => Instance.CaptureOrientation; }

        public static bool IsUiMode { get => Instance.IsUiMode; }

        public static ScriptState State { get => Instance.State; }

        public static Action ExitCallback { get => Instance.ExitCallback; set => Instance.ExitCallback = value; }

        public static string Directory { get => Instance.Directory; }
    }
}
`;

                    let config = `
 <Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net6.0-android</TargetFramework>
  </PropertyGroup>


  <ItemGroup>
    <Reference Include="./ref/astator.Core.dll" />
  </ItemGroup>
  
  <ProjectExtensions>
		<ScriptConfig>
			<UIMode>false</UIMode>
        <EntryType>${project}.Program</EntryType>
		</ScriptConfig>
	</ProjectExtensions>
</Project>
 `;

                    Fs.writeFile(Path.join(uri, "Program.cs"), programCode,  (err) => {
                        if (err) {
                            this.output.appendLine(err.message);
                        }
                    });

                    Fs.writeFile(Path.join(uri, "Runtime.cs"), runtimeCode,  (err) => {
                        if (err) {
                            this.output.appendLine(err.message);
                        }
                    });

                    Fs.writeFile(Path.join(uri, project + ".csproj"), config,  (err) => {
                        if (err) {
                            this.output.appendLine(err.message);
                        }
                    });

                    Vscode.commands.executeCommand("vscode.openFolder", Vscode.Uri.file(uri));
                });
            }
        });
    }

    public async openCommands(): Promise<void> {
        
        let list:string[] =  
        [
            "astator: 连接设备",
            "astator: 运行项目",
            "astator: 保存项目",
            "astator: 新建项目"
        ];
        let result = await Vscode.window.showQuickPick(list, { title: "astator命令" });
        if (result) {
            if (result === "astator: 连接设备") {
                this.connect();
            }
            else if (result === "astator: 运行项目") {
                this.runProject();
            }
            else if (result === "astator: 保存项目") {
                this.saveProject();
            }
            else if (result === "astator: 新建项目") {
                this.createProject();
            }
        }
    }

    public test(): void {
      
    }
}


