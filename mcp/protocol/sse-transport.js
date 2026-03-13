// mcp/protocol/sse-transport.js
const EventEmitter = require('events');

/**
 * SSE传输层实现
 * 处理服务器发送事件(Server-Sent Events)连接
 */
class SSETransport extends EventEmitter {
    constructor(options = {}) {
        super();
        this.clients = new Map();
        this.messageQueue = new Map();
        this.keepAliveInterval = options.keepAliveInterval || 15000; // 15秒保活
        this.keepAliveTimers = new Map();
    }

    // 处理新的SSE连接
    handleConnection(req, res, clientId) {
        // 设置SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no' // 禁用Nginx缓冲
        });

        console.log(`sse.02`)

        const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
        const messagesUrl = `${baseUrl}/api/mcp/messages?clientId=${clientId}`;

        // 发送初始连接成功事件
        this.sendEvent(res, 'endpoint', messagesUrl );

        // 发送初始连接成功事件
        this.sendEvent(res, 'connected', { clientId, timestamp: new Date().toISOString() });

        // 存储客户端连接
        this.clients.set(clientId, {
            id: clientId,
            response: res,
            connectedAt: new Date(),
            lastActivity: new Date()
        });

        // 启动保活定时器
        const keepAliveTimer = setInterval(() => {
            if (this.clients.has(clientId)) {
                this.sendEvent(res, 'ping', { timestamp: new Date().toISOString() });
            } else {
                clearInterval(keepAliveTimer);
            }
        }, this.keepAliveInterval);

        this.keepAliveTimers.set(clientId, keepAliveTimer);

        // 处理连接关闭
        req.on('close', () => {
            this.handleDisconnect(clientId);
        });

        // 触发连接事件
        this.emit('connection', clientId);

        return clientId;
    }

    // 发送事件到指定客户端
    sendEvent(response, event, data) {
        console.log(`sse.04`)
        if (!response || response.writableEnded) return false;

        try {
            const formattedData = typeof data === 'string' ? data : JSON.stringify(data);

            if (event) response.write(`event: ${event}\n`);
            response.write(`data: ${formattedData}\n\n`);
            // 强制刷新缓冲区
            if (response.flush) response.flush();
            return true;
        } catch (error) {
            console.error('发送SSE事件失败:', error);
            return false;
        }
    }

    // 发送JSON-RPC消息
    sendMessage(clientId, message) {

        const client = this.clients.get(clientId);
        if (!client) {
            // 客户端不存在，加入队列
            if (!this.messageQueue.has(clientId)) this.messageQueue.set(clientId, []);
            this.messageQueue.get(clientId).push(message);
            return false;
        }

        client.lastActivity = new Date();
        return this.sendEvent(client.response, 'message', message);
    }

    // 广播消息给所有客户端
    broadcast(message, filter = null) {
        let sentCount = 0;
        for (const [clientId, client] of this.clients) {
            if (!filter || filter(clientId, client)) {
                if (this.sendMessage(clientId, message)) {
                    sentCount++;
                }
            }
        }
        return sentCount;
    }

    // 处理客户端断开连接
    handleDisconnect(clientId) {
        const client = this.clients.get(clientId);

        // 清除保活定时器
        if (this.keepAliveTimers.has(clientId)) {
            clearInterval(this.keepAliveTimers.get(clientId));
            this.keepAliveTimers.delete(clientId);
        }

        // 移除客户端
        if (client) {
            this.clients.delete(clientId);
            this.emit('disconnect', clientId);
            console.log(`客户端 ${clientId} 断开连接，总连接数: ${this.clients.size}`);
        }
    }

    // 获取客户端信息
    getClientInfo(clientId) {
        return this.clients.get(clientId);
    }

    // 获取所有客户端
    getAllClients() {
        return Array.from(this.clients.values());
    }

    // 获取连接数
    getConnectionCount() {
        return this.clients.size;
    }

    // 关闭所有连接
    closeAll() {
        for (const [clientId, client] of this.clients) {
            try {
                if (client.response && !client.response.writableEnded) {
                    client.response.end();
                }
            } catch (error) {
                console.error(`关闭客户端 ${clientId} 连接失败:`, error);
            }
        }

        // 清除所有定时器
        for (const timer of this.keepAliveTimers.values()) {
            clearInterval(timer);
        }

        this.clients.clear();
        this.keepAliveTimers.clear();
        this.messageQueue.clear();

        this.emit('close');
        console.log('所有SSE连接已关闭');
    }

    // 处理消息队列
    flushMessageQueue(clientId) {
        if (this.messageQueue.has(clientId)) {
            const queue = this.messageQueue.get(clientId);
            const client = this.clients.get(clientId);

            if (client) {
                for (const message of queue) {
                    this.sendMessage(clientId, message);
                }
                this.messageQueue.delete(clientId);
            }
        }
    }
}

module.exports = SSETransport;