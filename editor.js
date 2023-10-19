(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
/// <reference path="../node_modules/pxt-core/localtypings/pxtarget.d.ts" />
/// <reference path="../node_modules/pxt-core/built/pxtblocks.d.ts" />
/// <reference path="../node_modules/pxt-core/built/pxtcompiler.d.ts" />
/// <reference path="../node_modules/pxt-core/built/pxtlib.d.ts" />
/// <reference path="../node_modules/pxt-core/built/pxteditor.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
//import * as dialogs from "./dialogs";
const flash = require("./stm_dap_flash");
//import * as patch from "./patch";
pxt.editor.initExtensionsAsync = function (opts) {
    pxt.debug("loading STM target extensions...");
    console.log("loading STM target extensions...");
    let body = document.getElementsByTagName("body")[0];
    let container = document.createElement("div");
    let content = document.createElement("div");
    container.setAttribute("id", "upload_modal_container");
    container.style.backgroundColor = "rgba(20, 20, 20, 0.7)";
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.zIndex = "99999";
    container.style.display = "none";
    content.style.zIndex = "999999";
    content.style.width = "25vw";
    content.style.position = "relative";
    content.style.top = "50%";
    content.style.left = "50%";
    content.style.transform = "translate(-50%, -50%)";
    content.style.borderRadius = "5px";
    content.style.overflow = "hidden";
    content.innerHTML = `<div style="padding: 8px; background-color: #e9407f; color: #ffffff;">
            <h3>Uploading</h3>
        </div>
        <div style="padding: 16px; background-color: white;">
            <p>
                Your program is uploading to your target, please wait.<br/><br/>
                <i>Do not unplug your board, do not close this tab nor change tab during uploading.</i><br/>
            </p>
            <div style="background-color: #cfcfcf; height: 20px; border-radius: 10px; overflow: hidden;">
                <p id="upload_modal_value" style="float: left; width: 100%; height: 100%; text-align: center">0%</p>
                <div id="upload_modal_bar" style="background-color: #3bbdd6; width: 0%; height: 100%;"></div>
            </div>
            <p id="upload_modal_message" style="display: none; padding-top: 8px;">
            </p>
            <div id="upload_modal_button" style="text-align: right; display: none;">
                <button onclick="document.getElementById('upload_modal_container').style.display = 'none'" style="border-radius: 10px; padding: 8px 32px; border: none; background: #e9407f; color: white; font-weight: bold; margin-top: 8px; cursor: pointer;">"Ok"</button>
            </div>
        </div>`;
    container.appendChild(content);
    body.appendChild(container);
    const manyAny = Math;
    if (!manyAny.imul)
        manyAny.imul = function (a, b) {
            const ah = (a >>> 16) & 0xffff;
            const al = a & 0xffff;
            const bh = (b >>> 16) & 0xffff;
            const bl = b & 0xffff;
            // the shift by 0 fixes the sign on the high part
            // the final |0 converts the unsigned value into a signed value
            return (al * bl + (((ah * bl + al * bh) << 16) >>> 0)) | 0;
        };
    const res = {
        hexFileImporters: [],
    };
    res.deployAsync = async function (r) {
        var wrapper = (await pxt.packetio.initAsync());
        if (!r.success) {
            return Promise.reject();
        }
        if (wrapper.isTargetReady() && !r.saveOnly) {
            wrapper.onFlashFinish = (error) => {
                wrapper.onFlashProgress = null;
                wrapper.onFlashFinish = null;
                if (error == null) {
                    document.getElementById("upload_modal_message").innerHTML = `<span style="color: #22AA22">Upload complete !</span>`;
                }
                else if (error instanceof Error) {
                    document.getElementById("upload_modal_message").innerHTML = `<span style="color: #FF5500">Upload failed !</span><br>Reason: [${error.name}] ${error.message}<br/><br/>Try unplugging your card and then plugging it back in.`;
                }
                else {
                    document.getElementById("upload_modal_message").innerHTML = `<span style="color: #FF5500">Upload failed !</span><br>Reason: ${error}<br/><br/>Try unplugging your card and then plugging it back in.`;
                }
                document.getElementById("upload_modal_button").style.display = "block";
                document.getElementById("upload_modal_message").style.display = "block";
            };
            wrapper.onFlashProgress = (prg) => {
                let bar = document.getElementById("upload_modal_bar");
                let text = document.getElementById("upload_modal_value");
                text.innerText = Math.round(prg * 100) + "%";
                bar.style.width = `${prg * 100}%`;
            };
            document.getElementById("upload_modal_container").style.display = "block";
            document.getElementById("upload_modal_message").style.display = "none";
            document.getElementById("upload_modal_message").innerText = "";
            document.getElementById("upload_modal_button").style.display = "none";
            wrapper.onFlashProgress(0);
            return wrapper.reflashAsync(r).catch(() => {
                console.error("Failed to upload...");
                return pxt.commands.saveOnlyAsync(r);
            });
        }
        else {
            console.log("Target not ready or save only !");
            return pxt.commands.saveOnlyAsync(r);
        }
    };
    pxt.usb.setFilters([
        {
            vendorId: 0x0d28,
            productId: 0x0204,
            classCode: 0xff,
            subclassCode: 0x03, // the ctrl pipe endpoint
        },
        {
            vendorId: 0x0d28,
            productId: 0x0204,
            classCode: 0xff,
            subclassCode: 0x00, // the custom CMSIS2 endpoint
        },
    ]);
    res.mkPacketIOWrapper = flash.mkSTMDAPPacketIOWrapper;
    // res.blocklyPatch = patch.patchBlocks;
    // res.renderBrowserDownloadInstructions = dialogs.renderBrowserDownloadInstructions;
    // res.renderUsbPairDialog = dialogs.renderUsbPairDialog;
    return Promise.resolve(res);
};

},{"./stm_dap_flash":2}],2:[function(require,module,exports){
(function (Buffer){(function (){
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
        this.initialized = false;
        this.icon = "usb";
        this.onFlashProgress = null;
        this.onFlashFinish = null;
        this.target = null;
        this.lastSerialPrint = 0;
        this.serialBuffer = "";
        this.lock_serial = false;
        this.familyID = 0x0d28; //this is the microbit vendor id, not quite UF2 family id
        this.io.onDeviceConnectionChanged = (connect) => {
            log("Device connection Changed !");
            this.disconnectAsync().then(() => connect && this.reconnectAsync());
        };
        this.io.onData = (buf) => {
            log("Wrapper On DATA : " + pxt.Util.toHex(buf));
        };
    }
    onSerial(buf, isStderr) {
        log(`On Serial : \n\tBuf : '${buf}'\n\tisStderr : ${isStderr}`);
    }
    onCustomEvent(type, payload) {
        log(`On Custom Event : \n\type : '${type}'\n\payload : ${payload}`);
    }
    async reconnectAsync() {
        log("Reconnect");
        this.initialized = false;
        await this.io.reconnectAsync();
        await this.initDAP(this.io.dev);
        await this.startSerial(SERIAL_BAUDRATE);
        this.initialized = true;
        return Promise.resolve();
    }
    async disconnectAsync() {
        log("Disconnected");
        this.initialized = false;
        if (this.target != null) {
            await this.target.disconnect();
            this.stopSerial();
            this.target = null;
        }
        this.serialBuffer = "";
        return Promise.resolve();
    }
    isConnected() {
        return this.io.isConnected() && this.initialized;
    }
    isConnecting() {
        return (this.io.isConnecting() || (this.io.isConnected() && !this.initialized));
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
            log(`Blob progress : ${(evt.loaded / evt.total) * 100.0} %`);
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
        return this.target != null;
    }
    async initDAP(device) {
        const transport = new DAPjs.WebUSB(device);
        this.target = new DAPjs.DAPLink(transport);
        log("DAP initialized !");
    }
    async startSerial(baudrateSerial) {
        //return;
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
        this.target
            .startSerialRead()
            .catch((e) => log_error("ERROR startSerial : ", e));
        log("Serial Started");
    }
    async stopSerial() {
        //return;
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
        this.target.on(DAPjs.DAPLink.EVENT_PROGRESS, (progress) => {
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
            await this.target.connect().catch((e) => {
                log_error("ERROR connect : ", e);
                throw e;
            });
            log("Reset");
            await this.target.reset().catch((e) => {
                log_error("No reset available on target. Error : ", e);
            });
            log("Flash");
            await this.target.flash(buffer).catch((e) => {
                log_error("ERROR flash : ", e);
                throw e;
            });
            log("Reset");
            await this.target.reset().catch((e) => {
                log_error("No reset available on target. Error : ", e);
            });
            await this.sleep(1000);
            log("Disconnect");
            await this.target.disconnect().catch((e) => {
                log_error("ERROR disconnect : ", e);
                throw e;
            });
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
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.STMDAPWrapper = STMDAPWrapper;
function mkSTMDAPPacketIOWrapper(io) {
    pxt.log(`packetio: mk wrapper STM_dap wrapper`);
    return new STMDAPWrapper(io);
}
exports.mkSTMDAPPacketIOWrapper = mkSTMDAPPacketIOWrapper;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":4,"dapjs":5}],3:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],4:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpreted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayView (arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    var copy = new Uint8Array(arrayView)
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
  }
  return fromArrayLike(arrayView)
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      if (pos + buf.length > buffer.length) {
        Buffer.from(buf).copy(buffer, pos)
      } else {
        Uint8Array.prototype.set.call(
          buffer,
          buf,
          pos
        )
      }
    } else if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    } else {
      buf.copy(buffer, pos)
    }
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
      case 'latin1':
      case 'binary':
        return asciiWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF)
      ? 4
      : (firstByte > 0xDF)
          ? 3
          : (firstByte > 0xBF)
              ? 2
              : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
  for (var i = 0; i < bytes.length - 1; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUintLE =
Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUintBE =
Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUint8 =
Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUint16LE =
Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUint16BE =
Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUint32LE =
Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUint32BE =
Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUintLE =
Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUintBE =
Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUint8 =
Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUint16LE =
Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUint16BE =
Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUint32LE =
Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUint32BE =
Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":3,"buffer":4,"ieee754":6}],5:[function(require,module,exports){
(function (Buffer){(function (){
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t=t||self).DAPjs={})}(this,(function(t){"use strict";
/*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */var e=function(t,r){return(e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(t,r)};function r(t,r){function n(){this.constructor=t}e(t,r),t.prototype=null===r?Object.create(r):(n.prototype=r.prototype,new n)}function n(t,e,r,n){return new(r||(r=Promise))((function(i,s){function o(t){try{c(n.next(t))}catch(t){s(t)}}function u(t){try{c(n.throw(t))}catch(t){s(t)}}function c(t){var e;t.done?i(t.value):(e=t.value,e instanceof r?e:new r((function(t){t(e)}))).then(o,u)}c((n=n.apply(t,e||[])).next())}))}function i(t,e){var r,n,i,s,o={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return s={next:u(0),throw:u(1),return:u(2)},"function"==typeof Symbol&&(s[Symbol.iterator]=function(){return this}),s;function u(s){return function(u){return function(s){if(r)throw new TypeError("Generator is already executing.");for(;o;)try{if(r=1,n&&(i=2&s[0]?n.return:s[0]?n.throw||((i=n.return)&&i.call(n),0):n.next)&&!(i=i.call(n,s[1])).done)return i;switch(n=0,i&&(s=[2&s[0],i.value]),s[0]){case 0:case 1:i=s;break;case 4:return o.label++,{value:s[1],done:!1};case 5:o.label++,n=s[1],s=[0];continue;case 7:s=o.ops.pop(),o.trys.pop();continue;default:if(!(i=o.trys,(i=i.length>0&&i[i.length-1])||6!==s[0]&&2!==s[0])){o=0;continue}if(3===s[0]&&(!i||s[1]>i[0]&&s[1]<i[3])){o.label=s[1];break}if(6===s[0]&&o.label<i[1]){o.label=i[1],i=s;break}if(i&&o.label<i[2]){o.label=i[2],o.ops.push(s);break}i[2]&&o.ops.pop(),o.trys.pop();continue}s=e.call(t,o)}catch(t){s=[6,t],n=0}finally{r=i=0}if(5&s[0])throw s[1];return{value:s[0]?s[1]:void 0,done:!0}}([s,u])}}}function s(){}function o(){o.init.call(this)}function u(t){return void 0===t._maxListeners?o.defaultMaxListeners:t._maxListeners}function c(t,e,r){if(e)t.call(r);else for(var n=t.length,i=w(t,n),s=0;s<n;++s)i[s].call(r)}function a(t,e,r,n){if(e)t.call(r,n);else for(var i=t.length,s=w(t,i),o=0;o<i;++o)s[o].call(r,n)}function h(t,e,r,n,i){if(e)t.call(r,n,i);else for(var s=t.length,o=w(t,s),u=0;u<s;++u)o[u].call(r,n,i)}function f(t,e,r,n,i,s){if(e)t.call(r,n,i,s);else for(var o=t.length,u=w(t,o),c=0;c<o;++c)u[c].call(r,n,i,s)}function l(t,e,r,n){if(e)t.apply(r,n);else for(var i=t.length,s=w(t,i),o=0;o<i;++o)s[o].apply(r,n)}function d(t,e,r,n){var i,o,c,a;if("function"!=typeof r)throw new TypeError('"listener" argument must be a function');if((o=t._events)?(o.newListener&&(t.emit("newListener",e,r.listener?r.listener:r),o=t._events),c=o[e]):(o=t._events=new s,t._eventsCount=0),c){if("function"==typeof c?c=o[e]=n?[r,c]:[c,r]:n?c.unshift(r):c.push(r),!c.warned&&(i=u(t))&&i>0&&c.length>i){c.warned=!0;var h=new Error("Possible EventEmitter memory leak detected. "+c.length+" "+e+" listeners added. Use emitter.setMaxListeners() to increase limit");h.name="MaxListenersExceededWarning",h.emitter=t,h.type=e,h.count=c.length,a=h,"function"==typeof console.warn?console.warn(a):console.log(a)}}else c=o[e]=r,++t._eventsCount;return t}function p(t,e,r){var n=!1;function i(){t.removeListener(e,i),n||(n=!0,r.apply(t,arguments))}return i.listener=r,i}function v(t){var e=this._events;if(e){var r=e[t];if("function"==typeof r)return 1;if(r)return r.length}return 0}function w(t,e){for(var r=new Array(e);e--;)r[e]=t[e];return r}s.prototype=Object.create(null),o.EventEmitter=o,o.usingDomains=!1,o.prototype.domain=void 0,o.prototype._events=void 0,o.prototype._maxListeners=void 0,o.defaultMaxListeners=10,o.init=function(){this.domain=null,o.usingDomains&&undefined.active,this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=new s,this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},o.prototype.setMaxListeners=function(t){if("number"!=typeof t||t<0||isNaN(t))throw new TypeError('"n" argument must be a positive number');return this._maxListeners=t,this},o.prototype.getMaxListeners=function(){return u(this)},o.prototype.emit=function(t){var e,r,n,i,s,o,u,d="error"===t;if(o=this._events)d=d&&null==o.error;else if(!d)return!1;if(u=this.domain,d){if(e=arguments[1],!u){if(e instanceof Error)throw e;var p=new Error('Uncaught, unspecified "error" event. ('+e+")");throw p.context=e,p}return e||(e=new Error('Uncaught, unspecified "error" event')),e.domainEmitter=this,e.domain=u,e.domainThrown=!1,u.emit("error",e),!1}if(!(r=o[t]))return!1;var v="function"==typeof r;switch(n=arguments.length){case 1:c(r,v,this);break;case 2:a(r,v,this,arguments[1]);break;case 3:h(r,v,this,arguments[1],arguments[2]);break;case 4:f(r,v,this,arguments[1],arguments[2],arguments[3]);break;default:for(i=new Array(n-1),s=1;s<n;s++)i[s-1]=arguments[s];l(r,v,this,i)}return!0},o.prototype.addListener=function(t,e){return d(this,t,e,!1)},o.prototype.on=o.prototype.addListener,o.prototype.prependListener=function(t,e){return d(this,t,e,!0)},o.prototype.once=function(t,e){if("function"!=typeof e)throw new TypeError('"listener" argument must be a function');return this.on(t,p(this,t,e)),this},o.prototype.prependOnceListener=function(t,e){if("function"!=typeof e)throw new TypeError('"listener" argument must be a function');return this.prependListener(t,p(this,t,e)),this},o.prototype.removeListener=function(t,e){var r,n,i,o,u;if("function"!=typeof e)throw new TypeError('"listener" argument must be a function');if(!(n=this._events))return this;if(!(r=n[t]))return this;if(r===e||r.listener&&r.listener===e)0==--this._eventsCount?this._events=new s:(delete n[t],n.removeListener&&this.emit("removeListener",t,r.listener||e));else if("function"!=typeof r){for(i=-1,o=r.length;o-- >0;)if(r[o]===e||r[o].listener&&r[o].listener===e){u=r[o].listener,i=o;break}if(i<0)return this;if(1===r.length){if(r[0]=void 0,0==--this._eventsCount)return this._events=new s,this;delete n[t]}else!function(t,e){for(var r=e,n=r+1,i=t.length;n<i;r+=1,n+=1)t[r]=t[n];t.pop()}(r,i);n.removeListener&&this.emit("removeListener",t,u||e)}return this},o.prototype.removeAllListeners=function(t){var e,r;if(!(r=this._events))return this;if(!r.removeListener)return 0===arguments.length?(this._events=new s,this._eventsCount=0):r[t]&&(0==--this._eventsCount?this._events=new s:delete r[t]),this;if(0===arguments.length){for(var n,i=Object.keys(r),o=0;o<i.length;++o)"removeListener"!==(n=i[o])&&this.removeAllListeners(n);return this.removeAllListeners("removeListener"),this._events=new s,this._eventsCount=0,this}if("function"==typeof(e=r[t]))this.removeListener(t,e);else if(e)do{this.removeListener(t,e[e.length-1])}while(e[0]);return this},o.prototype.listeners=function(t){var e,r=this._events;return r&&(e=r[t])?"function"==typeof e?[e.listener||e]:function(t){for(var e=new Array(t.length),r=0;r<e.length;++r)e[r]=t[r].listener||t[r];return e}(e):[]},o.listenerCount=function(t,e){return"function"==typeof t.listenerCount?t.listenerCount(e):v.call(t,e)},o.prototype.listenerCount=v,o.prototype.eventNames=function(){return this._eventsCount>0?Reflect.ownKeys(this._events):[]};var y,m=1e7,b=function(){function t(){this.locked=!1}return t.prototype.lock=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return this.locked?[4,new Promise((function(t){return setTimeout(t,1)}))]:[3,2];case 1:return t.sent(),[3,0];case 2:return this.locked=!0,[2]}}))}))},t.prototype.unlock=function(){this.locked=!1},t}(),g=function(t){function e(e,r,n){void 0===r&&(r=0),void 0===n&&(n=m);var i=t.call(this)||this;i.transport=e,i.mode=r,i.clockFrequency=n,i.connected=!1,i.sendMutex=new b,i.blockSize=i.transport.packetSize-4-1;var s=i.transport.packetSize-2-1;return i.operationCount=Math.floor(s/5),i}return r(e,t),e.prototype.bufferSourceToUint8Array=function(t,e){if(!e)return new Uint8Array([t]);var r=void 0!==e.buffer?e.buffer:e,n=new Uint8Array(r.byteLength+1);return n.set([t]),n.set(new Uint8Array(r),1),n},e.prototype.selectProtocol=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return e=2===t?59196:59294,[4,this.swjSequence(new Uint8Array([255,255,255,255,255,255,255]))];case 1:return r.sent(),[4,this.swjSequence(new Uint16Array([e]))];case 2:return r.sent(),[4,this.swjSequence(new Uint8Array([255,255,255,255,255,255,255]))];case 3:return r.sent(),[4,this.swjSequence(new Uint8Array([0]))];case 4:return r.sent(),[2]}}))}))},e.prototype.send=function(t,e){return n(this,void 0,void 0,(function(){var r,n;return i(this,(function(i){switch(i.label){case 0:return r=this.bufferSourceToUint8Array(t,e),[4,this.sendMutex.lock()];case 1:i.sent(),i.label=2;case 2:return i.trys.push([2,,5,6]),[4,this.transport.write(r)];case 3:return i.sent(),[4,this.transport.read()];case 4:if((n=i.sent()).getUint8(0)!==t)throw new Error("Bad response for "+t+" -> "+n.getUint8(0));switch(t){case 3:case 8:case 9:case 10:case 17:case 18:case 19:case 29:case 23:case 24:case 26:case 21:case 22:case 4:if(0!==n.getUint8(1))throw new Error("Bad status for "+t+" -> "+n.getUint8(1))}return[2,n];case 5:return this.sendMutex.unlock(),[7];case 6:return[2]}}))}))},e.prototype.clearAbort=function(t){return void 0===t&&(t=30),n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.send(8,new Uint8Array([0,t]))];case 1:return e.sent(),[2]}}))}))},e.prototype.dapInfo=function(t){return n(this,void 0,void 0,(function(){var e,r,n,s;return i(this,(function(i){switch(i.label){case 0:return i.trys.push([0,2,,4]),[4,this.send(0,new Uint8Array([t]))];case 1:if(e=i.sent(),0===(r=e.getUint8(1)))return[2,""];switch(t){case 240:case 254:case 255:case 253:if(1===r)return[2,e.getUint8(2)];if(2===r)return[2,e.getUint16(2)];if(4===r)return[2,e.getUint32(2)]}return n=Array.prototype.slice.call(new Uint8Array(e.buffer,2,r)),[2,String.fromCharCode.apply(null,n)];case 2:return s=i.sent(),[4,this.clearAbort()];case 3:throw i.sent(),s;case 4:return[2]}}))}))},e.prototype.swjSequence=function(t,e){return void 0===e&&(e=8*t.byteLength),n(this,void 0,void 0,(function(){var r,n;return i(this,(function(i){switch(i.label){case 0:r=this.bufferSourceToUint8Array(e,t),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(18,r)];case 2:return i.sent(),[3,5];case 3:return n=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),n;case 5:return[2]}}))}))},e.prototype.swjClock=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return r.trys.push([0,2,,4]),[4,this.send(17,new Uint8Array([255&t,(65280&t)>>8,(16711680&t)>>16,(4278190080&t)>>24]))];case 1:return r.sent(),[3,4];case 2:return e=r.sent(),[4,this.clearAbort()];case 3:throw r.sent(),e;case 4:return[2]}}))}))},e.prototype.swjPins=function(t,e,r){return n(this,void 0,void 0,(function(){var n;return i(this,(function(i){switch(i.label){case 0:return i.trys.push([0,2,,4]),[4,this.send(16,new Uint8Array([t,e,255&r,(65280&r)>>8,(16711680&r)>>16,(4278190080&r)>>24]))];case 1:return[2,i.sent().getUint8(1)];case 2:return n=i.sent(),[4,this.clearAbort()];case 3:throw i.sent(),n;case 4:return[2]}}))}))},e.prototype.dapDelay=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return r.trys.push([0,2,,4]),[4,this.send(9,new Uint8Array([255&t,(65280&t)>>8]))];case 1:return r.sent(),[3,4];case 2:return e=r.sent(),[4,this.clearAbort()];case 3:throw r.sent(),e;case 4:return[2]}}))}))},e.prototype.configureTransfer=function(t,e,r){return n(this,void 0,void 0,(function(){var n,s,o;return i(this,(function(i){switch(i.label){case 0:n=new Uint8Array(5),(s=new DataView(n.buffer)).setUint8(0,t),s.setUint16(1,e,!0),s.setUint16(3,r,!0),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(4,n)];case 2:return i.sent(),[3,5];case 3:return o=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),o;case 5:return[2]}}))}))},e.prototype.connect=function(){return n(this,void 0,void 0,(function(){var t,e,r;return i(this,(function(n){switch(n.label){case 0:return!0===this.connected?[2]:[4,this.transport.open()];case 1:n.sent(),n.label=2;case 2:return n.trys.push([2,5,,8]),[4,this.send(17,new Uint32Array([this.clockFrequency]))];case 3:return n.sent(),[4,this.send(2,new Uint8Array([this.mode]))];case 4:if(0===(t=n.sent()).getUint8(1)||0!==this.mode&&t.getUint8(1)!==this.mode)throw new Error("Mode not enabled.");return[3,8];case 5:return e=n.sent(),[4,this.clearAbort()];case 6:return n.sent(),[4,this.transport.close()];case 7:throw n.sent(),e;case 8:return n.trys.push([8,11,,13]),[4,this.configureTransfer(0,100,0)];case 9:return n.sent(),[4,this.selectProtocol(1)];case 10:return n.sent(),[3,13];case 11:return r=n.sent(),[4,this.transport.close()];case 12:throw n.sent(),r;case 13:return this.connected=!0,[2]}}))}))},e.prototype.disconnect=function(){return n(this,void 0,void 0,(function(){var t;return i(this,(function(e){switch(e.label){case 0:if(!1===this.connected)return[2];e.label=1;case 1:return e.trys.push([1,3,,5]),[4,this.send(3)];case 2:return e.sent(),[3,5];case 3:return t=e.sent(),[4,this.clearAbort()];case 4:throw e.sent(),t;case 5:return[4,this.transport.close()];case 6:return e.sent(),this.connected=!1,[2]}}))}))},e.prototype.reconnect=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.disconnect()];case 1:return t.sent(),[4,new Promise((function(t){return setTimeout(t,100)}))];case 2:return t.sent(),[4,this.connect()];case 3:return t.sent(),[2]}}))}))},e.prototype.reset=function(){return n(this,void 0,void 0,(function(){var t;return i(this,(function(e){switch(e.label){case 0:return e.trys.push([0,2,,4]),[4,this.send(10)];case 1:return[2,1===e.sent().getUint8(2)];case 2:return t=e.sent(),[4,this.clearAbort()];case 3:throw e.sent(),t;case 4:return[2]}}))}))},e.prototype.transfer=function(t,e,r,s){return void 0===e&&(e=2),void 0===r&&(r=0),void 0===s&&(s=0),n(this,void 0,void 0,(function(){var n,o,u,c,a,h,f;return i(this,(function(i){switch(i.label){case 0:n="number"==typeof t?[{port:t,mode:e,register:r,value:s}]:t,o=new Uint8Array(2+5*n.length),(u=new DataView(o.buffer)).setUint8(0,0),u.setUint8(1,n.length),n.forEach((function(t,e){var r=2+5*e;u.setUint8(r,t.port|t.mode|t.register),u.setUint32(r+1,t.value||0,!0)})),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(5,o)];case 2:if((c=i.sent()).getUint8(1)!==n.length)throw new Error("Transfer count mismatch");if(2===(a=c.getUint8(2)))throw new Error("Transfer response WAIT");if(4===a)throw new Error("Transfer response FAULT");if(8===a)throw new Error("Transfer response PROTOCOL_ERROR");if(16===a)throw new Error("Transfer response VALUE_MISMATCH");if(7===a)throw new Error("Transfer response NO_ACK");return"number"==typeof t?[2,c.getUint32(3,!0)]:(h=4*n.length,[2,new Uint32Array(c.buffer.slice(3,3+h))]);case 3:return f=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),f;case 5:return[2]}}))}))},e.prototype.transferBlock=function(t,e,r){return n(this,void 0,void 0,(function(){var n,s,o,u,c,a,h,f;return i(this,(function(i){switch(i.label){case 0:o=4,"number"==typeof r?(n=r,s=2):(n=r.length,s=0,o+=r.byteLength),u=new Uint8Array(o),(c=new DataView(u.buffer)).setUint8(0,0),c.setUint16(1,n,!0),c.setUint8(3,t|s|e),"number"!=typeof r&&r.forEach((function(t,e){var r=4+4*e;c.setUint32(r,t,!0)})),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(6,c)];case 2:if((a=i.sent()).getUint16(1,!0)!==n)throw new Error("Transfer count mismatch");if(2===(h=a.getUint8(3)))throw new Error("Transfer response WAIT");if(4===h)throw new Error("Transfer response FAULT");if(8===h)throw new Error("Transfer response PROTOCOL_ERROR");if(7===h)throw new Error("Transfer response NO_ACK");return"number"==typeof r?[2,new Uint32Array(a.buffer.slice(4,4+4*n))]:[3,5];case 3:return f=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),f;case 5:return[2,void 0]}}))}))},e}(o),A=/[\xc0-\xff][\x80-\xbf]*$/g,C=/[\xc0-\xff][\x80-\xbf]*/g,U=function(){function t(){}return t.prototype.decode=function(t){var e=Array.prototype.slice.call(new Uint8Array(t)),r=String.fromCodePoint.apply(void 0,e);this.partialChar&&(r=""+this.partialChar+r,this.partialChar=void 0);var n=r.match(A);if(n){var i=n[0].length;this.partialChar=r.slice(-i),r=r.slice(0,-i)}return r.replace(C,this.decoderReplacer)},t.prototype.decoderReplacer=function(t){var e=t.codePointAt(0)<<24,r=Math.clz32(~e),n=0,i=t.length,s="";if(r<5&&i>=r){for(e=e<<r>>>24+r,n=1;n<r;n+=1)e=e<<6|63&t.codePointAt(n);e<=65535?s+=String.fromCodePoint(e):e<=1114111?(e-=65536,s+=String.fromCodePoint(55296+(e>>10),56320+(1023&e))):n=0}for(;n<i;n+=1)s+="�";return s},t}(),E=new U,P=function(t){function e(r,s,o){void 0===s&&(s=0),void 0===o&&(o=m);var u=t.call(this,r,s,o)||this;return u.serialPolling=!1,u.serialListeners=!1,u.on("newListener",(function(t){return n(u,void 0,void 0,(function(){return i(this,(function(r){return t===e.EVENT_SERIAL_DATA&&0===this.listenerCount(t)&&(this.serialListeners=!0),[2]}))}))})),u.on("removeListener",(function(t){t===e.EVENT_SERIAL_DATA&&(0===u.listenerCount(t)&&(u.serialListeners=!1))})),u}return r(e,t),e.prototype.isBufferBinary=function(t){for(var e=Array.prototype.slice.call(new Uint16Array(t,0,50)),r=String.fromCharCode.apply(null,e),n=0;n<r.length;n++){var i=r.charCodeAt(n);if(65533===i||i<=8)return!0}return!1},e.prototype.writeBuffer=function(t,r,s){return void 0===s&&(s=0),n(this,void 0,void 0,(function(){var n,o,u,c;return i(this,(function(i){switch(i.label){case 0:n=Math.min(t.byteLength,s+r),o=t.slice(s,n),(u=new Uint8Array(o.byteLength+1)).set([o.byteLength]),u.set(new Uint8Array(o),1),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(140,u)];case 2:return i.sent(),[3,5];case 3:return c=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),c;case 5:return this.emit(e.EVENT_PROGRESS,s/t.byteLength),n<t.byteLength?[2,this.writeBuffer(t,r,n)]:[2]}}))}))},e.prototype.flash=function(t,r){return void 0===r&&(r=62),n(this,void 0,void 0,(function(){var n,s,o;return i(this,(function(i){switch(i.label){case 0:n=function(t){return void 0!==t.buffer}(t)?t.buffer:t,s=this.isBufferBinary(n)?0:1,i.label=1;case 1:return i.trys.push([1,6,,8]),[4,this.send(138,new Uint32Array([s]))];case 2:if(0!==i.sent().getUint8(1))throw new Error("Flash error");return[4,this.writeBuffer(n,r)];case 3:return i.sent(),this.emit(e.EVENT_PROGRESS,1),[4,this.send(139)];case 4:if(0!==i.sent().getUint8(1))throw new Error("Flash error");return[4,this.send(137)];case 5:return i.sent(),[3,8];case 6:return o=i.sent(),[4,this.clearAbort()];case 7:throw i.sent(),o;case 8:return[2]}}))}))},e.prototype.getSerialBaudrate=function(){return n(this,void 0,void 0,(function(){var t;return i(this,(function(e){switch(e.label){case 0:return e.trys.push([0,2,,4]),[4,this.send(129)];case 1:return[2,e.sent().getUint32(1,!0)];case 2:return t=e.sent(),[4,this.clearAbort()];case 3:throw e.sent(),t;case 4:return[2]}}))}))},e.prototype.setSerialBaudrate=function(t){return void 0===t&&(t=9600),n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return r.trys.push([0,2,,4]),[4,this.send(130,new Uint32Array([t]))];case 1:return r.sent(),[3,4];case 2:return e=r.sent(),[4,this.clearAbort()];case 3:throw r.sent(),e;case 4:return[2]}}))}))},e.prototype.serialWrite=function(t){return n(this,void 0,void 0,(function(){var e,r;return i(this,(function(n){switch(n.label){case 0:(e=t.split("").map((function(t){return t.charCodeAt(0)}))).unshift(e.length),n.label=1;case 1:return n.trys.push([1,3,,5]),[4,this.send(132,new Uint8Array(e).buffer)];case 2:return n.sent(),[3,5];case 3:return r=n.sent(),[4,this.clearAbort()];case 4:throw n.sent(),r;case 5:return[2]}}))}))},e.prototype.serialRead=function(){return n(this,void 0,void 0,(function(){var t,e,r;return i(this,(function(n){switch(n.label){case 0:return n.trys.push([0,2,,4]),[4,this.send(131)];case 1:return 0===(t=n.sent()).byteLength||(131!==t.getUint8(0)||0===(e=t.getUint8(1)))?[2,void 0]:(2,[2,t.buffer.slice(2,2+e)]);case 2:return r=n.sent(),[4,this.clearAbort()];case 3:throw n.sent(),r;case 4:return[2]}}))}))},e.prototype.startSerialRead=function(t,r){return void 0===t&&(t=100),void 0===r&&(r=!0),n(this,void 0,void 0,(function(){var n,s,o;return i(this,(function(i){switch(i.label){case 0:this.serialPolling=!0,i.label=1;case 1:return this.serialPolling?this.serialListeners?(n=this.connected,!1!==this.connected||!0!==r?[3,3]:[4,this.connect()]):[3,7]:[3,9];case 2:i.sent(),i.label=3;case 3:return[4,this.serialRead()];case 4:return s=i.sent(),!1!==n||!0!==r?[3,6]:[4,this.disconnect()];case 5:i.sent(),i.label=6;case 6:void 0!==s&&(o=E.decode(s),this.emit(e.EVENT_SERIAL_DATA,o)),i.label=7;case 7:return[4,new Promise((function(e){return setTimeout(e,t)}))];case 8:return i.sent(),[3,1];case 9:return[2]}}))}))},e.prototype.stopSerialRead=function(){this.serialPolling=!1},e.EVENT_PROGRESS="progress",e.EVENT_SERIAL_DATA="serial",e}(g),T=function(){function t(t,e,r){void 0===e&&(e=0),void 0===r&&(r=m);this.proxy=void 0!==t.open?new g(t,e,r):t}return t.prototype.waitDelay=function(t,e,r){return void 0===e&&(e=0),void 0===r&&(r=100),n(this,void 0,void 0,(function(){var n;return i(this,(function(i){switch(i.label){case 0:n=!0,e>0&&setTimeout((function(){if(n)throw n=!1,new Error("Wait timed out")}),e),i.label=1;case 1:return n?[4,t()]:[3,5];case 2:return!0===i.sent()?(n=!1,[2]):r>0?[4,new Promise((function(t){return setTimeout(t,e)}))]:[3,4];case 3:i.sent(),i.label=4;case 4:return[3,1];case 5:return[2]}}))}))},t.prototype.concatTypedArray=function(t){if(1===t.length)return t[0];for(var e=0,r=0,n=t;r<n.length;r++){e+=n[r].length}for(var i=new Uint32Array(e),s=0,o=0;s<t.length;s++)i.set(t[s],o),o+=t[s].length;return i},t.prototype.readDPCommand=function(t){return[{mode:2,port:0,register:t}]},t.prototype.writeDPCommand=function(t,e){if(8===t){if(e===this.selectedAddress)return[];this.selectedAddress=e}return[{mode:0,port:0,register:t,value:e}]},t.prototype.readAPCommand=function(t){var e=4278190080&t|240&t;return this.writeDPCommand(8,e).concat({mode:2,port:1,register:t})},t.prototype.writeAPCommand=function(t,e){if(0===t){if(e===this.cswValue)return[];this.cswValue=e}var r=4278190080&t|240&t;return this.writeDPCommand(8,r).concat({mode:0,port:1,register:t,value:e})},t.prototype.readMem16Command=function(t){return this.writeAPCommand(0,587202641).concat(this.writeAPCommand(4,t)).concat(this.readAPCommand(12))},t.prototype.writeMem16Command=function(t,e){return this.writeAPCommand(0,587202641).concat(this.writeAPCommand(4,t)).concat(this.writeAPCommand(12,e))},t.prototype.readMem32Command=function(t){return this.writeAPCommand(0,587202642).concat(this.writeAPCommand(4,t)).concat(this.readAPCommand(12))},t.prototype.writeMem32Command=function(t,e){return this.writeAPCommand(0,587202642).concat(this.writeAPCommand(4,t)).concat(this.writeAPCommand(12,e))},t.prototype.transferSequence=function(t){return n(this,void 0,void 0,(function(){var e,r,n,s;return i(this,(function(i){switch(i.label){case 0:e=(e=[]).concat.apply(e,t),r=[],i.label=1;case 1:return e.length?(n=e.splice(0,this.proxy.operationCount),[4,this.proxy.transfer(n)]):[3,3];case 2:return s=i.sent(),r.push(s),[3,1];case 3:return[2,this.concatTypedArray(r)]}}))}))},t.prototype.connect=function(){return n(this,void 0,void 0,(function(){var t,e=this;return i(this,(function(r){switch(r.label){case 0:return t=-1610612736,[4,this.proxy.connect()];case 1:return r.sent(),[4,this.readDP(0)];case 2:return r.sent(),[4,this.transferSequence([this.writeDPCommand(0,4),this.writeDPCommand(8,0),this.writeDPCommand(4,1342177280)])];case 3:return r.sent(),[4,this.waitDelay((function(){return n(e,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.readDP(4)];case 1:return[2,(e.sent()&t)===t]}}))}))}))];case 4:return r.sent(),[2]}}))}))},t.prototype.disconnect=function(){return this.proxy.disconnect()},t.prototype.reconnect=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.disconnect()];case 1:return t.sent(),[4,new Promise((function(t){return setTimeout(t,100)}))];case 2:return t.sent(),[4,this.connect()];case 3:return t.sent(),[2]}}))}))},t.prototype.reset=function(){return this.proxy.reset()},t.prototype.readDP=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.proxy.transfer(this.readDPCommand(t))];case 1:return[2,e.sent()[0]]}}))}))},t.prototype.writeDP=function(t,e){return n(this,void 0,void 0,(function(){return i(this,(function(r){switch(r.label){case 0:return[4,this.proxy.transfer(this.writeDPCommand(t,e))];case 1:return r.sent(),[2]}}))}))},t.prototype.readAP=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.proxy.transfer(this.readAPCommand(t))];case 1:return[2,e.sent()[0]]}}))}))},t.prototype.writeAP=function(t,e){return n(this,void 0,void 0,(function(){return i(this,(function(r){switch(r.label){case 0:return[4,this.proxy.transfer(this.writeAPCommand(t,e))];case 1:return r.sent(),[2]}}))}))},t.prototype.readMem16=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.proxy.transfer(this.readMem16Command(t))];case 1:return[2,e.sent()[0]]}}))}))},t.prototype.writeMem16=function(t,e){return n(this,void 0,void 0,(function(){return i(this,(function(r){switch(r.label){case 0:return e<<=(2&t)<<3,[4,this.proxy.transfer(this.writeMem16Command(t,e))];case 1:return r.sent(),[2]}}))}))},t.prototype.readMem32=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.proxy.transfer(this.readMem32Command(t))];case 1:return[2,e.sent()[0]]}}))}))},t.prototype.writeMem32=function(t,e){return n(this,void 0,void 0,(function(){return i(this,(function(r){switch(r.label){case 0:return[4,this.proxy.transfer(this.writeMem32Command(t,e))];case 1:return r.sent(),[2]}}))}))},t.prototype.readBlock=function(t,e){return n(this,void 0,void 0,(function(){var r,n,s,o;return i(this,(function(i){switch(i.label){case 0:return[4,this.transferSequence([this.writeAPCommand(0,587202642),this.writeAPCommand(4,t)])];case 1:i.sent(),r=[],n=e,i.label=2;case 2:return n>0?(s=Math.min(n,Math.floor(this.proxy.blockSize/4)),[4,this.proxy.transferBlock(1,12,s)]):[3,4];case 3:return o=i.sent(),r.push(o),n-=s,[3,2];case 4:return[2,this.concatTypedArray(r)]}}))}))},t.prototype.writeBlock=function(t,e){return n(this,void 0,void 0,(function(){var r,n;return i(this,(function(i){switch(i.label){case 0:return[4,this.transferSequence([this.writeAPCommand(0,587202642),this.writeAPCommand(4,t)])];case 1:i.sent(),r=0,i.label=2;case 2:return r<e.length?(n=e.slice(r,r+Math.floor(this.proxy.blockSize/4)),[4,this.proxy.transferBlock(1,12,n)]):[3,4];case 3:return i.sent(),r+=Math.floor(this.proxy.blockSize/4),[3,2];case 4:return[2]}}))}))},t}(),L=48682,_=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype.enableDebug=function(){return this.writeMem32(3758157296,-1604386815)},e.prototype.readCoreRegisterCommand=function(t){return this.writeMem32Command(3758157300,t).concat(this.readMem32Command(3758157296)).concat(this.readMem32Command(3758157304))},e.prototype.writeCoreRegisterCommand=function(t,e){return this.writeMem32Command(3758157304,e).concat(this.writeMem32Command(3758157300,65536|t))},e.prototype.getState=function(){return n(this,void 0,void 0,(function(){var t,e,r;return i(this,(function(n){switch(n.label){case 0:return[4,this.readMem32(3758157296)];case 1:return t=n.sent(),e=524288&t?1:262144&t?2:131072&t?3:4,33554432&t?[4,this.readMem32(3758157296)]:[3,3];case 2:return 33554432&(r=n.sent())&&!(16777216&r)?[2,0]:[2,e];case 3:return[2,e];case 4:return[2]}}))}))},e.prototype.isHalted=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.readMem32(3758157296)];case 1:return[2,!!(131072&t.sent())]}}))}))},e.prototype.halt=function(t,e){return void 0===t&&(t=!0),void 0===e&&(e=0),n(this,void 0,void 0,(function(){var r=this;return i(this,(function(n){switch(n.label){case 0:return[4,this.isHalted()];case 1:return n.sent()?[2]:[4,this.writeMem32(3758157296,-1604386813)];case 2:return n.sent(),t?[2,this.waitDelay((function(){return r.isHalted()}),e)]:[2]}}))}))},e.prototype.resume=function(t,e){return void 0===t&&(t=!0),void 0===e&&(e=0),n(this,void 0,void 0,(function(){var r=this;return i(this,(function(s){switch(s.label){case 0:return[4,this.isHalted()];case 1:return s.sent()?[4,this.writeMem32(3758157104,7)]:[2];case 2:return s.sent(),[4,this.enableDebug()];case 3:return s.sent(),t?[2,this.waitDelay((function(){return n(r,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.isHalted()];case 1:return[2,!t.sent()]}}))}))}),e)]:[2]}}))}))},e.prototype.readCoreRegister=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return[4,this.transferSequence([this.writeMem32Command(3758157300,t),this.readMem32Command(3758157296)])];case 1:if(e=r.sent(),!(65536&e[0]))throw new Error("Register not ready");return[2,this.readMem32(3758157304)]}}))}))},e.prototype.readCoreRegisters=function(t){return n(this,void 0,void 0,(function(){var e,r,n,s,o;return i(this,(function(i){switch(i.label){case 0:e=[],r=0,n=t,i.label=1;case 1:return r<n.length?(s=n[r],[4,this.readCoreRegister(s)]):[3,4];case 2:o=i.sent(),e.push(o),i.label=3;case 3:return r++,[3,1];case 4:return[2,e]}}))}))},e.prototype.writeCoreRegister=function(t,e){return n(this,void 0,void 0,(function(){var r;return i(this,(function(n){switch(n.label){case 0:return[4,this.transferSequence([this.writeMem32Command(3758157304,e),this.writeMem32Command(3758157300,65536|t),this.readMem32Command(3758157296)])];case 1:if(r=n.sent(),!(65536&r[0]))throw new Error("Register not ready");return[2]}}))}))},e.prototype.execute=function(t,e,r,s,o){void 0===o&&(o=t+1);for(var u=[],c=5;c<arguments.length;c++)u[c-5]=arguments[c];return n(this,void 0,void 0,(function(){var n,c,a,h=this;return i(this,(function(i){switch(i.label){case 0:for(e[e.length-1]!==L&&((n=new Uint32Array(e.length+1)).set(e),n.set([L],e.length-1),e=n),c=[this.writeCoreRegisterCommand(13,r),this.writeCoreRegisterCommand(15,s),this.writeCoreRegisterCommand(14,o)],a=0;a<Math.min(u.length,12);a++)c.push(this.writeCoreRegisterCommand(a,u[a]));return c.push(this.writeCoreRegisterCommand(16,16777216)),[4,this.halt()];case 1:return i.sent(),[4,this.transferSequence(c)];case 2:return i.sent(),[4,this.writeBlock(t,e)];case 3:return i.sent(),[4,this.resume(!1)];case 4:return i.sent(),[4,this.waitDelay((function(){return h.isHalted()}),1e4)];case 5:return i.sent(),[2]}}))}))},e.prototype.softReset=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.writeMem32(3758157308,0)];case 1:return t.sent(),[2,this.writeMem32(3758157068,100270084)]}}))}))},e.prototype.setTargetResetState=function(t){return void 0===t&&(t=!0),n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return[4,this.writeMem32(3758157308,1)];case 1:return r.sent(),!0!==t?[3,3]:[4,this.reset()];case 2:return r.sent(),[3,6];case 3:return[4,this.readMem32(3758157068)];case 4:return e=r.sent(),[4,this.writeMem32(3758157068,100270084|e)];case 5:r.sent(),r.label=6;case 6:return[4,this.writeMem32(3758157308,0)];case 7:return r.sent(),[2]}}))}))},e}(T);(y=t.FPBCtrlMask||(t.FPBCtrlMask={}))[y.ENABLE=1]="ENABLE",y[y.KEY=2]="KEY";var M=function(){function t(t){this.device=t,this.os="browser",this.packetSize=64}return t.prototype.open=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){return[2]}))}))},t.prototype.close=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){return this.device.close(),[2]}))}))},t.prototype.read=function(){return n(this,void 0,void 0,(function(){var t,e,r=this;return i(this,(function(n){switch(n.label){case 0:return[4,new Promise((function(t,e){r.device.read((function(r,n){if(r)return e(new Error(r));t(n)}))}))];case 1:return t=n.sent(),e=new Uint8Array(t).buffer,[2,new DataView(e)]}}))}))},t.prototype.write=function(t){return n(this,void 0,void 0,(function(){var e,r;return i(this,(function(n){for(e=function(t){return void 0!==t.buffer}(t)?t.buffer:t,r=Array.prototype.slice.call(new Uint8Array(e));r.length<this.packetSize;)r.push(0);if("win32"===this.os&&r.unshift(0),this.device.write(r)!==r.length)throw new Error("Incorrect bytecount written");return[2]}))}))},t}(),x=function(){function t(t,e,r,n){void 0===e&&(e=255),void 0===r&&(r=1),void 0===n&&(n=!1),this.device=t,this.interfaceClass=e,this.configuration=r,this.alwaysControlTransfer=n,this.packetSize=64}return t.prototype.bufferToDataView=function(t){var e=new Uint8Array(t).buffer;return new DataView(e)},t.prototype.isView=function(t){return void 0!==t.buffer},t.prototype.bufferSourceToBuffer=function(t){var e=this.isView(t)?t.buffer:t;return Buffer.from(e)},t.prototype.extendBuffer=function(t,e){var r=this.isView(t)?t.buffer:t,n=Math.min(r.byteLength,e),i=new Uint8Array(n);return i.set(new Uint8Array(r)),i},t.prototype.open=function(){return n(this,void 0,void 0,(function(){var t,e,r,n,s,o,u=this;return i(this,(function(i){switch(i.label){case 0:return this.device.open(),[4,new Promise((function(t,e){u.device.setConfiguration(u.configuration,(function(r){r?e(new Error(r)):t()}))}))];case 1:if(i.sent(),!(t=this.device.interfaces.filter((function(t){return t.descriptor.bInterfaceClass===u.interfaceClass}))).length)throw new Error("No valid interfaces found.");if((e=t.find((function(t){return t.endpoints.length>0})))||(e=t[0]),this.interfaceNumber=e.interfaceNumber,!this.alwaysControlTransfer){for(r=e.endpoints,this.endpointIn=void 0,this.endpointOut=void 0,n=0,s=r;n<s.length;n++)"in"!==(o=s[n]).direction||this.endpointIn?"out"!==o.direction||this.endpointOut||(this.endpointOut=o):this.endpointIn=o;if(this.endpointIn||this.endpointOut)try{e.claim()}catch(t){this.endpointIn=void 0,this.endpointOut=void 0}}return[2]}}))}))},t.prototype.close=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){return this.device.close(),[2]}))}))},t.prototype.read=function(){return n(this,void 0,void 0,(function(){var t,e=this;return i(this,(function(r){switch(r.label){case 0:if(void 0===this.interfaceNumber)throw new Error("No device opened");return[4,new Promise((function(t,r){e.endpointIn?e.endpointIn.transfer(e.packetSize,(function(e,n){e?r(e):t(n)})):e.device.controlTransfer(161,1,256,e.interfaceNumber,e.packetSize,(function(e,n){e?r(e):n?t(n):r(new Error("No buffer read"))}))}))];case 1:return t=r.sent(),[2,this.bufferToDataView(t)]}}))}))},t.prototype.write=function(t){return n(this,void 0,void 0,(function(){var e,r,n=this;return i(this,(function(i){switch(i.label){case 0:if(void 0===this.interfaceNumber)throw new Error("No device opened");return e=this.extendBuffer(t,this.packetSize),r=this.bufferSourceToBuffer(e),[4,new Promise((function(t,e){n.endpointOut?n.endpointOut.transfer(r,(function(r){if(r)return e(r);t()})):n.device.controlTransfer(33,9,512,n.interfaceNumber,r,(function(r){if(r)return e(r);t()}))}))];case 1:return i.sent(),[2]}}))}))},t}(),S=function(){function t(t,e,r,n){void 0===e&&(e=255),void 0===r&&(r=1),void 0===n&&(n=!1),this.device=t,this.interfaceClass=e,this.configuration=r,this.alwaysControlTransfer=n,this.packetSize=64}return t.prototype.extendBuffer=function(t,e){var r=void 0!==t.buffer?t.buffer:t,n=Math.min(r.byteLength,e),i=new Uint8Array(n);return i.set(new Uint8Array(r)),i},t.prototype.open=function(){return n(this,void 0,void 0,(function(){var t,e,r,n,s,o,u=this;return i(this,(function(i){switch(i.label){case 0:return[4,this.device.open()];case 1:return i.sent(),[4,this.device.selectConfiguration(this.configuration)];case 2:if(i.sent(),!(t=this.device.configuration.interfaces.filter((function(t){return t.alternates[0].interfaceClass===u.interfaceClass}))).length)throw new Error("No valid interfaces found.");if((e=t.find((function(t){return t.alternates[0].endpoints.length>0})))||(e=t[0]),this.interfaceNumber=e.interfaceNumber,!this.alwaysControlTransfer)for(r=e.alternates[0].endpoints,this.endpointIn=void 0,this.endpointOut=void 0,n=0,s=r;n<s.length;n++)"in"!==(o=s[n]).direction||this.endpointIn?"out"!==o.direction||this.endpointOut||(this.endpointOut=o):this.endpointIn=o;return[2,this.device.claimInterface(this.interfaceNumber)]}}))}))},t.prototype.close=function(){return this.device.close()},t.prototype.read=function(){return n(this,void 0,void 0,(function(){var t;return i(this,(function(e){switch(e.label){case 0:if(void 0===this.interfaceNumber)throw new Error("No device opened");return this.endpointIn?[4,this.device.transferIn(this.endpointIn.endpointNumber,this.packetSize)]:[3,2];case 1:return t=e.sent(),[3,4];case 2:return[4,this.device.controlTransferIn({requestType:"class",recipient:"interface",request:1,value:256,index:this.interfaceNumber},this.packetSize)];case 3:t=e.sent(),e.label=4;case 4:return[2,t.data]}}))}))},t.prototype.write=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:if(void 0===this.interfaceNumber)throw new Error("No device opened");return e=this.extendBuffer(t,this.packetSize),this.endpointOut?[4,this.device.transferOut(this.endpointOut.endpointNumber,e)]:[3,2];case 1:return r.sent(),[3,4];case 2:return[4,this.device.controlTransferOut({requestType:"class",recipient:"interface",request:9,value:512,index:this.interfaceNumber},e)];case 3:r.sent(),r.label=4;case 4:return[2]}}))}))},t}();t.ADI=T,t.CmsisDAP=g,t.CortexM=_,t.DAPLink=P,t.DEFAULT_CLOCK_FREQUENCY=m,t.HID=M,t.USB=x,t.WebUSB=S,Object.defineProperty(t,"__esModule",{value:!0})}));


}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":4}],6:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}]},{},[1,2]);
