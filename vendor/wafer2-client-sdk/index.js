module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { __MODS__[modId].m.exports.__proto__ = m.exports.__proto__; Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; var desp = Object.getOwnPropertyDescriptor(m.exports, k); if(desp && desp.configurable) Object.defineProperty(m.exports, k, { set: function(val) { __MODS__[modId].m.exports[k] = val; }, get: function() { return __MODS__[modId].m.exports[k]; } }); }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1578809491304, function(require, module, exports) {
var constants = require('./lib/constants');
var login = require('./lib/login');
var Session = require('./lib/session');
var request = require('./lib/request');
var Tunnel = require('./lib/tunnel');

var exports = module.exports = {
    login: login.login,
    loginWithCode: login.loginWithCode,
    setLoginUrl: login.setLoginUrl,

    Session,
    clearSession: Session.clear,

    request: request.request,
    RequestError: request.RequestError,

    Tunnel: Tunnel,
};

// 导出错误类型码
Object.keys(constants).forEach(function (key) {
    if (key.indexOf('ERR_') === 0) {
        exports[key] = constants[key];
    }
});
}, function(modId) {var map = {"./lib/constants":1578809491305,"./lib/login":1578809491306,"./lib/session":1578809491307,"./lib/request":1578809491308,"./lib/tunnel":1578809491310}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1578809491305, function(require, module, exports) {
module.exports = {
    WX_HEADER_CODE: 'X-WX-Code',
    WX_HEADER_ENCRYPTED_DATA: 'X-WX-Encrypted-Data',
    WX_HEADER_IV: 'X-WX-IV',
    WX_HEADER_ID: 'X-WX-Id',
    WX_HEADER_SKEY: 'X-WX-Skey',

    WX_SESSION_MAGIC_ID: 'F2C224D4-2BCE-4C64-AF9F-A6D872000D1A',

    ERR_INVALID_PARAMS: 'ERR_INVALID_PARAMS',

    ERR_WX_LOGIN_FAILED: 'ERR_WX_LOGIN_FAILED',
    ERR_WX_GET_USER_INFO: 'ERR_WX_GET_USER_INFO',
    ERR_LOGIN_TIMEOUT: 'ERR_LOGIN_TIMEOUT',
    ERR_LOGIN_FAILED: 'ERR_LOGIN_FAILED',
    ERR_LOGIN_SESSION_NOT_RECEIVED: 'ERR_LOGIN_MISSING_SESSION',

    ERR_SESSION_INVALID: 'ERR_SESSION_INVALID',
    ERR_CHECK_LOGIN_FAILED: 'ERR_CHECK_LOGIN_FAILED',
};
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1578809491306, function(require, module, exports) {
/**
 * README!!!
 * 为了兼容微信修改的登录逻辑
 * 这里对登录的 SDK 进行重构
 * 微信公告：https://developers.weixin.qq.com/blogdetail?action=get_post_info&lang=zh_CN&token=&docid=0000a26e1aca6012e896a517556c01
 */
var constants = require('./constants');
var Session = require('./session');

/**
 * 微信登录，获取 code 和 encryptData
 */
function getWxLoginResult (cb) {
    tt.login({
        success (loginResult) {
            tt.getUserInfo({
                success (userResult) {
                    cb(null, {
                        code: loginResult.code,
                        encryptedData: userResult.encryptedData,
                        iv: userResult.iv,
                        userInfo: userResult.userInfo
                    })
                },
                fail (userError) {
                    cb(new Error('获取微信用户信息失败，请检查网络状态'), null)
                }
            });
        },
        fail (loginError) {
            cb(new Error('微信登录失败，请检查网络状态'), null)
        }
    })
}

const noop = function noop() {}
const defaultOptions = {
    method: 'GET',
    success: noop,
    fail: noop,
    loginUrl: null,
}

/**
 * @method
 * 进行服务器登录，以获得登录会话
 * 受限于微信的限制，本函数需要在 <button open-type="getUserInfo" bindgetuserinfo="bindGetUserInfo"></button> 的回调函数中调用
 * 需要先使用 <button> 弹窗，让用户接受授权，然后再安全调用 wx.getUserInfo 获取用户信息
 *
 * @param {Object}   opts           登录配置
 * @param {string}   opts.loginUrl  登录使用的 URL，服务器应该在这个 URL 上处理登录请求，建议配合服务端 SDK 使用
 * @param {string}   [opts.method]  可选。请求使用的 HTTP 方法，默认为 GET
 * @param {Function} [opts.success] 可选。登录成功后的回调函数，参数 userInfo 微信用户信息
 * @param {Function} [opts.fail]    可选。登录失败后的回调函数，参数 error 错误信息
 */
function login (opts) {
    opts = Object.assign({}, defaultOptions, opts)

    if (!opts.loginUrl) {
        return opts.fail(new Error('登录错误：缺少登录地址，请通过 setLoginUrl() 方法设置登录地址'))
    }

    getWxLoginResult((err, loginResult) => {
        if (err) {
            return opts.fail(err)
        }

        // 构造请求头，包含 code、encryptedData 和 iv
        const header = {
            [constants.WX_HEADER_CODE]: loginResult.code,
            [constants.WX_HEADER_ENCRYPTED_DATA]: loginResult.encryptedData,
            [constants.WX_HEADER_IV]: loginResult.iv
        }

        // 请求服务器登录地址，获得会话信息
        tt.request({
            url: opts.loginUrl,
            header: header,
            method: opts.method,
            success (result) {
                const data = result.data;

                if (!data || data.code !== 0 || !data.data || !data.data.skey) {
                    return opts.fail(new Error(`响应错误，${JSON.stringify(data)}`))
                }

                const res = data.data

                if (!res || !res.userinfo) {
                    return opts.fail(new Error(`登录失败(${data.error})：${data.message}`))
                }

                // 成功地响应会话信息
                Session.set(res)
                opts.success(res.userinfo)
            },
            fail (err) {
                console.error('登录失败，可能是网络错误或者服务器发生异常')
                opts.fail(err)
            }
        });
    })
}

/**
 * @method
 * 只通过 wx.login 的 code 进行登录
 * 已经登录过的用户，只需要用 code 换取 openid，从数据库中查询出来即可
 * 无需每次都使用 wx.getUserInfo 去获取用户信息
 * 后端 Wafer SDK 需配合 1.4.x 及以上版本
 * 
 * @param {Object}   opts           登录配置
 * @param {string}   opts.loginUrl  登录使用的 URL，服务器应该在这个 URL 上处理登录请求，建议配合服务端 SDK 使用
 * @param {string}   [opts.method]  可选。请求使用的 HTTP 方法，默认为 GET
 * @param {Function} [opts.success] 可选。登录成功后的回调函数，参数 userInfo 微信用户信息
 * @param {Function} [opts.fail]    可选。登录失败后的回调函数，参数 error 错误信息
 */
function loginWithCode (opts) {
    opts = Object.assign({}, defaultOptions, opts)

    if (!opts.loginUrl) {
        return opts.fail(new Error('登录错误：缺少登录地址，请通过 setLoginUrl() 方法设置登录地址'))
    }

    tt.login({
        success (loginResult) {
            // 构造请求头，包含 code、encryptedData 和 iv
            const header = {
                [constants.WX_HEADER_CODE]: loginResult.code
            }
    
            // 请求服务器登录地址，获得会话信息
            tt.request({
                url: opts.loginUrl,
                header: header,
                method: opts.method,
                success (result) {
                    const data = result.data;
    
                    if (!data || data.code !== 0 || !data.data || !data.data.skey) {
                        return opts.fail(new Error(`用户未登录过，请先使用 login() 登录`))
                    }
    
                    const res = data.data
    
                    if (!res || !res.userinfo) {
                        return opts.fail(new Error(`登录失败(${data.error})：${data.message}`))
                    }
    
                    // 成功地响应会话信息
                    Session.set(res)
                    opts.success(res.userinfo)
                },
                fail (err) {
                    console.error('登录失败，可能是网络错误或者服务器发生异常')
                    opts.fail(err)
                }
            });
        }
    })
}

function setLoginUrl (loginUrl) {
    defaultOptions.loginUrl = loginUrl;
}

module.exports = { login, setLoginUrl, loginWithCode }

}, function(modId) { var map = {"./constants":1578809491305,"./session":1578809491307}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1578809491307, function(require, module, exports) {
var constants = require('./constants');
var SESSION_KEY = 'weapp_session_' + constants.WX_SESSION_MAGIC_ID;

var Session = {
    get: function () {
        return tt.getStorageSync(SESSION_KEY) || null;
    },

    set: function (session) {
        tt.setStorageSync(SESSION_KEY, session);
    },

    clear: function () {
        tt.removeStorageSync(SESSION_KEY);
    },
};

module.exports = Session;
}, function(modId) { var map = {"./constants":1578809491305}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1578809491308, function(require, module, exports) {
var constants = require('./constants');
var utils = require('./utils');
var Session = require('./session');
var loginLib = require('./login');

var noop = function noop() {};

var buildAuthHeader = function buildAuthHeader(session) {
    var header = {};

    if (session) {
        header[constants.WX_HEADER_SKEY] = session;
    }

    return header;
};

/***
 * @class
 * 表示请求过程中发生的异常
 */
var RequestError = (function () {
    function RequestError(type, message) {
        Error.call(this, message);
        this.type = type;
        this.message = message;
    }

    RequestError.prototype = new Error();
    RequestError.prototype.constructor = RequestError;

    return RequestError;
})();

function request(options) {
    if (typeof options !== 'object') {
        var message = '请求传参应为 object 类型，但实际传了 ' + (typeof options) + ' 类型';
        throw new RequestError(constants.ERR_INVALID_PARAMS, message);
    }

    var requireLogin = options.login;
    var success = options.success || noop;
    var fail = options.fail || noop;
    var complete = options.complete || noop;
    var originHeader = options.header || {};

    // 成功回调
    var callSuccess = function () {
        success.apply(null, arguments);
        complete.apply(null, arguments);
    };

    // 失败回调
    var callFail = function (error) {
        fail.call(null, error);
        complete.call(null, error);
    };

    // 是否已经进行过重试
    var hasRetried = false;

    if (requireLogin) {
        doRequestWithLogin();
    } else {
        doRequest();
    }

    // 登录后再请求
    function doRequestWithLogin() {
        loginLib.loginWithCode({ success: doRequest, fail: callFail });
    }

    // 实际进行请求的方法
    function doRequest() {
        var authHeader = {}

        var session = Session.get();
    
        if (session) {
            authHeader = buildAuthHeader(session.skey);
        }

        tt.request(utils.extend({}, options, {
            header: utils.extend({}, originHeader, authHeader),

            success: function (response) {
                var data = response.data;

                var error, message;
                if ((data && data.code === -1) || response.statusCode === 401) {
                    Session.clear();
                    // 如果是登录态无效，并且还没重试过，会尝试登录后刷新凭据重新请求
                    if (!hasRetried) {
                        hasRetried = true;
                        doRequestWithLogin();
                        return;
                    }

                    message = '登录态已过期';
                    error = new RequestError(data.error, message);

                    callFail(error);
                    return;
                } else {
                    callSuccess.apply(null, arguments);
                }
            },

            fail: callFail,
            complete: noop,
        }));
    };

};

module.exports = {
    RequestError: RequestError,
    request: request,
};
}, function(modId) { var map = {"./constants":1578809491305,"./utils":1578809491309,"./session":1578809491307,"./login":1578809491306}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1578809491309, function(require, module, exports) {

/**
 * 拓展对象
 */
exports.extend = function extend(target) {
    var sources = Array.prototype.slice.call(arguments, 1);

    for (var i = 0; i < sources.length; i += 1) {
        var source = sources[i];
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    }

    return target;
};
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1578809491310, function(require, module, exports) {
var requestLib = require('./request');
var wxTunnel = require('./wxTunnel');

/**
 * 当前打开的信道，同一时间只能有一个信道打开
 */
var currentTunnel = null;

// 信道状态枚举
var STATUS_CLOSED = Tunnel.STATUS_CLOSED = 'CLOSED';
var STATUS_CONNECTING = Tunnel.STATUS_CONNECTING = 'CONNECTING';
var STATUS_ACTIVE = Tunnel.STATUS_ACTIVE = 'ACTIVE';
var STATUS_RECONNECTING = Tunnel.STATUS_RECONNECTING = 'RECONNECTING';

// 错误类型枚举
var ERR_CONNECT_SERVICE = Tunnel.ERR_CONNECT_SERVICE = 1001;
var ERR_CONNECT_SOCKET = Tunnel.ERR_CONNECT_SOCKET = 1002;
var ERR_RECONNECT = Tunnel.ERR_RECONNECT = 2001;
var ERR_SOCKET_ERROR = Tunnel.ERR_SOCKET_ERROR = 3001;

// 包类型枚举
var PACKET_TYPE_MESSAGE = 'message';
var PACKET_TYPE_PING = 'ping';
var PACKET_TYPE_PONG = 'pong';
var PACKET_TYPE_TIMEOUT = 'timeout';
var PACKET_TYPE_CLOSE = 'close';

// 断线重连最多尝试 5 次
var DEFAULT_MAX_RECONNECT_TRY_TIMES = 5;

// 每次重连前，等待时间的增量值
var DEFAULT_RECONNECT_TIME_INCREASE = 1000;

function Tunnel(serviceUrl) {
    if (currentTunnel && currentTunnel.status !== STATUS_CLOSED) {
        throw new Error('当前有未关闭的信道，请先关闭之前的信道，再打开新信道');
    }

    currentTunnel = this;

    // 等确认微信小程序全面支持 ES6 就不用那么麻烦了
    var me = this;

    //=========================================================================
    // 暴露实例状态以及方法
    //=========================================================================
    this.serviceUrl = serviceUrl;
    this.socketUrl = null;
    this.status = null;

    this.open = openConnect;
    this.on = registerEventHandler;
    this.emit = emitMessagePacket;
    this.close = close;

    this.isClosed = isClosed;
    this.isConnecting = isConnecting;
    this.isActive = isActive;
    this.isReconnecting = isReconnecting;


    //=========================================================================
    // 信道状态处理，状态说明：
    //   closed       - 已关闭
    //   connecting   - 首次连接
    //   active       - 当前信道已经在工作
    //   reconnecting - 断线重连中
    //=========================================================================
    function isClosed() { return me.status === STATUS_CLOSED; }
    function isConnecting() { return me.status === STATUS_CONNECTING; }
    function isActive() { return me.status === STATUS_ACTIVE; }
    function isReconnecting() { return me.status === STATUS_RECONNECTING; }

    function setStatus(status) {
        var lastStatus = me.status;
        if (lastStatus !== status) {
            me.status = status;
        }
    }

    // 初始为关闭状态
    setStatus(STATUS_CLOSED);


    //=========================================================================
    // 信道事件处理机制
    // 信道事件包括：
    //   connect      - 连接已建立
    //   close        - 连接被关闭（包括主动关闭和被动关闭）
    //   reconnecting - 开始重连
    //   reconnect    - 重连成功
    //   error        - 发生错误，其中包括连接失败、重连失败、解包失败等等
    //   [message]    - 信道服务器发送过来的其它事件类型，如果事件类型和上面内置的事件类型冲突，将在事件类型前面添加前缀 `@`
    //=========================================================================
    var preservedEventTypes = 'connect,close,reconnecting,reconnect,error'.split(',');
    var eventHandlers = [];

    /**
     * 注册消息处理函数
     * @param {string} messageType 支持内置消息类型（"connect"|"close"|"reconnecting"|"reconnect"|"error"）以及业务消息类型
     */
    function registerEventHandler(eventType, eventHandler) {
        if (typeof eventHandler === 'function') {
            eventHandlers.push([eventType, eventHandler]);
        }
    }

    /**
     * 派发事件，通知所有处理函数进行处理
     */
    function dispatchEvent(eventType, eventPayload) {
        eventHandlers.forEach(function (handler) {
            var handleType = handler[0];
            var handleFn = handler[1];

            if (handleType === '*') {
                handleFn(eventType, eventPayload);
            } else if (handleType === eventType) {
                handleFn(eventPayload);
            }
        });
    }

    /**
     * 派发事件，事件类型和系统保留冲突的，事件名会自动加上 '@' 前缀
     */
    function dispatchEscapedEvent(eventType, eventPayload) {
        if (preservedEventTypes.indexOf(eventType) > -1) {
            eventType = '@' + eventType;
        }

        dispatchEvent(eventType, eventPayload);
    }


    //=========================================================================
    // 信道连接控制
    //=========================================================================
    var isFirstConnection = true;
    var isOpening = false;

    /**
     * 连接信道服务器，获取 WebSocket 连接地址，获取地址成功后，开始进行 WebSocket 连接
     */
    function openConnect() {
        if (isOpening) return;
        isOpening = true;

        // 只有关闭状态才会重新进入准备中
        setStatus(isFirstConnection ? STATUS_CONNECTING : STATUS_RECONNECTING);

        requestLib.request({
            url: serviceUrl,
            method: 'GET',
            success: function (response) {
                if (+response.statusCode === 200 && response.data && response.data.data.connectUrl) {
                    openSocket(me.socketUrl = response.data.data.connectUrl);
                } else {
                    dispatchConnectServiceError(response);
                }
            },
            fail: dispatchConnectServiceError,
            complete: () => isOpening = false,
        });

        function dispatchConnectServiceError(detail) {
            if (isFirstConnection) {
                setStatus(STATUS_CLOSED);

                dispatchEvent('error', {
                    code: ERR_CONNECT_SERVICE,
                    message: '连接信道服务失败，网络错误或者信道服务没有正确响应',
                    detail: detail || null,
                });

            } else {
                startReconnect(detail);
            }
        }
    }

    /**
     * 打开 WebSocket 连接，打开后，注册微信的 Socket 处理方法
     */
    function openSocket(url) {
        wxTunnel.listen({
            onOpen: handleSocketOpen,
            onMessage: handleSocketMessage,
            onClose: handleSocketClose,
            onError: handleSocketError,
        });

        tt.connectSocket({ url: url });
        isFirstConnection = false;
    }


    //=========================================================================
    // 处理消息通讯
    //
    // packet           - 数据包，序列化形式为 `${type}` 或者 `${type}:${content}`
    // packet.type      - 包类型，包括 message, ping, pong, close
    // packet.content?  - 当包类型为 message 的时候，会附带 message 数据
    //
    // message          - 消息体，会使用 JSON 序列化后作为 packet.content
    // message.type     - 消息类型，表示业务消息类型
    // message.content? - 消息实体，可以为任意类型，表示消息的附带数据，也可以为空
    //
    // 数据包示例：
    //  - 'ping' 表示 Ping 数据包
    //  - 'message:{"type":"speak","content":"hello"}' 表示一个打招呼的数据包
    //=========================================================================

    // 连接还没成功建立的时候，需要发送的包会先存放到队列里
    var queuedPackets = [];

    /**
     * WebSocket 打开之后，更新状态，同时发送所有遗留的数据包
     */
    function handleSocketOpen() {
        /* istanbul ignore else */
        if (isConnecting()) {
            dispatchEvent('connect');

        }
        else if (isReconnecting()) {
            dispatchEvent('reconnect');
            resetReconnectionContext();
        }

        setStatus(STATUS_ACTIVE);
        emitQueuedPackets();
        nextPing();
    }

    /**
     * 收到 WebSocket 数据包，交给处理函数
     */
    function handleSocketMessage(message) {
        resolvePacket(message.data);
    }

    /**
     * 发送数据包，如果信道没有激活，将先存放队列
     */
    function emitPacket(packet) {
        if (isActive()) {
            sendPacket(packet);
        } else {
            queuedPackets.push(packet);
        }
    }

    /**
     * 数据包推送到信道
     */
    function sendPacket(packet) {
        var encodedPacket = [packet.type];

        if (packet.content) {
            encodedPacket.push(JSON.stringify(packet.content));
        }

        wx.sendSocketMessage({
            data: encodedPacket.join(':'),
            fail: handleSocketError,
        });
    }

    function emitQueuedPackets() {
        queuedPackets.forEach(emitPacket);

        // empty queued packets
        queuedPackets.length = 0;
    }

    /**
     * 发送消息包
     */
    function emitMessagePacket(messageType, messageContent) {
        var packet = {
            type: PACKET_TYPE_MESSAGE,
            content: {
                type: messageType,
                content: messageContent,
            },
        };

        emitPacket(packet);
    }

    /**
     * 发送 Ping 包
     */
    function emitPingPacket() {
        emitPacket({ type: PACKET_TYPE_PING });
    }

    /**
     * 发送关闭包
     */
    function emitClosePacket() {
        emitPacket({ type: PACKET_TYPE_CLOSE });
    }

    /**
     * 解析并处理从信道接收到的包
     */
    function resolvePacket(raw) {
        var packetParts = raw.split(':');
        var packetType = packetParts.shift();
        var packetContent = packetParts.join(':') || null;
        var packet = { type: packetType };

        if (packetContent) {
            try {
                packet.content = JSON.parse(packetContent);
            } catch (e) {}
        }

        switch (packet.type) {
        case PACKET_TYPE_MESSAGE:
            handleMessagePacket(packet);
            break;
        case PACKET_TYPE_PONG:
            handlePongPacket(packet);
            break;
        case PACKET_TYPE_TIMEOUT:
            handleTimeoutPacket(packet);
            break;
        case PACKET_TYPE_CLOSE:
            handleClosePacket(packet);
            break;
        default:
            handleUnknownPacket(packet);
            break;
        }
    }

    /**
     * 收到消息包，直接 dispatch 给处理函数
     */
    function handleMessagePacket(packet) {
        var message = packet.content;
        dispatchEscapedEvent(message.type, message.content);
    }


    //=========================================================================
    // 心跳、断开与重连处理
    //=========================================================================

    /**
     * Ping-Pong 心跳检测超时控制，这个值有两个作用：
     *   1. 表示收到服务器的 Pong 相应之后，过多久再发下一次 Ping
     *   2. 如果 Ping 发送之后，超过这个时间还没收到 Pong，断开与服务器的连接
     * 该值将在与信道服务器建立连接后被更新
     */
    let pingPongTimeout = 15000;
    let pingTimer = 0;
    let pongTimer = 0;

    /**
     * 信道服务器返回 Ping-Pong 控制超时时间
     */
    function handleTimeoutPacket(packet) {
        var timeout = packet.content * 1000;
        /* istanbul ignore else */
        if (!isNaN(timeout)) {
            pingPongTimeout = timeout;
            ping();
        }
    }

    /**
     * 收到服务器 Pong 响应，定时发送下一个 Ping
     */
    function handlePongPacket(packet) {
        nextPing();
    }

    /**
     * 发送下一个 Ping 包
     */
    function nextPing() {
        clearTimeout(pingTimer);
        clearTimeout(pongTimer);
        pingTimer = setTimeout(ping, pingPongTimeout);
    }

    /**
     * 发送 Ping，等待 Pong
     */
    function ping() {
        /* istanbul ignore else */
        if (isActive()) {
            emitPingPacket();

            // 超时没有响应，关闭信道
            pongTimer = setTimeout(handlePongTimeout, pingPongTimeout);
        }
    }

    /**
     * Pong 超时没有响应，信道可能已经不可用，需要断开重连
     */
    function handlePongTimeout() {
        startReconnect('服务器已失去响应');
    }

    // 已经重连失败的次数
    var reconnectTryTimes = 0;

    // 最多允许失败次数
    var maxReconnectTryTimes = Tunnel.MAX_RECONNECT_TRY_TIMES || DEFAULT_MAX_RECONNECT_TRY_TIMES;

    // 重连前等待的时间
    var waitBeforeReconnect = 0;

    // 重连前等待时间增量
    var reconnectTimeIncrease = Tunnel.RECONNECT_TIME_INCREASE || DEFAULT_RECONNECT_TIME_INCREASE;

    var reconnectTimer = 0;

    function startReconnect(lastError) {
        if (reconnectTryTimes >= maxReconnectTryTimes) {
            close();

            dispatchEvent('error', {
                code: ERR_RECONNECT,
                message: '重连失败',
                detail: lastError,
            });
        }
        else {
            wx.closeSocket();
            waitBeforeReconnect += reconnectTimeIncrease;
            setStatus(STATUS_RECONNECTING);
            reconnectTimer = setTimeout(doReconnect, waitBeforeReconnect);
        }

        if (reconnectTryTimes === 0) {
            dispatchEvent('reconnecting');
        }

        reconnectTryTimes += 1;
    }

    function doReconnect() {
        openConnect();
    }

    function resetReconnectionContext() {
        reconnectTryTimes = 0;
        waitBeforeReconnect = 0;
    }

    /**
     * 收到服务器的关闭请求
     */
    function handleClosePacket(packet) {
        close();
    }

    function handleUnknownPacket(packet) {
        // throw away
    }

    var isClosing = false;

    /**
     * 收到 WebSocket 断开的消息，处理断开逻辑
     */
    function handleSocketClose() {
        /* istanbul ignore if */
        if (isClosing) return;

        /* istanbul ignore else */
        if (isActive()) {
            // 意外断开的情况，进行重连
            startReconnect('链接已断开');
        }
    }

    function close() {
        isClosing = true;
        closeSocket();
        setStatus(STATUS_CLOSED);
        resetReconnectionContext();
        isFirstConnection = false;
        clearTimeout(pingTimer);
        clearTimeout(pongTimer);
        clearTimeout(reconnectTimer);
        dispatchEvent('close');
        isClosing = false;
    }

    function closeSocket(emitClose) {
        if (isActive() && emitClose !== false) {
            emitClosePacket();
        }

        wx.closeSocket();
    }


    //=========================================================================
    // 错误处理
    //=========================================================================

    /**
     * 错误处理
     */
    function handleSocketError(detail) {
        switch (me.status) {
        case Tunnel.STATUS_CONNECTING:
            dispatchEvent('error', {
                code: ERR_SOCKET_ERROR,
                message: '连接信道失败，网络错误或者信道服务不可用',
                detail: detail,
            });
            break;
        }
    }

}

module.exports = Tunnel;
}, function(modId) { var map = {"./request":1578809491308,"./wxTunnel":1578809491311}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1578809491311, function(require, module, exports) {
/* istanbul ignore next */
const noop = () => void(0);

let onOpen, onClose, onMessage, onError;

/* istanbul ignore next */
function listen(listener) {
    if (listener) {
        onOpen = listener.onOpen;
        onClose = listener.onClose;
        onMessage = listener.onMessage;
        onError = listener.onError;
    } else {
        onOpen = noop;
        onClose = noop;
        onMessage = noop;
        onError = noop;
    }
}

/* istanbul ignore next */
function bind() {
    // wx.onSocketOpen(result => onOpen(result));
    // wx.onSocketClose(result => onClose(result));
    // wx.onSocketMessage(result => onMessage(result));
    // wx.onSocketError(error => onError(error));
}

listen(null);
bind();

module.exports = { listen };
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1578809491304);
})()
//# sourceMappingURL=index.js.map