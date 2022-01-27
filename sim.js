/// <reference path="../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../node_modules/pxt-core/localtypings/pxtarget.d.ts"/>
/// <reference path="../built/common-sim.d.ts"/>
var pxsim;
(function (pxsim) {
    function pinByName(name) {
        let v = pxsim.pinIds[name];
        if (v == null) {
            v = pxsim.getConfig(pxsim.getConfigKey("PIN_" + name));
        }
        let p = pxsim.pxtcore.getPin(v);
        if (!p)
            console.error("missing pin: " + name + "(" + v + ")");
        return p;
    }
    pxsim.pinByName = pinByName;
    class DalBoard extends pxsim.CoreBoard {
        constructor(boardDefinition) {
            super();
            this.boardDefinition = boardDefinition;
            const pinList = [];
            const servos = {};
            function pinId(name) {
                let key = pxsim.getConfigKey("PIN_" + name);
                if (key != null)
                    return pxsim.getConfig(key);
                // this is for P03 format used by NRF - these are direct names of CPU pins
                let m = /^P(\d+)$/.exec(name);
                if (m)
                    return parseInt(m[1]);
                return null;
            }
            pxsim.pinIds = {};
            for (let block of boardDefinition.visual.pinBlocks) {
                // scan labels
                for (let lbl of block.labels) {
                    for (let sublbl of lbl.split(/[\/,]/)) {
                        sublbl = sublbl.replace(/[~\s]+/g, "");
                        let id = pinId(sublbl);
                        if (id != null) {
                            if (pinList.indexOf(id) < 0) {
                                pinList.push(id);
                                servos[sublbl] = id;
                            }
                            pxsim.pinIds[lbl] = id;
                            pxsim.pinIds[sublbl] = id;
                        }
                    }
                }
            }
            // also add pins that might not have visual representation
            for (let k of pxsim.getAllConfigKeys()) {
                if (/^PIN_/.test(k)) {
                    let id = pxsim.getConfig(pxsim.getConfigKey(k));
                    if (id != null) {
                        if (pinList.indexOf(id) < 0)
                            pinList.push(id);
                        pxsim.pinIds[k.replace(/^PIN_/, "")] = id;
                    }
                }
            }
            this.lightState = {};
            this.microphoneState = new pxsim.AnalogSensorState(3001 /* DEVICE_ID_MICROPHONE */, 52, 120, 75, 96);
            this.storageState = new pxsim.StorageState();
            this.lightSensorState = new pxsim.AnalogSensorState(17 /* DEVICE_ID_LIGHT_SENSOR */, 0, 255, 128 / 4, 896 / 4);
            this.thermometerState = new pxsim.AnalogSensorState(8 /* DEVICE_ID_THERMOMETER */, -20, 50, 10, 30);
            this.thermometerUnitState = pxsim.TemperatureUnit.Celsius;
            this.irState = new pxsim.InfraredState(this);
            this.lcdState = new pxsim.LCDState();
            this.controlMessageState = new pxsim.ControlMessageState(this);
            this.bus.setNotify(1023 /* DEVICE_ID_NOTIFY */, 1022 /* DEVICE_ID_NOTIFY_ONE */);
            this.distanceState = new pxsim.AnalogSensorState(25 /* DEVICE_ID_DISTANCE */, 0, 2000);
            this.distanceUnitState = 0 /* Millimeter */;
            this.hygrometerState = new pxsim.AnalogSensorState(27 /* DEVICE_ID_HUMIDITY */, 0, 100);
            this.barometerState = new pxsim.AnalogSensorState(28 /* DEVICE_ID_PRESSURE */, 980, 1050);
            this.pressureUnitState = pxsim.PressureUnit.HectoPascal;
            this.ssd1306State = new pxsim.SSD1306State();
            // TODO we need this.buttonState set for pxtcore.getButtonByPin(), but
            // this should be probably merged with buttonpair somehow
            this.builtinParts["radio"] = this.radioState = new pxsim.RadioState(pxsim.runtime, this, {
                ID_RADIO: 9 /* DEVICE_ID_RADIO */,
                RADIO_EVT_DATAGRAM: 1 /*DAL.DEVICE_RADIO_EVT_DATAGRAM*/
            });
            this.builtinParts["pinbuttons"] = this.builtinParts["buttons"]
                = this.buttonState = new pxsim.CommonButtonState();
            this.builtinParts["touch"] = this.touchButtonState = new pxsim.TouchButtonState(pinList);
            // components
            this.builtinParts["audio"] = this.audioState = new pxsim.AudioState();
            this.builtinParts["edgeconnector"] = this.edgeConnectorState = new pxsim.EdgeConnectorState({
                pins: pinList,
                servos
            });
            this.builtinParts["microservo"] = this.edgeConnectorState;
            this.builtinParts["accelerometer"] = this.accelerometerState = new pxsim.AccelerometerState(pxsim.runtime);
            ;
            this.builtinParts["screen"] = this.screenState = new pxsim.ScreenState([], pxsim.getConfig(37 /* CFG_DISPLAY_WIDTH */) || 160, pxsim.getConfig(38 /* CFG_DISPLAY_HEIGHT */) || 128);
            this.builtinVisuals["buttons"] = () => new pxsim.visuals.ButtonView();
            this.builtinVisuals["microservo"] = () => new pxsim.visuals.MicroServoView();
            this.builtinParts["neopixel"] = (pin) => { return this.neopixelState(pin.id); };
            this.builtinVisuals["neopixel"] = () => new pxsim.visuals.NeoPixelView(parsePinString);
            this.builtinPartVisuals["neopixel"] = (xy) => pxsim.visuals.mkNeoPixelPart(xy);
            this.builtinParts["dotstar"] = (pin) => { return this.neopixelState(pin.id); };
            this.builtinVisuals["dotstar"] = () => new pxsim.visuals.NeoPixelView(parsePinString);
            this.builtinPartVisuals["dotstar"] = (xy) => pxsim.visuals.mkNeoPixelPart(xy);
            this.builtinParts["lcd"] = this.lcdState;
            this.builtinVisuals["lcd"] = () => new pxsim.visuals.LCD2View();
            this.builtinPartVisuals["lcd"] = (xy) => pxsim.visuals.mkLCD2Part(xy);
            this.builtinPartVisuals["buttons"] = (xy) => pxsim.visuals.mkBtnSvg(xy);
            this.builtinPartVisuals["microservo"] = (xy) => pxsim.visuals.mkMicroServoPart(xy);
            this.builtinParts["slideswitch"] = (pin) => new pxsim.ToggleState(pin);
            this.builtinVisuals["slideswitch"] = () => new pxsim.visuals.ToggleComponentVisual(parsePinString);
            this.builtinPartVisuals["slideswitch"] = (xy) => pxsim.visuals.mkSideSwitchPart(xy);
            this.builtinParts["led"] = (pin) => new pxsim.ToggleState(pin);
            this.builtinVisuals["led"] = () => new pxsim.visuals.LedView(parsePinString);
            this.builtinPartVisuals["led"] = (xy) => pxsim.visuals.mkLedPart(xy);
            this.builtinVisuals["photocell"] = () => new pxsim.visuals.PhotoCellView(parsePinString);
            this.builtinPartVisuals["photocell"] = (xy) => pxsim.visuals.mkPhotoCellPart(xy);
            this.builtinVisuals["screen"] = () => new pxsim.visuals.ScreenView();
            this.builtinPartVisuals["screen"] = (xy) => pxsim.visuals.mkScreenPart(xy);
            this.neopixelPin = this.edgeConnectorState.getPin(pxsim.getConfig(220 /* CFG_PIN_ONBOARD_DOTSTAR_DATA */))
                || this.edgeConnectorState.getPin(pxsim.getConfig(222 /* CFG_PIN_ONBOARD_NEOPIXEL */))
                || this.edgeConnectorState.getPin(pxsim.getConfig(8 /* CFG_PIN_DOTSTAR_DATA */))
                || this.edgeConnectorState.getPin(pxsim.getConfig(20 /* CFG_PIN_NEOPIXEL */));
            this.builtinParts["pixels"] = (pin) => { return this.neopixelState(!!this.neopixelPin && this.neopixelPin.id); };
            this.builtinVisuals["pixels"] = () => new pxsim.visuals.NeoPixelView(parsePinString);
            this.builtinPartVisuals["pixels"] = (xy) => pxsim.visuals.mkNeoPixelPart(xy);
            this.builtinParts["distance"] = () => new pxsim.DistanceState(this.distanceState, this.distanceUnitState);
            this.builtinVisuals["distance"] = () => new pxsim.visuals.DistanceView();
            this.builtinParts["hygrometer"] = () => new pxsim.HygrometerState(this.hygrometerState);
            this.builtinVisuals["hygrometer"] = () => new pxsim.visuals.HygrometerView();
            this.builtinParts["thermometer"] = () => new pxsim.ThermometerState(this.hygrometerState);
            this.builtinVisuals["thermometer"] = () => new pxsim.visuals.ThermometerView();
            this.builtinParts["barometer"] = () => new pxsim.BarometerState(this.hygrometerState, this.pressureUnitState);
            this.builtinVisuals["barometer"] = () => new pxsim.visuals.BarometerView();
            this.builtinParts["compass"] = this.compassState = new pxsim.CompassState();
            this.builtinParts["ssd1306"] = this.ssd1306State;
            this.builtinVisuals["ssd1306"] = () => new pxsim.visuals.SSD1306View();
            this.builtinPartVisuals["ssd1306"] = (xy) => pxsim.visuals.mkSSD1306Part(xy);
        }
        kill() {
            super.kill();
            pxsim.AudioContextManager.stop();
        }
        initAsync(msg) {
            super.initAsync(msg);
            const options = (msg.options || {});
            const boardDef = msg.boardDefinition;
            const cmpsList = msg.parts;
            cmpsList.sort();
            const cmpDefs = msg.partDefinitions || {};
            const fnArgs = msg.fnArgs;
            const opts = {
                state: this,
                boardDef: boardDef,
                partsList: cmpsList,
                partDefs: cmpDefs,
                fnArgs: fnArgs,
                maxWidth: "100%",
                maxHeight: "100%",
            };
            this.viewHost = new pxsim.visuals.BoardHost(pxsim.visuals.mkBoardView({
                visual: boardDef.visual,
                boardDef
            }), opts);
            document.body.innerHTML = ""; // clear children
            document.body.appendChild(this.view = this.viewHost.getView());
            this.accelerometerState.attachEvents(this.view);
            return Promise.resolve();
        }
        screenshotAsync(width) {
            return this.viewHost.screenshotAsync(width);
        }
        accelerometer() {
            return this.accelerometerState.accelerometer;
        }
        getDefaultPitchPin() {
            // amp always on PA02, regardless which name is has
            return pxsim.pxtcore.getPin(2 /* PA02 */);
        }
        tryGetNeopixelState(pinId) {
            return this.lightState[pinId];
        }
        neopixelState(pinId) {
            if (pinId === undefined) {
                pinId = pxsim.pxtcore.getConfig(19 /* CFG_PIN_MOSI */, -1);
            }
            let state = this.lightState[pinId];
            if (!state)
                state = this.lightState[pinId] = new pxsim.CommonNeoPixelState();
            return state;
        }
    }
    pxsim.DalBoard = DalBoard;
    function initRuntimeWithDalBoard(msg) {
        pxsim.U.assert(!pxsim.runtime.board);
        let b = new DalBoard(msg.boardDefinition);
        pxsim.runtime.board = b;
        pxsim.runtime.postError = (e) => {
            // TODO
            pxsim.runtime.updateDisplay();
        };
    }
    pxsim.initRuntimeWithDalBoard = initRuntimeWithDalBoard;
    if (!pxsim.initCurrentRuntime) {
        pxsim.initCurrentRuntime = initRuntimeWithDalBoard;
    }
    function parsePinString(pinString) {
        const pinName = pinString && pxsim.readPin(pinString);
        return pinName && pxsim.pxtcore.getPin(pxsim.pinIds[pinName]);
    }
    pxsim.parsePinString = parsePinString;
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    let DistanceCondition;
    (function (DistanceCondition) {
        //% block="far"
        DistanceCondition[DistanceCondition["Far"] = 2] = "Far";
        //% block="near"
        DistanceCondition[DistanceCondition["Near"] = 1] = "Near";
    })(DistanceCondition = pxsim.DistanceCondition || (pxsim.DistanceCondition = {}));
})(pxsim || (pxsim = {}));
(function (pxsim) {
    var input;
    (function (input) {
        function onDistanceConditionChanged(condition, distance, unit, body) {
            let b = pxsim.distanceState();
            b.setUsed();
            let d = distance;
            switch (unit) {
                case 0 /* Millimeter */:
                    d = distance;
                    break;
                case 1 /* Centimeter */:
                    d = distance * 10;
                    break;
                case 2 /* Decimeter */:
                    d = distance * 100;
                    break;
                case 3 /* Meter */:
                    d = distance * 1000;
                    break;
                default:
                    d = 0;
                    break;
            }
            if (condition === 2 /* ANALOG_THRESHOLD_HIGH */) {
                b.setHighThreshold(d);
            }
            else {
                b.setLowThreshold(d);
            }
            pxsim.pxtcore.registerWithDal(b.id, condition, body);
        }
        input.onDistanceConditionChanged = onDistanceConditionChanged;
        function distance(unit) {
            let b = pxsim.distanceState();
            b.setUsed();
            const distance = b.getLevel();
            switch (unit) {
                case 0 /* Millimeter */:
                    return distance;
                case 1 /* Centimeter */:
                    return distance / 10.;
                case 2 /* Decimeter */:
                    return distance / 100.;
                case 3 /* Meter */:
                    return distance / 1000.;
                default:
                    return 0;
            }
        }
        input.distance = distance;
    })(input = pxsim.input || (pxsim.input = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../built/common-sim.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../built/common-sim.d.ts"/>
var pxsim;
(function (pxsim) {
    class DistanceState {
        constructor(distanceState, distanceUnit) {
            this.distanceState = distanceState;
            this.distanceUnit = distanceUnit;
        }
    }
    pxsim.DistanceState = DistanceState;
    function distanceState() {
        return pxsim.board().distanceState;
    }
    pxsim.distanceState = distanceState;
    function setDistanceUnit(unit) {
        pxsim.board().distanceUnitState = unit;
    }
    pxsim.setDistanceUnit = setDistanceUnit;
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var oled;
    (function (oled) {
        const BLACK_COLOR_SVG = "#00435E";
        const WHITE_COLOR_SVG = "#FFFFFF";
        function printString(str, color, x, y) {
            let state = pxsim.ssd1306State();
            let elem = new pxsim.SSD1306DrawElement();
            elem.x = x;
            elem.y = y + 8; // On SSD1306 ref point is on top left corner (SVG is on bottom left corner)
            elem.svgObject = pxsim.svg.elt("text", { "fill": getSVGColor(state, color) });
            elem.svgObject.textContent = str;
            state.drawingList.push(elem);
            pxsim.runtime.queueDisplayUpdate();
        }
        oled.printString = printString;
        function fillRect(x, y, width, height, color) {
            let state = pxsim.ssd1306State();
            let elem = new pxsim.SSD1306DrawElement();
            elem.width = width;
            elem.height = height;
            elem.x = x;
            elem.y = y;
            elem.svgObject = pxsim.svg.elt("rect", { "fill": getSVGColor(state, color) });
            state.drawingList.push(elem);
            pxsim.runtime.queueDisplayUpdate();
        }
        oled.fillRect = fillRect;
        function fillScreen(color) {
            let state = pxsim.ssd1306State();
            state.drawingList = [];
            fillRect(0, 0, state.getWidth(), state.getHeight(), color);
        }
        oled.fillScreen = fillScreen;
        function clearScreen() {
            let state = pxsim.ssd1306State();
            state.isInvert = false;
            fillScreen(0 /* Black */);
        }
        oled.clearScreen = clearScreen;
        function setPixel(x, y, color) {
            fillRect(x, y, 1, 1, color);
        }
        oled.setPixel = setPixel;
        function invertScreen(invert) {
            let state = pxsim.ssd1306State();
            if (state.isInvert != invert) {
                state.drawingList.forEach((elem) => {
                    let color = elem.svgObject.getAttribute("fill");
                    if (color == BLACK_COLOR_SVG) {
                        color = WHITE_COLOR_SVG;
                    }
                    else {
                        color = BLACK_COLOR_SVG;
                    }
                    elem.svgObject.setAttribute("fill", color);
                });
            }
            state.isInvert = invert;
        }
        oled.invertScreen = invertScreen;
        function getSVGColor(state, color) {
            if (color == 0 /* Black */) {
                return state.isInvert ? WHITE_COLOR_SVG : BLACK_COLOR_SVG;
            }
            else {
                return state.isInvert ? BLACK_COLOR_SVG : WHITE_COLOR_SVG;
            }
        }
    })(oled = pxsim.oled || (pxsim.oled = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../built/common-sim.d.ts"/>
var pxsim;
(function (pxsim) {
    class SSD1306DrawElement {
    }
    pxsim.SSD1306DrawElement = SSD1306DrawElement;
    class SSD1306State {
        constructor() {
            this.isInvert = false;
            this.drawingList = [];
        }
        getWidth() { return 128; }
        getHeight() { return 64; }
    }
    pxsim.SSD1306State = SSD1306State;
    function ssd1306State() {
        return pxsim.board().ssd1306State;
    }
    pxsim.ssd1306State = ssd1306State;
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        const svg = pxsim.svg;
        visuals.VIEW_WIDTH = 372.3404255319149;
        visuals.VIEW_HEIGHT = 361.70212765957444;
        const TOP_MARGIN = 20;
        const MID_MARGIN = 40;
        const BOT_MARGIN = 20;
        const PIN_LBL_SIZE = visuals.PIN_DIST * 0.7;
        const PIN_LBL_HOVER_SIZE = PIN_LBL_SIZE * 1.5;
        const SQUARE_PIN_WIDTH = visuals.PIN_DIST * 0.66666;
        const SQUARE_PIN_HOVER_WIDTH = visuals.PIN_DIST * 0.66666 + visuals.PIN_DIST / 3.0;
        const STYLE = `
.sim-board-pin {
    stroke: #404040;
    fill: #000000;
}
.sim-board-button {
    stroke: #aaa;
    stroke-width: 3px;
    fill: #666;
}
.sim-board-button.pressed {
    fill: #ee0;
}
.sim-board-button:hover {
    stroke-width: 4px;
    stroke: #ee0;
    cursor: pointer;
}
    `;
        visuals.themes = ["#3ADCFE"].map(accent => {
            return {
                accent: accent,
                pin: "#D4AF37",
                pinTouched: "#FFA500",
                pinActive: "#FF5500",
                ledOn: "#ff7777",
                ledOff: "#fff",
                buttonOuter: "#979797",
                buttonUps: ["#000", "#000", "#000"],
                buttonDown: "#FFA500",
                virtualButtonDown: "#FFA500",
                virtualButtonOuter: "#333",
                virtualButtonUp: "#fff",
                lightLevelOn: "yellow",
                lightLevelOff: "#555",
                soundLevelOn: "#7f8c8d",
                soundLevelOff: "#555",
            };
        });
        function randomTheme() {
            return visuals.themes[Math.floor(Math.random() * visuals.themes.length)];
        }
        visuals.randomTheme = randomTheme;
        function getBoardDimensions(vis) {
            let scaleFn = (n) => n * (visuals.PIN_DIST / vis.pinDist);
            let width = scaleFn(vis.width);
            return {
                scaleFn: scaleFn,
                height: scaleFn(vis.height),
                width: width,
                xOff: (visuals.VIEW_WIDTH - width) / 2.0,
                yOff: TOP_MARGIN
            };
        }
        visuals.getBoardDimensions = getBoardDimensions;
        class MetroBoardSvg extends visuals.GenericBoardSvg {
            constructor(props) {
                super(props);
                this.props = props;
                const el = this.getView().el;
                this.addDefs(el);
                this.onBoardLeds = [];
                this.onBoardNeopixels = [];
                this.onBoardTouchPads = [];
                this.onBoardButtons = [];
                // neopixels/leds
                for (const l of props.visualDef.leds || []) {
                    if (l.color == "neopixel") {
                        const onBoardNeopixel = new BoardNeopixel(l.label, l.x, l.y, l.w || 0);
                        this.onBoardNeopixels.push(onBoardNeopixel);
                        el.appendChild(onBoardNeopixel.element);
                    }
                    else {
                        const pin = pxsim.pinByName(l.label);
                        if (pin) {
                            let bl = new BoardLed(l.x, l.y, l.color, pxsim.pinByName(l.label), l.w || 9, l.h || 8);
                            this.onBoardLeds.push(bl);
                            el.appendChild(bl.element);
                        }
                    }
                }
                this.onBoardNeopixels.sort((l, r) => {
                    const li = parseInt(l.name.replace(/^[^\d]*/, '')) || 0;
                    const ri = parseInt(r.name.replace(/^[^\d]*/, '')) || 0;
                    return li < ri ? -1 : li > ri ? 1 : 0;
                });
                // reset button
                if (props.visualDef.reset) {
                    this.onBoardReset = new BoardResetButton(props.visualDef.reset);
                    el.appendChild(this.onBoardReset.element);
                }
                // touch pads
                for (const l of props.visualDef.touchPads || []) {
                    const pin = pxsim.pinIds[l.label];
                    if (!pin) {
                        console.error(`touch pin ${pin} not found`);
                        continue;
                    }
                    const tp = new BoardTouchButton(l, pin);
                    this.onBoardTouchPads.push(tp);
                    el.appendChild(tp.element);
                }
                // regular buttons
                for (const l of props.visualDef.buttons || []) {
                    const tp = new BoardButton(l);
                    this.onBoardButtons.push(tp);
                    el.appendChild(tp.element);
                }
                this.onBoardDistance = new visuals.DistanceView();
                this.onBoardHygrometer = new visuals.HygrometerView();
                this.onBoardThermometer = new visuals.ThermometerView();
                this.onBoardBarometer = new visuals.BarometerView();
                this.onBoardCompass = new visuals.CompassView();
                if (props && props.theme)
                    this.updateTheme();
                if (props && props.runtime) {
                    this.board = this.props.runtime.board;
                    this.board.updateSubscribers.push(() => this.updateState());
                    this.updateState();
                }
                this.onBoardDistance.init(this.board.bus, new pxsim.DistanceState(this.board.distanceState, this.board.distanceUnitState), el, null);
                this.onBoardHygrometer.init(this.board.bus, new pxsim.HygrometerState(this.board.hygrometerState), el, null);
                this.onBoardThermometer.init(this.board.bus, new pxsim.ThermometerState(this.board.thermometerState), el, null);
                this.onBoardBarometer.init(this.board.bus, new pxsim.BarometerState(this.board.barometerState, this.board.pressureUnitState), el, null);
                this.onBoardCompass.init(this.board.bus, this.board.compassState, el, null);
            }
            updateTheme() {
                let theme = this.props.theme;
                if (this.shakeButton)
                    svg.fill(this.shakeButton, theme.virtualButtonUp);
            }
            updateState() {
                this.onBoardLeds.forEach(l => l.updateState());
                if (this.board.neopixelPin) {
                    const state = this.board.neopixelState(this.board.neopixelPin.id);
                    if (state.buffer) {
                        for (let i = 0; i < this.onBoardNeopixels.length; ++i) {
                            const rgb = state.pixelColor(i);
                            if (rgb !== null)
                                this.onBoardNeopixels[i].setColor(rgb);
                        }
                    }
                }
                this.onBoardDistance.updateState();
                this.onBoardHygrometer.updateState();
                this.onBoardThermometer.updateState();
                this.onBoardBarometer.updateState();
                this.onBoardCompass.updateState();
                this.updateGestures();
            }
            updateGestures() {
                let state = this.board;
                if (state.accelerometerState.useShake && !this.shakeButton) {
                    const el = this.getView().el;
                    this.shakeButton = svg.child(el, "circle", { cx: 230, cy: 30, r: 16.5, class: "sim-shake" });
                    pxsim.accessibility.makeFocusable(this.shakeButton);
                    svg.fill(this.shakeButton, this.props.theme.virtualButtonUp);
                    pxsim.pointerEvents.down.forEach(evid => this.shakeButton.addEventListener(evid, ev => {
                        let state = this.board;
                        svg.fill(this.shakeButton, this.props.theme.buttonDown);
                    }));
                    this.shakeButton.addEventListener(pxsim.pointerEvents.leave, ev => {
                        let state = this.board;
                        svg.fill(this.shakeButton, this.props.theme.virtualButtonUp);
                    });
                    this.shakeButton.addEventListener(pxsim.pointerEvents.up, ev => {
                        let state = this.board;
                        svg.fill(this.shakeButton, this.props.theme.virtualButtonUp);
                        this.board.bus.queue(13 /* DEVICE_ID_GESTURE */, 11); // GESTURE_SHAKE
                    });
                    pxsim.accessibility.enableKeyboardInteraction(this.shakeButton, undefined, () => {
                        this.board.bus.queue(13 /* DEVICE_ID_GESTURE */, 11);
                    });
                    pxsim.accessibility.setAria(this.shakeButton, "button", "Shake the board");
                    this.shakeText = svg.child(el, "text", { x: 250, y: 40, class: "sim-text" });
                    this.shakeText.textContent = "SHAKE";
                }
            }
            addDefs(el) {
                const defs = svg.child(el, "defs", {});
                let neopixelglow = svg.child(defs, "filter", { id: "neopixelglow", x: "-200%", y: "-200%", width: "400%", height: "400%" });
                svg.child(neopixelglow, "feGaussianBlur", { stdDeviation: "4.3", result: "coloredBlur" });
                let neopixelmerge = svg.child(neopixelglow, "feMerge", {});
                svg.child(neopixelmerge, "feMergeNode", { in: "coloredBlur" });
                svg.child(neopixelmerge, "feMergeNode", { in: "SourceGraphic" });
                const style = svg.child(el, "style", {});
                style.textContent = STYLE;
            }
        }
        visuals.MetroBoardSvg = MetroBoardSvg;
        class BoardResetButton {
            constructor(p) {
                p.w = p.w || 15;
                p.h = p.h || 15;
                this.element = svg.elt("circle", {
                    cx: p.x + p.w / 2,
                    cy: p.y + p.h / 2,
                    r: Math.max(p.w, p.h) / 2,
                    class: "sim-board-button"
                });
                svg.title(this.element, "RESET");
                // hooking up events
                pxsim.pointerEvents.down.forEach(evid => this.element.addEventListener(evid, ev => {
                    pxsim.U.addClass(this.element, "pressed");
                    pxsim.Runtime.postMessage({
                        type: "simulator",
                        command: "restart"
                    });
                }));
                this.element.addEventListener(pxsim.pointerEvents.leave, ev => {
                    pxsim.U.removeClass(this.element, "pressed");
                });
                this.element.addEventListener(pxsim.pointerEvents.up, ev => {
                    pxsim.U.removeClass(this.element, "pressed");
                });
            }
        }
        class BoardLed {
            constructor(x, y, colorOn, pin, w, h) {
                this.colorOn = colorOn;
                this.pin = pin;
                this.colorOff = "#aaa";
                this.backElement = svg.elt("rect", { x, y, width: w, height: h, fill: this.colorOff });
                this.ledElement = svg.elt("rect", { x, y, width: w, height: h, fill: this.colorOn, opacity: 0 });
                svg.filter(this.ledElement, `url(#neopixelglow)`);
                this.element = svg.elt("g", { class: "sim-led" });
                this.element.appendChild(this.backElement);
                this.element.appendChild(this.ledElement);
            }
            updateTheme(colorOff, colorOn) {
                if (colorOff) {
                    this.colorOff = colorOff;
                }
                if (colorOn) {
                    this.colorOn = colorOn;
                }
            }
            updateState() {
                const opacity = this.pin.mode & pxsim.PinFlags.Digital ? (this.pin.value > 0 ? 1 : 0)
                    : 0.1 + Math.max(0, Math.min(1023, this.pin.value)) / 1023 * 0.8;
                this.ledElement.setAttribute("opacity", opacity.toString());
            }
        }
        class BoardNeopixel {
            constructor(name, x, y, r) {
                this.name = name;
                this.element = svg.elt("circle", { cx: x + r / 2, cy: y + r / 2, r: 10 });
                svg.title(this.element, name);
            }
            setColor(rgb) {
                const hsl = visuals.rgbToHsl(rgb);
                let [h, s, l] = hsl;
                const lx = Math.max(l * 1.3, 85);
                // at least 10% luminosity
                l = l * 90 / 100 + 10;
                this.element.style.stroke = `hsl(${h}, ${s}%, ${Math.min(l * 3, 75)}%)`;
                this.element.style.strokeWidth = "1.5";
                svg.fill(this.element, `hsl(${h}, ${s}%, ${lx}%)`);
                svg.filter(this.element, `url(#neopixelglow)`);
            }
        }
        class BoardButton {
            constructor(def) {
                this.def = def;
                def.w = def.w || 15;
                def.h = def.h || 15;
                this.element = svg.elt("circle", {
                    cx: def.x + def.w / 2,
                    cy: def.y + def.h / 2,
                    r: Math.max(def.w, def.h) / 2,
                    class: "sim-board-button"
                });
                svg.title(this.element, def.label);
                // resolve button
                this.button = def.index !== undefined
                    ? pxsim.pxtcore.getButton(def.index)
                    : pxsim.pxtcore.getButtonByPin(pxsim.pinIds[def.label]);
                // hooking up events
                pxsim.pointerEvents.down.forEach(evid => this.element.addEventListener(evid, ev => {
                    this.button.setPressed(true);
                    pxsim.U.addClass(this.element, "pressed");
                }));
                this.element.addEventListener(pxsim.pointerEvents.leave, ev => {
                    pxsim.U.removeClass(this.element, "pressed");
                    this.button.setPressed(false);
                });
                this.element.addEventListener(pxsim.pointerEvents.up, ev => {
                    pxsim.U.removeClass(this.element, "pressed");
                    this.button.setPressed(false);
                });
            }
        }
        class BoardTouchButton {
            constructor(def, pinId) {
                this.def = def;
                def.w = def.w || 15;
                def.h = def.h || 15;
                this.element = svg.elt("circle", {
                    cx: def.x + def.w / 2,
                    cy: def.y + def.h / 2,
                    r: Math.max(def.w, def.h) / 2,
                    class: "sim-board-button"
                });
                svg.title(this.element, def.label);
                // resolve button
                this.button = pxsim.pxtcore.getTouchButton(pinId);
                // hooking up events
                pxsim.pointerEvents.down.forEach(evid => this.element.addEventListener(evid, ev => {
                    this.button.setPressed(true);
                    pxsim.U.addClass(this.element, "pressed");
                }));
                this.element.addEventListener(pxsim.pointerEvents.leave, ev => {
                    pxsim.U.removeClass(this.element, "pressed");
                    this.button.setPressed(false);
                });
                this.element.addEventListener(pxsim.pointerEvents.up, ev => {
                    pxsim.U.removeClass(this.element, "pressed");
                    this.button.setPressed(false);
                });
            }
        }
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        visuals.mkBoardView = (opts) => {
            return new visuals.MetroBoardSvg({
                runtime: pxsim.runtime,
                theme: visuals.randomTheme(),
                visualDef: opts.visual,
                boardDef: opts.boardDef,
                disableTilt: false,
                wireframe: opts.wireframe
            });
        };
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/core/dal.d.ts"/>
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        class ButtonView {
            constructor() {
                this.style = visuals.BUTTON_PAIR_STYLE;
            }
            init(bus, state, svgEl, otherParams) {
                this.state = state;
                this.bus = bus;
                this.defs = [];
                this.element = this.mkBtn();
                let pinStr = pxsim.readPin(otherParams["button"]);
                this.pinId = pxsim.pinIds[pinStr];
                this.button = new pxsim.CommonButton(this.pinId);
                this.state.buttonsByPin[this.pinId] = this.button;
                this.updateState();
                this.attachEvents();
            }
            moveToCoord(xy) {
                let btnWidth = visuals.PIN_DIST * 3;
                let [x, y] = xy;
                visuals.translateEl(this.btn, [x, y]);
            }
            updateState() {
            }
            updateTheme() { }
            mkBtn() {
                this.btn = visuals.mkBtnSvg([0, 0]).el;
                const mkVirtualBtn = () => {
                    const numPins = 2;
                    const w = visuals.PIN_DIST * 2.8;
                    const offset = (w - (numPins * visuals.PIN_DIST)) / 2;
                    const corner = visuals.PIN_DIST / 2;
                    const cx = 0 - offset + w / 2;
                    const cy = cx;
                    const txtSize = visuals.PIN_DIST * 1.3;
                    const x = -offset;
                    const y = -offset;
                    const txtXOff = visuals.PIN_DIST / 7;
                    const txtYOff = visuals.PIN_DIST / 10;
                    let btng = pxsim.svg.elt("g");
                    let btn = pxsim.svg.child(btng, "rect", { class: "sim-button-virtual", x: x, y: y, rx: corner, ry: corner, width: w, height: w });
                    let btnTxt = visuals.mkTxt(cx + txtXOff, cy + txtYOff, txtSize, 0, "A+B");
                    pxsim.U.addClass(btnTxt, "sim-text");
                    pxsim.U.addClass(btnTxt, "sim-text-virtual");
                    btng.appendChild(btnTxt);
                    return btng;
                };
                let el = pxsim.svg.elt("g");
                pxsim.U.addClass(el, "sim-buttonpair");
                el.appendChild(this.btn);
                return el;
            }
            attachEvents() {
                let btnSvgs = [this.btn];
                btnSvgs.forEach((btn, index) => {
                    pxsim.pointerEvents.down.forEach(evid => btn.addEventListener(evid, ev => {
                        this.button.setPressed(true);
                    }));
                    btn.addEventListener(pxsim.pointerEvents.leave, ev => {
                        this.button.setPressed(false);
                    });
                    btn.addEventListener(pxsim.pointerEvents.up, ev => {
                        this.button.setPressed(false);
                    });
                });
            }
        }
        visuals.ButtonView = ButtonView;
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../built/common-sim.d.ts"/>
/// <reference path="../../libs/core/dal.d.ts"/>
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        class DistanceView {
            constructor() {
                this.style = visuals.BUTTON_PAIR_STYLE;
            }
            init(bus, state, svgEl, otherParams) {
                this.state = state;
                this.bus = bus;
                this.defs = [];
                this.svgEl = svgEl;
                this.updateState();
                this.attachEvents();
            }
            moveToCoord(xy) {
                let btnWidth = visuals.PIN_DIST * 3;
                let [x, y] = xy;
                visuals.translateEl(this.btn, [x, y]);
            }
            updateState() {
                let state = this.state;
                if (!state || !state.distanceState || !state.distanceState.sensorUsed) {
                    if (this.distance) {
                        this.svgEl.removeChild(this.element);
                        this.distance = null;
                    }
                }
                else if (state && state.distanceState && state.distanceState.sensorUsed) {
                    this.mkDistance();
                    this.svgEl.appendChild(this.element);
                    this.updateDistance();
                }
            }
            getElement() {
                return this.element;
            }
            updateTheme() {
                let On = "#77ffff";
                let Off = "#fff";
                pxsim.svg.setGradientColors(this.distanceGradient, Off, On);
            }
            mkDistance() {
                let svgEl = this.svgEl;
                let defs = pxsim.svg.child(svgEl, "defs", {});
                let g = pxsim.svg.elt("g");
                if (!this.distance) {
                    let gid = "gradient-distance";
                    this.distanceGradient = pxsim.svg.linearGradient(defs, gid);
                    let xBase = 25;
                    let yBase = 450;
                    let heightBase = 64;
                    pxsim.svg.child(g, "rect", {
                        fill: "transparent",
                        x: xBase - 5,
                        y: yBase - 20,
                        width: 20,
                        height: heightBase + 40,
                    });
                    this.distance = pxsim.svg.child(g, "rect", {
                        class: "sim-distance no-drag",
                        x: xBase,
                        y: yBase,
                        width: 10,
                        height: heightBase,
                        rx: 4, ry: 4,
                        fill: `url(#${gid})`
                    });
                    this.distanceText = pxsim.svg.child(g, "text", { class: 'sim-text', x: xBase + 20, y: yBase + 20 });
                    this.updateTheme();
                    let pt = svgEl.createSVGPoint();
                    pxsim.svg.buttonEvents(this.distance, 
                    // move
                    (ev) => {
                        let cur = pxsim.svg.cursorPoint(pt, svgEl, ev);
                        let t = Math.max(0, Math.min(1, ((heightBase + yBase) - cur.y) / (heightBase)));
                        this.state.distanceState.setLevel(Math.floor(DistanceView.dmin + t * (DistanceView.dmax - DistanceView.dmin)));
                        this.updateDistance();
                    }, 
                    // start
                    ev => { }, 
                    // stop
                    ev => { }, 
                    // keydown
                    (ev) => {
                        let charCode = (typeof ev.which == "number") ? ev.which : ev.keyCode;
                        if (charCode === 40 || charCode === 37) { // Down/Left arrow
                            if (this.state.distanceState.getLevel() === DistanceView.dmin) {
                                this.state.distanceState.setLevel(DistanceView.dmax);
                            }
                            else {
                                this.state.distanceState.setLevel(this.state.distanceState.getLevel() - 1);
                            }
                            this.updateDistance();
                        }
                        else if (charCode === 38 || charCode === 39) { // Up/Right arrow
                            if (this.state.distanceState.getLevel() === DistanceView.dmax) {
                                this.state.distanceState.setLevel(DistanceView.dmin);
                            }
                            else {
                                this.state.distanceState.setLevel(this.state.distanceState.getLevel() + 1);
                            }
                            this.updateDistance();
                        }
                    });
                    pxsim.accessibility.makeFocusable(this.distance);
                    pxsim.accessibility.setAria(this.distance, "slider", "Distance");
                    this.distance.setAttribute("aria-valuemin", DistanceView.dmin.toString());
                    this.distance.setAttribute("aria-valuemax", DistanceView.dmax.toString());
                    this.distance.setAttribute("aria-orientation", "vertical");
                }
                this.element = g;
            }
            attachEvents() {
            }
            updateDistance() {
                let state = this.state;
                if (!state || !state.distanceState || !state.distanceState.sensorUsed)
                    return;
                let t = Math.max(DistanceView.dmin, Math.min(DistanceView.dmax, state.distanceState.getLevel()));
                let per = Math.floor((state.distanceState.getLevel() - DistanceView.dmin) / (DistanceView.dmax - DistanceView.dmin) * 100);
                pxsim.svg.setGradientValue(this.distanceGradient, 100 - per + "%");
                let unit = " mm";
                if (state.distanceUnit == 3 /* Meter */) {
                    unit = " m";
                }
                this.distanceText.textContent = t + unit;
                this.distance.setAttribute("aria-valuenow", t.toString());
                this.distance.setAttribute("aria-valuetext", t + unit);
                pxsim.accessibility.setLiveContent(t + unit);
            }
        }
        DistanceView.dmin = 0;
        DistanceView.dmax = 2000;
        visuals.DistanceView = DistanceView;
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../built/common-sim.d.ts"/>
/// <reference path="../../libs/core/dal.d.ts"/>
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        function mkSSD1306Part(xy = [0, 0]) {
            let [x, y] = xy;
            let l = x;
            let t = y;
            let w = SSD1306_PART_WIDTH;
            let h = SSD1306_PART_HEIGHT;
            let img = pxsim.svg.elt("image");
            console.log("Mk SSD !");
            pxsim.svg.hydrate(img, {
                class: "sim-ssd1306", x: l, y: t, width: w, height: h,
                href: pxsim.svg.toDataUri(SSD1306_PART)
            });
            return { el: img, x: l, y: t, w: w, h: h };
        }
        visuals.mkSSD1306Part = mkSSD1306Part;
        class SSD1306View {
            constructor() {
                this.style = visuals.BUTTON_PAIR_STYLE;
            }
            init(bus, state, svgEl, otherParams) {
                this.state = state;
                this.bus = bus;
                this.defs = [];
                this.svgEl = svgEl;
                this.initDom();
                this.attachEvents();
                pxsim.oled.fillScreen(0 /* Black */);
            }
            moveToCoord(xy) {
                visuals.translateEl(this.element, [xy[0], xy[1]]);
            }
            updateState() {
                this.removeAllChildFromDrawGroup();
                this.state.drawingList.forEach((elem) => {
                    let tmpSvg = elem.svgObject;
                    tmpSvg.setAttribute("x", String(elem.x * 0.5947));
                    tmpSvg.setAttribute("y", String(elem.y * 0.6797));
                    if (elem.width)
                        tmpSvg.setAttribute("width", String(elem.width * 0.5947));
                    if (elem.height)
                        tmpSvg.setAttribute("height", String(elem.height * 0.6797));
                    this.drawGroup.appendChild(tmpSvg);
                });
            }
            removeAllChildFromDrawGroup() {
                while (this.drawGroup.firstChild) {
                    this.drawGroup.removeChild(this.drawGroup.firstChild);
                }
            }
            initDom() {
                this.element = pxsim.svg.elt("g");
                this.svgEl = new DOMParser().parseFromString(SSD1306_PART, "image/svg+xml").querySelector("svg");
                pxsim.svg.hydrate(this.svgEl, {
                    class: "sim-ssd1306",
                    width: SSD1306_PART_WIDTH,
                    height: SSD1306_PART_HEIGHT
                });
                this.drawGroup = this.svgEl.getElementById("print_zone");
                this.element.appendChild(this.svgEl);
            }
            attachEvents() {
            }
            updateTheme() {
            }
        }
        visuals.SSD1306View = SSD1306View;
        const SSD1306_PART_WIDTH = 171.054;
        const SSD1306_PART_HEIGHT = 170.167;
        const SSD1306_PART = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" enable-background="new 0 0 82 82" viewBox="0 0 171.054 170.16701" height="170.16701" width="171.054" y="0px" x="0px" id="Layer_1" version="1.1"><metadata id="metadata4617"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title></dc:title></cc:Work></rdf:RDF></metadata>
        <defs id="defs4615">
            <style>
            @font-face{
                font-family:"LCD Dot Matrix HD44780U";
                font-style:normal;
                font-weight:400;
                src:url("data:font/ttf;base64,AAEAAAAKAIAAAwAgT1MvMuavFLIAAAEoAAAAYGNtYXDXm9yxAAAIIAAACnBnbHlm9hnXhAAAGSwAAe6waGVhZBGpDAcAAACsAAAANmhoZWEHMgVqAAAA5AAAACRobXR48jEwjAAAAYgAAAaYbG9jYQGTMBgAABKQAAAGnG1heHABygCOAAABCAAAACBuYW1lNr48dwACB9wAABjWcG9zdABpADMAAiC0AAAAIAABAAAAAQAAsac6618PPPUAAAQAAAAAANfyY04AAAAA1/JjTgAAAAACsQRtAAAACAACAAEAAAAAAAEAAASAAAAAAAMxAAAAkgKxAAEAAAAAAAAAAAAAAAAAAAGmAAEAAAGmAIwAIwAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAgMAAZAABQAEAgACAAAAAAACAAIAAAACAAAzAMwAAAAABAAAAAAAAACBAICPQAQASgAAAAAAAAAARlNUUgBAACD7AgOAAAAAAASAAAAAAAH/AAAAAAJhA2EAAAAgAAADMQAAAwAAAAMAAAADAAAAAwABDAMAAIwDAAAMAwAADAMAAAwDAAAMAwABDAMAAIwDAACMAwAADAMAAAwDAACMAwAADAMAAIwDAAAMAwAADAMAAIwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAIwDAACMAwAADAMAAAwDAACMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAIwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAIwDAAAMAwAAjAMAAAwDAAAMAwAAjAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAAjAMAAAwDAAAMAwAAjAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAAjAMAAQwDAACMAwAADAMAAAADAAEMAwAADAMAAAwDAAAMAwAADAMAAQwDAAAMAwAAjAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAAjAMAAAwDAAAMAwAAjAMAAIwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAAjAMAAIwDAACMAwAAjAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAACMAwAAjAMAAIwDAACMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAACMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAACMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAEMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAACMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAAAMAwAADAMAAAwDAACMAwAAjAMAAIwDAACMAwAADAMAAAwDAAAM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AAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAACgCMAAwB7QNtAAMABwALAA8AEwAXABsAHwAjACcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP8fAAAAYQAAAB8AAABhAAD/nwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAA4ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADgAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/58AAABhAAD/HwAAAGEAAP8fAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAOAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQGMAAAAYQAA/58AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABHwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAfAAAAYQAA/58AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fABEADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAABnwAAAGEAAP+fAAAAYQAA/58AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAAPAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAAwADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAD/nwAAAGEAAP+fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fABEADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAA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AGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwASAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAEcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAUAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAEcASwBPAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAA0ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAAAZ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAABIADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMARwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fABIADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMARwAAAQEBAQEBAQEBAQEB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AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/Z8AAABhAAABHwAAAGEAAP4fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP+fAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAACwAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAA8ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAADQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAP8fAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAEQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAACfAAAAYQAA/h8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAA0ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+HwAAAGEAAACfAAAAYQAA/x8AAABhAAD/HwAAAGEAAACfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAAsADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAD/nwAAAGEAAP+fAAAAYQAA/x8AAABhAAAAnwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAAAPAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAAsAjAAMAe0DbQADAAcACwAPABMAFwAbAB8AIwAnACsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAAFAAwAjAJtAu0AAwAHAAsADwATAAABAQEBAQEBAQEBAQEBAQEBAQEBAQIMAAAAYQAA/x8AAABhAAD/HwAAAGEAAP8fAAAAYQAA/x8AAABhAAAAjABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAACwCMAAwB7QNtAAMABwALAA8AEwAXABsAHwAjACcAKwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAAUADAIMAm0DbQADAAcACwAPABMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP4fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAIMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAAAFAAwADAJtAG0AAwAHAAsADwATAAABAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAAwCMAgwB7QNtAAMABwALAAABAQEBAQEBAQEBAQEBjAAAAGEAAP8fAAAAYQAA/x8AAABhAAACDABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAAAOAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fABAADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAABHwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAHwAAAGEAAP4fAAAAYQAA/58AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAKAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAP+fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AEAAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABHwAAAGEAAAAfAAAAYQAA/h8AAABhAAAAHwAAAGEAAACfAAAAYQAA/58AAABhAAD/nwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAA4ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58ACwAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAP+fAAAAYQAA/58AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAP+fAAAAYQAAAR8AAABhAAD+nwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAA4ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADgAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAR8AAABhAAD9nwAAAGEAAACfAAAAYQAAAB8AAABhAAD+HwAAAGEAAP+fAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAJAIwADAHtA20AAwAHAAsADwATABcAGwAfACMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/58AAABhAAD/HwAAAGEAAAAfAAAAYQAA/58AAABhAAD/nwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58BAABhAAD/nwAAAAkADAAMAe0DbQADAAcACwAPABMAFwAbAB8AIwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAP6fAAAAYQAAAR8AAABhAAD/nwAAAGEAAP+fAAAAYQAA/x8AAABhAAAAHwAAAGEAAP+fAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwEAAGEAAP+fAAAADAAMAAwB7QNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAEfAAAAYQAA/h8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAB8AAABhAAD/HwAAAGEAAACfAAAAYQAA/p8AAABhAAABHwAAAGEAAP4fAAAAYQAA/58AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58ACgCMAAwB7QNtAAMABwALAA8AEwAXABsAHwAjACcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/x8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAA8ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAACfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAADAAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAR8AAABhAAD9nwAAAGEAAACfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADAAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADAAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAP+fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADAAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQECDAAAAGEAAP+fAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAEfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAJ8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58ACQAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAAAfAAAAYQAAAR8AAABhAAD9nwAAAGEAAACfAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAAMAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwALAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAAAB8AAABhAAD+nwAAAGEAAAEfAAAAYQAA/h8AAABhAAD/nwAAAGEAAP8fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/58AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAADAAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAAEfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58ACQAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAP8fAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAAADABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAAAMAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAJ8AAABhAAD+HwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAJAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAZ8AAABhAAD+HwAAAGEAAACfAAAAYQAA/x8AAABhAAD/HwAAAGEAAACfAAAAYQAA/h8AAABhAAABnwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAAwADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAA0ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAAcAjAAMAe0DbQADAAcACwAPABMAFwAbAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAYwAAABhAAD/HwAAAGEAAP+fAAAAYQAA/x8AAABhAAAAHwAAAGEAAP+fAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAAcBDAAMAW0DbQADAAcACwAPABMAFwAbAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAAcAjAAMAe0DbQADAAcACwAPABMAFwAbAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAP+fAAAAYQAAAB8AAABhAAD/HwAAAGEAAP+fAAAAYQAA/x8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAAUADAEMAm0B7QADAAcACwAPABMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABHwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAnwAAAGEAAAEMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAAGAQwADAFtA20AAwAHAAsADwATABcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58BAABhAAD/nwAPAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAA/x8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAA4ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAnwAAAGEAAAAfAAAAYQAA/p8AAABhAAABHwAAAGEAAP4fAAAAYQAA/x8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+nwAAAGEAAP+fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58ADAAMAIwCbQLtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAAAjABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AEQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAP+fAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP6fAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAAYBDAAMAW0DbQADAAcACwAPABMAFwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAQAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAwADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAP6fAAAAYQAAAR8AAABhAAD/HwAAAGEAAP8fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAP8fAAAAYQAAAR8AAABhAAD+nwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAIAjAMMAe0DbQADAAcAAAEBAQEBAQEBAIwAAABhAAAAnwAAAGEAAAMMAGEAAP+fAAAAYQAA/58AGAAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAEsATwBTAFcAWwBfAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AEwAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAEsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/nwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58BAABhAAD/nwAA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/58AAABhAAD/nwAAABQADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMARwBLAE8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAYwAAABhAAAAHwAAAGEAAP8fAAAAYQAAAB8AAABhAAD/HwAAAGEAAAAfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAEfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAEfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ABACMAQwBbQHtAAMABwALAA8AAAEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAA/x8AAABhAAAAHwAAAGEAAAEMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAUAjAAMAe0B7QADAAcACwAPABMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/x8AAABhAAD/nwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAAAIAAwBjAFtA+0AAwAHAAsADwATABcAGwAfAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/58AAABhAAD/HwAAAGEAAAAfAAAAYQAA/58AAABhAAABjABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fABEADAAMAm0DbQADAAcACwAPABMAFwAb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ADcAOwA/AEMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/x8AAABhAAAAnwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwEAAGEAAP+fAAAAYQAA/58AAAASAAwADAJtA+0AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAEcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAP8fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAVAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAEcASwBPAFMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAJ8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAA8ADAAMAm0D7QADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAAAHwAAAGEAAP+fAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAA/58AAABhAAD/nwAAAGEAAAGfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAEgAMAAwCbQPtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP6fAAAAYQAA/x8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwEAAGEAAP+fAIAAYQAA/58AEgAMAAwCbQPtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP6fAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwEAAGEAAP+fAIAAYQAA/58AEwAMAAwCbQPtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAEsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAQAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAEgAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAJ8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwEAAGEAAP+fAAAAYQAA/58ACwCMAAwB7QPtAAMABwALAA8AEwAXABsAHwAjACcAKwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAP+fAAAAYQAA/58AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAP8fAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAQAAYQAA/58AgABhAAD/nwAAAAsAjAAMAe0D7QADAAcACwAPABMAFwAbAB8AIwAnACsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/x8AAABhAAD/nwAAAGEAAP+fAAAAYQAA/x8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/x8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwEAAGEAAP+fAIAAYQAA/58AAAAMAIwADAHtA+0AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/58AAABhAAD/nwAAAGEAAP8fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwEAAGEAAP+fAAAAYQAA/58AgABhAAD/nwALAIwADAHtA20AAwAHAAsADwATABcAGwAfACMAJwArAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/58AAABhAAD/nwAAAGEAAP8fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP6fAAAAYQAAAJ8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58BAABhAAD/nwAAAGEAAP+fAAAAEgAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+nwAAAGEAAAEfAAAAYQAA/h8AAABhAAABHwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAACfAAAAYQAA/h8AAABhAAABHwAAAGEAAP4fAAAAYQAAAR8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AEgAMAAwCbQPtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/Z8AAABhAAABHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAEfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAR8AAABhAAD+nwAAAGEAAAAfAAAAYQAAAJ8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwEAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AEAAMAAwCbQPtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/x8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABh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AAD/nwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58BAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAAATAAwADAJtA+0AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAEcASwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/p8AAABhAAAAHwAAAGEAAACfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwEAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAAQAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+nwAAAGEAAACfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABh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AAABnwAAAGEAAP4fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAACfAAAAYQAA/x8AAABhAAD/nwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAABIADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMARwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAA/58AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAA/58AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAA8ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAA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AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAACfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fABEADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAEfAAAAYQAAAB8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAR8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAAARAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABh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/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAAAMAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQGMAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAMAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAOAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAR8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAACfAAAAYQAA/p8AAABhAAAAnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+f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/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADAAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AEwAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAEsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/p8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAEgAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAD/nwAAAGEAAP+fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAD/nwAAAGEAAP+fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AFQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAEsATwBTAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAA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AAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAANAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAAGfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAALAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAACwAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAACfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAABEADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAAANAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/h8AAABhAAAAnwAAAGEAAP8fAAAAYQAA/x8AAABhAAAAnwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAAAQAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQIMAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58ADQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQECDAAAAGEAAP+fAAAAYQAA/58AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAFwAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAEsATwBTAFcAWwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCA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AB8AIwAnACsALwAzADcAOwA/AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAJAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAA4ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/h8AAABhAAABHwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADgAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAP+fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAPAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAA0ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAA0ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAABHwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAR8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAABAADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAABHwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAR8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+nwAAAGEAAP8fAAAAYQAAAJ8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAKAAwADAHtAm0AAwAHAAsADwATABcAGwAfACMAJwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAR8AAABhAAD+HwAAAGEAAACfAAAAYQAA/p8AAABhAAAAHwAAAGEAAP8fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAAEfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58ADAAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/h8AAABhAAABHwAAAGEAAP4fAAAAYQAAAR8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADQAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAnwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAADQAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAADAAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADQAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAADAAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAP+fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ACgAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAkADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAABwAMAAwCbQJtAAMABwALAA8AEwAXABsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAACfAAAAYQAA/h8AAABhAAABnwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAADQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAP+fAAAAYQAA/x8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAAAnwAAAGEAAACfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/x8AAABhAAD/nwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAACQAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAGfAAAAYQAA/h8AAABhAAAAnwAAAGEAAP8fAAAAYQAA/x8AAABhAAAAnwAAAGEAAP4fAAAAYQAAAZ8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAAAMAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQIMAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAR8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/h8AAABhAAABHwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAKAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQIMAAAAYQAA/58AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AEQAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAA8ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAgwAAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAAAAwAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAACwAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+nwAAAGEAAAEfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAD/HwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAA0ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAEfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAEfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAAwADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAP+fAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAA4ADAAMAm0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADgAMAAwCbQJtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAEfAAAAYQAA/h8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAAEfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAOAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAZ8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAoADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/x8AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAQAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAKAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAP8fAAAAYQAA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AIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAPAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQGMAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAR8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/p8AAABhAAAAnwAAAGEAAP8fAAAAYQAAAB8AAABhAAD/nwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAABEADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAABnwAAAGEAAP+fAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAP+fAAAAYQAA/58AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAALAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAA/58AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2f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AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAJ8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAnwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAABMADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMARwBLAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwEAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58BAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAABIADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AEMARwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAAAAwAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAUADAGMAm0B7QADAAcACwAPABMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAGMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAADAIwCDAHtA20AAwAHAAsAAAEBAQEBAQEBAQEBAQGMAAAAYQAA/x8AAABhAAD/HwAAAGEAAAIMAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAAMAjAIMAe0DbQADAAcACwAAAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAgwAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAABACMAAwBbQFtAAMABwALAA8AAAEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAA/x8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAMAjAIMAe0DbQADAAcACwAAAQEBAQEBAQEBAQEBAYwAAABhAAD/HwAAAGEAAP8fAAAAYQAAAgwAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAABgAMAgwCbQNtAAMABwALAA8AEwAXAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAACfAAAAYQAA/h8AAABhAAAAnwAAAGEAAP4fAAAAYQAAAJ8AAABhAAACDABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58ABgAMAgwCbQNtAAMABwALAA8AEwAXAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAACfAAAAYQAA/x8AAABhAAAAnwAAAGEAAP8fAAAAYQAAAJ8AAABhAAACDABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58ACAAMAAwCbQFtAAMABwALAA8AEwAXABsAHwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAEfAAAAYQAA/p8AAABhAAABHwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAnwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAJAIwADAHtA20AAwAHAAsADwATABcAGwAfACMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAAkAjAEMAe0CbQADAAcACwAPABMAFwAbAB8AIwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAQwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAAwAMAAwCbQBtAAMABwALAAABAQEBAQEBAQEBAQEADAAAAGEAAACfAAAAYQAAAJ8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAADAIwBDAFtAm0AAwAHAAsAAAEBAQEBAQEBAQEBAQEMAAAAYQAA/x8AAABhAAAAHwAAAGEAAAEMAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAAMBDAEMAe0CbQADAAcACwAAAQEBAQEBAQEBAQEBAQwAAABhAAAAHwAAAGEAAP8fAAAAYQAAAQwAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAADACMAAwB7QNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAACfAAAAYQAA/p8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAACfAAAAYQAA/p8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAJ8AAABhAAAADABhAAD/nwAAAGEAAP+fAQAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58ADAAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAP+fAAAAYQAA/58AAABhAAAAHwAAAGEAAP8fAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwEAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADwAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAAAfAAAAYQAA/p8AAABhAAABHwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/x8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/x8AAABhAAABHwAAAGEAAP6fAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAAASAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAEcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAZ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAJ8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD+nwAAAGEAAP+fAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAHAAwBDAJtAm0AAwAHAAsADwATABcAGwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAJ8AAABhAAD+HwAAAGEAAACfAAAAYQAAAJ8AAABhAAD+HwAAAGEAAACfAAAAYQAAAQwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAAAKAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAA/58AAABhAAD/nwAAAGEAAAAfAAAAYQAA/x8AAABhAAAAnwAAAGEAAP+fAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAABwAMAAwB7QJtAAMABwALAA8AEwAXABsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAP6fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAfAAAAYQAA/58AAABhAAAAHwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAACQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAP+fAAAAYQAA/p8AAABhAAAAnwAAAGEAAP8fAAAAYQAAAB8AAABhAAD/nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAAALAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAADQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+nwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAADAAMAAwCbQHtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAD/nwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADwAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAAMAAwADAJtAm0AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAR8AAABhAAD+nwAAAGEAAACfAAAAYQAA/x8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAOAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQGMAAAAYQAA/h8AAABhAAABHwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAfAAAAYQAA/58AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/x8AAABhAAAADABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fABAADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABHwAAAGEAAP6fAAAAYQAAAR8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/h8AAABhAAABHwAAAGEAAP4fAAAAYQAAAR8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAPAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAA/58AAABhAAD/nwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+nwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+nwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAAwADAAMAm0C7QADAAcACwAPABMAFwAbAB8AIwAnACsALwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/h8AAABhAAABHwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAsADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAAAHwAAAGEAAP+fAAAAYQAA/58AAABhAAD+HwAAAGEAAAEfAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAAAOAAwADAJtAu0AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAA4ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAAAnwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58ACwAMAAwCbQLtAAMABwALAA8AEwAXABsAHwAjACcAKwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAEfAAAAYQAA/58AAABhAAD9nwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAAwADAAMAm0C7QADAAcACwAPABMAFwAbAB8AIwAnACsALwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAABnwAAAGEAAP4fAAAAYQAAAJ8AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAA8ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAD/nwAAAGEAAP+fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAAEfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAACgAMAAwCbQLtAAMABwALAA8AEwAXABsAHwAjACcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAR8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAA4ADAAMAm0C7QADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAAAHwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP4fAAAAYQAAAR8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAA/58AAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAACQAMAAwCbQHtAAMABwALAA8AEwAXABsAHwAjAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD9nwAAAGEAAACfAAAAYQAAAJ8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAAAMAAwADAJtAu0AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAP2fAAAAYQAAAJ8AAABhAAAAnwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAMAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAB8AAABhAAD/nwAAAGEAAP+fAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwEAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAJAIwADAHtA20AAwAHAAsADwATABcAGwAfACMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAA/58AAABhAAD/nwAAAGEAAACfAAAAYQAA/p8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/58AAABhAAD/nwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAAsADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAD+nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/p8AAABhAAD/nwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAAAIAAwADAJtAu0AAwAHAAsADwATABcAGwAfAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAoAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAwADAAMAm0C7QADAAcACwAPABMAFwAbAB8AIwAnACsALwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAACfAAAAYQAA/x8AAABhAAD/HwAAAGEAAACfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAA8ADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQwAAABhAAD+nwAAAGEAAACfAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/HwAAAGEAAAAfAAAAYQAA/h8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABh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/58AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAD/HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADAAMAAwCbQLtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAP+fAAAAYQAA/58AAABhAAAAnwAAAGEAAP6fAAAAYQAAAR8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58ADQAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAP+fAAAAYQAA/58AAABhAAAAnwAAAGEAAP6fAAAAYQAAAR8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/h8AAABhAAD/nwAAAGEAAAAMAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAACgAMAAwCbQHtAAMABwALAA8AEwAXABsAHwAjACcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/x8AAABhAAD/nwAAAGEAAP6fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAwADAAMAm0C7QADAAcACwAPABMAFwAbAB8AIwAnACsALwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAP8fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAA4ADAAMAe0CbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/nwAAAGEAAP4fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AEgAMAAwCbQLtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEADAAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAD/nwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/nwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ADAAMAAwCbQNtAAMABwALAA8AEwAXABsAHwAjACcAKwAvAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAAAfAAAAYQAAAB8AAABhAAD/nwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58BAABhAAD/nwAAAGEAAP+fAAAAYQAA/58ACwAMAAwB7QNtAAMABwALAA8AEwAXABsAHwAjACcAKwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAjAAAAGEAAAAfAAAAYQAAAB8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/h8AAABhAAABHwAAAGEAAP4fAAAAYQAAAR8AAABhAAD+HwAAAGEAAAEfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAA0ADAAMAm0C7QADAAcACwAPABMAFwAbAB8AIwAnACsALwAzAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAnwAAAGEAAAAfAAAAYQAA/h8AAABhAAAAnwAAAGEAAACfAAAAYQAA/Z8AAABhAAAAnwAAAGEAAP6fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAACfAAAAYQAA/58AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAAoADAAMAm0C7QADAAcACwAPABMAFwAbAB8AIwAnAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAwAAABhAAAAHwAAAGEAAP8fAAAAYQAAAJ8AAABhAAD+nwAAAGEAAAEfAAAAYQAA/h8AAABhAAABnwAAAGEAAP2fAAAAYQAA/58AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwASAAwADAJtAu0AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAEcAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAABnwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwALAAwADAJtAu0AAwAHAAsADwATABcAGwAfACMAJwArAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEMAAAAYQAAAB8AAABhAAAAHwAAAGEAAP2fAAAAYQAAAZ8AAABhAAD9nwAAAGEAAAGfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAAADABhAAD/nwCAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAADgAMAAwCbQLtAAMABwALAA8AEwAXABsAHwAjACcAKwAvADMANwAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBDAAAAGEAAAAfAAAAYQAAAB8AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAA/58AAABhAAD9nwAAAGEAAAAfAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAAwAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAIAAwADAJtAu0AAwAHAAsADwATABcAGwAfAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAD/nwAAAGEAAP2fAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAAAAYQAA/58AgABhAAD/nwCAAGEAAP+fAIAAYQAA/58BAABhAAD/nwAAAGEAAP+fAAQAjAEMAW0B7QADAAcACwAPAAABAQEBAQEBAQEBAQEBAQEBAIwAAABhAAAAHwAAAGEAAP8fAAAAYQAAAB8AAABhAAABDABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAFAAwBjAJtAe0AAwAHAAsADwATAAABAQEBAQEBAQEBAQEBAQEBAQEBAQAMAAAAYQAAAB8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAB8AAABhAAABjABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAAAAAwAMAIwBbQHtAAMABwALAAABAQEBAQEBAQEBAQEBDAAAAGEAAP8fAAAAYQAA/x8AAABhAAAAjABhAAD/nwCAAGEAAP+fAIAAYQAA/58AAAAPAAwADAJtA20AAwAHAAsADwATABcAGwAfACMAJwArAC8AMwA3ADsAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQCMAAAAYQAAAR8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/h8AAABhAAABHwAAAGEAAP2fAAAAYQAAAB8AAABhAAAAHwAAAGEAAACfAAAAYQAA/h8AAABhAAD/nwAAAGEAAAEfAAAAYQAA/p8AAABhAAAAHwAAAGEAAAAMAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AAABhAAD/nwAAAGEAAP+fAIAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAABAADAAMAm0DbQADAAcACwAPABMAFwAbAB8AIwAnACsALwAzADcAOwA/AAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIwAAABhAAABHwAAAGEAAP4fAAAAYQAAAR8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/Z8AAABhAAAAHwAAAGEAAAAfAAAAYQAAAJ8AAABhAAD+HwAAAGEAAAEfAAAAYQAA/h8AAABhAAABHwAAAGEAAP6fAAAAYQAAAB8AAABhAAAADABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAAAAYQAA/58AAABhAAD/nwCAAGEAAP+fAAAAYQAA/58AgABhAAD/nwAAAGEAAP+fAIAAYQAA/58AAABhAAD/nwAAACIBngABAAAAAAAAAM4AAAABAAAAAAABABcAzgABAAAAAAACAAcA5QABAAAAAAADABcA7AABAAAAAAAEAB8BAwABAAAAAAAFAAsBIgABAAAAAAAGABcBLQABAAAAAAAHACsBRAABAAAAAAAIABYBbwABAAAAAAAJAA8BhQABAAAAAAAKBRsBlAABAAAAAAALAEkGrwABAAAAAAAMADcG+AABAAAAAAANACgHLwABAAAAAAAOAC4HVwABAAAAAAATACkHhQABAAAAAAEAAAgHrgADAAEECQAAAZ4HtgADAAEECQABAC4JVAADAAEECQACAA4JggADAAEECQADAC4JkAADAAEECQAEAD4JvgADAAEECQAFABYJ/AADAAEECQAGAC4KEgADAAEECQAHAFYKQAADAAEECQAIACwKlgADAAEECQAJAB4KwgADAAEECQAKCkoK4AADAAEECQALAJIVKgADAAEECQAMAG4VvAADAAEECQANAFAWKgADAAEECQAOAFwWegADAAEECQATAFIW1gADAAEECQEAABAXKENvcHlyaWdodCBIjHZhciBIZW5yaWtzZW4gMjAxMdI1eDggTENEIEhENDQ3ODBVIEEwMtMgYnkg0nZhZGVyMzgx0yAoaHR0cHM6Ly9mb250c3RydWN0LmNvbS9mb250c3RydWN0b3JzL3Nob3cvMjc1MDg0L3ZhZGVyMzgxKSwgd2hpY2ggaXMgYmFzZWQgb24g0kxDRCBEb3QgTWF0cml4IENvbmRlbnNlZCwgd2hpY2ggaXMgYmFzZWQgb24g0kxDRCBEb3QgTWF0cml4TENEIERvdCBNYXRyaXggSEQ0NDc4MFVSZWd1bGFyTENEIERvdCBNYXRyaXggSEQ0NDc4MFVMQ0QgRG90IE1hdHJpeCBIRDQ0NzgwVSBSZWd1bGFyVmVyc2lvbiAxLjBMQ0QtRG90LU1hdHJpeC1IRDQ0NzgwVUZvbnRTdHJ1Y3QgaXMgYSB0cmFkZW1hcmsgb2YgRm9udFN0cnVjdC5jb21odHRwczovL2ZvbnRzdHJ1Y3QuY29tSIx2YXIgSGVucmlrc2Vu0kxDRCBEb3QgTWF0cml4IEhENDQ3ODBV0yB3YXMgYnVpbHQgd2l0aCBGb250U3RydWN0RGVzaWduZXIgZGVzY3JpcHRpb246IFRoaXMgZm9udCBpcyBiYXNlZCBvbiB0aGUgPGEgaHJlZj0iaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IRDQ0NzgwX0NoYXJhY3Rlcl9MQ0QiPkhENDQ3ODBVIENoYXJhY3RlciBMQ0Q8L2E+LWRpc3BsYXksIGFuZCBpdCdzIGEgY2xvbmUgb2YgdGhlIDxhIGhyZWY9Imh0dHA6Ly9mb250c3RydWN0LmNvbS9mb250c3RydWN0aW9ucy9zaG93LzMxMDIzMyI+NXg4IExDRCBIRDQ0NzgwVSBBMDI8L2E+IGZvbnQsIHdpY2ggYWdhaW4gaXMgYSBjbG9uZSBvZiBteSA8YSBocmVmPSJodHRwOi8vZm9udHN0cnVjdC5jb20vZm9udHN0cnVjdGlvbnMvc2hvdy8xNDI4MTAiPkxDRCBEb3QgTWF0cml4PC9hPiBmb250LjxiciAvPkkndmUgYWRkZWQgc29tZSBtb3JlIGNoYXJhY3RlcnMgdG8gdGhlIGZvbnQsIHNvbWUgY2xvbmVkIGZyb20gdGhlIDxhIGhyZWY9Imh0dHA6Ly9mb250c3RydWN0LmNvbS9mb250c3RydWN0aW9ucy9zaG93LzQ4NDEwIj5MdWNpZCBmb250PC9hPiwgd2hpbGUgb3RoZXJzIHdoZXJlIHRha2VuIGZyb20gdGhlIGRhdGFzaGVldCBmb3IgdGhlIDxhIGhyZWY9Imh0dHA6Ly9sY2QtbGludXguc291cmNlZm9yZ2UubmV0L3BkZmRvY3MvaGQ0NDc4MC5wZGYiPkhpdGFjaGkgSEQ0NDc4MFUgKExDRC1JSSk8L2E+LjxiciAvPkkndmUgbWFkZSBhIG5ldyBmb250IHdpY2ggY29udGFpbnMgbWFueSBzeW1ib2xzIHRvIGJlIHVzZWQgdG9nZXRoZXIgd2l0aCB0aGlzIGZvbnQuIEl0J2xsIGJlIHJlbGVhc2VkIGxhdGVyLjxiciAvPlRoZSBmb250IGNvbnRhaW5zIHNvbWUgYWx0ZXJuYXRpdmUgZ2x5cGhzIGZvciB0aGUgIkEiLCAiUyIsICIzIiwgIjQiLCAiNSIsICI3IiBhbmQgIjkiIGNoYXJhY3RlcnMgaW4gdGhlIERldmFuYWdhcmkgY2hhcmFjdGVyIHNwYWNlLjxiciAvPlRoZSB1cHBlci0gYW5kIGxvd2VyY2FzZSBsZXR0ZXJzICKvIiwgYW5kICK/IiwgaGFzIGJlZW4gY2xvbmVkIGZyb20gdGhlIEx1Y2lkIGZvbnQuIChUaGUgb3JpZ2luYWwgIq8iLCBhbmQgIr8iIGNvdWxkIGJlIGZvdW5kIGluIHRoZSBEZXZhbmFnYXJpIGNoYXJhY3RlciBzcGFjZSku0jV4OCBMQ0QgSEQ0NDc4MFUgQTAy0yBieSDSdmFkZXIzODHTIChodHRwczovL2ZvbnRzdHJ1Y3QuY29tL2ZvbnRzdHJ1Y3RvcnMvc2hvdy8yNzUwODQvdmFkZXIzODEpLCB3aGljaCBpcyBiYXNlZCBvbiDSTENEIERvdCBNYXRyaXggQ29uZGVuc2VkLCB3aGljaCBpcyBiYXNlZCBvbiDSTENEIERvdCBNYXRyaXhodHRwczovL2ZvbnRzdHJ1Y3QuY29tL2ZvbnRzdHJ1Y3Rpb25zL3Nob3cvNDc2MTIxL2xjZF9kb3RfbWF0cml4X2hkNDQ3ODB1aHR0cHM6Ly9mb250c3RydWN0LmNvbS9mb250c3RydWN0b3JzL3Nob3cvMzQ3OTgvZmFyc2lkZUNyZWF0aXZlIENvbW1vbnMgQXR0cmlidXRpb24gU2hhcmUgQWxpa2VodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS1zYS8zLjAvRml2ZSBiaWcgcXVhY2tpbmcgemVwaHlycyBqb2x0IG15IHdheCBiZWRCZzRPZEZ0bABDAG8AcAB5AHIAaQBnAGgAdAAgAEgA5QB2AGEAcgAgAEgAZQBuAHIAaQBrAHMAZQBuACAAMgAwADEAMQAKIBwANQB4ADgAIABMAEMARAAgAEgARAA0ADQANwA4ADAAVQAgAEEAMAAyIB0AIABiAHkAICAcAHYAYQBkAGUAcgAzADgAMSAdACAAKABoAHQAdABwAHMAOgAvAC8AZgBvAG4AdABzAHQAcgB1AGMAdAAuAGMAbwBtAC8AZgBvAG4AdABzAHQAcgB1AGMAdABvAHIAcwAvAHMAaABvAHcALwAyADcANQAwADgANAAvAHYAYQBkAGUAcgAzADgAMQApACwAIAB3AGgAaQBjAGgAIABpAHMAIABiAGEAcwBlAGQAIABvAG4AICAcAEwAQwBEACAARABvAHQAIABNAGEAdAByAGkAeAAgAEMAbwBuAGQAZQBuAHMAZQBkACwAIAB3AGgAaQBjAGgAIABpAHMAIABiAGEAcwBlAGQAIABvAG4AICAcAEwAQwBEACAARABvAHQAIABNAGEAdAByAGkAeABMAEMARAAgAEQAbwB0ACAATQBhAHQAcgBpAHgAIABIAEQANAA0ADcAOAAwAFUAUgBlAGcAdQBsAGEAcgBMAEMARAAgAEQAbwB0ACAATQBhAHQAcgBpAHgAIABIAEQANAA0ADcAOAAwAFUATABDAEQAIABEAG8AdAAgAE0AYQB0AHIAaQB4ACAASABEADQANAA3ADgAMABVACAAUgBlAGcAdQBsAGEAcgBWAGUAcgBzAGkAbwBuACAAMQAuADAATABDAEQALQBEAG8AdAAtAE0AYQB0AHIAaQB4AC0ASABEADQANAA3ADgAMABVAEYAbwBuAHQAUwB0AHIAdQBjAHQAIABpAHMAIABhACAAdAByAGEAZABlAG0AYQByAGsAIABvAGYAIABGAG8AbgB0AFMAdAByAHUAYwB0AC4AYwBvAG0AaAB0AHQAcABzADoALwAvAGYAbwBuAHQAcwB0AHIAdQBjAHQALgBjAG8AbQBIAOUAdgBhAHIAIABIAGUAbgByAGkAawBzAGUAbiAcAEwAQwBEACAARABvAHQAIABNAGEAdAByAGkAeAAgAEgARAA0ADQANwA4ADAAVSAdACAAdwBhAHMAIABiAHUAaQBsAHQAIAB3AGkAdABoACAARgBvAG4AdABTAHQAcgB1AGMAdAAKAEQAZQBzAGkAZwBuAGUAcgAgAGQAZQBzAGMAcgBpAHAAdABpAG8AbgA6ACAAVABoAGkAcwAgAGYAbwBuAHQAIABpAHMAIABiAGEAcwBlAGQAIABvAG4AIAB0AGgAZQAgADwAYQAgAGgAcgBlAGYAPQAiAGgAdAB0AHAAOgAvAC8AZQBuAC4AdwBpAGsAaQBwAGUAZABpAGEALgBvAHIAZwAvAHcAaQBrAGkALwBIAEQANAA0ADcAOAAwAF8AQwBoAGEAcgBhAGMAdABlAHIAXwBMAEMARAAiAD4ASABEADQANAA3ADgAMABVACAAQwBoAGEAcgBhAGMAdABlAHIAIABMAEMARAA8AC8AYQA+AC0AZABpAHMAcABsAGEAeQAsACAAYQBuAGQAIABpAHQAJwBzACAAYQAgAGMAbABvAG4AZQAgAG8AZgAgAHQAaABlACAAPABhACAAaAByAGUAZgA9ACIAaAB0AHQAcAA6AC8ALwBmAG8AbgB0AHMAdAByAHUAYwB0AC4AYwBvAG0ALwBmAG8AbgB0AHMAdAByAHUAYwB0AGkAbwBuAHMALwBzAGgAbwB3AC8AMwAxADAAMgAzADMAIgA+ADUAeAA4ACAATABDAEQAIABIAEQANAA0ADcAOAAwAFUAIABBADAAMgA8AC8AYQA+ACAAZgBvAG4AdAAsACAAdwBpAGMAaAAgAGEAZwBhAGkAbgAgAGkAcwAgAGEAIABjAGwAbwBuAGUAIABvAGYAIABtAHkAIAA8AGEAIABoAHIAZQBmAD0AIgBoAHQAdABwADoALwAvAGYAbwBuAHQAcwB0AHIAdQBjAHQALgBjAG8AbQAvAGYAbwBuAHQAcwB0AHIAdQBjAHQAaQBvAG4AcwAvAHMAaABvAHcALwAxADQAMgA4ADEAMAAiAD4ATABDAEQAIABEAG8AdAAgAE0AYQB0AHIAaQB4ADwALwBhAD4AIABmAG8AbgB0AC4APABiAHIAIAAvAD4ADQAKAEkAJwB2AGUAIABhAGQAZABlAGQAIABzAG8AbQBlACAAbQBvAHIAZQAgAGMAaABhAHIAYQBjAHQAZQByAHMAIAB0AG8AIAB0AGgAZQAgAGYAbwBuAHQALAAgAHMAbwBtAGUAIABjAGwAbwBuAGUAZAAgAGYAcgBvAG0AIAB0AGgAZQAgADwAYQAgAGgAcgBlAGYAPQAiAGgAdAB0AHAAOgAvAC8AZgBvAG4AdABzAHQAcgB1AGMAdAAuAGMAbwBtAC8AZgBvAG4AdABzAHQAcgB1AGMAdABpAG8AbgBzAC8AcwBoAG8AdwAvADQAOAA0ADEAMAAiAD4ATAB1AGMAaQBkACAAZgBvAG4AdAA8AC8AYQA+ACwAIAB3AGgAaQBsAGUAIABvAHQAaABlAHIAcwAgAHcAaABlAHIAZQAgAHQAYQBrAGUAbgAgAGYAcgBvAG0AIAB0AGgAZQAgAGQAYQB0AGEAcwBoAGUAZQB0ACAAZgBvAHIAIAB0AGgAZQAgADwAYQAgAGgAcgBlAGYAPQAiAGgAdAB0AHAAOgAvAC8AbABjAGQALQBsAGkAbgB1AHgALgBzAG8AdQByAGMAZQBmAG8AcgBnAGUALgBuAGUAdAAvAHAAZABmAGQAbwBjAHMALwBoAGQANAA0ADcAOAAwAC4AcABkAGYAIgA+AEgAaQB0AGEAYwBoAGkAIABIAEQANAA0ADcAOAAwAFUAIAAoAEwAQwBEAC0ASQBJACkAPAAvAGEAPgAuADwAYgByACAALwA+AA0ACgBJACcAdgBlACAAbQBhAGQAZQAgAGEAIABuAGUAdwAgAGYAbwBuAHQAIAB3AGkAYwBoACAAYwBvAG4AdABhAGkAbgBzACAAbQBhAG4AeQAgAHMAeQBtAGIAbwBsAHMAIAB0AG8AIABiAGUAIAB1AHMAZQBkACAAdABvAGcAZQB0AGgAZQByACAAdwBpAHQAaAAgAHQAaABpAHMAIABmAG8AbgB0AC4AIABJAHQAJwBsAGwAIABiAGUAIAByAGUAbABlAGEAcwBlAGQAIABsAGEAdABlAHIALgA8AGIAcgAgAC8APgANAAoAVABoAGUAIABmAG8AbgB0ACAAYwBvAG4AdABhAGkAbgBzACAAcwBvAG0AZQAgAGEAbAB0AGUAcgBuAGEAdABpAHYAZQAgAGcAbAB5AHAAaABzACAAZgBvAHIAIAB0AGgAZQAgACIAQQAiACwAIAAiAFMAIgAsACAAIgAzACIALAAgACIANAAiACwAIAAiADUAIgAsACAAIgA3ACIAIABhAG4AZAAgACIAOQAiACAAYwBoAGEAcgBhAGMAdABlAHIAcwAgAGkAbgAgAHQAaABlACAARABlAHYAYQBuAGEAZwBhAHIAaQAgAGMAaABhAHIAYQBjAHQAZQByACAAcwBwAGEAYwBlAC4APABiAHIAIAAvAD4ADQAKAFQAaABlACAAdQBwAHAAZQByAC0AIABhAG4AZAAgAGwAbwB3AGUAcgBjAGEAcwBlACAAbABlAHQAdABlAHIAcwAgACIA2AAiACwAIABhAG4AZAAgACIA+AAiACwAIABoAGEAcwAgAGIAZQBlAG4AIABjAGwAbwBuAGUAZAAgAGYAcgBvAG0AIAB0AGgAZQAgAEwAdQBjAGkAZAAgAGYAbwBuAHQALgAgACgAVABoAGUAIABvAHIAaQBnAGkAbgBhAGwAIAAiANgAIgAsACAAYQBuAGQAIAAiAPgAIgAgAGMAbwB1AGwAZAAgAGIAZQAgAGYAbwB1AG4AZAAgAGkAbgAgAHQAaABlACAARABlAHYAYQBuAGEAZwBhAHIAaQAgAGMAaABhAHIAYQBjAHQAZQByACAAcwBwAGEAYwBlACkALgAKIBwANQB4ADgAIABMAEMARAAgAEgARAA0ADQANwA4ADAAVQAgAEEAMAAyIB0AIABiAHkAICAcAHYAYQBkAGUAcgAzADgAMSAdACAAKABoAHQAdABwAHMAOgAvAC8AZgBvAG4AdABzAHQAcgB1AGMAdAAuAGMAbwBtAC8AZgBvAG4AdABzAHQAcgB1AGMAdABvAHIAcwAvAHMAaABvAHcALwAyADcANQAwADgANAAvAHYAYQBkAGUAcgAzADgAMQApACwAIAB3AGgAaQBjAGgAIABpAHMAIABiAGEAcwBlAGQAIABvAG4AICAcAEwAQwBEACAARABvAHQAIABNAGEAdAByAGkAeAAgAEMAbwBuAGQAZQBuAHMAZQBkACwAIAB3AGgAaQBjAGgAIABpAHMAIABiAGEAcwBlAGQAIABvAG4AICAcAEwAQwBEACAARABvAHQAIABNAGEAdAByAGkAeABoAHQAdABwAHMAOgAvAC8AZgBvAG4AdABzAHQAcgB1AGMAdAAuAGMAbwBtAC8AZgBvAG4AdABzAHQAcgB1AGMAdABpAG8AbgBzAC8AcwBoAG8AdwAvADQANwA2ADEAMgAxAC8AbABjAGQAXwBkAG8AdABfAG0AYQB0AHIAaQB4AF8AaABkADQANAA3ADgAMAB1AGgAdAB0AHAAcwA6AC8ALwBmAG8AbgB0AHMAdAByAHUAYwB0AC4AYwBvAG0ALwBmAG8AbgB0AHMAdAByAHUAYwB0AG8AcgBzAC8AcwBoAG8AdwAvADMANAA3ADkAOAAvAGYAYQByAHMAaQBkAGUAQwByAGUAYQB0AGkAdgBlACAAQwBvAG0AbQBvAG4AcwAgAEEAdAB0AHIAaQBiAHUAdABpAG8AbgAgAFMAaABhAHIAZQAgAEEAbABpAGsAZQBoAHQAdABwADoALwAvAGMAcgBlAGEAdABpAHYAZQBjAG8AbQBtAG8AbgBzAC4AbwByAGcALwBsAGkAYwBlAG4AcwBlAHMALwBiAHkALQBzAGEALwAzAC4AMAAvAEYAaQB2AGUAIABiAGkAZwAgAHEAdQBhAGMAawBpAG4AZwAgAHoAZQBwAGgAeQByAHMAIABqAG8AbAB0ACAAbQB5ACAAdwBhAHgAIABiAGUAZABCAGcANABPAGQARgB0AGwAAAADAAAAAAAAAGYAMwAAAAAAAAAAAAAAAAAAAAAAAAAA") format("truetype");
            }
            </style>
        </defs>
        <g transform="matrix(2.0830003,0,0,2.0830003,0.12498002,-0.318243)" id="main_group">
            <path style="fill:#006699" id="path4554" d="M 77.363,0.153 H 3.946 c -1.66,0 -4.006,2.571 -4.006,5.745 v 70.205 c 0,3.171 2.346,5.743 4.006,5.743 H 78.05 c 1.66,0 4.009,-2.572 4.009,-5.743 V 5.897 c 0,-3.173 -3.036,-5.744 -4.696,-5.744 z M 13.052,80.501 v 0.006 h -0.047 c -0.094,0.006 -0.183,0.026 -0.276,0.026 -0.112,0 -0.22,-0.021 -0.328,-0.026 H 8.052 c -0.108,0.008 -0.215,0.026 -0.327,0.026 -2.313,0 -4.188,-1.875 -4.188,-4.188 0,-2.312 1.875,-4.188 4.188,-4.188 h 5.327 v 0.033 c 2.158,0.168 3.863,1.953 3.863,4.154 0,2.204 -1.703,3.989 -3.863,4.157 z m 0.625,-69.875 v 0.005 H 13.63 c -0.094,0.006 -0.183,0.028 -0.276,0.028 -0.112,0 -0.22,-0.019 -0.328,-0.028 H 8.677 C 8.569,10.64 8.462,10.659 8.35,10.659 6.037,10.659 4.162,8.784 4.162,6.471 4.162,4.158 6.036,2.283 8.35,2.283 h 5.327 v 0.033 c 2.158,0.168 3.863,1.953 3.863,4.155 0,2.202 -1.703,3.987 -3.863,4.155 z m 60.5,69.625 v 0.006 H 74.13 c -0.094,0.006 -0.183,0.026 -0.276,0.026 -0.112,0 -0.22,-0.021 -0.328,-0.026 h -4.349 c -0.108,0.008 -0.215,0.026 -0.327,0.026 -2.313,0 -4.188,-1.875 -4.188,-4.188 0,-2.312 1.875,-4.188 4.188,-4.188 h 5.327 v 0.033 c 2.158,0.168 3.863,1.953 3.863,4.154 0,2.204 -1.703,3.989 -3.863,4.157 z m 1,-69.251 v 0.006 H 75.13 c -0.094,0.006 -0.183,0.027 -0.276,0.027 -0.112,0 -0.22,-0.02 -0.328,-0.027 h -4.349 c -0.108,0.008 -0.215,0.027 -0.327,0.027 -2.313,0 -4.188,-1.875 -4.188,-4.188 0,-2.313 1.875,-4.188 4.188,-4.188 h 5.327 V 2.69 c 2.158,0.168 3.863,1.953 3.863,4.155 0,2.202 -1.703,3.988 -3.863,4.155 z" />
            <rect style="fill:#454545" id="rect4556" height="7.427" width="3.7130001" y="1.473" x="28.021" />
            <polygon style="fill:#454545" id="polygon4558" points="26.163,7.041 26.163,3.328 28.021,1.473 28.021,8.899 " />
            <polygon style="fill:#454545" id="polygon4560" points="31.732,8.899 31.732,1.473 33.593,3.328 33.593,7.041 " />
            <rect style="fill:#b68b2d" id="rect4562" height="1.668" width="1.312" y="4.349" x="29.223" />
            <rect style="fill:#454545" id="rect4564" height="7.427" width="3.7130001" y="1.473" x="35.223" />
            <polygon style="fill:#454545" id="polygon4566" points="33.363,7.041 33.363,3.328 35.223,1.473 35.223,8.899 " />
            <polygon style="fill:#454545" id="polygon4568" points="38.934,8.899 38.934,1.473 40.792,3.328 40.792,7.041 " />
            <rect style="fill:#b68b2d" id="rect4570" height="1.668" width="1.312" y="4.349" x="36.421001" />
            <rect style="fill:#454545" id="rect4572" height="7.427" width="3.7130001" y="1.473" x="42.421001" />
            <polygon style="fill:#454545" id="polygon4574" points="40.564,7.041 40.564,3.328 42.421,1.473 42.421,8.899 " />
            <polygon style="fill:#454545" id="polygon4576" points="46.134,8.899 46.134,1.473 47.992,3.328 47.992,7.041 " />
            <rect style="fill:#b68b2d" id="rect4578" height="1.668" width="1.312" y="4.349" x="43.622002" />
            <rect style="fill:#454545" id="rect4580" height="7.427" width="3.7130001" y="1.473" x="49.622002" />
            <polygon style="fill:#454545" id="polygon4582" points="47.764,7.041 47.764,3.328 49.622,1.473 49.622,8.899 " />
            <polygon style="fill:#454545" id="polygon4584" points="53.333,8.899 53.333,1.473 55.191,3.328 55.191,7.041 " />
            <rect style="fill:#b68b2d" id="rect4586" height="1.668" width="1.312" y="4.349" x="50.82" />
            <text style="font-size:2.5px;font-family:OCRA;fill:#ffffff" id="text4588" font-size="2.5" transform="translate(27.165,12.1396)">VCC</text>
        
            <text style="font-size:2.5px;font-family:OCRA;fill:#ffffff" id="text4590" font-size="2.5" transform="translate(34.4883,12.1377)">GND</text>
        
            <text style="font-size:2.5px;font-family:OCRA;fill:#ffffff" id="text4592" font-size="2.5" transform="translate(41.8115,12.1396)">SCL</text>
        
            <text style="font-size:2.5px;font-family:OCRA;fill:#ffffff" id="text4594" font-size="2.5" transform="translate(49.1348,12.1377)">SDA</text>
        
            <rect style="fill:#231f20" id="rect4596" height="46" width="79.125" y="12.726" x="1.238" />
            <rect style="fill:#00435e" id="4598" height="43.5" width="76.125" y="14.101" x="3.1129999" />
            <g transform="translate (3.1129999 14.101)" id="print_zone" style="font-size:4.7579px;font-family:'LCD Dot Matrix HD44780U';" >
            </g>
            <rect style="fill:#231f20" id="rect4600" height="23.375" width="30" y="57.726002" x="25.988001" />
            <text style="font-size:2.5px;font-family:OCRA;fill:#ffffff" id="text4602" font-size="2.5" transform="translate(30.7334,64.6006)">OLED 128x64 </text>
        
            <text style="font-size:2.5px;font-family:OCRA;fill:#ffffff" id="text4604" font-size="2.5" transform="translate(34.3076,67.6006)">SSD1306 </text>
        
            <text style="font-size:2.5px;font-family:OCRA;fill:#ffffff" id="text4606" font-size="2.5" transform="translate(37.8823,70.6006)">I2C</text>
        
            <text style="font-size:2.5px;font-family:OCRA;fill:#ffffff" id="text4608" font-size="2.5" transform="translate(29.2227,77.0986)">blog.squix.ch</text>
        </g>
        </svg>`;
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var input;
    (function (input) {
        function compassHeading() {
            let b = pxsim.compass();
            if (!b.usesHeading) {
                b.usesHeading = true;
                pxsim.runtime.queueDisplayUpdate();
            }
            return b.heading;
        }
        input.compassHeading = compassHeading;
        function magneticForce() {
            // TODO
            return 0;
        }
        input.magneticForce = magneticForce;
        function gyroscopicForce(dimension) {
            // TODO
            return 0;
        }
        input.gyroscopicForce = gyroscopicForce;
    })(input = pxsim.input || (pxsim.input = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
var pxsim;
(function (pxsim) {
    function compass() {
        return pxsim.board().compassState;
    }
    pxsim.compass = compass;
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
/// <reference path="../../../libs/core/dal.d.ts"/>
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        const xc = 275;
        const yc = 255;
        class CompassView {
            constructor() {
                this.style = visuals.BUTTON_PAIR_STYLE;
                this.headInitialized = false;
            }
            init(bus, state, svgEl, otherParams) {
                this.state = state;
                this.bus = bus;
                this.defs = [];
                this.svgEl = svgEl;
                this.updateState();
                this.attachEvents();
            }
            moveToCoord(xy) {
                let btnWidth = visuals.PIN_DIST * 3;
                let [x, y] = xy;
                visuals.translateEl(this.element, [x, y]);
            }
            updateState() {
                let state = this.state;
                if (!state || !state.heading || !state.usesHeading) {
                    if (this.head) {
                        this.svgEl.removeChild(this.element);
                        this.head = null;
                        this.headInitialized = false;
                    }
                }
                else if (state && state.heading && state.usesHeading && !this.headInitialized) {
                    this.mkCompass();
                    this.svgEl.appendChild(this.element);
                    this.updateCompass();
                    this.headInitialized = true;
                }
            }
            getElement() {
                return this.element;
            }
            updateTheme() {
            }
            mkCompass() {
                let svgEl = this.svgEl;
                let g = pxsim.svg.elt("g");
                this.head = pxsim.svg.child(g, "g", { class: "sim-head no-drag" });
                pxsim.svg.child(this.head, "circle", { cx: xc, cy: yc, r: 40, fill: "#303030" });
                let compass = pxsim.svg.child(this.head, "g");
                compass.setAttribute("transform", "translate(" + (xc - 46) + "," + (yc - 46) + ") scale(0.090612541, 0.090538705)");
                //svg.path(compass, "sim-theme", "M 500.1,990.4 C 225.2,986.5 9.9,774.4 10,499.4 10.1,224.7 225,9.6 499.9,9.6 775.1,9.5 990.7,225.3 990,500.9 989.3,774.6 774.9,986.4 500.1,990.4 Z M 500.2,63.2 C 260,62.9 64,258 63.6,497.8 63.2,739.8 257.7,935.4 499.5,935.9 739.6,936.4 936,741.2 936.4,501.5 936.8,259.2 742,63.5 500.2,63.2 Z");
                pxsim.svg.path(compass, "sim-theme", "m 706.2,141.1 c -3.1,17.1 -6,32.6 -8.8,48 -14.8,79.7 -29.5,159.5 -44.3,239.2 -8.7,46.7 -17.3,93.5 -26.1,140.2 -0.4,2.2 -1.9,4.7 -3.6,6.2 -80.8,69.1 -161.6,138.1 -242.4,207.1 -27.7,23.7 -55.5,47.3 -83.2,70.9 -1.2,1 -2.5,1.9 -4.8,3.8 1.9,-10.3 3.4,-19.3 5.1,-28.3 24.6,-132.9 49.2,-265.8 74,-398.6 0.5,-2.5 2.3,-5.3 4.3,-7 62.5,-53.5 125.2,-106.9 187.8,-160.4 46.1,-39.3 92.1,-78.7 138.2,-118 0.7,-0.6 1.6,-1.3 3.8,-3.1 z M 341.9,770.7 c 0.4,0.2 0.7,0.5 1.1,0.7 84.6,-71.9 169.2,-143.8 254.2,-216 C 532.1,517.8 467.7,480.6 402.8,443.2 382.4,552.9 362.2,661.8 341.9,770.7 Z");
                this.headText = pxsim.svg.child(g, "text", { x: xc - 15, y: yc + 65, class: "sim-text" });
                this.updateTheme();
                let pt = this.svgEl.createSVGPoint();
                pxsim.svg.buttonEvents(this.head, (ev) => {
                    let state = this.state;
                    let cur = pxsim.svg.cursorPoint(pt, this.svgEl, ev);
                    state.heading = Math.floor(Math.atan2(cur.y - yc, cur.x - xc) * 180 / Math.PI + 90);
                    if (state.heading < 0)
                        state.heading += 360;
                    this.updateCompass();
                });
                this.element = g;
            }
            attachEvents() {
            }
            updateCompass() {
                let state = this.state;
                if (!state || !state.usesHeading)
                    return;
                let txt = state.heading.toString() + "°";
                if (txt != this.headText.textContent) {
                    pxsim.svg.rotateElement(this.head, xc, yc, state.heading - 120);
                    this.headText.textContent = txt;
                }
            }
        }
        visuals.CompassView = CompassView;
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../node_modules/pxt-core/localtypings/pxtarget.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
var pxsim;
(function (pxsim) {
    let PressureUnit;
    (function (PressureUnit) {
        PressureUnit[PressureUnit["HectoPascal"] = 0] = "HectoPascal";
        PressureUnit[PressureUnit["mBar"] = 1] = "mBar";
    })(PressureUnit = pxsim.PressureUnit || (pxsim.PressureUnit = {}));
})(pxsim || (pxsim = {}));
(function (pxsim) {
    var input;
    (function (input) {
        function onPressureConditionChanged(condition, pressure, unit, body) {
            let state = pxsim.barometerState();
            state.setUsed();
            const t = pressure;
            if (condition === 2 /* ANALOG_THRESHOLD_HIGH */) {
                state.setHighThreshold(t);
            }
            else {
                state.setLowThreshold(t);
            }
            pxsim.pxtcore.registerWithDal(state.id, condition, body);
        }
        input.onPressureConditionChanged = onPressureConditionChanged;
        function pressure(unit) {
            let state = pxsim.barometerState();
            state.setUsed();
            const pressure = state.getLevel();
            return pressure;
        }
        input.pressure = pressure;
    })(input = pxsim.input || (pxsim.input = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
var pxsim;
(function (pxsim) {
    class BarometerState {
        constructor(barometerState, pressureUnit) {
            this.barometerState = barometerState;
            this.pressureUnit = pressureUnit;
        }
    }
    pxsim.BarometerState = BarometerState;
    function barometerState() {
        return pxsim.board().barometerState;
    }
    pxsim.barometerState = barometerState;
    function setPressureUnit(unit) {
        pxsim.board().pressureUnitState = unit;
    }
    pxsim.setPressureUnit = setPressureUnit;
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
/// <reference path="../../../libs/core/dal.d.ts"/>
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        class BarometerView {
            constructor() {
                this.style = visuals.BUTTON_PAIR_STYLE;
            }
            init(bus, state, svgEl, otherParams) {
                this.state = state;
                this.bus = bus;
                this.defs = [];
                this.svgEl = svgEl;
                this.updateState();
                this.attachEvents();
            }
            moveToCoord(xy) {
                let btnWidth = visuals.PIN_DIST * 3;
                let [x, y] = xy;
                visuals.translateEl(this.btn, [x, y]);
            }
            updateState() {
                let state = this.state;
                if (!state || !state.barometerState || !state.barometerState.sensorUsed) {
                    if (this.pressure) {
                        this.svgEl.removeChild(this.element);
                        this.pressure = null;
                    }
                }
                else if (state && state.barometerState && state.barometerState.sensorUsed) {
                    this.mkPressure();
                    this.svgEl.appendChild(this.element);
                    this.updatePressure();
                }
            }
            getElement() {
                return this.element;
            }
            updateTheme() {
                let On = "#77ff77";
                let Off = "#fff";
                pxsim.svg.setGradientColors(this.pressureGradient, Off, On);
            }
            mkPressure() {
                let svgEl = this.svgEl;
                let defs = pxsim.svg.child(svgEl, "defs", {});
                let g = pxsim.svg.elt("g");
                if (!this.pressure) {
                    let gid = "gradient-pressure";
                    this.pressureGradient = pxsim.svg.linearGradient(defs, gid);
                    let xBase = 450;
                    let yBase = 450;
                    let heightBase = 64;
                    pxsim.svg.child(g, "rect", {
                        fill: "transparent",
                        x: xBase - 5,
                        y: yBase - 20,
                        width: 20,
                        height: heightBase + 40,
                    });
                    this.pressure = pxsim.svg.child(g, "rect", {
                        class: "sim-pressure no-drag",
                        x: xBase,
                        y: yBase,
                        width: 10,
                        height: heightBase,
                        rx: 4, ry: 4,
                        fill: `url(#${gid})`
                    });
                    this.pressureText = pxsim.svg.child(g, "text", { class: 'sim-text', x: xBase + 20, y: yBase + 20 });
                    this.updateTheme();
                    let pt = svgEl.createSVGPoint();
                    pxsim.svg.buttonEvents(g, 
                    // move
                    (ev) => {
                        let cur = pxsim.svg.cursorPoint(pt, svgEl, ev);
                        let t = Math.max(0, Math.min(1, ((heightBase + yBase) - cur.y) / (heightBase)));
                        this.state.barometerState.setLevel(Math.floor(BarometerView.pmin + t * (BarometerView.pmax - BarometerView.pmin)));
                        this.updatePressure();
                    }, 
                    // start
                    ev => { }, 
                    // stop
                    ev => { }, 
                    // keydown
                    (ev) => {
                        let charCode = (typeof ev.which == "number") ? ev.which : ev.keyCode;
                        if (charCode === 40 || charCode === 37) { // Down/Left arrow
                            if (this.state.barometerState.getLevel() === BarometerView.pmin) {
                                this.state.barometerState.setLevel(BarometerView.pmax);
                            }
                            else {
                                this.state.barometerState.setLevel(this.state.barometerState.getLevel() - 1);
                            }
                            this.updatePressure();
                        }
                        else if (charCode === 38 || charCode === 39) { // Up/Right arrow
                            if (this.state.barometerState.getLevel() === BarometerView.pmax) {
                                this.state.barometerState.setLevel(BarometerView.pmin);
                            }
                            else {
                                this.state.barometerState.setLevel(this.state.barometerState.getLevel() + 1);
                            }
                            this.updatePressure();
                        }
                    });
                    pxsim.accessibility.makeFocusable(this.pressure);
                    pxsim.accessibility.setAria(this.pressure, "slider", "Pressure");
                    this.pressure.setAttribute("aria-valuemin", BarometerView.pmin.toString());
                    this.pressure.setAttribute("aria-valuemax", BarometerView.pmax.toString());
                    this.pressure.setAttribute("aria-orientation", "vertical");
                }
                this.element = g;
            }
            attachEvents() {
            }
            updatePressure() {
                let state = this.state;
                if (!state || !state.barometerState || !state.barometerState.sensorUsed)
                    return;
                let t = Math.max(BarometerView.pmin, Math.min(BarometerView.pmax, state.barometerState.getLevel()));
                let per = Math.floor((state.barometerState.getLevel() - BarometerView.pmin) / (BarometerView.pmax - BarometerView.pmin) * 100);
                pxsim.svg.setGradientValue(this.pressureGradient, 100 - per + "%");
                let unit = " hPa";
                if (state.pressureUnit == pxsim.PressureUnit.mBar) {
                    unit = " mBar";
                }
                this.pressureText.textContent = t + unit;
                this.pressure.setAttribute("aria-valuenow", t.toString());
                this.pressure.setAttribute("aria-valuetext", t + unit);
                pxsim.accessibility.setLiveContent(t + unit);
            }
        }
        BarometerView.pmin = 980;
        BarometerView.pmax = 1050;
        visuals.BarometerView = BarometerView;
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var input;
    (function (input) {
        function humidity() {
            let state = pxsim.hygrometerState();
            state.setUsed();
            return state.getLevel();
        }
        input.humidity = humidity;
        function onHumidityConditionChanged(condition, humidity, body) {
            let state = pxsim.hygrometerState();
            state.setUsed();
            if (condition === 2 /* ANALOG_THRESHOLD_HIGH */) {
                state.setHighThreshold(humidity);
            }
            else {
                state.setLowThreshold(humidity);
            }
            pxsim.pxtcore.registerWithDal(state.id, condition, body);
        }
        input.onHumidityConditionChanged = onHumidityConditionChanged;
    })(input = pxsim.input || (pxsim.input = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    function hygrometerState() {
        return pxsim.board().hygrometerState;
    }
    pxsim.hygrometerState = hygrometerState;
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    class HygrometerState {
        constructor(hygrometerState) {
            this.hygrometerState = hygrometerState;
        }
    }
    pxsim.HygrometerState = HygrometerState;
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
/// <reference path="../../../libs/core/dal.d.ts"/>
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        class HygrometerView {
            constructor() {
                this.style = visuals.BUTTON_PAIR_STYLE;
            }
            init(bus, state, svgEl, otherParams) {
                this.state = state;
                this.bus = bus;
                this.defs = [];
                this.svgEl = svgEl;
                this.updateState();
                this.attachEvents();
            }
            moveToCoord(xy) {
                let btnWidth = visuals.PIN_DIST * 3;
                let [x, y] = xy;
                visuals.translateEl(this.btn, [x, y]);
            }
            updateState() {
                let state = this.state;
                if (!state || !state.hygrometerState || !state.hygrometerState.sensorUsed) {
                    if (this.humidity) {
                        this.svgEl.removeChild(this.element);
                        this.humidity = null;
                    }
                }
                else if (state && state.hygrometerState && state.hygrometerState.sensorUsed) {
                    this.mkHumidity();
                    this.svgEl.appendChild(this.element);
                    this.updateHumidity();
                }
            }
            getElement() {
                return this.element;
            }
            updateTheme() {
                let On = "#7777ff";
                let Off = "#fff";
                pxsim.svg.setGradientColors(this.humidityGradient, Off, On);
            }
            mkHumidity() {
                let svgEl = this.svgEl;
                let defs = pxsim.svg.child(svgEl, "defs", {});
                let g = pxsim.svg.elt("g");
                if (!this.humidity) {
                    let gid = "gradient-humidity";
                    this.humidityGradient = pxsim.svg.linearGradient(defs, gid);
                    let xBase = 450;
                    let yBase = 15;
                    let heightBase = 64;
                    pxsim.svg.child(g, "rect", {
                        fill: "transparent",
                        x: xBase - 5,
                        y: yBase - 20,
                        width: 20,
                        height: heightBase + 40,
                    });
                    this.humidity = pxsim.svg.child(g, "rect", {
                        class: "sim-humidity no-drag",
                        x: xBase,
                        y: yBase,
                        width: 10,
                        height: heightBase,
                        rx: 4, ry: 4,
                        fill: `url(#${gid})`
                    });
                    this.humidityText = pxsim.svg.child(g, "text", { class: 'sim-text', x: xBase + 20, y: yBase + 20 });
                    this.updateTheme();
                    let pt = svgEl.createSVGPoint();
                    pxsim.svg.buttonEvents(g, 
                    // move
                    (ev) => {
                        let cur = pxsim.svg.cursorPoint(pt, svgEl, ev);
                        let t = Math.max(0, Math.min(1, ((heightBase + yBase) - cur.y) / (heightBase)));
                        this.state.hygrometerState.setLevel(Math.floor(HygrometerView.tmin + t * (HygrometerView.tmax - HygrometerView.tmin)));
                        this.updateHumidity();
                    }, 
                    // start
                    ev => { }, 
                    // stop
                    ev => { }, 
                    // keydown
                    (ev) => {
                        let charCode = (typeof ev.which == "number") ? ev.which : ev.keyCode;
                        if (charCode === 40 || charCode === 37) { // Down/Left arrow
                            if (this.state.hygrometerState.getLevel() === -5) {
                                this.state.hygrometerState.setLevel(50);
                            }
                            else {
                                this.state.hygrometerState.setLevel(this.state.hygrometerState.getLevel() - 1);
                            }
                            this.updateHumidity();
                        }
                        else if (charCode === 38 || charCode === 39) { // Up/Right arrow
                            if (this.state.hygrometerState.getLevel() === 50) {
                                this.state.hygrometerState.setLevel(-5);
                            }
                            else {
                                this.state.hygrometerState.setLevel(this.state.hygrometerState.getLevel() + 1);
                            }
                            this.updateHumidity();
                        }
                    });
                    pxsim.accessibility.makeFocusable(this.humidity);
                    pxsim.accessibility.setAria(this.humidity, "slider", "Humidity");
                    this.humidity.setAttribute("aria-valuemin", HygrometerView.tmin.toString());
                    this.humidity.setAttribute("aria-valuemax", HygrometerView.tmax.toString());
                    this.humidity.setAttribute("aria-orientation", "vertical");
                }
                this.element = g;
            }
            attachEvents() {
            }
            updateHumidity() {
                let state = this.state;
                if (!state || !state.hygrometerState || !state.hygrometerState.sensorUsed)
                    return;
                let t = Math.max(HygrometerView.tmin, Math.min(HygrometerView.tmax, state.hygrometerState.getLevel()));
                let per = Math.floor((state.hygrometerState.getLevel() - HygrometerView.tmin) / (HygrometerView.tmax - HygrometerView.tmin) * 100);
                pxsim.svg.setGradientValue(this.humidityGradient, 100 - per + "%");
                let unit = "%";
                this.humidityText.textContent = t + unit;
                this.humidity.setAttribute("aria-valuenow", t.toString());
                this.humidity.setAttribute("aria-valuetext", t + unit);
                pxsim.accessibility.setLiveContent(t + unit);
            }
        }
        HygrometerView.tmin = 0;
        HygrometerView.tmax = 100;
        visuals.HygrometerView = HygrometerView;
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../node_modules/pxt-core/localtypings/pxtarget.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
var pxsim;
(function (pxsim) {
    var lcd;
    (function (lcd) {
        function setCursor(x, y) {
            let state = pxsim.lcdState();
            if (y < state.lines && y >= 0)
                state.cursorPos[0] = y;
            if (x < state.columns && x >= 0)
                state.cursorPos[1] = x;
            else if (x >= state.columns)
                state.cursorPos[1] = state.columns;
            state.setUsed();
        }
        lcd.setCursor = setCursor;
        function ShowNumber(n) {
            ShowString("" + n);
        }
        lcd.ShowNumber = ShowNumber;
        function ShowValue(name, value) {
            ShowString(name + ":" + value);
        }
        lcd.ShowValue = ShowValue;
        function ShowString(s) {
            let state = pxsim.lcdState();
            state.setUsed();
            if (state.cursorPos[0] >= state.lines || state.cursorPos[0] < 0)
                return;
            if (state.cursorPos[1] >= state.columns || state.cursorPos[1] < 0)
                return;
            state.text[state.cursorPos[0]] = state.text[state.cursorPos[0]].substring(0, state.cursorPos[1]) + s + state.text[state.cursorPos[0]].substring(state.cursorPos[1] + s.length, state.columns);
            state.cursorPos[1] += s.length;
            pxsim.runtime.queueDisplayUpdate();
        }
        lcd.ShowString = ShowString;
        function clear() {
            let state = pxsim.lcdState();
            state.clear();
            state.setUsed();
        }
        lcd.clear = clear;
        function SetBacklightColor(rgb) {
            let state = pxsim.lcdState();
            state.backLightColor = RGBColorToHtmlColor(rgb);
            state.setUsed();
        }
        lcd.SetBacklightColor = SetBacklightColor;
        function BacklightOn() {
            let state = pxsim.lcdState();
            state.backLightColor = "#A0F7F7";
            state.setUsed();
        }
        lcd.BacklightOn = BacklightOn;
        function BacklightOff() {
            let state = pxsim.lcdState();
            state.backLightColor = "#6e7d6e";
            state.setUsed();
        }
        lcd.BacklightOff = BacklightOff;
        function ShowNumberAtPos(n, x, y) {
            setCursor(x, y);
            ShowNumber(n);
            pxsim.runtime.queueDisplayUpdate();
        }
        lcd.ShowNumberAtPos = ShowNumberAtPos;
        function ShowStringAtPos(s, x, y) {
            setCursor(x, y);
            ShowString(s);
            pxsim.runtime.queueDisplayUpdate();
        }
        lcd.ShowStringAtPos = ShowStringAtPos;
        function RGBColorToHtmlColor(rgb) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);
            let html = "#" +
                (red > 10 ? red.toString(16) : "0" + red.toString(16)) +
                (green > 10 ? green.toString(16) : "0" + green.toString(16)) +
                (blue > 10 ? blue.toString(16) : "0" + blue.toString(16));
            return html;
        }
        function unpackR(rgb) {
            let r = (rgb >> 16) & 0xFF;
            return r;
        }
        function unpackG(rgb) {
            let g = (rgb >> 8) & 0xFF;
            return g;
        }
        function unpackB(rgb) {
            let b = (rgb >> 0) & 0xFF;
            return b;
        }
    })(lcd = pxsim.lcd || (pxsim.lcd = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        // For the intructions
        function mkLCD2Part(xy = [0, 0]) {
            let [x, y] = xy;
            let l = x;
            let t = y;
            let w = LCD_PART_WIDTH;
            let h = LCD_PART_HEIGHT;
            let img = pxsim.svg.elt("image");
            pxsim.svg.hydrate(img, {
                class: "sim-lcd", x: l, y: t, width: w, height: h,
                href: pxsim.svg.toDataUri(LCD_PART)
            });
            return { el: img, x: l, y: t, w: w, h: h };
        }
        visuals.mkLCD2Part = mkLCD2Part;
        class LCD2View {
            constructor() {
            }
            init(bus, state, svgEl, otherParams) {
                this.state = state;
                this.bus = bus;
                this.initDom();
                this.updateState();
            }
            initDom() {
                this.element = pxsim.svg.elt("g");
                this.image = new DOMParser().parseFromString(LCD_PART, "image/svg+xml").querySelector("svg");
                pxsim.svg.hydrate(this.image, {
                    class: "sim-lcd", width: LCD_PART_WIDTH, height: LCD_PART_HEIGHT,
                });
                this.screen = this.image.getElementById('ecran');
                this.backlight = this.image.getElementById('backlight');
                this.backlight.style.fill = "#6e7d6e";
                this.element.appendChild(this.image);
            }
            setChar(column, line, value) {
                let _case = this.image.getElementById("case" + line + "" + column + "_text");
                _case.innerHTML = value.charAt(0);
            }
            moveToCoord(xy) {
                visuals.translateEl(this.element, [xy[0], xy[1]]);
            }
            updateTheme() {
            }
            updateState() {
                for (let line = 0; line < this.state.lines; line++) {
                    for (let column = 0; column < this.state.columns; column++) {
                        if (!!this.state.text && !!this.state.text[line] && !!this.state.text[line][column])
                            this.setChar(column, line, this.state.text[line][column]);
                    }
                }
                this.backlight.style.fill = this.state.backLightColor;
            }
        }
        visuals.LCD2View = LCD2View;
        const LCD_PART_WIDTH = 322.79001;
        const LCD_PART_HEIGHT = 129.27348;
        const LCD_PART = `
    <svg xmlns="http://www.w3.org/2000/svg" id="lcd" width="322.8" height="129.3" viewBox="0 0 322.8 129.3">
    <defs id="defs2284">
      <style id="style2282">
        .cls-textCase{fill:#000;fill-opacity:.8;font-family:monospace;font-weight:100;font-size:24px}.cls-case{fill:#fff;fill-opacity:.1}
      </style>
    </defs>
    <path id="rect4820" fill="#005679" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width=".7" d="M.3.3h322.1v128.6H.3z"/>
    <path id="path132" fill="#303030" stroke-width=".9" d="M308.6 93c-1 0-1.9-.8-1.9-1.8V57.7c0-1 .9-1.8 1.9-1.8V29h-.9l-2.9-2.6v-1H18v1L15.1 29h-1V56h.1c1 0 1.9.8 1.9 1.8v33.5c0 1-.8 1.8-1.9 1.8v26.9h1l2.8 2.6v1h286.8v-1l2.9-2.6h1V93z"/>
    <g id="g140" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="backlight" d="M319.6 118.3a6 6 0 0 1-6 6h-269a6 6 0 0 1-6-6v-60a6 6 0 0 1 6-6h269a6 6 0 0 1 6 6z" class="cls-backlight"/>
      <g id="g138" opacity=".2">
        <path id="path136" fill="#22420d" d="M319.6 58.3v60-60zm-275-6a6 6 0 0 0-6 6v60a6 6 0 0 0 6 6H48a6 6 0 0 1-6-6v-58a6 6 0 0 1 6-6h270c-1-1.1-2.6-2-4.4-2h-269z"/>
      </g>
    </g>
    <g id="g146" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="path142" fill="#1a1a1a" d="M322 40.5c0-1-.8-2-1.9-2h-282c-1.1 0-2 1-2 2v1.1c0 1.1.9 2 2 2h282c1 0 2-.9 2-2v-1z"/>
      <path id="path144" fill="#424242" d="M321 42.3c0-.7-.6-1.3-1.3-1.3h-281c-.9 0-1.5.6-1.5 1.3 0 .7.6 1.3 1.4 1.3h281c.8 0 1.5-.6 1.5-1.3z"/>
    </g>
    <g id="g152" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="path148" fill="#1a1a1a" d="M322 134c0-1-.8-1.9-1.9-1.9h-282c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2h282c1 0 2-.9 2-2v-1z"/>
      <path id="path150" fill="#424242" d="M321 135.8c0-.7-.6-1.3-1.3-1.3h-281c-.9 0-1.5.6-1.5 1.3 0 .8.6 1.3 1.4 1.3h281c.8 0 1.5-.5 1.5-1.3z"/>
    </g>
    <g id="g158" fill-opacity="0" stroke="#f2f2f2" stroke-linecap="round" stroke-opacity=".2" stroke-width=".2" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="path154" d="M27 37.4l3.2-3"/>
      <path id="path156" d="M30.2 143.3l-3.1-3.1"/>
    </g>
    <g id="g164" fill-opacity="0" stroke="#f2f2f2" stroke-linecap="round" stroke-opacity=".2" stroke-width=".2" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="path160" d="M332.1 37.4l-3.1-3"/>
      <path id="path162" d="M329 143.3l3-3.1"/>
    </g>
    <path id="path166" fill-opacity="0" stroke="#1a1a1a" stroke-opacity=".4" stroke-width="1.3" d="M296.5 101.4c0 2.8-2.6 5.2-5.7 5.2H33c-3 0-5.6-2.4-5.6-5.2v-53c0-2.8 2.5-5.2 5.6-5.2h258c3 0 5.6 2.4 5.6 5.2z"/>
    <g id="ecran" transform="matrix(1.02697 0 0 1.04868 -20.3 -17.7)">
      <path id="case10" fill="#fff" fill-opacity=".1" d="M52.9 88.8h14.8v24.4H52.9z" class="cls-case"/>
      <path id="case11" fill="#fff" fill-opacity=".1" d="M68.7 88.8h14.8v24.4H68.7z" class="cls-case"/>
      <path id="case12" fill="#fff" fill-opacity=".1" d="M84.6 88.8h14.8v24.4H84.5z" class="cls-case"/>
      <path id="case13" fill="#fff" fill-opacity=".1" d="M100.4 88.8h14.8v24.4h-14.8z" class="cls-case"/>
      <path id="case14" fill="#fff" fill-opacity=".1" d="M116.3 88.8H131v24.4h-14.7z" class="cls-case"/>
      <path id="case15" fill="#fff" fill-opacity=".1" d="M132 88.8H147v24.4H132z" class="cls-case"/>
      <path id="case16" fill="#fff" fill-opacity=".1" d="M148 88.8h14.7v24.4H148z" class="cls-case"/>
      <path id="case17" fill="#fff" fill-opacity=".1" d="M163.8 88.8h14.8v24.4h-14.8z" class="cls-case"/>
      <path id="case18" fill="#fff" fill-opacity=".1" d="M179.6 88.8h14.8v24.4h-14.8z" class="cls-case"/>
      <path id="case19" fill="#fff" fill-opacity=".1" d="M195.5 88.8h14.7v24.4h-14.7z" class="cls-case"/>
      <path id="case110" fill="#fff" fill-opacity=".1" d="M211.3 88.8h14.8v24.4h-14.8z" class="cls-case"/>
      <path id="case111" fill="#fff" fill-opacity=".1" d="M227.1 88.8H242v24.4h-14.8z" class="cls-case"/>
      <path id="case112" fill="#fff" fill-opacity=".1" d="M243 88.8h14.8v24.4H243z" class="cls-case"/>
      <path id="case113" fill="#fff" fill-opacity=".1" d="M258.8 88.8h14.8v24.4h-14.8z" class="cls-case"/>
      <path id="case114" fill="#fff" fill-opacity=".1" d="M274.7 88.8h14.7v24.4h-14.7z" class="cls-case"/>
      <path id="case115" fill="#fff" fill-opacity=".1" d="M290.5 88.8h14.8v24.4h-14.8z" class="cls-case"/>
      <text id="case10_text" x="52.9" y="112.9" class="cls-textCase"/>
      <text id="case11_text" x="68.7" y="112.9" class="cls-textCase"/>
      <text id="case12_text" x="84.6" y="112.9" class="cls-textCase"/>
      <text id="case13_text" x="100.4" y="112.9" class="cls-textCase"/>
      <text id="case14_text" x="116.3" y="112.9" class="cls-textCase"/>
      <text id="case15_text" x="132.1" y="112.9" class="cls-textCase"/>
      <text id="case16_text" x="147.9" y="112.9" class="cls-textCase"/>
      <text id="case17_text" x="163.8" y="112.9" class="cls-textCase"/>
      <text id="case18_text" x="179.6" y="112.9" class="cls-textCase"/>
      <text id="case19_text" x="195.5" y="112.9" class="cls-textCase"/>
      <text id="case110_text" x="211.3" y="112.9" class="cls-textCase"/>
      <text id="case111_text" x="227.1" y="112.9" class="cls-textCase"/>
      <text id="case112_text" x="243" y="112.9" class="cls-textCase"/>
      <text id="case113_text" x="258.8" y="112.9" class="cls-textCase"/>
      <text id="case114_text" x="274.7" y="112.9" class="cls-textCase"/>
      <text id="case115_text" x="290.5" y="112.9" class="cls-textCase"/>
      <path id="case00" fill="#fff" fill-opacity=".1" d="M52.9 63.5h14.8v24.3H52.9z" class="cls-case"/>
      <path id="case01" fill="#fff" fill-opacity=".1" d="M68.7 63.5h14.8v24.3H68.7z" class="cls-case"/>
      <path id="case02" fill="#fff" fill-opacity=".1" d="M84.6 63.5h14.8v24.3H84.5z" class="cls-case"/>
      <path id="case03" fill="#fff" fill-opacity=".1" d="M100.4 63.5h14.8v24.3h-14.8z" class="cls-case"/>
      <path id="case04" fill="#fff" fill-opacity=".1" d="M116.3 63.5H131v24.3h-14.7z" class="cls-case"/>
      <path id="case05" fill="#fff" fill-opacity=".1" d="M132 63.5H147v24.3H132z" class="cls-case"/>
      <path id="case06" fill="#fff" fill-opacity=".1" d="M148 63.5h14.7v24.3H148z" class="cls-case"/>
      <path id="case07" fill="#fff" fill-opacity=".1" d="M163.8 63.5h14.8v24.3h-14.8z" class="cls-case"/>
      <path id="case08" fill="#fff" fill-opacity=".1" d="M179.6 63.5h14.8v24.3h-14.8z" class="cls-case"/>
      <path id="case09" fill="#fff" fill-opacity=".1" d="M195.5 63.5h14.7v24.3h-14.7z" class="cls-case"/>
      <path id="case010" fill="#fff" fill-opacity=".1" d="M211.3 63.5h14.8v24.3h-14.8z" class="cls-case"/>
      <path id="case011" fill="#fff" fill-opacity=".1" d="M227.1 63.5H242v24.3h-14.8z" class="cls-case"/>
      <path id="case012" fill="#fff" fill-opacity=".1" d="M243 63.5h14.8v24.3H243z" class="cls-case"/>
      <path id="case013" fill="#fff" fill-opacity=".1" d="M258.8 63.5h14.8v24.3h-14.8z" class="cls-case"/>
      <path id="case014" fill="#fff" fill-opacity=".1" d="M274.7 63.5h14.7v24.3h-14.7z" class="cls-case"/>
      <path id="case015" fill="#fff" fill-opacity=".1" d="M290.5 63.5h14.8v24.3h-14.8z" class="cls-case"/>
      <text id="case00_text" x="52.9" y="87.5" class="cls-textCase"/>
      <text id="case01_text" x="68.7" y="87.5" class="cls-textCase"/>
      <text id="case02_text" x="84.6" y="87.5" class="cls-textCase"/>
      <text id="case03_text" x="100.4" y="87.5" class="cls-textCase"/>
      <text id="case04_text" x="116.3" y="87.5" class="cls-textCase"/>
      <text id="case05_text" x="132.1" y="87.5" class="cls-textCase"/>
      <text id="case06_text" x="147.9" y="87.5" class="cls-textCase"/>
      <text id="case07_text" x="163.8" y="87.5" class="cls-textCase"/>
      <text id="case08_text" x="179.6" y="87.5" class="cls-textCase"/>
      <text id="case09_text" x="195.5" y="87.5" class="cls-textCase"/>
      <text id="case010_text" x="211.3" y="87.5" class="cls-textCase"/>
      <text id="case011_text" x="227.1" y="87.5" class="cls-textCase"/>
      <text id="case012_text" x="243" y="87.5" class="cls-textCase"/>
      <text id="case013_text" x="258.8" y="87.5" class="cls-textCase"/>
      <text id="case014_text" x="274.7" y="87.5" class="cls-textCase"/>
      <text id="case015_text" x="290.5" y="87.5" class="cls-textCase"/>
    </g>
    <g id="g238" fill="#606060" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="path234" d="M25.8 109.3v30.6h.4v-30.7h-.4z"/>
      <path id="path236" d="M26.2 67.5V36.7h-.4v30.7h.4z"/>
    </g>
    <g id="g248" fill="#212121" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="path244" d="M25.5 67.3h.4V36.8h-.5v30.6z"/>
      <path id="path246" d="M25.5 109.3h-.1V140h.5v-30.6h-.4z"/>
    </g>
    <path id="path250" fill="#212121" stroke-width=".9" d="M18 123.1h286.8v.5H18z"/>
    <path id="path252" fill="#606060" stroke-width=".9" d="M18 122.8h286.8v.3H18z"/>
    <g id="g258" fill="#212121" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="path254" d="M332.7 109.3h-.4v30.6h.5v-30.6z"/>
      <path id="path256" d="M332.7 67.3V36.7h-.4v30.7h.4z"/>
    </g>
    <g id="g264" fill="#606060" transform="matrix(.95829 0 0 .88143 -10.2 -3.4)">
      <path id="path260" d="M332 109.2v30.7h.3v-30.6l-.4-.1z"/>
      <path id="path262" d="M332.3 67.4V36.7h-.4v30.8l.4-.1z"/>
    </g>
    <path id="LCD_SDA" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width=".6" d="M10 8h9.7v9.7h-9.7z"/>
    <path id="LCD_SCL" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width=".6" d="M25 8h9.7v9.7h-9.7z"/>
    <path id="LCD_VCC" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width=".6" d="M40 8h9.7v9.7h-9.7z"/>
    <path id="LCD_GND" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width=".6" d="M55 8h9.7v9.7h-9.7z"/>
  </svg>
`;
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var magnetics;
    (function (magnetics) {
        function setLocalName(name) { }
        magnetics.setLocalName = setLocalName;
        function setAdvertisingUserStringData(data) { }
        magnetics.setAdvertisingUserStringData = setAdvertisingUserStringData;
        function setAdvertisingKeyValueData(key, value) { }
        magnetics.setAdvertisingKeyValueData = setAdvertisingKeyValueData;
        function availableDataFromName(name) { return false; }
        magnetics.availableDataFromName = availableDataFromName;
        function readDataFromName(name) { return ""; }
        magnetics.readDataFromName = readDataFromName;
        function onTemperatureConditionChanged(Name, handler) { }
        magnetics.onTemperatureConditionChanged = onTemperatureConditionChanged;
        function isEmitting() { return false; }
        magnetics.isEmitting = isEmitting;
        function isScanning() { return false; }
        magnetics.isScanning = isScanning;
        function setAdvertisingService(uuidService, data) { }
        magnetics.setAdvertisingService = setAdvertisingService;
        function setAdvertisingData(id, data) { }
        magnetics.setAdvertisingData = setAdvertisingData;
        function stopScanning() { }
        magnetics.stopScanning = stopScanning;
        function stopEmitting() { }
        magnetics.stopEmitting = stopEmitting;
        function starScanning(ms) { }
        magnetics.starScanning = starScanning;
        function startEmitting(ms) { }
        magnetics.startEmitting = startEmitting;
        function onNewMessageReceived(name, handler) { }
        magnetics.onNewMessageReceived = onNewMessageReceived;
    })(magnetics = pxsim.magnetics || (pxsim.magnetics = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
/// <reference path="../../../libs/core/dal.d.ts"/>
var pxsim;
(function (pxsim) {
    class ThermometerState {
        constructor(thermometerState, thermometerUnitState = pxsim.TemperatureUnit.Celsius) {
            this.thermometerState = thermometerState;
            this.thermometerUnitState = thermometerUnitState;
        }
    }
    pxsim.ThermometerState = ThermometerState;
})(pxsim || (pxsim = {}));
/// <reference path="../../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../../built/common-sim.d.ts"/>
/// <reference path="../../../libs/core/dal.d.ts"/>
var pxsim;
(function (pxsim) {
    var visuals;
    (function (visuals) {
        class ThermometerView {
            constructor() {
                this.style = visuals.BUTTON_PAIR_STYLE;
            }
            init(bus, state, svgEl, otherParams) {
                this.state = state;
                this.bus = bus;
                this.defs = [];
                this.svgEl = svgEl;
                this.updateState();
                this.attachEvents();
            }
            moveToCoord(xy) {
                let btnWidth = visuals.PIN_DIST * 3;
                let [x, y] = xy;
                visuals.translateEl(this.btn, [x, y]);
            }
            updateState() {
                let state = this.state;
                if (!state || !state.thermometerState || !state.thermometerState.sensorUsed) {
                    if (this.thermometer) {
                        this.svgEl.removeChild(this.element);
                        this.thermometer = null;
                    }
                }
                else if (state && state.thermometerState && state.thermometerState.sensorUsed) {
                    this.mkThermometer();
                    this.svgEl.appendChild(this.element);
                    this.updateTemperature();
                }
            }
            getElement() {
                return this.element;
            }
            updateTheme() {
                let On = "#ff7777";
                let Off = "#fff";
                pxsim.svg.setGradientColors(this.thermometerGradient, Off, On);
            }
            mkThermometer() {
                let svgEl = this.svgEl;
                let defs = pxsim.svg.child(svgEl, "defs", {});
                let g = pxsim.svg.elt("g");
                if (!this.thermometer) {
                    let gid = "gradient-thermometer";
                    this.thermometerGradient = pxsim.svg.linearGradient(defs, gid);
                    let xBase = 25;
                    let yBase = 15;
                    let heightBase = 64;
                    pxsim.svg.child(g, "rect", {
                        fill: "transparent",
                        x: xBase - 5,
                        y: yBase - 20,
                        width: 20,
                        height: heightBase + 40,
                    });
                    this.thermometer = pxsim.svg.child(g, "rect", {
                        class: "sim-thermometer no-drag",
                        x: xBase,
                        y: yBase,
                        width: 10,
                        height: heightBase,
                        rx: 4, ry: 4,
                        fill: `url(#${gid})`
                    });
                    this.thermometerText = pxsim.svg.child(g, "text", { class: 'sim-text', x: xBase + 20, y: yBase + 20 });
                    this.updateTheme();
                    let pt = svgEl.createSVGPoint();
                    pxsim.svg.buttonEvents(g, 
                    // move
                    (ev) => {
                        let cur = pxsim.svg.cursorPoint(pt, svgEl, ev);
                        let t = Math.max(0, Math.min(1, ((heightBase + yBase) - cur.y) / (heightBase)));
                        this.state.thermometerState.setLevel(Math.floor(ThermometerView.tmin + t * (ThermometerView.tmax - ThermometerView.tmin)));
                        this.updateTemperature();
                    }, 
                    // start
                    ev => { }, 
                    // stop
                    ev => { }, 
                    // keydown
                    (ev) => {
                        let charCode = (typeof ev.which == "number") ? ev.which : ev.keyCode;
                        if (charCode === 40 || charCode === 37) { // Down/Left arrow
                            if (this.state.thermometerState.getLevel() === -5) {
                                this.state.thermometerState.setLevel(50);
                            }
                            else {
                                this.state.thermometerState.setLevel(this.state.thermometerState.getLevel() - 1);
                            }
                            this.updateTemperature();
                        }
                        else if (charCode === 38 || charCode === 39) { // Up/Right arrow
                            if (this.state.thermometerState.getLevel() === 50) {
                                this.state.thermometerState.setLevel(-5);
                            }
                            else {
                                this.state.thermometerState.setLevel(this.state.thermometerState.getLevel() + 1);
                            }
                            this.updateTemperature();
                        }
                    });
                    pxsim.accessibility.makeFocusable(this.thermometer);
                    pxsim.accessibility.setAria(this.thermometer, "slider", "Thermometer");
                    this.thermometer.setAttribute("aria-valuemin", ThermometerView.tmin.toString());
                    this.thermometer.setAttribute("aria-valuemax", ThermometerView.tmax.toString());
                    this.thermometer.setAttribute("aria-orientation", "vertical");
                }
                this.element = g;
            }
            attachEvents() {
            }
            updateTemperature() {
                let state = this.state;
                if (!state || !state.thermometerState || !state.thermometerState.sensorUsed)
                    return;
                let t = Math.max(ThermometerView.tmin, Math.min(ThermometerView.tmax, state.thermometerState.getLevel()));
                let per = Math.floor((state.thermometerState.getLevel() - ThermometerView.tmin) / (ThermometerView.tmax - ThermometerView.tmin) * 100);
                pxsim.svg.setGradientValue(this.thermometerGradient, 100 - per + "%");
                let unit = "°C";
                if (state.thermometerUnitState == pxsim.TemperatureUnit.Fahrenheit) {
                    unit = "°F";
                    t = ((t * 18) / 10 + 32) >> 0;
                }
                this.thermometerText.textContent = t + unit;
                this.thermometer.setAttribute("aria-valuenow", t.toString());
                this.thermometer.setAttribute("aria-valuetext", t + unit);
                pxsim.accessibility.setLiveContent(t + unit);
            }
        }
        // Celsius
        ThermometerView.tmin = -5;
        ThermometerView.tmax = 50;
        visuals.ThermometerView = ThermometerView;
    })(visuals = pxsim.visuals || (pxsim.visuals = {}));
})(pxsim || (pxsim = {}));
