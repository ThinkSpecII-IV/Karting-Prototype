"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/engine.io-parser/build/esm/commons.js
  var PACKET_TYPES = /* @__PURE__ */ Object.create(null);
  PACKET_TYPES["open"] = "0";
  PACKET_TYPES["close"] = "1";
  PACKET_TYPES["ping"] = "2";
  PACKET_TYPES["pong"] = "3";
  PACKET_TYPES["message"] = "4";
  PACKET_TYPES["upgrade"] = "5";
  PACKET_TYPES["noop"] = "6";
  var PACKET_TYPES_REVERSE = /* @__PURE__ */ Object.create(null);
  Object.keys(PACKET_TYPES).forEach((key) => {
    PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
  });
  var ERROR_PACKET = { type: "error", data: "parser error" };

  // node_modules/engine.io-parser/build/esm/encodePacket.browser.js
  var withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && Object.prototype.toString.call(Blob) === "[object BlobConstructor]";
  var withNativeArrayBuffer = typeof ArrayBuffer === "function";
  var isView = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj && obj.buffer instanceof ArrayBuffer;
  };
  var encodePacket = ({ type, data }, supportsBinary, callback) => {
    if (withNativeBlob && data instanceof Blob) {
      if (supportsBinary) {
        return callback(data);
      } else {
        return encodeBlobAsBase64(data, callback);
      }
    } else if (withNativeArrayBuffer && (data instanceof ArrayBuffer || isView(data))) {
      if (supportsBinary) {
        return callback(data);
      } else {
        return encodeBlobAsBase64(new Blob([data]), callback);
      }
    }
    return callback(PACKET_TYPES[type] + (data || ""));
  };
  var encodeBlobAsBase64 = (data, callback) => {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const content = fileReader.result.split(",")[1];
      callback("b" + (content || ""));
    };
    return fileReader.readAsDataURL(data);
  };
  function toArray(data) {
    if (data instanceof Uint8Array) {
      return data;
    } else if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    } else {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
  }
  var TEXT_ENCODER;
  function encodePacketToBinary(packet, callback) {
    if (withNativeBlob && packet.data instanceof Blob) {
      return packet.data.arrayBuffer().then(toArray).then(callback);
    } else if (withNativeArrayBuffer && (packet.data instanceof ArrayBuffer || isView(packet.data))) {
      return callback(toArray(packet.data));
    }
    encodePacket(packet, false, (encoded) => {
      if (!TEXT_ENCODER) {
        TEXT_ENCODER = new TextEncoder();
      }
      callback(TEXT_ENCODER.encode(encoded));
    });
  }

  // node_modules/engine.io-parser/build/esm/contrib/base64-arraybuffer.js
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
  for (let i2 = 0; i2 < chars.length; i2++) {
    lookup[chars.charCodeAt(i2)] = i2;
  }
  var decode = (base64) => {
    let bufferLength = base64.length * 0.75, len = base64.length, i2, p = 0, encoded1, encoded2, encoded3, encoded4;
    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }
    const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
    for (i2 = 0; i2 < len; i2 += 4) {
      encoded1 = lookup[base64.charCodeAt(i2)];
      encoded2 = lookup[base64.charCodeAt(i2 + 1)];
      encoded3 = lookup[base64.charCodeAt(i2 + 2)];
      encoded4 = lookup[base64.charCodeAt(i2 + 3)];
      bytes[p++] = encoded1 << 2 | encoded2 >> 4;
      bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
      bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
    }
    return arraybuffer;
  };

  // node_modules/engine.io-parser/build/esm/decodePacket.browser.js
  var withNativeArrayBuffer2 = typeof ArrayBuffer === "function";
  var decodePacket = (encodedPacket, binaryType) => {
    if (typeof encodedPacket !== "string") {
      return {
        type: "message",
        data: mapBinary(encodedPacket, binaryType)
      };
    }
    const type = encodedPacket.charAt(0);
    if (type === "b") {
      return {
        type: "message",
        data: decodeBase64Packet(encodedPacket.substring(1), binaryType)
      };
    }
    const packetType = PACKET_TYPES_REVERSE[type];
    if (!packetType) {
      return ERROR_PACKET;
    }
    return encodedPacket.length > 1 ? {
      type: PACKET_TYPES_REVERSE[type],
      data: encodedPacket.substring(1)
    } : {
      type: PACKET_TYPES_REVERSE[type]
    };
  };
  var decodeBase64Packet = (data, binaryType) => {
    if (withNativeArrayBuffer2) {
      const decoded = decode(data);
      return mapBinary(decoded, binaryType);
    } else {
      return { base64: true, data };
    }
  };
  var mapBinary = (data, binaryType) => {
    switch (binaryType) {
      case "blob":
        if (data instanceof Blob) {
          return data;
        } else {
          return new Blob([data]);
        }
      case "arraybuffer":
      default:
        if (data instanceof ArrayBuffer) {
          return data;
        } else {
          return data.buffer;
        }
    }
  };

  // node_modules/engine.io-parser/build/esm/index.js
  var SEPARATOR = String.fromCharCode(30);
  var encodePayload = (packets, callback) => {
    const length2 = packets.length;
    const encodedPackets = new Array(length2);
    let count = 0;
    packets.forEach((packet, i2) => {
      encodePacket(packet, false, (encodedPacket) => {
        encodedPackets[i2] = encodedPacket;
        if (++count === length2) {
          callback(encodedPackets.join(SEPARATOR));
        }
      });
    });
  };
  var decodePayload = (encodedPayload, binaryType) => {
    const encodedPackets = encodedPayload.split(SEPARATOR);
    const packets = [];
    for (let i2 = 0; i2 < encodedPackets.length; i2++) {
      const decodedPacket = decodePacket(encodedPackets[i2], binaryType);
      packets.push(decodedPacket);
      if (decodedPacket.type === "error") {
        break;
      }
    }
    return packets;
  };
  function createPacketEncoderStream() {
    return new TransformStream({
      transform(packet, controller) {
        encodePacketToBinary(packet, (encodedPacket) => {
          const payloadLength = encodedPacket.length;
          let header;
          if (payloadLength < 126) {
            header = new Uint8Array(1);
            new DataView(header.buffer).setUint8(0, payloadLength);
          } else if (payloadLength < 65536) {
            header = new Uint8Array(3);
            const view = new DataView(header.buffer);
            view.setUint8(0, 126);
            view.setUint16(1, payloadLength);
          } else {
            header = new Uint8Array(9);
            const view = new DataView(header.buffer);
            view.setUint8(0, 127);
            view.setBigUint64(1, BigInt(payloadLength));
          }
          if (packet.data && typeof packet.data !== "string") {
            header[0] |= 128;
          }
          controller.enqueue(header);
          controller.enqueue(encodedPacket);
        });
      }
    });
  }
  var TEXT_DECODER;
  function totalLength(chunks) {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  }
  function concatChunks(chunks, size) {
    if (chunks[0].length === size) {
      return chunks.shift();
    }
    const buffer = new Uint8Array(size);
    let j = 0;
    for (let i2 = 0; i2 < size; i2++) {
      buffer[i2] = chunks[0][j++];
      if (j === chunks[0].length) {
        chunks.shift();
        j = 0;
      }
    }
    if (chunks.length && j < chunks[0].length) {
      chunks[0] = chunks[0].slice(j);
    }
    return buffer;
  }
  function createPacketDecoderStream(maxPayload, binaryType) {
    if (!TEXT_DECODER) {
      TEXT_DECODER = new TextDecoder();
    }
    const chunks = [];
    let state = 0;
    let expectedLength = -1;
    let isBinary2 = false;
    return new TransformStream({
      transform(chunk, controller) {
        chunks.push(chunk);
        while (true) {
          if (state === 0) {
            if (totalLength(chunks) < 1) {
              break;
            }
            const header = concatChunks(chunks, 1);
            isBinary2 = (header[0] & 128) === 128;
            expectedLength = header[0] & 127;
            if (expectedLength < 126) {
              state = 3;
            } else if (expectedLength === 126) {
              state = 1;
            } else {
              state = 2;
            }
          } else if (state === 1) {
            if (totalLength(chunks) < 2) {
              break;
            }
            const headerArray = concatChunks(chunks, 2);
            expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
            state = 3;
          } else if (state === 2) {
            if (totalLength(chunks) < 8) {
              break;
            }
            const headerArray = concatChunks(chunks, 8);
            const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
            const n = view.getUint32(0);
            if (n > Math.pow(2, 53 - 32) - 1) {
              controller.enqueue(ERROR_PACKET);
              break;
            }
            expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
            state = 3;
          } else {
            if (totalLength(chunks) < expectedLength) {
              break;
            }
            const data = concatChunks(chunks, expectedLength);
            controller.enqueue(decodePacket(isBinary2 ? data : TEXT_DECODER.decode(data), binaryType));
            state = 0;
          }
          if (expectedLength === 0 || expectedLength > maxPayload) {
            controller.enqueue(ERROR_PACKET);
            break;
          }
        }
      }
    });
  }
  var protocol = 4;

  // node_modules/@socket.io/component-emitter/lib/esm/index.js
  function Emitter(obj) {
    if (obj) return mixin(obj);
  }
  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj;
  }
  Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
    return this;
  };
  Emitter.prototype.once = function(event, fn) {
    function on2() {
      this.off(event, on2);
      fn.apply(this, arguments);
    }
    on2.fn = fn;
    this.on(event, on2);
    return this;
  };
  Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    if (0 == arguments.length) {
      this._callbacks = {};
      return this;
    }
    var callbacks = this._callbacks["$" + event];
    if (!callbacks) return this;
    if (1 == arguments.length) {
      delete this._callbacks["$" + event];
      return this;
    }
    var cb;
    for (var i2 = 0; i2 < callbacks.length; i2++) {
      cb = callbacks[i2];
      if (cb === fn || cb.fn === fn) {
        callbacks.splice(i2, 1);
        break;
      }
    }
    if (callbacks.length === 0) {
      delete this._callbacks["$" + event];
    }
    return this;
  };
  Emitter.prototype.emit = function(event) {
    this._callbacks = this._callbacks || {};
    var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
    for (var i2 = 1; i2 < arguments.length; i2++) {
      args[i2 - 1] = arguments[i2];
    }
    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (var i2 = 0, len = callbacks.length; i2 < len; ++i2) {
        callbacks[i2].apply(this, args);
      }
    }
    return this;
  };
  Emitter.prototype.emitReserved = Emitter.prototype.emit;
  Emitter.prototype.listeners = function(event) {
    this._callbacks = this._callbacks || {};
    return this._callbacks["$" + event] || [];
  };
  Emitter.prototype.hasListeners = function(event) {
    return !!this.listeners(event).length;
  };

  // node_modules/engine.io-client/build/esm/globalThis.browser.js
  var globalThisShim = (() => {
    if (typeof self !== "undefined") {
      return self;
    } else if (typeof window !== "undefined") {
      return window;
    } else {
      return Function("return this")();
    }
  })();

  // node_modules/engine.io-client/build/esm/util.js
  function pick(obj, ...attr) {
    return attr.reduce((acc, k) => {
      if (obj.hasOwnProperty(k)) {
        acc[k] = obj[k];
      }
      return acc;
    }, {});
  }
  var NATIVE_SET_TIMEOUT = globalThisShim.setTimeout;
  var NATIVE_CLEAR_TIMEOUT = globalThisShim.clearTimeout;
  function installTimerFunctions(obj, opts) {
    if (opts.useNativeTimers) {
      obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThisShim);
      obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThisShim);
    } else {
      obj.setTimeoutFn = globalThisShim.setTimeout.bind(globalThisShim);
      obj.clearTimeoutFn = globalThisShim.clearTimeout.bind(globalThisShim);
    }
  }
  var BASE64_OVERHEAD = 1.33;
  function byteLength(obj) {
    if (typeof obj === "string") {
      return utf8Length(obj);
    }
    return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
  }
  function utf8Length(str) {
    let c = 0, length2 = 0;
    for (let i2 = 0, l = str.length; i2 < l; i2++) {
      c = str.charCodeAt(i2);
      if (c < 128) {
        length2 += 1;
      } else if (c < 2048) {
        length2 += 2;
      } else if (c < 55296 || c >= 57344) {
        length2 += 3;
      } else {
        i2++;
        length2 += 4;
      }
    }
    return length2;
  }

  // node_modules/engine.io-client/build/esm/contrib/parseqs.js
  function encode(obj) {
    let str = "";
    for (let i2 in obj) {
      if (obj.hasOwnProperty(i2)) {
        if (str.length)
          str += "&";
        str += encodeURIComponent(i2) + "=" + encodeURIComponent(obj[i2]);
      }
    }
    return str;
  }
  function decode2(qs) {
    let qry = {};
    let pairs = qs.split("&");
    for (let i2 = 0, l = pairs.length; i2 < l; i2++) {
      let pair = pairs[i2].split("=");
      qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return qry;
  }

  // node_modules/engine.io-client/build/esm/transport.js
  var TransportError = class extends Error {
    constructor(reason, description, context) {
      super(reason);
      this.description = description;
      this.context = context;
      this.type = "TransportError";
    }
  };
  var Transport = class extends Emitter {
    /**
     * Transport abstract constructor.
     *
     * @param {Object} opts - options
     * @protected
     */
    constructor(opts) {
      super();
      this.writable = false;
      installTimerFunctions(this, opts);
      this.opts = opts;
      this.query = opts.query;
      this.socket = opts.socket;
    }
    /**
     * Emits an error.
     *
     * @param {String} reason
     * @param description
     * @param context - the error context
     * @return {Transport} for chaining
     * @protected
     */
    onError(reason, description, context) {
      super.emitReserved("error", new TransportError(reason, description, context));
      return this;
    }
    /**
     * Opens the transport.
     */
    open() {
      this.readyState = "opening";
      this.doOpen();
      return this;
    }
    /**
     * Closes the transport.
     */
    close() {
      if (this.readyState === "opening" || this.readyState === "open") {
        this.doClose();
        this.onClose();
      }
      return this;
    }
    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     */
    send(packets) {
      if (this.readyState === "open") {
        this.write(packets);
      } else {
      }
    }
    /**
     * Called upon open
     *
     * @protected
     */
    onOpen() {
      this.readyState = "open";
      this.writable = true;
      super.emitReserved("open");
    }
    /**
     * Called with data.
     *
     * @param {String} data
     * @protected
     */
    onData(data) {
      const packet = decodePacket(data, this.socket.binaryType);
      this.onPacket(packet);
    }
    /**
     * Called with a decoded packet.
     *
     * @protected
     */
    onPacket(packet) {
      super.emitReserved("packet", packet);
    }
    /**
     * Called upon close.
     *
     * @protected
     */
    onClose(details) {
      this.readyState = "closed";
      super.emitReserved("close", details);
    }
    /**
     * Pauses the transport, in order not to lose packets during an upgrade.
     *
     * @param onPause
     */
    pause(onPause) {
    }
    createUri(schema, query = {}) {
      return schema + "://" + this._hostname() + this._port() + this.opts.path + this._query(query);
    }
    _hostname() {
      const hostname = this.opts.hostname;
      return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
    }
    _port() {
      if (this.opts.port && (this.opts.secure && Number(this.opts.port !== 443) || !this.opts.secure && Number(this.opts.port) !== 80)) {
        return ":" + this.opts.port;
      } else {
        return "";
      }
    }
    _query(query) {
      const encodedQuery = encode(query);
      return encodedQuery.length ? "?" + encodedQuery : "";
    }
  };

  // node_modules/engine.io-client/build/esm/contrib/yeast.js
  var alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("");
  var length = 64;
  var map = {};
  var seed = 0;
  var i = 0;
  var prev;
  function encode2(num) {
    let encoded = "";
    do {
      encoded = alphabet[num % length] + encoded;
      num = Math.floor(num / length);
    } while (num > 0);
    return encoded;
  }
  function yeast() {
    const now = encode2(+/* @__PURE__ */ new Date());
    if (now !== prev)
      return seed = 0, prev = now;
    return now + "." + encode2(seed++);
  }
  for (; i < length; i++)
    map[alphabet[i]] = i;

  // node_modules/engine.io-client/build/esm/contrib/has-cors.js
  var value = false;
  try {
    value = typeof XMLHttpRequest !== "undefined" && "withCredentials" in new XMLHttpRequest();
  } catch (err) {
  }
  var hasCORS = value;

  // node_modules/engine.io-client/build/esm/transports/xmlhttprequest.browser.js
  function XHR(opts) {
    const xdomain = opts.xdomain;
    try {
      if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
        return new XMLHttpRequest();
      }
    } catch (e) {
    }
    if (!xdomain) {
      try {
        return new globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
      } catch (e) {
      }
    }
  }
  function createCookieJar() {
  }

  // node_modules/engine.io-client/build/esm/transports/polling.js
  function empty() {
  }
  var hasXHR2 = function() {
    const xhr = new XHR({
      xdomain: false
    });
    return null != xhr.responseType;
  }();
  var Polling = class extends Transport {
    /**
     * XHR Polling constructor.
     *
     * @param {Object} opts
     * @package
     */
    constructor(opts) {
      super(opts);
      this.polling = false;
      if (typeof location !== "undefined") {
        const isSSL = "https:" === location.protocol;
        let port = location.port;
        if (!port) {
          port = isSSL ? "443" : "80";
        }
        this.xd = typeof location !== "undefined" && opts.hostname !== location.hostname || port !== opts.port;
      }
      const forceBase64 = opts && opts.forceBase64;
      this.supportsBinary = hasXHR2 && !forceBase64;
      if (this.opts.withCredentials) {
        this.cookieJar = createCookieJar();
      }
    }
    get name() {
      return "polling";
    }
    /**
     * Opens the socket (triggers polling). We write a PING message to determine
     * when the transport is open.
     *
     * @protected
     */
    doOpen() {
      this.poll();
    }
    /**
     * Pauses polling.
     *
     * @param {Function} onPause - callback upon buffers are flushed and transport is paused
     * @package
     */
    pause(onPause) {
      this.readyState = "pausing";
      const pause = () => {
        this.readyState = "paused";
        onPause();
      };
      if (this.polling || !this.writable) {
        let total = 0;
        if (this.polling) {
          total++;
          this.once("pollComplete", function() {
            --total || pause();
          });
        }
        if (!this.writable) {
          total++;
          this.once("drain", function() {
            --total || pause();
          });
        }
      } else {
        pause();
      }
    }
    /**
     * Starts polling cycle.
     *
     * @private
     */
    poll() {
      this.polling = true;
      this.doPoll();
      this.emitReserved("poll");
    }
    /**
     * Overloads onData to detect payloads.
     *
     * @protected
     */
    onData(data) {
      const callback = (packet) => {
        if ("opening" === this.readyState && packet.type === "open") {
          this.onOpen();
        }
        if ("close" === packet.type) {
          this.onClose({ description: "transport closed by the server" });
          return false;
        }
        this.onPacket(packet);
      };
      decodePayload(data, this.socket.binaryType).forEach(callback);
      if ("closed" !== this.readyState) {
        this.polling = false;
        this.emitReserved("pollComplete");
        if ("open" === this.readyState) {
          this.poll();
        } else {
        }
      }
    }
    /**
     * For polling, send a close packet.
     *
     * @protected
     */
    doClose() {
      const close = () => {
        this.write([{ type: "close" }]);
      };
      if ("open" === this.readyState) {
        close();
      } else {
        this.once("open", close);
      }
    }
    /**
     * Writes a packets payload.
     *
     * @param {Array} packets - data packets
     * @protected
     */
    write(packets) {
      this.writable = false;
      encodePayload(packets, (data) => {
        this.doWrite(data, () => {
          this.writable = true;
          this.emitReserved("drain");
        });
      });
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
      const schema = this.opts.secure ? "https" : "http";
      const query = this.query || {};
      if (false !== this.opts.timestampRequests) {
        query[this.opts.timestampParam] = yeast();
      }
      if (!this.supportsBinary && !query.sid) {
        query.b64 = 1;
      }
      return this.createUri(schema, query);
    }
    /**
     * Creates a request.
     *
     * @param {String} method
     * @private
     */
    request(opts = {}) {
      Object.assign(opts, { xd: this.xd, cookieJar: this.cookieJar }, this.opts);
      return new Request(this.uri(), opts);
    }
    /**
     * Sends data.
     *
     * @param {String} data to send.
     * @param {Function} called upon flush.
     * @private
     */
    doWrite(data, fn) {
      const req = this.request({
        method: "POST",
        data
      });
      req.on("success", fn);
      req.on("error", (xhrStatus, context) => {
        this.onError("xhr post error", xhrStatus, context);
      });
    }
    /**
     * Starts a poll cycle.
     *
     * @private
     */
    doPoll() {
      const req = this.request();
      req.on("data", this.onData.bind(this));
      req.on("error", (xhrStatus, context) => {
        this.onError("xhr poll error", xhrStatus, context);
      });
      this.pollXhr = req;
    }
  };
  var Request = class _Request extends Emitter {
    /**
     * Request constructor
     *
     * @param {Object} options
     * @package
     */
    constructor(uri, opts) {
      super();
      installTimerFunctions(this, opts);
      this.opts = opts;
      this.method = opts.method || "GET";
      this.uri = uri;
      this.data = void 0 !== opts.data ? opts.data : null;
      this.create();
    }
    /**
     * Creates the XHR object and sends the request.
     *
     * @private
     */
    create() {
      var _a;
      const opts = pick(this.opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
      opts.xdomain = !!this.opts.xd;
      const xhr = this.xhr = new XHR(opts);
      try {
        xhr.open(this.method, this.uri, true);
        try {
          if (this.opts.extraHeaders) {
            xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
            for (let i2 in this.opts.extraHeaders) {
              if (this.opts.extraHeaders.hasOwnProperty(i2)) {
                xhr.setRequestHeader(i2, this.opts.extraHeaders[i2]);
              }
            }
          }
        } catch (e) {
        }
        if ("POST" === this.method) {
          try {
            xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
          } catch (e) {
          }
        }
        try {
          xhr.setRequestHeader("Accept", "*/*");
        } catch (e) {
        }
        (_a = this.opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
        if ("withCredentials" in xhr) {
          xhr.withCredentials = this.opts.withCredentials;
        }
        if (this.opts.requestTimeout) {
          xhr.timeout = this.opts.requestTimeout;
        }
        xhr.onreadystatechange = () => {
          var _a2;
          if (xhr.readyState === 3) {
            (_a2 = this.opts.cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(xhr);
          }
          if (4 !== xhr.readyState)
            return;
          if (200 === xhr.status || 1223 === xhr.status) {
            this.onLoad();
          } else {
            this.setTimeoutFn(() => {
              this.onError(typeof xhr.status === "number" ? xhr.status : 0);
            }, 0);
          }
        };
        xhr.send(this.data);
      } catch (e) {
        this.setTimeoutFn(() => {
          this.onError(e);
        }, 0);
        return;
      }
      if (typeof document !== "undefined") {
        this.index = _Request.requestsCount++;
        _Request.requests[this.index] = this;
      }
    }
    /**
     * Called upon error.
     *
     * @private
     */
    onError(err) {
      this.emitReserved("error", err, this.xhr);
      this.cleanup(true);
    }
    /**
     * Cleans up house.
     *
     * @private
     */
    cleanup(fromError) {
      if ("undefined" === typeof this.xhr || null === this.xhr) {
        return;
      }
      this.xhr.onreadystatechange = empty;
      if (fromError) {
        try {
          this.xhr.abort();
        } catch (e) {
        }
      }
      if (typeof document !== "undefined") {
        delete _Request.requests[this.index];
      }
      this.xhr = null;
    }
    /**
     * Called upon load.
     *
     * @private
     */
    onLoad() {
      const data = this.xhr.responseText;
      if (data !== null) {
        this.emitReserved("data", data);
        this.emitReserved("success");
        this.cleanup();
      }
    }
    /**
     * Aborts the request.
     *
     * @package
     */
    abort() {
      this.cleanup();
    }
  };
  Request.requestsCount = 0;
  Request.requests = {};
  if (typeof document !== "undefined") {
    if (typeof attachEvent === "function") {
      attachEvent("onunload", unloadHandler);
    } else if (typeof addEventListener === "function") {
      const terminationEvent = "onpagehide" in globalThisShim ? "pagehide" : "unload";
      addEventListener(terminationEvent, unloadHandler, false);
    }
  }
  function unloadHandler() {
    for (let i2 in Request.requests) {
      if (Request.requests.hasOwnProperty(i2)) {
        Request.requests[i2].abort();
      }
    }
  }

  // node_modules/engine.io-client/build/esm/transports/websocket-constructor.browser.js
  var nextTick = (() => {
    const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
    if (isPromiseAvailable) {
      return (cb) => Promise.resolve().then(cb);
    } else {
      return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
    }
  })();
  var WebSocket = globalThisShim.WebSocket || globalThisShim.MozWebSocket;
  var usingBrowserWebSocket = true;
  var defaultBinaryType = "arraybuffer";

  // node_modules/engine.io-client/build/esm/transports/websocket.js
  var isReactNative = typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative";
  var WS = class extends Transport {
    /**
     * WebSocket transport constructor.
     *
     * @param {Object} opts - connection options
     * @protected
     */
    constructor(opts) {
      super(opts);
      this.supportsBinary = !opts.forceBase64;
    }
    get name() {
      return "websocket";
    }
    doOpen() {
      if (!this.check()) {
        return;
      }
      const uri = this.uri();
      const protocols = this.opts.protocols;
      const opts = isReactNative ? {} : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
      if (this.opts.extraHeaders) {
        opts.headers = this.opts.extraHeaders;
      }
      try {
        this.ws = usingBrowserWebSocket && !isReactNative ? protocols ? new WebSocket(uri, protocols) : new WebSocket(uri) : new WebSocket(uri, protocols, opts);
      } catch (err) {
        return this.emitReserved("error", err);
      }
      this.ws.binaryType = this.socket.binaryType;
      this.addEventListeners();
    }
    /**
     * Adds event listeners to the socket
     *
     * @private
     */
    addEventListeners() {
      this.ws.onopen = () => {
        if (this.opts.autoUnref) {
          this.ws._socket.unref();
        }
        this.onOpen();
      };
      this.ws.onclose = (closeEvent) => this.onClose({
        description: "websocket connection closed",
        context: closeEvent
      });
      this.ws.onmessage = (ev) => this.onData(ev.data);
      this.ws.onerror = (e) => this.onError("websocket error", e);
    }
    write(packets) {
      this.writable = false;
      for (let i2 = 0; i2 < packets.length; i2++) {
        const packet = packets[i2];
        const lastPacket = i2 === packets.length - 1;
        encodePacket(packet, this.supportsBinary, (data) => {
          const opts = {};
          if (!usingBrowserWebSocket) {
            if (packet.options) {
              opts.compress = packet.options.compress;
            }
            if (this.opts.perMessageDeflate) {
              const len = (
                // @ts-ignore
                "string" === typeof data ? Buffer.byteLength(data) : data.length
              );
              if (len < this.opts.perMessageDeflate.threshold) {
                opts.compress = false;
              }
            }
          }
          try {
            if (usingBrowserWebSocket) {
              this.ws.send(data);
            } else {
              this.ws.send(data, opts);
            }
          } catch (e) {
          }
          if (lastPacket) {
            nextTick(() => {
              this.writable = true;
              this.emitReserved("drain");
            }, this.setTimeoutFn);
          }
        });
      }
    }
    doClose() {
      if (typeof this.ws !== "undefined") {
        this.ws.close();
        this.ws = null;
      }
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
      const schema = this.opts.secure ? "wss" : "ws";
      const query = this.query || {};
      if (this.opts.timestampRequests) {
        query[this.opts.timestampParam] = yeast();
      }
      if (!this.supportsBinary) {
        query.b64 = 1;
      }
      return this.createUri(schema, query);
    }
    /**
     * Feature detection for WebSocket.
     *
     * @return {Boolean} whether this transport is available.
     * @private
     */
    check() {
      return !!WebSocket;
    }
  };

  // node_modules/engine.io-client/build/esm/transports/webtransport.js
  var WT = class extends Transport {
    get name() {
      return "webtransport";
    }
    doOpen() {
      if (typeof WebTransport !== "function") {
        return;
      }
      this.transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
      this.transport.closed.then(() => {
        this.onClose();
      }).catch((err) => {
        this.onError("webtransport error", err);
      });
      this.transport.ready.then(() => {
        this.transport.createBidirectionalStream().then((stream) => {
          const decoderStream = createPacketDecoderStream(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
          const reader = stream.readable.pipeThrough(decoderStream).getReader();
          const encoderStream = createPacketEncoderStream();
          encoderStream.readable.pipeTo(stream.writable);
          this.writer = encoderStream.writable.getWriter();
          const read = () => {
            reader.read().then(({ done, value: value2 }) => {
              if (done) {
                return;
              }
              this.onPacket(value2);
              read();
            }).catch((err) => {
            });
          };
          read();
          const packet = { type: "open" };
          if (this.query.sid) {
            packet.data = `{"sid":"${this.query.sid}"}`;
          }
          this.writer.write(packet).then(() => this.onOpen());
        });
      });
    }
    write(packets) {
      this.writable = false;
      for (let i2 = 0; i2 < packets.length; i2++) {
        const packet = packets[i2];
        const lastPacket = i2 === packets.length - 1;
        this.writer.write(packet).then(() => {
          if (lastPacket) {
            nextTick(() => {
              this.writable = true;
              this.emitReserved("drain");
            }, this.setTimeoutFn);
          }
        });
      }
    }
    doClose() {
      var _a;
      (_a = this.transport) === null || _a === void 0 ? void 0 : _a.close();
    }
  };

  // node_modules/engine.io-client/build/esm/transports/index.js
  var transports = {
    websocket: WS,
    webtransport: WT,
    polling: Polling
  };

  // node_modules/engine.io-client/build/esm/contrib/parseuri.js
  var re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
  var parts = [
    "source",
    "protocol",
    "authority",
    "userInfo",
    "user",
    "password",
    "host",
    "port",
    "relative",
    "path",
    "directory",
    "file",
    "query",
    "anchor"
  ];
  function parse(str) {
    if (str.length > 2e3) {
      throw "URI too long";
    }
    const src = str, b = str.indexOf("["), e = str.indexOf("]");
    if (b != -1 && e != -1) {
      str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
    }
    let m = re.exec(str || ""), uri = {}, i2 = 14;
    while (i2--) {
      uri[parts[i2]] = m[i2] || "";
    }
    if (b != -1 && e != -1) {
      uri.source = src;
      uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
      uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
      uri.ipv6uri = true;
    }
    uri.pathNames = pathNames(uri, uri["path"]);
    uri.queryKey = queryKey(uri, uri["query"]);
    return uri;
  }
  function pathNames(obj, path) {
    const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
    if (path.slice(0, 1) == "/" || path.length === 0) {
      names.splice(0, 1);
    }
    if (path.slice(-1) == "/") {
      names.splice(names.length - 1, 1);
    }
    return names;
  }
  function queryKey(uri, query) {
    const data = {};
    query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
      if ($1) {
        data[$1] = $2;
      }
    });
    return data;
  }

  // node_modules/engine.io-client/build/esm/socket.js
  var Socket = class _Socket extends Emitter {
    /**
     * Socket constructor.
     *
     * @param {String|Object} uri - uri or options
     * @param {Object} opts - options
     */
    constructor(uri, opts = {}) {
      super();
      this.binaryType = defaultBinaryType;
      this.writeBuffer = [];
      if (uri && "object" === typeof uri) {
        opts = uri;
        uri = null;
      }
      if (uri) {
        uri = parse(uri);
        opts.hostname = uri.host;
        opts.secure = uri.protocol === "https" || uri.protocol === "wss";
        opts.port = uri.port;
        if (uri.query)
          opts.query = uri.query;
      } else if (opts.host) {
        opts.hostname = parse(opts.host).host;
      }
      installTimerFunctions(this, opts);
      this.secure = null != opts.secure ? opts.secure : typeof location !== "undefined" && "https:" === location.protocol;
      if (opts.hostname && !opts.port) {
        opts.port = this.secure ? "443" : "80";
      }
      this.hostname = opts.hostname || (typeof location !== "undefined" ? location.hostname : "localhost");
      this.port = opts.port || (typeof location !== "undefined" && location.port ? location.port : this.secure ? "443" : "80");
      this.transports = opts.transports || [
        "polling",
        "websocket",
        "webtransport"
      ];
      this.writeBuffer = [];
      this.prevBufferLen = 0;
      this.opts = Object.assign({
        path: "/engine.io",
        agent: false,
        withCredentials: false,
        upgrade: true,
        timestampParam: "t",
        rememberUpgrade: false,
        addTrailingSlash: true,
        rejectUnauthorized: true,
        perMessageDeflate: {
          threshold: 1024
        },
        transportOptions: {},
        closeOnBeforeunload: false
      }, opts);
      this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : "");
      if (typeof this.opts.query === "string") {
        this.opts.query = decode2(this.opts.query);
      }
      this.id = null;
      this.upgrades = null;
      this.pingInterval = null;
      this.pingTimeout = null;
      this.pingTimeoutTimer = null;
      if (typeof addEventListener === "function") {
        if (this.opts.closeOnBeforeunload) {
          this.beforeunloadEventListener = () => {
            if (this.transport) {
              this.transport.removeAllListeners();
              this.transport.close();
            }
          };
          addEventListener("beforeunload", this.beforeunloadEventListener, false);
        }
        if (this.hostname !== "localhost") {
          this.offlineEventListener = () => {
            this.onClose("transport close", {
              description: "network connection lost"
            });
          };
          addEventListener("offline", this.offlineEventListener, false);
        }
      }
      this.open();
    }
    /**
     * Creates transport of the given type.
     *
     * @param {String} name - transport name
     * @return {Transport}
     * @private
     */
    createTransport(name) {
      const query = Object.assign({}, this.opts.query);
      query.EIO = protocol;
      query.transport = name;
      if (this.id)
        query.sid = this.id;
      const opts = Object.assign({}, this.opts, {
        query,
        socket: this,
        hostname: this.hostname,
        secure: this.secure,
        port: this.port
      }, this.opts.transportOptions[name]);
      return new transports[name](opts);
    }
    /**
     * Initializes transport to use and starts probe.
     *
     * @private
     */
    open() {
      let transport;
      if (this.opts.rememberUpgrade && _Socket.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1) {
        transport = "websocket";
      } else if (0 === this.transports.length) {
        this.setTimeoutFn(() => {
          this.emitReserved("error", "No transports available");
        }, 0);
        return;
      } else {
        transport = this.transports[0];
      }
      this.readyState = "opening";
      try {
        transport = this.createTransport(transport);
      } catch (e) {
        this.transports.shift();
        this.open();
        return;
      }
      transport.open();
      this.setTransport(transport);
    }
    /**
     * Sets the current transport. Disables the existing one (if any).
     *
     * @private
     */
    setTransport(transport) {
      if (this.transport) {
        this.transport.removeAllListeners();
      }
      this.transport = transport;
      transport.on("drain", this.onDrain.bind(this)).on("packet", this.onPacket.bind(this)).on("error", this.onError.bind(this)).on("close", (reason) => this.onClose("transport close", reason));
    }
    /**
     * Probes a transport.
     *
     * @param {String} name - transport name
     * @private
     */
    probe(name) {
      let transport = this.createTransport(name);
      let failed = false;
      _Socket.priorWebsocketSuccess = false;
      const onTransportOpen = () => {
        if (failed)
          return;
        transport.send([{ type: "ping", data: "probe" }]);
        transport.once("packet", (msg) => {
          if (failed)
            return;
          if ("pong" === msg.type && "probe" === msg.data) {
            this.upgrading = true;
            this.emitReserved("upgrading", transport);
            if (!transport)
              return;
            _Socket.priorWebsocketSuccess = "websocket" === transport.name;
            this.transport.pause(() => {
              if (failed)
                return;
              if ("closed" === this.readyState)
                return;
              cleanup();
              this.setTransport(transport);
              transport.send([{ type: "upgrade" }]);
              this.emitReserved("upgrade", transport);
              transport = null;
              this.upgrading = false;
              this.flush();
            });
          } else {
            const err = new Error("probe error");
            err.transport = transport.name;
            this.emitReserved("upgradeError", err);
          }
        });
      };
      function freezeTransport() {
        if (failed)
          return;
        failed = true;
        cleanup();
        transport.close();
        transport = null;
      }
      const onerror = (err) => {
        const error = new Error("probe error: " + err);
        error.transport = transport.name;
        freezeTransport();
        this.emitReserved("upgradeError", error);
      };
      function onTransportClose() {
        onerror("transport closed");
      }
      function onclose() {
        onerror("socket closed");
      }
      function onupgrade(to) {
        if (transport && to.name !== transport.name) {
          freezeTransport();
        }
      }
      const cleanup = () => {
        transport.removeListener("open", onTransportOpen);
        transport.removeListener("error", onerror);
        transport.removeListener("close", onTransportClose);
        this.off("close", onclose);
        this.off("upgrading", onupgrade);
      };
      transport.once("open", onTransportOpen);
      transport.once("error", onerror);
      transport.once("close", onTransportClose);
      this.once("close", onclose);
      this.once("upgrading", onupgrade);
      if (this.upgrades.indexOf("webtransport") !== -1 && name !== "webtransport") {
        this.setTimeoutFn(() => {
          if (!failed) {
            transport.open();
          }
        }, 200);
      } else {
        transport.open();
      }
    }
    /**
     * Called when connection is deemed open.
     *
     * @private
     */
    onOpen() {
      this.readyState = "open";
      _Socket.priorWebsocketSuccess = "websocket" === this.transport.name;
      this.emitReserved("open");
      this.flush();
      if ("open" === this.readyState && this.opts.upgrade) {
        let i2 = 0;
        const l = this.upgrades.length;
        for (; i2 < l; i2++) {
          this.probe(this.upgrades[i2]);
        }
      }
    }
    /**
     * Handles a packet.
     *
     * @private
     */
    onPacket(packet) {
      if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
        this.emitReserved("packet", packet);
        this.emitReserved("heartbeat");
        this.resetPingTimeout();
        switch (packet.type) {
          case "open":
            this.onHandshake(JSON.parse(packet.data));
            break;
          case "ping":
            this.sendPacket("pong");
            this.emitReserved("ping");
            this.emitReserved("pong");
            break;
          case "error":
            const err = new Error("server error");
            err.code = packet.data;
            this.onError(err);
            break;
          case "message":
            this.emitReserved("data", packet.data);
            this.emitReserved("message", packet.data);
            break;
        }
      } else {
      }
    }
    /**
     * Called upon handshake completion.
     *
     * @param {Object} data - handshake obj
     * @private
     */
    onHandshake(data) {
      this.emitReserved("handshake", data);
      this.id = data.sid;
      this.transport.query.sid = data.sid;
      this.upgrades = this.filterUpgrades(data.upgrades);
      this.pingInterval = data.pingInterval;
      this.pingTimeout = data.pingTimeout;
      this.maxPayload = data.maxPayload;
      this.onOpen();
      if ("closed" === this.readyState)
        return;
      this.resetPingTimeout();
    }
    /**
     * Sets and resets ping timeout timer based on server pings.
     *
     * @private
     */
    resetPingTimeout() {
      this.clearTimeoutFn(this.pingTimeoutTimer);
      this.pingTimeoutTimer = this.setTimeoutFn(() => {
        this.onClose("ping timeout");
      }, this.pingInterval + this.pingTimeout);
      if (this.opts.autoUnref) {
        this.pingTimeoutTimer.unref();
      }
    }
    /**
     * Called on `drain` event
     *
     * @private
     */
    onDrain() {
      this.writeBuffer.splice(0, this.prevBufferLen);
      this.prevBufferLen = 0;
      if (0 === this.writeBuffer.length) {
        this.emitReserved("drain");
      } else {
        this.flush();
      }
    }
    /**
     * Flush write buffers.
     *
     * @private
     */
    flush() {
      if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
        const packets = this.getWritablePackets();
        this.transport.send(packets);
        this.prevBufferLen = packets.length;
        this.emitReserved("flush");
      }
    }
    /**
     * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
     * long-polling)
     *
     * @private
     */
    getWritablePackets() {
      const shouldCheckPayloadSize = this.maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1;
      if (!shouldCheckPayloadSize) {
        return this.writeBuffer;
      }
      let payloadSize = 1;
      for (let i2 = 0; i2 < this.writeBuffer.length; i2++) {
        const data = this.writeBuffer[i2].data;
        if (data) {
          payloadSize += byteLength(data);
        }
        if (i2 > 0 && payloadSize > this.maxPayload) {
          return this.writeBuffer.slice(0, i2);
        }
        payloadSize += 2;
      }
      return this.writeBuffer;
    }
    /**
     * Sends a message.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} callback function.
     * @return {Socket} for chaining.
     */
    write(msg, options, fn) {
      this.sendPacket("message", msg, options, fn);
      return this;
    }
    send(msg, options, fn) {
      this.sendPacket("message", msg, options, fn);
      return this;
    }
    /**
     * Sends a packet.
     *
     * @param {String} type: packet type.
     * @param {String} data.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @private
     */
    sendPacket(type, data, options, fn) {
      if ("function" === typeof data) {
        fn = data;
        data = void 0;
      }
      if ("function" === typeof options) {
        fn = options;
        options = null;
      }
      if ("closing" === this.readyState || "closed" === this.readyState) {
        return;
      }
      options = options || {};
      options.compress = false !== options.compress;
      const packet = {
        type,
        data,
        options
      };
      this.emitReserved("packetCreate", packet);
      this.writeBuffer.push(packet);
      if (fn)
        this.once("flush", fn);
      this.flush();
    }
    /**
     * Closes the connection.
     */
    close() {
      const close = () => {
        this.onClose("forced close");
        this.transport.close();
      };
      const cleanupAndClose = () => {
        this.off("upgrade", cleanupAndClose);
        this.off("upgradeError", cleanupAndClose);
        close();
      };
      const waitForUpgrade = () => {
        this.once("upgrade", cleanupAndClose);
        this.once("upgradeError", cleanupAndClose);
      };
      if ("opening" === this.readyState || "open" === this.readyState) {
        this.readyState = "closing";
        if (this.writeBuffer.length) {
          this.once("drain", () => {
            if (this.upgrading) {
              waitForUpgrade();
            } else {
              close();
            }
          });
        } else if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      }
      return this;
    }
    /**
     * Called upon transport error
     *
     * @private
     */
    onError(err) {
      _Socket.priorWebsocketSuccess = false;
      this.emitReserved("error", err);
      this.onClose("transport error", err);
    }
    /**
     * Called upon transport close.
     *
     * @private
     */
    onClose(reason, description) {
      if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
        this.clearTimeoutFn(this.pingTimeoutTimer);
        this.transport.removeAllListeners("close");
        this.transport.close();
        this.transport.removeAllListeners();
        if (typeof removeEventListener === "function") {
          removeEventListener("beforeunload", this.beforeunloadEventListener, false);
          removeEventListener("offline", this.offlineEventListener, false);
        }
        this.readyState = "closed";
        this.id = null;
        this.emitReserved("close", reason, description);
        this.writeBuffer = [];
        this.prevBufferLen = 0;
      }
    }
    /**
     * Filters upgrades, returning only those matching client transports.
     *
     * @param {Array} upgrades - server upgrades
     * @private
     */
    filterUpgrades(upgrades) {
      const filteredUpgrades = [];
      let i2 = 0;
      const j = upgrades.length;
      for (; i2 < j; i2++) {
        if (~this.transports.indexOf(upgrades[i2]))
          filteredUpgrades.push(upgrades[i2]);
      }
      return filteredUpgrades;
    }
  };
  Socket.protocol = protocol;

  // node_modules/engine.io-client/build/esm/index.js
  var protocol2 = Socket.protocol;

  // node_modules/socket.io-client/build/esm/url.js
  function url(uri, path = "", loc) {
    let obj = uri;
    loc = loc || typeof location !== "undefined" && location;
    if (null == uri)
      uri = loc.protocol + "//" + loc.host;
    if (typeof uri === "string") {
      if ("/" === uri.charAt(0)) {
        if ("/" === uri.charAt(1)) {
          uri = loc.protocol + uri;
        } else {
          uri = loc.host + uri;
        }
      }
      if (!/^(https?|wss?):\/\//.test(uri)) {
        if ("undefined" !== typeof loc) {
          uri = loc.protocol + "//" + uri;
        } else {
          uri = "https://" + uri;
        }
      }
      obj = parse(uri);
    }
    if (!obj.port) {
      if (/^(http|ws)$/.test(obj.protocol)) {
        obj.port = "80";
      } else if (/^(http|ws)s$/.test(obj.protocol)) {
        obj.port = "443";
      }
    }
    obj.path = obj.path || "/";
    const ipv6 = obj.host.indexOf(":") !== -1;
    const host = ipv6 ? "[" + obj.host + "]" : obj.host;
    obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
    obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : ":" + obj.port);
    return obj;
  }

  // node_modules/socket.io-parser/build/esm/index.js
  var esm_exports = {};
  __export(esm_exports, {
    Decoder: () => Decoder,
    Encoder: () => Encoder,
    PacketType: () => PacketType,
    isPacketValid: () => isPacketValid,
    protocol: () => protocol3
  });

  // node_modules/socket.io-parser/build/esm/is-binary.js
  var withNativeArrayBuffer3 = typeof ArrayBuffer === "function";
  var isView2 = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
  };
  var toString = Object.prototype.toString;
  var withNativeBlob2 = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
  var withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
  function isBinary(obj) {
    return withNativeArrayBuffer3 && (obj instanceof ArrayBuffer || isView2(obj)) || withNativeBlob2 && obj instanceof Blob || withNativeFile && obj instanceof File;
  }
  function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
      return false;
    }
    if (Array.isArray(obj)) {
      for (let i2 = 0, l = obj.length; i2 < l; i2++) {
        if (hasBinary(obj[i2])) {
          return true;
        }
      }
      return false;
    }
    if (isBinary(obj)) {
      return true;
    }
    if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
      return hasBinary(obj.toJSON(), true);
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
        return true;
      }
    }
    return false;
  }

  // node_modules/socket.io-parser/build/esm/binary.js
  function deconstructPacket(packet) {
    const buffers = [];
    const packetData = packet.data;
    const pack = packet;
    pack.data = _deconstructPacket(packetData, buffers);
    pack.attachments = buffers.length;
    return { packet: pack, buffers };
  }
  function _deconstructPacket(data, buffers, toJSON) {
    if (!data)
      return data;
    if (isBinary(data)) {
      const placeholder = { _placeholder: true, num: buffers.length };
      buffers.push(data);
      return placeholder;
    } else if (Array.isArray(data)) {
      const newData = new Array(data.length);
      for (let i2 = 0; i2 < data.length; i2++) {
        newData[i2] = _deconstructPacket(data[i2], buffers);
      }
      return newData;
    } else if (typeof data === "object" && !(data instanceof Date)) {
      if (data.toJSON && typeof data.toJSON === "function" && !toJSON) {
        return _deconstructPacket(data.toJSON(), buffers, true);
      }
      const newData = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          newData[key] = _deconstructPacket(data[key], buffers);
        }
      }
      return newData;
    }
    return data;
  }
  function reconstructPacket(packet, buffers) {
    packet.data = _reconstructPacket(packet.data, buffers);
    delete packet.attachments;
    return packet;
  }
  function _reconstructPacket(data, buffers) {
    if (!data)
      return data;
    if (data && data._placeholder === true) {
      const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
      if (isIndexValid) {
        return buffers[data.num];
      } else {
        throw new Error("illegal attachments");
      }
    } else if (Array.isArray(data)) {
      for (let i2 = 0; i2 < data.length; i2++) {
        data[i2] = _reconstructPacket(data[i2], buffers);
      }
    } else if (typeof data === "object") {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          data[key] = _reconstructPacket(data[key], buffers);
        }
      }
    }
    return data;
  }

  // node_modules/socket.io-parser/build/esm/index.js
  var RESERVED_EVENTS = [
    "connect",
    // used on the client side
    "connect_error",
    // used on the client side
    "disconnect",
    // used on both sides
    "disconnecting",
    // used on the server side
    "newListener",
    // used by the Node.js EventEmitter
    "removeListener"
    // used by the Node.js EventEmitter
  ];
  var protocol3 = 5;
  var PacketType;
  (function(PacketType2) {
    PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
    PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
    PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
    PacketType2[PacketType2["ACK"] = 3] = "ACK";
    PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
    PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
    PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
  })(PacketType || (PacketType = {}));
  var Encoder = class {
    /**
     * Encoder constructor
     *
     * @param {function} replacer - custom replacer to pass down to JSON.parse
     */
    constructor(replacer) {
      this.replacer = replacer;
    }
    /**
     * Encode a packet as a single string if non-binary, or as a
     * buffer sequence, depending on packet type.
     *
     * @param {Object} obj - packet object
     */
    encode(obj) {
      if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
        if (hasBinary(obj)) {
          return this.encodeAsBinary({
            type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
            nsp: obj.nsp,
            data: obj.data,
            id: obj.id
          });
        }
      }
      return [this.encodeAsString(obj)];
    }
    /**
     * Encode packet as string.
     */
    encodeAsString(obj) {
      let str = "" + obj.type;
      if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
        str += obj.attachments + "-";
      }
      if (obj.nsp && "/" !== obj.nsp) {
        str += obj.nsp + ",";
      }
      if (null != obj.id) {
        str += obj.id;
      }
      if (null != obj.data) {
        str += JSON.stringify(obj.data, this.replacer);
      }
      return str;
    }
    /**
     * Encode packet as 'buffer sequence' by removing blobs, and
     * deconstructing packet into object with placeholders and
     * a list of buffers.
     */
    encodeAsBinary(obj) {
      const deconstruction = deconstructPacket(obj);
      const pack = this.encodeAsString(deconstruction.packet);
      const buffers = deconstruction.buffers;
      buffers.unshift(pack);
      return buffers;
    }
  };
  var Decoder = class _Decoder extends Emitter {
    /**
     * Decoder constructor
     */
    constructor(opts) {
      super();
      this.opts = Object.assign({
        reviver: void 0,
        maxAttachments: 10
      }, typeof opts === "function" ? { reviver: opts } : opts);
    }
    /**
     * Decodes an encoded packet string into packet JSON.
     *
     * @param {String} obj - encoded packet
     */
    add(obj) {
      let packet;
      if (typeof obj === "string") {
        if (this.reconstructor) {
          throw new Error("got plaintext data when reconstructing a packet");
        }
        packet = this.decodeString(obj);
        const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
        if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
          packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
          this.reconstructor = new BinaryReconstructor(packet);
        } else {
          super.emitReserved("decoded", packet);
        }
      } else if (isBinary(obj) || obj.base64) {
        if (!this.reconstructor) {
          throw new Error("got binary data when not reconstructing a packet");
        } else {
          packet = this.reconstructor.takeBinaryData(obj);
          if (packet) {
            this.reconstructor = null;
            super.emitReserved("decoded", packet);
          }
        }
      } else {
        throw new Error("Unknown type: " + obj);
      }
    }
    /**
     * Decode a packet String (JSON data)
     *
     * @param {String} str
     * @return {Object} packet
     */
    decodeString(str) {
      let i2 = 0;
      const p = {
        type: Number(str.charAt(0))
      };
      if (PacketType[p.type] === void 0) {
        throw new Error("unknown packet type " + p.type);
      }
      if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
        const start = i2 + 1;
        while (str.charAt(++i2) !== "-" && i2 != str.length) {
        }
        const buf = str.substring(start, i2);
        if (buf != Number(buf) || str.charAt(i2) !== "-") {
          throw new Error("Illegal attachments");
        }
        const n = Number(buf);
        if (!isInteger(n) || n < 1) {
          throw new Error("Illegal attachments");
        } else if (n > this.opts.maxAttachments) {
          throw new Error("too many attachments");
        }
        p.attachments = n;
      }
      if ("/" === str.charAt(i2 + 1)) {
        const start = i2 + 1;
        while (++i2) {
          const c = str.charAt(i2);
          if ("," === c)
            break;
          if (i2 === str.length)
            break;
        }
        p.nsp = str.substring(start, i2);
      } else {
        p.nsp = "/";
      }
      const next = str.charAt(i2 + 1);
      if ("" !== next && Number(next) == next) {
        const start = i2 + 1;
        while (++i2) {
          const c = str.charAt(i2);
          if (null == c || Number(c) != c) {
            --i2;
            break;
          }
          if (i2 === str.length)
            break;
        }
        p.id = Number(str.substring(start, i2 + 1));
      }
      if (str.charAt(++i2)) {
        const payload = this.tryParse(str.substr(i2));
        if (_Decoder.isPayloadValid(p.type, payload)) {
          p.data = payload;
        } else {
          throw new Error("invalid payload");
        }
      }
      return p;
    }
    tryParse(str) {
      try {
        return JSON.parse(str, this.opts.reviver);
      } catch (e) {
        return false;
      }
    }
    static isPayloadValid(type, payload) {
      switch (type) {
        case PacketType.CONNECT:
          return isObject(payload);
        case PacketType.DISCONNECT:
          return payload === void 0;
        case PacketType.CONNECT_ERROR:
          return typeof payload === "string" || isObject(payload);
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          return Array.isArray(payload);
      }
    }
    /**
     * Deallocates a parser's resources
     */
    destroy() {
      if (this.reconstructor) {
        this.reconstructor.finishedReconstruction();
        this.reconstructor = null;
      }
    }
  };
  var BinaryReconstructor = class {
    constructor(packet) {
      this.packet = packet;
      this.buffers = [];
      this.reconPack = packet;
    }
    /**
     * Method to be called when binary data received from connection
     * after a BINARY_EVENT packet.
     *
     * @param {Buffer | ArrayBuffer} binData - the raw binary data received
     * @return {null | Object} returns null if more binary data is expected or
     *   a reconstructed packet object if all buffers have been received.
     */
    takeBinaryData(binData) {
      this.buffers.push(binData);
      if (this.buffers.length === this.reconPack.attachments) {
        const packet = reconstructPacket(this.reconPack, this.buffers);
        this.finishedReconstruction();
        return packet;
      }
      return null;
    }
    /**
     * Cleans up binary packet reconstruction variables.
     */
    finishedReconstruction() {
      this.reconPack = null;
      this.buffers = [];
    }
  };
  function isNamespaceValid(nsp) {
    return typeof nsp === "string";
  }
  var isInteger = Number.isInteger || function(value2) {
    return typeof value2 === "number" && isFinite(value2) && Math.floor(value2) === value2;
  };
  function isAckIdValid(id) {
    return id === void 0 || isInteger(id);
  }
  function isObject(value2) {
    return Object.prototype.toString.call(value2) === "[object Object]";
  }
  function isDataValid(type, payload) {
    switch (type) {
      case PacketType.CONNECT:
        return payload === void 0 || isObject(payload);
      case PacketType.DISCONNECT:
        return payload === void 0;
      case PacketType.EVENT:
        return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
      case PacketType.ACK:
        return Array.isArray(payload);
      case PacketType.CONNECT_ERROR:
        return typeof payload === "string" || isObject(payload);
      default:
        return false;
    }
  }
  function isPacketValid(packet) {
    return isNamespaceValid(packet.nsp) && isAckIdValid(packet.id) && isDataValid(packet.type, packet.data);
  }

  // node_modules/socket.io-client/build/esm/on.js
  function on(obj, ev, fn) {
    obj.on(ev, fn);
    return function subDestroy() {
      obj.off(ev, fn);
    };
  }

  // node_modules/socket.io-client/build/esm/socket.js
  var RESERVED_EVENTS2 = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
    newListener: 1,
    removeListener: 1
  });
  var Socket2 = class extends Emitter {
    /**
     * `Socket` constructor.
     */
    constructor(io, nsp, opts) {
      super();
      this.connected = false;
      this.recovered = false;
      this.receiveBuffer = [];
      this.sendBuffer = [];
      this._queue = [];
      this._queueSeq = 0;
      this.ids = 0;
      this.acks = {};
      this.flags = {};
      this.io = io;
      this.nsp = nsp;
      if (opts && opts.auth) {
        this.auth = opts.auth;
      }
      this._opts = Object.assign({}, opts);
      if (this.io._autoConnect)
        this.open();
    }
    /**
     * Whether the socket is currently disconnected
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log(socket.disconnected); // false
     * });
     *
     * socket.on("disconnect", () => {
     *   console.log(socket.disconnected); // true
     * });
     */
    get disconnected() {
      return !this.connected;
    }
    /**
     * Subscribe to open, close and packet events
     *
     * @private
     */
    subEvents() {
      if (this.subs)
        return;
      const io = this.io;
      this.subs = [
        on(io, "open", this.onopen.bind(this)),
        on(io, "packet", this.onpacket.bind(this)),
        on(io, "error", this.onerror.bind(this)),
        on(io, "close", this.onclose.bind(this))
      ];
    }
    /**
     * Whether the Socket will try to reconnect when its Manager connects or reconnects.
     *
     * @example
     * const socket = io();
     *
     * console.log(socket.active); // true
     *
     * socket.on("disconnect", (reason) => {
     *   if (reason === "io server disconnect") {
     *     // the disconnection was initiated by the server, you need to manually reconnect
     *     console.log(socket.active); // false
     *   }
     *   // else the socket will automatically try to reconnect
     *   console.log(socket.active); // true
     * });
     */
    get active() {
      return !!this.subs;
    }
    /**
     * "Opens" the socket.
     *
     * @example
     * const socket = io({
     *   autoConnect: false
     * });
     *
     * socket.connect();
     */
    connect() {
      if (this.connected)
        return this;
      this.subEvents();
      if (!this.io["_reconnecting"])
        this.io.open();
      if ("open" === this.io._readyState)
        this.onopen();
      return this;
    }
    /**
     * Alias for {@link connect()}.
     */
    open() {
      return this.connect();
    }
    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * socket.send("hello");
     *
     * // this is equivalent to
     * socket.emit("message", "hello");
     *
     * @return self
     */
    send(...args) {
      args.unshift("message");
      this.emit.apply(this, args);
      return this;
    }
    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @example
     * socket.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the server
     * socket.emit("hello", "world", (val) => {
     *   // ...
     * });
     *
     * @return self
     */
    emit(ev, ...args) {
      if (RESERVED_EVENTS2.hasOwnProperty(ev)) {
        throw new Error('"' + ev.toString() + '" is a reserved event name');
      }
      args.unshift(ev);
      if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
        this._addToQueue(args);
        return this;
      }
      const packet = {
        type: PacketType.EVENT,
        data: args
      };
      packet.options = {};
      packet.options.compress = this.flags.compress !== false;
      if ("function" === typeof args[args.length - 1]) {
        const id = this.ids++;
        const ack = args.pop();
        this._registerAckCallback(id, ack);
        packet.id = id;
      }
      const isTransportWritable = this.io.engine && this.io.engine.transport && this.io.engine.transport.writable;
      const discardPacket = this.flags.volatile && (!isTransportWritable || !this.connected);
      if (discardPacket) {
      } else if (this.connected) {
        this.notifyOutgoingListeners(packet);
        this.packet(packet);
      } else {
        this.sendBuffer.push(packet);
      }
      this.flags = {};
      return this;
    }
    /**
     * @private
     */
    _registerAckCallback(id, ack) {
      var _a;
      const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
      if (timeout === void 0) {
        this.acks[id] = ack;
        return;
      }
      const timer = this.io.setTimeoutFn(() => {
        delete this.acks[id];
        for (let i2 = 0; i2 < this.sendBuffer.length; i2++) {
          if (this.sendBuffer[i2].id === id) {
            this.sendBuffer.splice(i2, 1);
          }
        }
        ack.call(this, new Error("operation has timed out"));
      }, timeout);
      const fn = (...args) => {
        this.io.clearTimeoutFn(timer);
        ack.apply(this, args);
      };
      fn.withError = true;
      this.acks[id] = fn;
    }
    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * // without timeout
     * const response = await socket.emitWithAck("hello", "world");
     *
     * // with a specific timeout
     * try {
     *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
     * } catch (err) {
     *   // the server did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when the server acknowledges the event
     */
    emitWithAck(ev, ...args) {
      return new Promise((resolve, reject) => {
        const fn = (arg1, arg2) => {
          return arg1 ? reject(arg1) : resolve(arg2);
        };
        fn.withError = true;
        args.push(fn);
        this.emit(ev, ...args);
      });
    }
    /**
     * Add the packet to the queue.
     * @param args
     * @private
     */
    _addToQueue(args) {
      let ack;
      if (typeof args[args.length - 1] === "function") {
        ack = args.pop();
      }
      const packet = {
        id: this._queueSeq++,
        tryCount: 0,
        pending: false,
        args,
        flags: Object.assign({ fromQueue: true }, this.flags)
      };
      args.push((err, ...responseArgs) => {
        if (packet !== this._queue[0]) {
          return;
        }
        const hasError = err !== null;
        if (hasError) {
          if (packet.tryCount > this._opts.retries) {
            this._queue.shift();
            if (ack) {
              ack(err);
            }
          }
        } else {
          this._queue.shift();
          if (ack) {
            ack(null, ...responseArgs);
          }
        }
        packet.pending = false;
        return this._drainQueue();
      });
      this._queue.push(packet);
      this._drainQueue();
    }
    /**
     * Send the first packet of the queue, and wait for an acknowledgement from the server.
     * @param force - whether to resend a packet that has not been acknowledged yet
     *
     * @private
     */
    _drainQueue(force = false) {
      if (!this.connected || this._queue.length === 0) {
        return;
      }
      const packet = this._queue[0];
      if (packet.pending && !force) {
        return;
      }
      packet.pending = true;
      packet.tryCount++;
      this.flags = packet.flags;
      this.emit.apply(this, packet.args);
    }
    /**
     * Sends a packet.
     *
     * @param packet
     * @private
     */
    packet(packet) {
      packet.nsp = this.nsp;
      this.io._packet(packet);
    }
    /**
     * Called upon engine `open`.
     *
     * @private
     */
    onopen() {
      if (typeof this.auth == "function") {
        this.auth((data) => {
          this._sendConnectPacket(data);
        });
      } else {
        this._sendConnectPacket(this.auth);
      }
    }
    /**
     * Sends a CONNECT packet to initiate the Socket.IO session.
     *
     * @param data
     * @private
     */
    _sendConnectPacket(data) {
      this.packet({
        type: PacketType.CONNECT,
        data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data) : data
      });
    }
    /**
     * Called upon engine or manager `error`.
     *
     * @param err
     * @private
     */
    onerror(err) {
      if (!this.connected) {
        this.emitReserved("connect_error", err);
      }
    }
    /**
     * Called upon engine `close`.
     *
     * @param reason
     * @param description
     * @private
     */
    onclose(reason, description) {
      this.connected = false;
      delete this.id;
      this.emitReserved("disconnect", reason, description);
      this._clearAcks();
    }
    /**
     * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
     * the server.
     *
     * @private
     */
    _clearAcks() {
      Object.keys(this.acks).forEach((id) => {
        const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
        if (!isBuffered) {
          const ack = this.acks[id];
          delete this.acks[id];
          if (ack.withError) {
            ack.call(this, new Error("socket has been disconnected"));
          }
        }
      });
    }
    /**
     * Called with socket packet.
     *
     * @param packet
     * @private
     */
    onpacket(packet) {
      const sameNamespace = packet.nsp === this.nsp;
      if (!sameNamespace)
        return;
      switch (packet.type) {
        case PacketType.CONNECT:
          if (packet.data && packet.data.sid) {
            this.onconnect(packet.data.sid, packet.data.pid);
          } else {
            this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
          }
          break;
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          this.onevent(packet);
          break;
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          this.onack(packet);
          break;
        case PacketType.DISCONNECT:
          this.ondisconnect();
          break;
        case PacketType.CONNECT_ERROR:
          this.destroy();
          const err = new Error(packet.data.message);
          err.data = packet.data.data;
          this.emitReserved("connect_error", err);
          break;
      }
    }
    /**
     * Called upon a server event.
     *
     * @param packet
     * @private
     */
    onevent(packet) {
      const args = packet.data || [];
      if (null != packet.id) {
        args.push(this.ack(packet.id));
      }
      if (this.connected) {
        this.emitEvent(args);
      } else {
        this.receiveBuffer.push(Object.freeze(args));
      }
    }
    emitEvent(args) {
      if (this._anyListeners && this._anyListeners.length) {
        const listeners = this._anyListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, args);
        }
      }
      super.emit.apply(this, args);
      if (this._pid && args.length && typeof args[args.length - 1] === "string") {
        this._lastOffset = args[args.length - 1];
      }
    }
    /**
     * Produces an ack callback to emit with an event.
     *
     * @private
     */
    ack(id) {
      const self2 = this;
      let sent = false;
      return function(...args) {
        if (sent)
          return;
        sent = true;
        self2.packet({
          type: PacketType.ACK,
          id,
          data: args
        });
      };
    }
    /**
     * Called upon a server acknowledgement.
     *
     * @param packet
     * @private
     */
    onack(packet) {
      const ack = this.acks[packet.id];
      if (typeof ack !== "function") {
        return;
      }
      delete this.acks[packet.id];
      if (ack.withError) {
        packet.data.unshift(null);
      }
      ack.apply(this, packet.data);
    }
    /**
     * Called upon server connect.
     *
     * @private
     */
    onconnect(id, pid) {
      this.id = id;
      this.recovered = pid && this._pid === pid;
      this._pid = pid;
      this.connected = true;
      this.emitBuffered();
      this.emitReserved("connect");
      this._drainQueue(true);
    }
    /**
     * Emit buffered events (received and emitted).
     *
     * @private
     */
    emitBuffered() {
      this.receiveBuffer.forEach((args) => this.emitEvent(args));
      this.receiveBuffer = [];
      this.sendBuffer.forEach((packet) => {
        this.notifyOutgoingListeners(packet);
        this.packet(packet);
      });
      this.sendBuffer = [];
    }
    /**
     * Called upon server disconnect.
     *
     * @private
     */
    ondisconnect() {
      this.destroy();
      this.onclose("io server disconnect");
    }
    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @private
     */
    destroy() {
      if (this.subs) {
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs = void 0;
      }
      this.io["_destroy"](this);
    }
    /**
     * Disconnects the socket manually. In that case, the socket will not try to reconnect.
     *
     * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
     *
     * @example
     * const socket = io();
     *
     * socket.on("disconnect", (reason) => {
     *   // console.log(reason); prints "io client disconnect"
     * });
     *
     * socket.disconnect();
     *
     * @return self
     */
    disconnect() {
      if (this.connected) {
        this.packet({ type: PacketType.DISCONNECT });
      }
      this.destroy();
      if (this.connected) {
        this.onclose("io client disconnect");
      }
      return this;
    }
    /**
     * Alias for {@link disconnect()}.
     *
     * @return self
     */
    close() {
      return this.disconnect();
    }
    /**
     * Sets the compress flag.
     *
     * @example
     * socket.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    compress(compress) {
      this.flags.compress = compress;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
     * ready to send messages.
     *
     * @example
     * socket.volatile.emit("hello"); // the server may or may not receive it
     *
     * @returns self
     */
    get volatile() {
      this.flags.volatile = true;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the server:
     *
     * @example
     * socket.timeout(5000).emit("my-event", (err) => {
     *   if (err) {
     *     // the server did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @returns self
     */
    timeout(timeout) {
      this.flags.timeout = timeout;
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @example
     * socket.onAny((event, ...args) => {
     *   console.log(`got ${event}`);
     * });
     *
     * @param listener
     */
    onAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.push(listener);
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * socket.prependAny((event, ...args) => {
     *   console.log(`got event ${event}`);
     * });
     *
     * @param listener
     */
    prependAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.unshift(listener);
      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`got event ${event}`);
     * }
     *
     * socket.onAny(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAny(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAny();
     *
     * @param listener
     */
    offAny(listener) {
      if (!this._anyListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyListeners;
        for (let i2 = 0; i2 < listeners.length; i2++) {
          if (listener === listeners[i2]) {
            listeners.splice(i2, 1);
            return this;
          }
        }
      } else {
        this._anyListeners = [];
      }
      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAny() {
      return this._anyListeners || [];
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.onAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    onAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.push(listener);
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.prependAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    prependAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.unshift(listener);
      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`sent event ${event}`);
     * }
     *
     * socket.onAnyOutgoing(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAnyOutgoing(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAnyOutgoing();
     *
     * @param [listener] - the catch-all listener (optional)
     */
    offAnyOutgoing(listener) {
      if (!this._anyOutgoingListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyOutgoingListeners;
        for (let i2 = 0; i2 < listeners.length; i2++) {
          if (listener === listeners[i2]) {
            listeners.splice(i2, 1);
            return this;
          }
        }
      } else {
        this._anyOutgoingListeners = [];
      }
      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAnyOutgoing() {
      return this._anyOutgoingListeners || [];
    }
    /**
     * Notify the listeners for each packet sent
     *
     * @param packet
     *
     * @private
     */
    notifyOutgoingListeners(packet) {
      if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
        const listeners = this._anyOutgoingListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, packet.data);
        }
      }
    }
  };

  // node_modules/socket.io-client/build/esm/contrib/backo2.js
  function Backoff(opts) {
    opts = opts || {};
    this.ms = opts.min || 100;
    this.max = opts.max || 1e4;
    this.factor = opts.factor || 2;
    this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
  }
  Backoff.prototype.duration = function() {
    var ms = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
      var rand = Math.random();
      var deviation = Math.floor(rand * this.jitter * ms);
      ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, this.max) | 0;
  };
  Backoff.prototype.reset = function() {
    this.attempts = 0;
  };
  Backoff.prototype.setMin = function(min) {
    this.ms = min;
  };
  Backoff.prototype.setMax = function(max) {
    this.max = max;
  };
  Backoff.prototype.setJitter = function(jitter) {
    this.jitter = jitter;
  };

  // node_modules/socket.io-client/build/esm/manager.js
  var Manager = class extends Emitter {
    constructor(uri, opts) {
      var _a;
      super();
      this.nsps = {};
      this.subs = [];
      if (uri && "object" === typeof uri) {
        opts = uri;
        uri = void 0;
      }
      opts = opts || {};
      opts.path = opts.path || "/socket.io";
      this.opts = opts;
      installTimerFunctions(this, opts);
      this.reconnection(opts.reconnection !== false);
      this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
      this.reconnectionDelay(opts.reconnectionDelay || 1e3);
      this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
      this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
      this.backoff = new Backoff({
        min: this.reconnectionDelay(),
        max: this.reconnectionDelayMax(),
        jitter: this.randomizationFactor()
      });
      this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
      this._readyState = "closed";
      this.uri = uri;
      const _parser = opts.parser || esm_exports;
      this.encoder = new _parser.Encoder();
      this.decoder = new _parser.Decoder();
      this._autoConnect = opts.autoConnect !== false;
      if (this._autoConnect)
        this.open();
    }
    reconnection(v) {
      if (!arguments.length)
        return this._reconnection;
      this._reconnection = !!v;
      return this;
    }
    reconnectionAttempts(v) {
      if (v === void 0)
        return this._reconnectionAttempts;
      this._reconnectionAttempts = v;
      return this;
    }
    reconnectionDelay(v) {
      var _a;
      if (v === void 0)
        return this._reconnectionDelay;
      this._reconnectionDelay = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
      return this;
    }
    randomizationFactor(v) {
      var _a;
      if (v === void 0)
        return this._randomizationFactor;
      this._randomizationFactor = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
      return this;
    }
    reconnectionDelayMax(v) {
      var _a;
      if (v === void 0)
        return this._reconnectionDelayMax;
      this._reconnectionDelayMax = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
      return this;
    }
    timeout(v) {
      if (!arguments.length)
        return this._timeout;
      this._timeout = v;
      return this;
    }
    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @private
     */
    maybeReconnectOnOpen() {
      if (!this._reconnecting && this._reconnection && this.backoff.attempts === 0) {
        this.reconnect();
      }
    }
    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} fn - optional, callback
     * @return self
     * @public
     */
    open(fn) {
      if (~this._readyState.indexOf("open"))
        return this;
      this.engine = new Socket(this.uri, this.opts);
      const socket = this.engine;
      const self2 = this;
      this._readyState = "opening";
      this.skipReconnect = false;
      const openSubDestroy = on(socket, "open", function() {
        self2.onopen();
        fn && fn();
      });
      const onError = (err) => {
        this.cleanup();
        this._readyState = "closed";
        this.emitReserved("error", err);
        if (fn) {
          fn(err);
        } else {
          this.maybeReconnectOnOpen();
        }
      };
      const errorSub = on(socket, "error", onError);
      if (false !== this._timeout) {
        const timeout = this._timeout;
        const timer = this.setTimeoutFn(() => {
          openSubDestroy();
          onError(new Error("timeout"));
          socket.close();
        }, timeout);
        if (this.opts.autoUnref) {
          timer.unref();
        }
        this.subs.push(() => {
          this.clearTimeoutFn(timer);
        });
      }
      this.subs.push(openSubDestroy);
      this.subs.push(errorSub);
      return this;
    }
    /**
     * Alias for open()
     *
     * @return self
     * @public
     */
    connect(fn) {
      return this.open(fn);
    }
    /**
     * Called upon transport open.
     *
     * @private
     */
    onopen() {
      this.cleanup();
      this._readyState = "open";
      this.emitReserved("open");
      const socket = this.engine;
      this.subs.push(on(socket, "ping", this.onping.bind(this)), on(socket, "data", this.ondata.bind(this)), on(socket, "error", this.onerror.bind(this)), on(socket, "close", this.onclose.bind(this)), on(this.decoder, "decoded", this.ondecoded.bind(this)));
    }
    /**
     * Called upon a ping.
     *
     * @private
     */
    onping() {
      this.emitReserved("ping");
    }
    /**
     * Called with data.
     *
     * @private
     */
    ondata(data) {
      try {
        this.decoder.add(data);
      } catch (e) {
        this.onclose("parse error", e);
      }
    }
    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    ondecoded(packet) {
      nextTick(() => {
        this.emitReserved("packet", packet);
      }, this.setTimeoutFn);
    }
    /**
     * Called upon socket error.
     *
     * @private
     */
    onerror(err) {
      this.emitReserved("error", err);
    }
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @public
     */
    socket(nsp, opts) {
      let socket = this.nsps[nsp];
      if (!socket) {
        socket = new Socket2(this, nsp, opts);
        this.nsps[nsp] = socket;
      } else if (this._autoConnect && !socket.active) {
        socket.connect();
      }
      return socket;
    }
    /**
     * Called upon a socket close.
     *
     * @param socket
     * @private
     */
    _destroy(socket) {
      const nsps = Object.keys(this.nsps);
      for (const nsp of nsps) {
        const socket2 = this.nsps[nsp];
        if (socket2.active) {
          return;
        }
      }
      this._close();
    }
    /**
     * Writes a packet.
     *
     * @param packet
     * @private
     */
    _packet(packet) {
      const encodedPackets = this.encoder.encode(packet);
      for (let i2 = 0; i2 < encodedPackets.length; i2++) {
        this.engine.write(encodedPackets[i2], packet.options);
      }
    }
    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @private
     */
    cleanup() {
      this.subs.forEach((subDestroy) => subDestroy());
      this.subs.length = 0;
      this.decoder.destroy();
    }
    /**
     * Close the current socket.
     *
     * @private
     */
    _close() {
      this.skipReconnect = true;
      this._reconnecting = false;
      this.onclose("forced close");
      if (this.engine)
        this.engine.close();
    }
    /**
     * Alias for close()
     *
     * @private
     */
    disconnect() {
      return this._close();
    }
    /**
     * Called upon engine close.
     *
     * @private
     */
    onclose(reason, description) {
      this.cleanup();
      this.backoff.reset();
      this._readyState = "closed";
      this.emitReserved("close", reason, description);
      if (this._reconnection && !this.skipReconnect) {
        this.reconnect();
      }
    }
    /**
     * Attempt a reconnection.
     *
     * @private
     */
    reconnect() {
      if (this._reconnecting || this.skipReconnect)
        return this;
      const self2 = this;
      if (this.backoff.attempts >= this._reconnectionAttempts) {
        this.backoff.reset();
        this.emitReserved("reconnect_failed");
        this._reconnecting = false;
      } else {
        const delay = this.backoff.duration();
        this._reconnecting = true;
        const timer = this.setTimeoutFn(() => {
          if (self2.skipReconnect)
            return;
          this.emitReserved("reconnect_attempt", self2.backoff.attempts);
          if (self2.skipReconnect)
            return;
          self2.open((err) => {
            if (err) {
              self2._reconnecting = false;
              self2.reconnect();
              this.emitReserved("reconnect_error", err);
            } else {
              self2.onreconnect();
            }
          });
        }, delay);
        if (this.opts.autoUnref) {
          timer.unref();
        }
        this.subs.push(() => {
          this.clearTimeoutFn(timer);
        });
      }
    }
    /**
     * Called upon successful reconnect.
     *
     * @private
     */
    onreconnect() {
      const attempt = this.backoff.attempts;
      this._reconnecting = false;
      this.backoff.reset();
      this.emitReserved("reconnect", attempt);
    }
  };

  // node_modules/socket.io-client/build/esm/index.js
  var cache = {};
  function lookup2(uri, opts) {
    if (typeof uri === "object") {
      opts = uri;
      uri = void 0;
    }
    opts = opts || {};
    const parsed = url(uri, opts.path || "/socket.io");
    const source = parsed.source;
    const id = parsed.id;
    const path = parsed.path;
    const sameNamespace = cache[id] && path in cache[id]["nsps"];
    const newConnection = opts.forceNew || opts["force new connection"] || false === opts.multiplex || sameNamespace;
    let io;
    if (newConnection) {
      io = new Manager(source, opts);
    } else {
      if (!cache[id]) {
        cache[id] = new Manager(source, opts);
      }
      io = cache[id];
    }
    if (parsed.query && !opts.query) {
      opts.query = parsed.queryKey;
    }
    return io.socket(parsed.path, opts);
  }
  Object.assign(lookup2, {
    Manager,
    Socket: Socket2,
    io: lookup2,
    connect: lookup2
  });

  // src/client/audio/AudioEngine.ts
  var IDLE_HZ = 72;
  var MAX_ENGINE_HZ = 420;
  var LOOKAHEAD_S = 0.12;
  var SCHEDULE_INTERVAL_MS = 25;
  var NOTE_DURATION_S = 0.14;
  var MELODY_STEP_S = 0.18;
  var MELODY_HZ = [
    261.63,
    329.63,
    392,
    523.25,
    392,
    329.63,
    261.63,
    196,
    220,
    261.63,
    329.63,
    392,
    349.23,
    329.63,
    293.66,
    261.63
  ];
  function resolveAudioContextCtor() {
    if (typeof window === "undefined") {
      return null;
    }
    const w = window;
    return w.AudioContext ?? w.webkitAudioContext ?? null;
  }
  function finite(value2, fallback) {
    return Number.isFinite(value2) ? value2 : fallback;
  }
  function clamp01(value2) {
    if (value2 < 0) return 0;
    if (value2 > 1) return 1;
    return value2;
  }
  var AudioEngine = class {
    constructor() {
      this.context = null;
      this.masterGain = null;
      this.engineOsc = null;
      this.engineGain = null;
      this.noiseSource = null;
      this.noiseGain = null;
      this.melodyGain = null;
      this.running = false;
      this.muted = false;
      this.melodyEnabled = true;
      this.nextNoteTime = 0;
      this.melodyIndex = 0;
      this.schedulerHandle = null;
      this.engineHz = IDLE_HZ;
    }
    isRunning() {
      return this.running;
    }
    isMuted() {
      return this.muted;
    }
    async start() {
      try {
        if (this.running) {
          await this.resume();
          return;
        }
        const Ctor = resolveAudioContextCtor();
        if (!Ctor) {
          return;
        }
        this.context = new Ctor();
        this.buildGraph();
        this.running = true;
        this.nextNoteTime = this.context.currentTime + 0.05;
        this.armScheduler();
        await this.resume();
      } catch {
        this.safeShutdown();
      }
    }
    stop() {
      try {
        this.disarmScheduler();
        this.safeShutdown();
      } catch {
        this.running = false;
      }
    }
    setMuted(muted) {
      this.muted = muted;
      this.applyMasterGain();
    }
    setMelodyEnabled(enabled) {
      this.melodyEnabled = enabled;
      try {
        const now = this.context?.currentTime ?? 0;
        this.melodyGain?.gain.setTargetAtTime(enabled && !this.muted ? 0.08 : 0, now, 0.05);
      } catch {
      }
    }
    /**
     * Drive live parameters from interpolated vehicle telemetry.
     * Safe to call every animation frame.
     */
    update(telemetry) {
      if (!this.running || !this.context) {
        return;
      }
      try {
        const speed = Math.max(0, finite(telemetry.speedMs, 0));
        const maxSpeed = Math.max(1, finite(telemetry.maxSpeedMs, 30));
        const ratio = clamp01(speed / maxSpeed);
        const throttle = clamp01(finite(telemetry.throttle, 0));
        const targetHz = IDLE_HZ + (MAX_ENGINE_HZ - IDLE_HZ) * (0.35 * throttle + 0.65 * ratio);
        this.engineHz += (targetHz - this.engineHz) * 0.18;
        const now = this.context.currentTime;
        this.engineOsc?.frequency.setTargetAtTime(this.engineHz, now, 0.04);
        const engineLevel = 0.04 + 0.1 * ratio + 0.04 * throttle;
        this.engineGain?.gain.setTargetAtTime(this.muted ? 0 : engineLevel, now, 0.05);
        const screech = telemetry.isDrifting ? 0.16 + 0.1 * ratio : 0;
        this.noiseGain?.gain.setTargetAtTime(this.muted ? 0 : screech, now, 0.03);
      } catch {
      }
    }
    async resume() {
      if (!this.context) {
        return;
      }
      try {
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
      } catch {
      }
    }
    buildGraph() {
      const ctx = this.context;
      if (!ctx) {
        return;
      }
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.55;
      this.masterGain.connect(ctx.destination);
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineGain.connect(this.masterGain);
      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = "sawtooth";
      this.engineOsc.frequency.value = IDLE_HZ;
      this.engineOsc.connect(this.engineGain);
      this.engineOsc.start();
      this.noiseGain = ctx.createGain();
      this.noiseGain.gain.value = 0;
      this.noiseGain.connect(this.masterGain);
      const noiseBuffer = this.createWhiteNoiseBuffer(ctx);
      this.noiseSource = ctx.createBufferSource();
      this.noiseSource.buffer = noiseBuffer;
      this.noiseSource.loop = true;
      this.noiseSource.connect(this.noiseGain);
      this.noiseSource.start();
      this.melodyGain = ctx.createGain();
      this.melodyGain.gain.value = this.melodyEnabled ? 0.08 : 0;
      this.melodyGain.connect(this.masterGain);
    }
    createWhiteNoiseBuffer(ctx) {
      const length2 = Math.max(1, Math.floor(ctx.sampleRate * 0.5));
      const buffer = ctx.createBuffer(1, length2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i2 = 0; i2 < length2; i2++) {
        data[i2] = Math.random() * 2 - 1;
      }
      return buffer;
    }
    armScheduler() {
      this.disarmScheduler();
      const tick = () => {
        this.scheduleAhead();
        this.schedulerHandle = window.setTimeout(tick, SCHEDULE_INTERVAL_MS);
      };
      this.schedulerHandle = window.setTimeout(tick, SCHEDULE_INTERVAL_MS);
    }
    disarmScheduler() {
      if (this.schedulerHandle !== null) {
        window.clearTimeout(this.schedulerHandle);
        this.schedulerHandle = null;
      }
    }
    scheduleAhead() {
      const ctx = this.context;
      const melodyGain = this.melodyGain;
      if (!ctx || !melodyGain || !this.running) {
        return;
      }
      if (!this.melodyEnabled) {
        this.nextNoteTime = Math.max(this.nextNoteTime, ctx.currentTime);
        return;
      }
      try {
        const horizon = ctx.currentTime + LOOKAHEAD_S;
        while (this.nextNoteTime < horizon) {
          this.spawnNote(this.nextNoteTime, MELODY_HZ[this.melodyIndex % MELODY_HZ.length] ?? 261.63);
          this.nextNoteTime += MELODY_STEP_S;
          this.melodyIndex += 1;
        }
      } catch {
      }
    }
    spawnNote(when, frequency) {
      const ctx = this.context;
      const melodyGain = this.melodyGain;
      if (!ctx || !melodyGain) {
        return;
      }
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = frequency;
      amp.gain.setValueAtTime(1e-4, when);
      amp.gain.exponentialRampToValueAtTime(0.22, when + 0.012);
      amp.gain.exponentialRampToValueAtTime(1e-4, when + NOTE_DURATION_S);
      osc.connect(amp);
      amp.connect(melodyGain);
      osc.start(when);
      osc.stop(when + NOTE_DURATION_S + 0.02);
      osc.onended = () => {
        try {
          osc.disconnect();
          amp.disconnect();
        } catch {
        }
      };
    }
    applyMasterGain() {
      try {
        const now = this.context?.currentTime ?? 0;
        this.masterGain?.gain.setTargetAtTime(this.muted ? 0 : 0.55, now, 0.04);
      } catch {
      }
    }
    safeShutdown() {
      this.running = false;
      try {
        this.engineOsc?.stop();
      } catch {
      }
      try {
        this.noiseSource?.stop();
      } catch {
      }
      try {
        this.engineOsc?.disconnect();
        this.engineGain?.disconnect();
        this.noiseSource?.disconnect();
        this.noiseGain?.disconnect();
        this.melodyGain?.disconnect();
        this.masterGain?.disconnect();
      } catch {
      }
      const ctx = this.context;
      this.engineOsc = null;
      this.engineGain = null;
      this.noiseSource = null;
      this.noiseGain = null;
      this.melodyGain = null;
      this.masterGain = null;
      this.context = null;
      this.melodyIndex = 0;
      if (ctx) {
        void ctx.close().catch(() => void 0);
      }
    }
  };

  // src/shared/constants.ts
  var PHYSICS_TICK_HZ = 60;
  var PHYSICS_DT = 1 / PHYSICS_TICK_HZ;
  var NETWORK_SNAP_HZ = 20;
  var TICKS_PER_SNAPSHOT = PHYSICS_TICK_HZ / NETWORK_SNAP_HZ;
  var SERVER_PORT = 3e3;
  var MAX_PLAYERS = 8;
  var MAX_SPEED_MS = 30;
  var VEHICLE_RADIUS = 0.5;
  var ENGINE_OVERHEAT_THRESHOLD = 120;
  if (PHYSICS_TICK_HZ % NETWORK_SNAP_HZ !== 0) {
    throw new Error(
      `PHYSICS_TICK_HZ (${PHYSICS_TICK_HZ}) must be evenly divisible by NETWORK_SNAP_HZ (${NETWORK_SNAP_HZ}).`
    );
  }
  var _tunnelLimit = VEHICLE_RADIUS / PHYSICS_DT;
  if (MAX_SPEED_MS > _tunnelLimit) {
    throw new Error(
      `MAX_SPEED_MS (${MAX_SPEED_MS} m/s) exceeds tunnelling safety limit (VEHICLE_RADIUS / PHYSICS_DT = ${_tunnelLimit.toFixed(2)} m/s). Reduce MAX_SPEED_MS or increase VEHICLE_RADIUS.`
    );
  }

  // src/math/MathUtils.ts
  var TWO_PI = Math.PI * 2;
  var HALF_PI = Math.PI / 2;
  var DEG_TO_RAD = Math.PI / 180;
  var RAD_TO_DEG = 180 / Math.PI;
  function radToDeg(radians) {
    return radians * RAD_TO_DEG;
  }
  function clamp(value2, min, max) {
    if (value2 < min) return min;
    if (value2 > max) return max;
    return value2;
  }
  function clamp012(value2) {
    if (value2 < 0) return 0;
    if (value2 > 1) return 1;
    return value2;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function normalizeAngle(angleRad) {
    let a = angleRad % TWO_PI;
    if (a > Math.PI) a -= TWO_PI;
    if (a < -Math.PI) a += TWO_PI;
    return a;
  }
  function angleDelta(from, to) {
    return normalizeAngle(to - from);
  }
  function lerpAngle(from, to, t) {
    return from + angleDelta(from, to) * t;
  }
  function deadZone(value2, threshold) {
    return Math.abs(value2) < threshold ? 0 : value2;
  }

  // src/client/render/CanvasRenderer.ts
  var TARGET_FRAME_MS = 1e3 / 60;
  var PIXELS_PER_METRE = 18;
  var TACH_MIN_ANGLE = -140 * Math.PI / 180;
  var TACH_MAX_ANGLE = 140 * Math.PI / 180;
  var TIRE_IDLE_C = 72;
  var TIRE_MAX_C = 130;
  var drawRearWing = (ctx, palette) => {
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-22, -12, 4, 24);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(-21, -13, 3, 26);
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-18, -10, 4, 20);
  };
  var drawRearSlicks = (ctx) => {
    ctx.fillStyle = "#101116";
    for (const y of [-12, 7]) {
      ctx.fillRect(-15, y, 9, 5);
      ctx.strokeStyle = "#454951";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-15, y, 9, 5);
    }
  };
  var drawSweptChassis = (ctx, palette) => {
    ctx.beginPath();
    ctx.moveTo(23, 0);
    ctx.lineTo(17, -4);
    ctx.bezierCurveTo(11, -7, 8, -8, 1, -8);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-19, -4);
    ctx.lineTo(-19, 4);
    ctx.lineTo(-12, 7);
    ctx.lineTo(1, 8);
    ctx.bezierCurveTo(8, 8, 11, 7, 17, 4);
    ctx.closePath();
    ctx.fillStyle = palette.body;
    ctx.fill();
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  };
  var drawFerrariLivery = (ctx, palette) => {
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.lineTo(12, -2);
    ctx.lineTo(-16, -2.5);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-16, 2.5);
    ctx.lineTo(12, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4f0e8";
    ctx.fillRect(-7, -1, 5, 2);
  };
  var drawWilliamsLivery = (ctx, palette) => {
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(9, -2.2);
    ctx.lineTo(-15, -3.5);
    ctx.lineTo(-18, -1.7);
    ctx.lineTo(-18, 1.7);
    ctx.lineTo(-15, 3.5);
    ctx.lineTo(9, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.secondary;
    ctx.fillRect(-9, -6, 13, 2);
    ctx.fillRect(-9, 4, 13, 2);
  };
  var drawMcLarenLivery = (ctx, palette) => {
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(13, -2);
    ctx.lineTo(-16, -3);
    ctx.lineTo(-19, 0);
    ctx.lineTo(-16, 3);
    ctx.lineTo(13, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.secondary;
    ctx.fillRect(-13, -1, 8, 2);
  };
  var drawCockpit = (ctx, palette) => {
    ctx.fillStyle = palette.cockpit;
    ctx.beginPath();
    ctx.ellipse(1, 0, 6.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  var drawCockpitHalo = (ctx, palette) => {
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.ellipse(1, 0, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, -4.3);
    ctx.lineTo(1, 4.3);
    ctx.stroke();
  };
  var drawFrontWing = (ctx, palette) => {
    ctx.fillStyle = palette.dark;
    ctx.fillRect(16, -13, 3, 26);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(19, -15, 2, 30);
    ctx.fillStyle = palette.secondary;
    ctx.fillRect(21, -12, 2, 24);
    ctx.fillStyle = palette.dark;
    ctx.fillRect(16, -15, 7, 2);
    ctx.fillRect(16, 13, 7, 2);
  };
  var TEAM_SPRITE_PASSES = {
    "Ferrari F2002": {
      palette: {
        body: "#d71920",
        accent: "#f2c230",
        secondary: "#f4f0e8",
        dark: "#42090e",
        cockpit: "#171c26"
      },
      passes: [
        drawRearWing,
        drawRearSlicks,
        drawSweptChassis,
        drawFerrariLivery,
        drawCockpit,
        drawCockpitHalo,
        drawFrontWing
      ]
    },
    "Williams FW24": {
      palette: {
        body: "#1763b3",
        accent: "#f4f6fb",
        secondary: "#17376f",
        dark: "#081c3a",
        cockpit: "#151c28"
      },
      passes: [
        drawRearWing,
        drawRearSlicks,
        drawSweptChassis,
        drawWilliamsLivery,
        drawCockpit,
        drawCockpitHalo,
        drawFrontWing
      ]
    },
    "McLaren MP4-17": {
      palette: {
        body: "#aeb4bc",
        accent: "#e8edf2",
        secondary: "#f07a24",
        dark: "#343941",
        cockpit: "#151b25"
      },
      passes: [
        drawRearWing,
        drawRearSlicks,
        drawSweptChassis,
        drawMcLarenLivery,
        drawCockpit,
        drawCockpitHalo,
        drawFrontWing
      ]
    }
  };
  var COL = {
    void: "#050814",
    asphalt: "#1a2233",
    hudPanel: "rgba(4, 10, 28, 0.82)",
    hudStroke: "#8a9bb8",
    gold: "#f0c400",
    cyan: "#6ee0ff",
    red: "#e02424",
    white: "#f4f6fb",
    dim: "#8b97ad"
  };
  var CanvasRenderer = class {
    constructor(canvas) {
      this.rafId = null;
      this.running = false;
      this.lastDrawMs = 0;
      this.displayedRotation = /* @__PURE__ */ new Map();
      this.tachAngle = TACH_MIN_ANGLE;
      this.flashPhase = 0;
      this.onFrame = null;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        throw new Error("Canvas 2D context is unavailable.");
      }
      this.canvas = canvas;
      this.ctx = ctx;
      this.view = {
        snapshot: null,
        localPlayerId: null,
        raceStartedAtMs: 0,
        gameMode: "quick_race",
        nowMs: 0
      };
    }
    setFrameHook(hook) {
      this.onFrame = hook;
    }
    setView(view) {
      this.view = view;
    }
    start() {
      if (this.running) {
        return;
      }
      this.running = true;
      this.lastDrawMs = 0;
      const loop = (now) => {
        if (!this.running) {
          return;
        }
        this.rafId = window.requestAnimationFrame(loop);
        try {
          if (this.lastDrawMs === 0) {
            this.lastDrawMs = now;
          }
          const elapsed = now - this.lastDrawMs;
          if (elapsed < TARGET_FRAME_MS - 1) {
            return;
          }
          const dtSec = Math.min(0.05, elapsed / 1e3);
          this.lastDrawMs = now;
          this.resizeToDisplay();
          this.onFrame?.(now, dtSec);
          this.draw(now, dtSec);
        } catch {
        }
      };
      this.rafId = window.requestAnimationFrame(loop);
    }
    stop() {
      this.running = false;
      if (this.rafId !== null) {
        window.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
    worldToScreen(world, camera, width, height) {
      return {
        x: (world.x - camera.x) * PIXELS_PER_METRE + width * 0.5,
        y: -(world.y - camera.y) * PIXELS_PER_METRE + height * 0.5
      };
    }
    /**
     * Polar shortest-path blend, then map onto the tachometer sweep.
     * Exposed for tests and HUD needle updates.
     */
    interpolatePolar(fromRad, toRad, t) {
      return lerpAngle(fromRad, toRad, clamp012(t));
    }
    deriveTireTemperatures(vehicle) {
      const speed = Math.hypot(vehicle.velocity.x, vehicle.velocity.y);
      const speedRatio = clamp012(speed / MAX_SPEED_MS);
      const driftBoost = vehicle.isDrifting ? 28 : 0;
      const engineBias = clamp((vehicle.engineTemperature - 20) * 0.18, 0, 22);
      const base = TIRE_IDLE_C + speedRatio * 22 + engineBias;
      return {
        fl: clamp(base + driftBoost * 0.85, TIRE_IDLE_C, TIRE_MAX_C),
        fr: clamp(base + driftBoost, TIRE_IDLE_C, TIRE_MAX_C),
        rl: clamp(base + driftBoost * 1.15, TIRE_IDLE_C, TIRE_MAX_C),
        rr: clamp(base + driftBoost * 1.25, TIRE_IDLE_C, TIRE_MAX_C)
      };
    }
    resizeToDisplay() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(1, this.canvas.clientWidth);
      const height = Math.max(1, this.canvas.clientHeight);
      const pixelW = Math.floor(width * dpr);
      const pixelH = Math.floor(height * dpr);
      if (this.canvas.width !== pixelW || this.canvas.height !== pixelH) {
        this.canvas.width = pixelW;
        this.canvas.height = pixelH;
      }
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    draw(now, dtSec) {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      const ctx = this.ctx;
      ctx.fillStyle = COL.void;
      ctx.fillRect(0, 0, width, height);
      const snapshot = this.view.snapshot;
      const local = this.findLocal(snapshot);
      const camera = local ? local.position : { x: 0, y: 0 };
      this.drawTrackGrid(width, height, camera);
      if (snapshot) {
        for (const vehicle of snapshot.vehicles) {
          this.drawKart(vehicle, camera, width, height, dtSec);
        }
      }
      this.drawHud(now, dtSec, local, snapshot, width, height);
    }
    findLocal(snapshot) {
      if (!snapshot) {
        return null;
      }
      const id = this.view.localPlayerId;
      if (id) {
        const match = snapshot.vehicles.find((v) => v.id === id);
        if (match) {
          return match;
        }
      }
      return snapshot.vehicles[0] ?? null;
    }
    drawTrackGrid(width, height, camera) {
      const ctx = this.ctx;
      ctx.fillStyle = COL.asphalt;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(80, 96, 128, 0.35)";
      ctx.lineWidth = 1;
      const spacing = PIXELS_PER_METRE * 4;
      const offsetX = -(camera.x * PIXELS_PER_METRE % spacing);
      const offsetY = camera.y * PIXELS_PER_METRE % spacing;
      ctx.beginPath();
      for (let x = offsetX; x < width + spacing; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height + spacing; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }
    drawKart(vehicle, camera, width, height, dtSec) {
      const ctx = this.ctx;
      const screen = this.worldToScreen(vehicle.position, camera, width, height);
      const prev2 = this.displayedRotation.get(vehicle.id) ?? vehicle.rotation;
      const next = this.interpolatePolar(prev2, vehicle.rotation, clamp012(dtSec * 18));
      this.displayedRotation.set(vehicle.id, next);
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(-next);
      const sprite = TEAM_SPRITE_PASSES[vehicle.carModel];
      for (const pass of sprite.passes) {
        pass(ctx, sprite.palette);
      }
      if (vehicle.isDrifting) {
        ctx.strokeStyle = COL.red;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-15, -16, 38, 32);
      }
      ctx.restore();
    }
    drawHud(now, dtSec, local, snapshot, width, height) {
      this.flashPhase += dtSec * 6;
      this.drawTachometer(local, width, height, dtSec);
      this.drawRaceTimers(local, snapshot, now, width);
      this.drawTireTracks(local, height);
      this.drawOverheat(local, width, height);
      this.drawModeChip(width);
    }
    drawTachometer(local, width, height, dtSec) {
      const ctx = this.ctx;
      const cx = width * 0.5;
      const cy = height - 78;
      const radius = 62;
      const speed = local ? Math.hypot(local.velocity.x, local.velocity.y) : 0;
      const ratio = clamp012(speed / MAX_SPEED_MS);
      const target = lerp(TACH_MIN_ANGLE, TACH_MAX_ANGLE, ratio);
      this.tachAngle = this.interpolatePolar(this.tachAngle, target, clamp012(dtSec * 10));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = COL.hudPanel;
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = COL.hudStroke;
      ctx.lineWidth = 2;
      for (let i2 = 0; i2 <= 8; i2++) {
        const t = i2 / 8;
        const a = lerp(TACH_MIN_ANGLE, TACH_MAX_ANGLE, t) - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (radius - 4), Math.sin(a) * (radius - 4));
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        ctx.stroke();
      }
      ctx.save();
      ctx.rotate(this.tachAngle);
      ctx.strokeStyle = COL.red;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, -radius + 6);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COL.white;
      ctx.font = "bold 13px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(speed * 3.6)} KM/H`, 0, 28);
      ctx.fillStyle = COL.dim;
      ctx.font = "10px 'Courier New', monospace";
      ctx.fillText(`TACH ${radToDeg(this.tachAngle).toFixed(0)}\xB0`, 0, 42);
      ctx.restore();
    }
    drawRaceTimers(local, snapshot, now, width) {
      const ctx = this.ctx;
      const elapsed = this.view.raceStartedAtMs > 0 ? Math.max(0, now - this.view.raceStartedAtMs) : 0;
      const rank = this.localRank(local, snapshot);
      const laps = local?.completedLaps ?? 0;
      const progress = local?.checkpointProgress ?? 0;
      this.panel(12, 12, 220, 92);
      ctx.fillStyle = COL.gold;
      ctx.font = "bold 12px 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillText("F1 2002  TELEMETRY", 24, 32);
      ctx.fillStyle = COL.white;
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillText(`P${rank}   LAP ${laps}`, 24, 58);
      ctx.fillStyle = COL.cyan;
      ctx.font = "14px 'Courier New', monospace";
      ctx.fillText(`T ${formatRaceTime(elapsed)}`, 24, 80);
      ctx.fillStyle = COL.dim;
      ctx.font = "11px 'Courier New', monospace";
      ctx.textAlign = "right";
      ctx.fillText(`SEC ${(progress * 100).toFixed(0)}%`, 220, 80);
      ctx.textAlign = "right";
      this.panel(width - 188, 12, 176, 56);
      ctx.fillStyle = COL.gold;
      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.fillText("ENGINE \xB0C", width - 24, 32);
      const temp = local?.engineTemperature ?? 20;
      ctx.fillStyle = temp >= ENGINE_OVERHEAT_THRESHOLD ? COL.red : COL.white;
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillText(temp.toFixed(0), width - 24, 54);
    }
    drawTireTracks(local, height) {
      const temps = local ? this.deriveTireTemperatures(local) : { fl: TIRE_IDLE_C, fr: TIRE_IDLE_C, rl: TIRE_IDLE_C, rr: TIRE_IDLE_C };
      const x = 16;
      const y = height - 148;
      this.panel(x, y, 132, 128);
      const ctx = this.ctx;
      ctx.fillStyle = COL.gold;
      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillText("TIRE TEMP", x + 12, y + 20);
      this.tireBar(x + 18, y + 36, "FL", temps.fl);
      this.tireBar(x + 72, y + 36, "FR", temps.fr);
      this.tireBar(x + 18, y + 80, "RL", temps.rl);
      this.tireBar(x + 72, y + 80, "RR", temps.rr);
    }
    tireBar(x, y, label, tempC) {
      const ctx = this.ctx;
      const ratio = clamp012((tempC - TIRE_IDLE_C) / (TIRE_MAX_C - TIRE_IDLE_C));
      ctx.fillStyle = COL.dim;
      ctx.font = "10px 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillText(label, x, y);
      ctx.fillStyle = "#12182a";
      ctx.fillRect(x, y + 4, 40, 28);
      ctx.fillStyle = ratio > 0.8 ? COL.red : ratio > 0.45 ? COL.gold : COL.cyan;
      ctx.fillRect(x, y + 32 - 28 * ratio, 40, 28 * ratio);
      ctx.strokeStyle = COL.hudStroke;
      ctx.strokeRect(x, y + 4, 40, 28);
      ctx.fillStyle = COL.white;
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillText(`${tempC.toFixed(0)}`, x + 6, y + 22);
    }
    drawOverheat(local, width, height) {
      if (!local || local.engineTemperature < ENGINE_OVERHEAT_THRESHOLD) {
        return;
      }
      const ctx = this.ctx;
      const pulse = 0.45 + 0.45 * Math.abs(Math.sin(this.flashPhase));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "rgba(160, 8, 8, 0.55)";
      ctx.fillRect(width * 0.18, height * 0.38, width * 0.64, 64);
      ctx.strokeStyle = COL.red;
      ctx.lineWidth = 3;
      ctx.strokeRect(width * 0.18, height * 0.38, width * 0.64, 64);
      ctx.fillStyle = COL.white;
      ctx.font = "bold 22px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("OVERHEAT PENALTY", width * 0.5, height * 0.38 + 42);
      ctx.restore();
    }
    drawModeChip(width) {
      const label = this.view.gameMode === "time_trial" ? "TIME TRIAL" : "QUICK RACE";
      this.panel(width * 0.5 - 70, 12, 140, 28);
      const ctx = this.ctx;
      ctx.fillStyle = COL.cyan;
      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, width * 0.5, 32);
    }
    panel(x, y, w, h) {
      const ctx = this.ctx;
      ctx.fillStyle = COL.hudPanel;
      ctx.strokeStyle = COL.hudStroke;
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
    localRank(local, snapshot) {
      if (!local || !snapshot) {
        return 1;
      }
      const standing = snapshot.standings.find((s) => s.playerId === local.id);
      return standing?.rank ?? 1;
    }
  };
  function formatRaceTime(ms) {
    const total = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(total / 6e4);
    const seconds = Math.floor(total % 6e4 / 1e3);
    const hundredths = Math.floor(total % 1e3 / 10);
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    const hh = String(hundredths).padStart(2, "0");
    return `${mm}:${ss}.${hh}`;
  }

  // src/client/render/Interpolation.ts
  var INTERPOLATION_DELAY_MS = 100;
  var InterpolationBuffer = class {
    constructor() {
      this.snapshots = [];
    }
    addSnapshot(snapshot) {
      this.snapshots.push(snapshot);
      if (this.snapshots.length > 30) {
        this.snapshots.shift();
      }
    }
    getInterpolatedState(clientTimeMs) {
      if (this.snapshots.length === 0) {
        return null;
      }
      const renderTime = clientTimeMs - INTERPOLATION_DELAY_MS;
      let s0 = null;
      let s1 = null;
      for (let i2 = this.snapshots.length - 1; i2 >= 0; i2--) {
        const snap = this.snapshots[i2];
        if (snap.timestamp <= renderTime) {
          s0 = snap;
          s1 = this.snapshots[i2 + 1] ?? snap;
          break;
        }
      }
      if (!s0) {
        s0 = this.snapshots[0];
        s1 = s0;
      }
      if (!s1 || s0 === s1) {
        return s0;
      }
      const t0 = s0.timestamp;
      const t1 = s1.timestamp;
      const dt = t1 - t0;
      let t = dt > 0 ? (renderTime - t0) / dt : 0;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      const interpolatedVehicles = [];
      const v0Map = /* @__PURE__ */ new Map();
      for (const v of s0.vehicles) v0Map.set(v.id, v);
      for (const v1 of s1.vehicles) {
        const v0 = v0Map.get(v1.id);
        if (!v0) {
          interpolatedVehicles.push({ ...v1 });
          continue;
        }
        interpolatedVehicles.push({
          ...v0,
          // Base other properties on s0
          carModel: v1.carModel,
          position: {
            x: lerp(v0.position.x, v1.position.x, t),
            y: lerp(v0.position.y, v1.position.y, t)
          },
          rotation: lerpAngle(v0.rotation, v1.rotation, t),
          velocity: {
            x: lerp(v0.velocity.x, v1.velocity.x, t),
            y: lerp(v0.velocity.y, v1.velocity.y, t)
          }
        });
      }
      return {
        tick: s0.tick,
        timestamp: renderTime,
        phase: s0.phase,
        vehicles: interpolatedVehicles,
        standings: s0.standings,
        weather: s0.weather,
        countdown: s0.countdown
      };
    }
  };

  // src/shared/events.ts
  var ClientEvents = {
    // Room management
    /** Create a new room. */
    ROOM_CREATE: "room:create",
    /** Join an existing room by PIN. */
    ROOM_JOIN: "room:join",
    /** Leave the current room voluntarily. */
    ROOM_LEAVE: "room:leave",
    // Lobby
    /** Toggle ready state in the lobby. */
    PLAYER_READY: "player:ready",
    // Race
    /** Continuous input stream during a race. */
    PLAYER_INPUT: "player:input"
  };
  var ServerEvents = {
    // Room lifecycle
    /** Confirms room creation; includes joinCode and full RoomInfo. */
    ROOM_CREATED: "room:created",
    /** Confirms successful join; includes full RoomInfo. */
    ROOM_JOINED: "room:joined",
    /** An error response (join failure, invalid code, etc.). */
    ROOM_ERROR: "room:error",
    /** Broadcast to all room members when a player joins. */
    PLAYER_JOINED: "player:joined",
    /** Broadcast to all room members when a player leaves or disconnects. */
    PLAYER_LEFT: "player:left",
    /** Broadcast when a player toggles ready state. */
    PLAYER_READY_CHANGED: "player:readyChanged",
    /** Room was closed (host disconnected). */
    ROOM_CLOSED: "room:closed",
    // Race lifecycle
    /** Countdown has started; clients show countdown UI. */
    RACE_COUNTDOWN: "race:countdown",
    /** Race has started. */
    RACE_STARTED: "race:started",
    /** Periodic physics snapshot broadcast. */
    RACE_STATE: "race:state",
    /** A vehicle crossed the finish line. */
    RACE_VEHICLE_FINISHED: "race:vehicleFinished",
    /** Race is over; full results included. */
    RACE_ENDED: "race:ended"
  };

  // src/shared/types.ts
  var F1_2002_CAR_MODELS = [
    "Ferrari F2002",
    "Williams FW24",
    "McLaren MP4-17"
  ];
  function isF1TeamCarModel(value2) {
    return typeof value2 === "string" && F1_2002_CAR_MODELS.some((model) => model === value2);
  }

  // src/client/client_main.ts
  var DEFAULT_BINDINGS = {
    throttle: "KeyW",
    brake: "KeyS",
    steerLeft: "KeyA",
    steerRight: "KeyD",
    drift: "Space"
  };
  var ARROW_ALIASES = {
    ArrowUp: "throttle",
    ArrowDown: "brake",
    ArrowLeft: "steerLeft",
    ArrowRight: "steerRight"
  };
  var BIND_LABELS = {
    throttle: "Throttle",
    brake: "Brake",
    steerLeft: "Steer Left",
    steerRight: "Steer Right",
    drift: "Drift"
  };
  function byId(id) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Missing required element #${id}`);
    }
    return el;
  }
  function codeLabel(code) {
    if (code === "Space") return "SPACE";
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Arrow")) return code.slice(5).toUpperCase();
    return code;
  }
  function socketUrl() {
    if (typeof window === "undefined") {
      return `http://127.0.0.1:${SERVER_PORT}`;
    }
    const { protocol: protocol4, hostname, port } = window.location;
    if (hostname && port) {
      return `${protocol4}//${hostname}:${port}`;
    }
    return `http://${hostname || "127.0.0.1"}:${SERVER_PORT}`;
  }
  var ClientMain = class {
    constructor(els, renderer) {
      this.audio = new AudioEngine();
      this.interpolator = new InterpolationBuffer();
      this.keys = /* @__PURE__ */ new Set();
      this.bindings = { ...DEFAULT_BINDINGS };
      this.socket = null;
      this.localPlayerId = null;
      this.roomId = null;
      this.screen = "menu";
      this.gameMode = "quick_race";
      this.selectedCarModel = F1_2002_CAR_MODELS[0];
      this.raceStartedAtMs = 0;
      this.rebindTarget = null;
      this.lastInput = null;
      this.pointerSteer = 0;
      this.pointerThrottle = 0;
      this.pointerBrake = 0;
      this.pointerDrift = false;
      this.destroyed = false;
      this.els = els;
      this.renderer = renderer;
    }
    start() {
      this.bindDom();
      this.bindKeyboard();
      this.bindTouch();
      this.connectSocket();
      this.renderer.setFrameHook((nowMs) => {
        this.onAnimationFrame(nowMs);
      });
      this.renderer.start();
      this.showScreen("menu");
    }
    destroy() {
      this.destroyed = true;
      this.renderer.stop();
      this.audio.stop();
      this.socket?.disconnect();
    }
    connectSocket() {
      try {
        const socket = lookup2(socketUrl(), {
          autoConnect: true,
          reconnection: true,
          timeout: 4e3
        });
        this.socket = socket;
        socket.on("connect", () => {
          this.localPlayerId = socket.id ?? null;
          this.setStatus("LINK ONLINE");
        });
        socket.on("disconnect", () => {
          this.setStatus("LINK DOWN");
        });
        socket.on("connect_error", () => {
          this.setStatus("LINK FAILED \u2014 retrying");
        });
        socket.on(ServerEvents.ROOM_CREATED, (payload) => {
          this.roomId = payload.room.roomId;
          this.localPlayerId = socket.id ?? this.localPlayerId;
          this.els.joinCode.textContent = payload.joinCode;
          this.showScreen("lobby");
          this.setStatus(`ROOM ${payload.joinCode}`);
          this.emitReady();
        });
        socket.on(ServerEvents.ROOM_JOINED, (payload) => {
          this.roomId = payload.room.roomId;
          this.els.joinCode.textContent = payload.room.joinCode;
          this.showScreen("lobby");
          this.setStatus(`JOINED ${payload.room.joinCode}`);
          this.emitReady();
        });
        socket.on(ServerEvents.ROOM_ERROR, (payload) => {
          this.setStatus(payload.message);
        });
        socket.on(ServerEvents.RACE_STARTED, (payload) => {
          this.raceStartedAtMs = payload.startedAt;
          this.showScreen("race");
          this.setStatus(this.gameMode === "time_trial" ? "TIME TRIAL" : "QUICK RACE");
          void this.audio.start();
        });
        socket.on(ServerEvents.RACE_STATE, (snapshot) => {
          this.interpolator.addSnapshot(snapshot);
        });
        socket.on(ServerEvents.ROOM_CLOSED, () => {
          this.roomId = null;
          this.showScreen("menu");
          this.setStatus("ROOM CLOSED");
        });
      } catch {
        this.setStatus("SOCKET INIT FAILED");
      }
    }
    bindDom() {
      document.getElementById("btn-quick-race")?.addEventListener("click", () => {
        this.gameMode = "quick_race";
        void this.audio.start();
        this.createRoom(3);
      });
      document.getElementById("btn-time-trial")?.addEventListener("click", () => {
        this.gameMode = "time_trial";
        void this.audio.start();
        this.createRoom(1);
      });
      document.getElementById("btn-join")?.addEventListener("click", () => {
        this.joinRoom();
      });
      document.getElementById("btn-leave")?.addEventListener("click", () => {
        this.leaveRoom();
      });
      this.els.soundToggle.addEventListener("change", () => {
        this.audio.setMuted(!this.els.soundToggle.checked);
      });
      this.els.melodyToggle.addEventListener("change", () => {
        this.audio.setMelodyEnabled(this.els.melodyToggle.checked);
      });
      if (isF1TeamCarModel(this.els.carModelSelect.value)) {
        this.selectedCarModel = this.els.carModelSelect.value;
      }
      this.els.carModelSelect.addEventListener("change", () => {
        if (!isF1TeamCarModel(this.els.carModelSelect.value)) {
          this.els.carModelSelect.value = this.selectedCarModel;
          return;
        }
        this.selectedCarModel = this.els.carModelSelect.value;
        this.lastInput = null;
        this.setStatus(`${this.selectedCarModel.toUpperCase()} SELECTED`);
      });
      this.paintBindButtons();
      for (const action of Object.keys(BIND_LABELS)) {
        document.getElementById(`bind-${action}`)?.addEventListener("click", () => {
          this.rebindTarget = action;
          this.setStatus(`PRESS KEY FOR ${BIND_LABELS[action].toUpperCase()}`);
        });
      }
    }
    bindKeyboard() {
      window.addEventListener("keydown", (event) => {
        try {
          if (this.rebindTarget) {
            event.preventDefault();
            this.bindings[this.rebindTarget] = event.code;
            this.rebindTarget = null;
            this.paintBindButtons();
            this.setStatus("CONTROLS UPDATED");
            return;
          }
          if (event.code === "Space" || event.code.startsWith("Arrow")) {
            event.preventDefault();
          }
          this.keys.add(event.code);
          void this.audio.start();
        } catch {
        }
      });
      window.addEventListener("keyup", (event) => {
        this.keys.delete(event.code);
      });
      window.addEventListener("blur", () => {
        this.keys.clear();
      });
    }
    bindTouch() {
      const gas = document.getElementById("touch-gas");
      const brake = document.getElementById("touch-brake");
      const drift = document.getElementById("touch-drift");
      this.wireHold(gas, (down) => {
        this.pointerThrottle = down ? 1 : 0;
      });
      this.wireHold(brake, (down) => {
        this.pointerBrake = down ? 1 : 0;
      });
      this.wireHold(drift, (down) => {
        this.pointerDrift = down;
      });
      this.els.steerSlider.addEventListener("input", () => {
        const raw = Number.parseFloat(this.els.steerSlider.value);
        this.pointerSteer = deadZone(clamp(Number.isFinite(raw) ? raw : 0, -1, 1), 0.04);
      });
      this.els.steerSlider.addEventListener("pointerup", () => {
        this.els.steerSlider.value = "0";
        this.pointerSteer = 0;
      });
      this.els.steerSlider.addEventListener("pointercancel", () => {
        this.els.steerSlider.value = "0";
        this.pointerSteer = 0;
      });
    }
    wireHold(el, set) {
      if (!el) {
        return;
      }
      const on2 = (event) => {
        event.preventDefault();
        set(true);
        void this.audio.start();
      };
      const off = (event) => {
        event.preventDefault();
        set(false);
      };
      el.addEventListener("pointerdown", on2);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("pointercancel", off);
    }
    createRoom(totalLaps) {
      const name = this.playerName();
      this.safeEmit(ClientEvents.ROOM_CREATE, {
        playerName: name,
        role: "player",
        settings: {
          trackId: "default",
          totalLaps,
          maxPlayers: this.gameMode === "time_trial" ? 1 : MAX_PLAYERS
        }
      });
    }
    joinRoom() {
      const pin = this.els.pinInput.value.trim();
      this.safeEmit(ClientEvents.ROOM_JOIN, {
        joinCode: pin,
        playerName: this.playerName(),
        role: "player"
      });
    }
    leaveRoom() {
      if (this.roomId) {
        this.safeEmit(ClientEvents.ROOM_LEAVE, { roomId: this.roomId });
      }
      this.roomId = null;
      this.showScreen("menu");
    }
    emitReady() {
      this.safeEmit(ClientEvents.PLAYER_READY, { ready: true });
    }
    playerName() {
      const value2 = this.els.playerName.value.trim();
      return value2.length > 0 ? value2.slice(0, 16) : "DRIVER";
    }
    onAnimationFrame(nowMs) {
      if (this.destroyed) {
        return;
      }
      const snapshot = this.interpolator.getInterpolatedState(Date.now());
      this.renderer.setView({
        snapshot,
        localPlayerId: this.localPlayerId,
        raceStartedAtMs: this.raceStartedAtMs,
        gameMode: this.gameMode,
        nowMs
      });
      const local = snapshot?.vehicles.find((v) => v.id === this.localPlayerId) ?? snapshot?.vehicles[0];
      const speed = local ? Math.hypot(local.velocity.x, local.velocity.y) : 0;
      const input = this.captureInput();
      this.audio.update({
        speedMs: speed,
        maxSpeedMs: MAX_SPEED_MS,
        throttle: input.throttle,
        isDrifting: local?.isDrifting ?? this.held("drift")
      });
      if (this.screen === "race") {
        this.uplinkInput(input);
      }
    }
    captureInput() {
      const steerKey = (this.held("steerRight") ? 1 : 0) + (this.held("steerLeft") ? -1 : 0);
      const steering = clamp(steerKey !== 0 ? steerKey : this.pointerSteer, -1, 1);
      const throttle = this.held("throttle") ? 1 : this.pointerThrottle;
      const brake = this.held("brake") ? 1 : this.pointerBrake;
      return {
        steering,
        throttle,
        brake,
        drift: this.held("drift") || this.pointerDrift,
        carModel: this.selectedCarModel,
        timestamp: Date.now()
      };
    }
    held(action) {
      if (this.keys.has(this.bindings[action])) {
        return true;
      }
      for (const [code, alias] of Object.entries(ARROW_ALIASES)) {
        if (alias === action && this.keys.has(code)) {
          return true;
        }
      }
      return false;
    }
    uplinkInput(input) {
      const prev2 = this.lastInput;
      const changed = !prev2 || prev2.steering !== input.steering || prev2.throttle !== input.throttle || prev2.brake !== input.brake || prev2.drift !== input.drift || prev2.carModel !== input.carModel;
      if (!changed) {
        return;
      }
      this.lastInput = input;
      this.safeEmit(ClientEvents.PLAYER_INPUT, input);
    }
    safeEmit(event, payload) {
      try {
        this.socket?.emit(event, payload);
      } catch {
      }
    }
    showScreen(screen) {
      this.screen = screen;
      this.els.menu.hidden = screen !== "menu";
      this.els.lobby.hidden = screen !== "lobby";
      this.els.touchHud.hidden = screen !== "race";
    }
    paintBindButtons() {
      for (const action of Object.keys(BIND_LABELS)) {
        const btn = document.getElementById(`bind-${action}`);
        if (btn) {
          btn.textContent = `${BIND_LABELS[action]}: ${codeLabel(this.bindings[action])}`;
        }
      }
    }
    setStatus(message) {
      this.els.status.textContent = message;
    }
  };
  function boot() {
    try {
      window.addEventListener("error", (event) => {
        event.preventDefault();
      });
      window.addEventListener("unhandledrejection", (event) => {
        event.preventDefault();
      });
      const canvas = byId("race-canvas");
      const renderer = new CanvasRenderer(canvas);
      const app = new ClientMain(
        {
          canvas,
          menu: byId("main-menu"),
          lobby: byId("lobby-overlay"),
          touchHud: byId("touch-hud"),
          status: byId("link-status"),
          joinCode: byId("join-code"),
          playerName: byId("player-name"),
          pinInput: byId("pin-input"),
          carModelSelect: byId("car-model-select"),
          soundToggle: byId("sound-toggle"),
          melodyToggle: byId("melody-toggle"),
          steerSlider: byId("steer-slider")
        },
        renderer
      );
      app.start();
    } catch (error) {
      const status = document.getElementById("link-status");
      if (status) {
        status.textContent = error instanceof Error ? error.message : "CLIENT BOOT FAILED";
      }
    }
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
//# sourceMappingURL=bundle.js.map
