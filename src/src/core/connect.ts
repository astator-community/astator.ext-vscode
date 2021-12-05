// import * as Os from 'os';
// import * as Dgram from 'dgram';
// import * as Vscode from 'vscode';
// import * as Net from 'net';
// import { MaxBodyLen, Stick } from "@lvgithub/stick";
// import { Output } from "./output";


// interface DeviceInfo {
//     ip: string;
//     updateTime: number;
// }

// export class Connect {
//     ip: string;
//     netmask: string;
//     broadcastIp: string;
//     devices: Map<string, DeviceInfo>;
//     clinet: Net.Socket;
//     stick: Stick;
//     output: Output;

//     public constructor() {
//         let iface = this.getLocalIface();
//         this.ip = iface.address;
//         this.netmask = iface.netmask;
//         this.broadcastIp = this.getBroadcastIp(this.ip, this.netmask);
//         this.devices = new Map<string, DeviceInfo>();
//         this.startUdpService();
//         this.clinet = new Net.Socket();
//         this.stick = new Stick(1024);
//         this.stick.setMaxBodyLen(MaxBodyLen['2048M']);
//         this.output = Output.getInstance();
//     }

//     public connect(key: string): boolean {
//         if (!this.clinet.destroyed) {
//             this.clinet.emit("close");
//         }
//         this.clinet = new Net.Socket();
//         this.startTcpService();
//         let state: boolean = false;
//         let device = this.devices.get(key);
//         if (device) {
//             this.clinet.connect(1025, device.ip, function () {
//                 state = true;
//             });
//         }
//         return state;
//     }

//     private startTcpService() {
//         this.stick.onBody((body: any) => {
//             this.output.appendLine(body.toString());
//             console.log(body.toString());
//         });

//         this.clinet.on('data', (data) => {
//             this.stick.putData(data);
//         });

//         this.clinet.on('error', (error) => {
//             console.log(error);
//         });
//     }

//     public getDeviceList(): Map<string, DeviceInfo> {
//         let time: number = Date.now();
//         for (let key of this.devices.keys()) {
//             let device = this.devices.get(key);
//             if (device) {
//                 if (time - device.updateTime > 60000) {
//                     this.devices.delete(key);
//                 }
//             }
//         }
//         return this.devices;
//     }

//     private startUdpService(): void {

//         var server = Dgram.createSocket("udp4");

//         server.on("error", (err: any) => {
//             console.log("server error:\n" + err.stack);
//             server.close();
//         });

//         server.on("message", (msg: Uint8Array, rinfo: { address: string; port: string; }) => {
//             let message = msg.toString();
//             let array = message.split("---");
//             if (array[0] === "online") {
//                 if (!this.devices.has(array[1])) {
//                     Vscode.window.showInformationMessage(`设备: ${array[1]} (${array[2]})  上线`);
//                 }
//                 this.devices.set(array[1], { ip: array[2], updateTime: Date.now() });
//             }
//             else if (array[0] === "offline") {
//                 if (this.devices.has(array[1])) {
//                     Vscode.window.showInformationMessage(`设备: ${array[1]} (${array[2]})  下线`);
//                     this.devices.delete(array[1]);
//                 }

//             }
//         });

//         server.bind(1024);
//     }

//     private getBroadcastIp(ip: string, netmask: String): string {
//         let ipArr: string[] = ip.split(".");
//         let netmaskArr: string[] = netmask.split(".");
//         let broadcastDomainArr: number[] = [];
//         let broadcastIpArr: number[] = [];
//         for (let i = 0; i < 4; i++) {
//             broadcastDomainArr[i] = Number(ipArr[i]) & Number(netmaskArr[i]);
//         }
//         for (let i = 0; i < 4; i++) {
//             let v = broadcastDomainArr[i] | ~parseInt(netmaskArr[i]);
//             if (v < 0) {
//                 broadcastIpArr[i] = Math.pow(2, 8) - Math.abs(v);
//             }
//             else {
//                 broadcastIpArr[i] = v;
//             }
//         }
//         return broadcastIpArr.join(".");
//     }

//     private getLocalIface(): Os.NetworkInterfaceBase {
//         let ifaces = Os.networkInterfaces();

//         for (let dev in ifaces) {
//             let iface = ifaces[dev];
//             if (iface) {
//                 for (let i = 0; i < iface.length; i++) {
//                     let { family, address, netmask, internal } = iface[i];
//                     if (family === 'IPv4' && address.indexOf('192.168') !== -1 && !internal) {
//                         return iface[i];
//                     }
//                 }
//             }
//         }

//         for (var dev in ifaces) {
//             let iface = ifaces[dev];
//             if (iface) {
//                 for (let i = 0; i < iface.length; i++) {
//                     let { family, address, internal } = iface[i];
//                     if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
//                         return iface[i];
//                     }
//                 }
//             }
//         }
//         throw new Error("获取局域网ip地址失败!");
//     }


// }

