/* eslint-disable @typescript-eslint/naming-convention */
import * as Vscode from 'vscode';
import * as Fs from "fs";
import * as FsExtra from "fs-extra";
import * as Path from 'path';
import * as AdmZip from 'adm-zip';
import * as net from 'net';
import { Output } from './output';
import { MaxBodyLen, Stick } from "@lvgithub/stick";
import { PackData } from './packData';
import { start } from 'repl';


export class Commands {

    extContext: Vscode.ExtensionContext;
    tcpClient: net.Socket;
    output: Output;
    stick: Stick;
    isConnected: boolean;

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
        let deviceList = this.extContext.globalState.get<string[]>("deviceList", []).slice();
        if (deviceList.length >= 15) {
            deviceList.splice(15, deviceList.length - 15);
        }

        deviceList.push("输入设备ip");
        deviceList.push("清空历史记录");

        let result = await Vscode.window.showQuickPick(deviceList, { title: "选择设备" });
        if (result) {
            if (result === "输入设备ip") {
                Vscode.window.showInputBox({
                    "title": "请输入设备ip"
                }).then(ip => {
                    if (ip !== undefined) {
                        deviceList.pop();
                        deviceList.pop();
                        deviceList.unshift(ip);
                        this.extContext.globalState.update("deviceList", deviceList);
                    }
                });
            }
            else if (result === "清空历史记录") {
                this.extContext.globalState.update("deviceList", []);
                return;
            }
            else {
                this.tcpClient = new net.Socket();

                this.tcpClient.connect(1024, result);

                this.stick = new Stick(1024);
                this.stick.setMaxBodyLen(MaxBodyLen['2048M']);

                this.stick.onBody((body: Buffer) => {
                    var pack: PackData = PackData.parse(body);
                    switch (pack.key) {
                        case "init":
                            this.output.appendLine("连接成功: " + pack.description);
                            this.isConnected = true;
                            break;
                        case "showMessage":
                            this.output.appendLine(pack.buffer.toString());
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

                let packData: PackData = new PackData("runProject", id, buffer);
                this.tcpClient.write(packData.makeBuffer());
            });
        }
    }

    public async runScript(): Promise<void> {
        if (!this.isConnected) {
            Vscode.window.showErrorMessage("请先连接设备!");
            return;
        }
        let activeEditorFileName = Vscode.window.activeTextEditor?.document.fileName;
        if (activeEditorFileName === undefined || !activeEditorFileName.endsWith(".cs")) {
            return;
        }

        let scriptFileName = Path.basename(activeEditorFileName);

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


                let packData: PackData = new PackData("runScript", id + "|" + scriptFileName!, buffer);
                this.tcpClient.write(packData.makeBuffer());
            });
        }
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
                let packData: PackData = new PackData("saveProject", id, buffer);
                this.tcpClient.write(packData.makeBuffer());
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
                }).then(projectName => {
                    if (!projectName) {
                        return;
                    }


                    let programCode =
                        `using System;   
using System.Collections.Generic;
using System.Linq;
using System.Text;               
using astator.Core;      
using astator.Core.Script;

namespace ${projectName};

public class Program
{
    [ProjectEntryMethod(IsUIMode = false)]
    public static void Main(ScriptRuntime runtime)
    {
        Runtime.Instance = runtime;
        Console.WriteLine("我是项目入口方法");
    }
}
`;

                    let testCode =
                        `using System;   
using System.Collections.Generic;
using System.Linq;
using System.Text;               
using astator.Core;      
using astator.Core.Script;

namespace ${projectName};
public class Test
{
    [ScriptEntryMethod(FileName = "Test.cs")]
    public static void Main(ScriptRuntime runtime)
    {
        Runtime.Instance = runtime;
        Console.WriteLine("我是脚本入口方法");
    }
}
`;

                    let runtimeCode =
                        `using System;   
using System.Collections.Generic;
using System.Linq;
using System.Text;    
using astator.Core;
using astator.Core.UI;
using astator.Core.UI.Floaty;
using astator.Core.Threading;
using static astator.Core.Globals.Permission;

namespace ${projectName};

public static class Runtime
{
    public static ScriptRuntime Instance { get; set; }

    public static string ScriptId { get => Instance.ScriptId; }

    public static UiManager Ui { get => Instance.Ui; }

    public static FloatyManager Floatys { get => Instance.Floatys; }

    public static ScriptThreadManager Threads { get => Instance.Threads; }

    public static ScriptTaskManager Tasks { get => Instance.Tasks; }

    public static bool IsUiMode { get => Instance.IsUiMode; }

    public static ScriptState State { get => Instance.State; }

    public static string Directory { get => Instance.Directory; }
}
`;

                    let projectCode =
                        `<Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
        <TargetFramework>net6.0-android</TargetFramework>
        <UseMaui>true</UseMaui>
    </PropertyGroup>

    <ItemGroup>
	  <PackageReference Include="astator.Core" Version="*" />
	</ItemGroup>

    <ProjectExtensions>
        <IsObfuscate>True</IsObfuscate>
        <ApkBuilderConfigs>
            <Label>${projectName}</Label>
            <PackageName>com.script.${projectName}</PackageName>
            <Version>1.0.0</Version>
        </ApkBuilderConfigs>
    </ProjectExtensions>

</Project>
 `;


                    let uri: string = Path.join(uriList[0].fsPath, projectName);

                    Fs.mkdir(uri, { recursive: true }, (err) => {
                        if (err) {
                            Vscode.window.showErrorMessage(err.message);
                            return;
                        }
                        Fs.writeFile(Path.join(uri, "Program.cs"), programCode, (err) => {
                            if (err) {
                                Vscode.window.showWarningMessage(err.message);
                                return;
                            }
                        });

                        Fs.writeFile(Path.join(uri, "Test.cs"), testCode, (err) => {
                            if (err) {
                                Vscode.window.showWarningMessage(err.message);
                                return;
                            }
                        });

                        Fs.writeFile(Path.join(uri, projectName + ".csproj"), projectCode, (err) => {
                            if (err) {
                                Vscode.window.showWarningMessage(err.message);
                                return;
                            }
                        });

                        Fs.mkdir(Path.join(uri, "Core"), { recursive: true }, (err) => {
                            if (err) {
                                Vscode.window.showWarningMessage(err.message);
                                return;
                            }

                            Fs.writeFile(Path.join(uri, "Core", "Runtime.cs"), runtimeCode, (err) => {
                                if (err) {
                                    Vscode.window.showWarningMessage(err.message);
                                    return;
                                }

                                Vscode.commands.executeCommand("vscode.openFolder", Vscode.Uri.file(uri));
                            });

                        });

                    });
                });
            }
        });
    }

    public async openCommands(): Promise<void> {

        let list: string[] =
            [
                "astator: 连接设备",
                "astator: 运行项目",
                "astator: 运行脚本",
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
            else if (result === "astator: 运行脚本") {
                this.runScript();
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


