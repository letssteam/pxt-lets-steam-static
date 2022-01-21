"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mkSTMDAPPacketIOWrapper = exports.STMDAPWrapper = void 0;
const DAPjs = require("dapjs");
const SERIAL_BAUDRATE = 115200;
const PERIOD_SERIAL_SEND_MS = 500;
const HEX_FILENAME = "binary.hex";
function log(msg, ...optionsParams) {
    console.log(`STM DAP : ${msg}`, ...optionsParams);
}
function log_error(msg, ...optionsParams) {
    console.error(`STM DAP : ${msg}`, ...optionsParams);
}
class STMDAPWrapper {
    constructor(io) {
        this.io = io;
        this.icon = "usb";
        this.onFlashProgress = null;
        this.onFlashFinish = null;
        this.target = null;
        this.lastSerialPrint = 0;
        this.serialBuffer = "";
        this.lock_serial = false;
        this.familyID = 0x0D28; //this is the microbit vendor id, not quite UF2 family id
        this.io.onDeviceConnectionChanged = (connect) => {
            log("Device connection Changed !");
            this.disconnectAsync()
                .then(() => connect && this.reconnectAsync());
        };
        this.io.onData = (buf) => {
            log("Wrapper On DATA : " + pxt.Util.toHex(buf));
        };
    }
    onSerial(buf, isStderr) {
        log(`On Serial : \n\tBuf : '${buf}'\n\tisStderr : ${isStderr}`);
    }
    ;
    onCustomEvent(type, payload) {
        log(`On Custom Event : \n\type : '${type}'\n\payload : ${payload}`);
    }
    ;
    async reconnectAsync() {
        log("Reconnect");
        await this.io.reconnectAsync();
        await this.initDAP(this.io.dev);
        await this.startSerial(SERIAL_BAUDRATE);
        return Promise.resolve();
    }
    async disconnectAsync() {
        log("Disconnected");
        if (this.target != null) {
            await this.target.disconnect();
            this.stopSerial();
            this.target = null;
        }
        this.serialBuffer = "";
        return Promise.resolve();
    }
    async reflashAsync(resp) {
        var blob = new Blob([resp.outfiles[HEX_FILENAME]], { type: "text/plain" });
        const fileReader = new FileReader();
        console.log(resp);
        // TODO : Remove useless part of the file to speed up the upload
        fileReader.onloadend = (evt) => {
            return this.flashDevice(evt.target.result);
        };
        fileReader.onprogress = (evt) => {
            log(`Blob progress : ${evt.loaded / evt.total * 100.0} %`);
        };
        fileReader.onerror = (evt) => {
            log_error("Failed to load Blob file : ", fileReader.error);
            return Promise.reject();
        };
        fileReader.readAsArrayBuffer(blob);
    }
    sendCustomEventAsync(type, payload) {
        throw new Error("Method not implemented.");
    }
    isTargetReady() {
        return (this.target != null);
    }
    async initDAP(device) {
        const transport = new DAPjs.WebUSB(device);
        this.target = new DAPjs.DAPLink(transport);
        log("DAP initialized !");
    }
    async startSerial(baudrateSerial) {
        return;
        if (this.lock_serial) {
            return;
        }
        this.target.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, (data) => {
            this.serialBuffer += data;
            if (Date.now() - this.lastSerialPrint > PERIOD_SERIAL_SEND_MS) {
                this.processSerialLine(Buffer.from(this.serialBuffer));
                this.serialBuffer = "";
                this.lastSerialPrint = Date.now();
            }
        });
        await this.target.connect();
        await this.target.setSerialBaudrate(baudrateSerial);
        await this.target.disconnect();
        this.target.startSerialRead().catch((e) => log_error("ERROR startSerial : ", e));
        log("Serial Started");
    }
    async stopSerial() {
        return;
        this.target.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, (data) => { });
        this.target.stopSerialRead();
        await this.sleep(1000);
        log("Serial Stopped");
    }
    processSerialLine(line) {
        if (this.onSerial) {
            try {
                // catch encoding bugs
                this.onSerial(line, false);
            }
            catch (err) {
                log_error(`serial decoding error: ${err.message}`);
                pxt.tickEvent("hid.flash.serial.decode.error");
                log_error("", { err, line });
            }
        }
    }
    async flashDevice(buffer) {
        var errorCatch = null;
        log(`Flashing file ${buffer.byteLength} words long`);
        this.target.on(DAPjs.DAPLink.EVENT_PROGRESS, progress => {
            if (this.onFlashProgress != null) {
                this.onFlashProgress(progress);
            }
        });
        try {
            pxt.tickEvent("hid.flash.start");
            log("Stopping Serial");
            this.lock_serial = true;
            await this.stopSerial();
            log("Connect");
            await this.target.connect().catch((e) => { log_error("ERROR connect : ", e); throw e; });
            log("Reset");
            await this.target.reset().catch((e) => { log_error("No reset available on target. Error : ", e); });
            log("Flash");
            await this.target.flash(buffer).catch((e) => { log_error("ERROR flash : ", e); throw e; });
            log("Reset");
            await this.target.reset().catch((e) => { log_error("No reset available on target. Error : ", e); });
            await this.sleep(1000);
            log("Disconnect");
            await this.target.disconnect().catch((e) => { log_error("ERROR disconnect : ", e); throw e; });
        }
        catch (error) {
            errorCatch = error;
            log_error("Failed to flash : ", error);
            return Promise.reject();
        }
        finally {
            this.lock_serial = false;
            this.startSerial(SERIAL_BAUDRATE);
            if (this.onFlashFinish != null) {
                this.onFlashFinish(errorCatch);
            }
        }
        pxt.tickEvent("hid.flash.success");
        return Promise.resolve();
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.STMDAPWrapper = STMDAPWrapper;
function mkSTMDAPPacketIOWrapper(io) {
    pxt.log(`packetio: mk wrapper STM_dap wrapper`);
    return new STMDAPWrapper(io);
}
exports.mkSTMDAPPacketIOWrapper = mkSTMDAPPacketIOWrapper;
//# sourceMappingURL=stm_dap_flash.js.map