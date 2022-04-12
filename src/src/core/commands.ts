/* eslint-disable @typescript-eslint/naming-convention */
import * as Vscode from 'vscode';
import * as Fs from "fs";
import * as Path from 'path';
import { ClientCommands } from './clientCommands';
import { ServerCommands } from './serverCommands';
import { Output } from './output';


export class Commands {
    extContext: Vscode.ExtensionContext;

    constructor(extContext: Vscode.ExtensionContext) {
        this.extContext = extContext;
        ServerCommands.startAsync();
    }

    public async connectDevice() {
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
                this.extContext.globalState.update("deviceList", deviceList);
                ClientCommands.connectAsync(result);
                deviceList.pop();
                deviceList.pop();
                deviceList.splice(deviceList.indexOf(result), 1);
                deviceList.unshift(result);
            }
        }
    }

    public async connectLatestDevice() {
        let deviceList = this.extContext.globalState.get<string[]>("deviceList", []).slice();
        if (deviceList.length >= 15) {
            deviceList.splice(15, deviceList.length - 15);
        }
        else if (deviceList.length === 0) {
            Vscode.window.showErrorMessage("设备列表为空!");
            return;
        }
        ClientCommands.connectAsync(deviceList[0]);
    }

    public runProject() {
        let clientISconnected = ClientCommands.checkIsConnected();
        let serverISconnected = ServerCommands.checkIsConnected();

        if (!clientISconnected && !serverISconnected) {
            Vscode.window.showErrorMessage("未连接设备, 请连接设备后重试!");
        }

        if (clientISconnected) {
            ClientCommands.runProject();
        }
        if (serverISconnected) {
            ServerCommands.runProject();
        }
    }

    public async runScript(): Promise<void> {
        let clientISconnected = ClientCommands.checkIsConnected();
        let serverISconnected = ServerCommands.checkIsConnected();

        if (!clientISconnected && !serverISconnected) {
            Vscode.window.showErrorMessage("未连接设备, 请连接设备后重试!");
        }

        if (clientISconnected) {
            ClientCommands.runScript();
        }
        if (serverISconnected) {
            ServerCommands.runScript();
        }
    }

    public async saveProject(): Promise<void> {
        let clientISconnected = ClientCommands.checkIsConnected();
        let serverISconnected = ServerCommands.checkIsConnected();

        if (!clientISconnected && !serverISconnected) {
            Vscode.window.showErrorMessage("未连接设备, 请连接设备后重试!");
        }

        if (clientISconnected) {
            ClientCommands.saveProject();
        }
        if (serverISconnected) {
            ServerCommands.saveProject();
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
                        `using astator.Core.Script;
using AstatorScript1.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using ${projectName}.Core;

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
                        `using astator.Core.Script;
using AstatorScript1.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using ${projectName}.Core;

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
                        `
using System;
using astator.Core.UI;
using astator.Core.UI.Floaty;
using astator.Core.Threading;
using astator.Core.Script;
using Android.App;

namespace ${projectName}.Core;
public static class Runtime
{
    
    /// <summary>
    /// 实例
    /// </summary>
    public static ScriptRuntime Instance { get; set; }

    /// <summary>
    /// 脚本自身的activity, 非ui模式时为null
    /// </summary>
    public static Activity Activity => Instance.Activity;

    /// <summary>
    /// 脚本id
    /// </summary>
    public static string ScriptId => Instance.ScriptId;

    /// <summary>
    /// ui管理
    /// </summary>
    public static UiManager Ui => Instance.Ui;

    /// <summary>
    /// 悬浮窗相关
    /// </summary>
    public static FloatyHelper FloatyHelper => Instance.FloatyHelper;

    /// <summary>
    /// 线程管理
    /// </summary>
    public static ThreadManager Threads => Instance.Threads;

    /// <summary>
    /// Task管理
    /// </summary>
    public static TaskManager Tasks => Instance.Tasks;

    public static PermissionHelper PermissionHelper => Instance.PermissionHelper;

    /// <summary>
    /// 是否为ui模式
    /// </summary>
    public static bool IsUiMode => Instance.IsUiMode;

    /// <summary>
    /// 脚本工作路径
    /// </summary>
    public static string WorkDir => Instance.WorkDir;

    /// <summary>
    /// 在脚本停止时退出应用, 只在打包apk有效
    /// </summary>
    public static bool IsExitAppOnStoped => Instance.IsExitAppOnStoped;

    /// <summary>
    /// 添加一个脚本停止时的回调
    /// </summary>
    public static void AddExitCallback(Action callback) => Instance.AddExitCallback(callback);
    
    /// <summary>
    /// 停止脚本
    /// </summary>
    public static void SetStop() => Instance.SetStop();
}              
`;

                    let projectCode =
                        `<Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
        <TargetFramework>net6.0-android</TargetFramework>
        <OutputType>Library</OutputType>
        <RootNamespace>$safeprojectname$</RootNamespace>
        <UseMaui>true</UseMaui>
                    
        <SupportedOSPlatformVersion>24.0</SupportedOSPlatformVersion>
    </PropertyGroup>
                    
    <ItemGroup>
        <PackageReference Include="astator.Core" Version="*" />
    </ItemGroup>
                    
    <ProjectExtensions>
        <IsObfuscate>true</IsObfuscate>
        <UseOCR>false</UseOCR>
        <BuildX86>true</BuildX86>
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

                        Fs.mkdir(Path.join(uri, "assets"), { recursive: true }, (_) => {

                        });

                        Fs.mkdir(Path.join(uri, "ref"), { recursive: true }, (_) => {

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
                "连接设备",
                "连接最近的设备",
                "新建项目",
                "保存项目",
                "运行脚本",
                "运行项目",
            ];
        let result = await Vscode.window.showQuickPick(list, { title: "astator命令" });
        if (result) {
            if (result === "连接设备") {
                this.connectDevice();
            }
            else if (result === "连接最近的设备") {
                this.connectLatestDevice();
            }
            else if (result === "运行项目") {
                this.runProject();
            }
            else if (result === "运行脚本") {
                this.runScript();
            }
            else if (result === "保存项目") {
                this.saveProject();
            }
            else if (result === "新建项目") {
                this.createProject();
            }
        }
    }

    // public createCSFile(): void {

    // }
}


