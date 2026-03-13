// mcp/protocol/http-transport.js
const EventEmitter = require('events');

/**
 * HTTP 传输层实现
 * 处理基于 HTTP 的请求-响应模式通信
 */
class HTTPTransport extends EventEmitter {
    constructor(options = {}) {
        super();
        this.sessions = new Map();
        this.requestTimeout = options.requestTimeout || 30000; // 30秒超时
        this.maxBatchSize = options.maxBatchSize || 10; // 最大批处理请求数
    }

    // 创建新会话
    createSession() {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            createdAt: new Date(),
            lastActivity: new Date(),
            context: {},
            metadata: {}
        };

        this.sessions.set(sessionId, session);
        this.emit('sessionCreated', session);

        return session;
    }

    // 获取或创建会话
    getOrCreateSession(sessionId) {
        if (sessionId && this.sessions.has(sessionId)) {
            const session = this.sessions.get(sessionId);
            session.lastActivity = new Date();
            return session;
        }

        // 如果没有提供 sessionId 或会话不存在，创建新会话
        return this.createSession();
    }

    // 处理 HTTP 请求
    async handleRequest(req, res, mcpServer) {
        const startTime = Date.now();
        const { method, url, headers, body } = req;

        // 设置响应头
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id, X-API-Key');

        // 处理预检请求
        if (method === 'OPTIONS') {
            return res.status(200).end();
        }

        try {
            // 获取会话 ID（从 header 或 query 参数）
            const sessionId = headers['x-session-id'] || req.query.sessionId;
            const session = this.getOrCreateSession(sessionId);

            // 更新会话元数据
            session.metadata.lastIP = req.socket.remoteAddress;
            session.metadata.userAgent = headers['user-agent'];

            // 处理请求体
            let requests = [];

            if (method === 'GET') {
                // GET 请求：从 query 参数获取
                const { method: rpcMethod, params, id } = req.query;
                if (rpcMethod) {
                    requests.push({
                        jsonrpc: '2.0',
                        method: rpcMethod,
                        params: params ? JSON.parse(params) : {},
                        id: id || null
                    });
                }
            } else if (method === 'POST') {
                // POST 请求：从 body 获取
                const requestBody = body;

                if (Array.isArray(requestBody)) {
                    // 批处理请求
                    if (requestBody.length > this.maxBatchSize) {
                        throw { code: -32000, message: `Batch size exceeds maximum (${this.maxBatchSize})` };
                    }
                    requests = requestBody;
                } else {
                    // 单个请求
                    requests = [requestBody];
                }
            }

            if (requests.length === 0) {
                throw {
                    code: -32600,
                    message: 'Invalid Request: No valid requests found'
                };
            }

            // 处理所有请求
            const responses = [];
            for (const request of requests) {
                try {
                    // 验证 JSON-RPC 版本
                    if (request.jsonrpc !== '2.0') {
                        throw { code: -32600, message: 'Invalid JSON-RPC version' };
                    }

                    // 执行方法
                    const result = await mcpServer.executeMethod(
                        session.id,
                        request.method,
                        request.params || {},
                        { http: true, session }
                    );

                    // 如果有 ID，需要响应
                    if (request.id !== undefined && request.id !== null) {
                        responses.push({
                            jsonrpc: '2.0',
                            result,
                            id: request.id
                        });
                    }
                    // 没有 ID 的通知不需要响应
                } catch (error) {
                    // 如果有 ID，返回错误响应
                    if (request.id !== undefined && request.id !== null) {
                        responses.push({
                            jsonrpc: '2.0',
                            error: {
                                code: error.code || -32603,
                                message: error.message || 'Internal error',
                                data: error.data
                            },
                            id: request.id
                        });
                    }
                }
            }

            // 记录处理时间
            const processingTime = Date.now() - startTime;

            // 添加处理时间到响应头
            res.setHeader('X-Processing-Time', `${processingTime}ms`);
            res.setHeader('X-Session-Id', session.id);

            // 返回响应
            if (responses.length === 1) {
                res.json(responses[0]);
            } else if (responses.length > 1) {
                res.json(responses);
            } else {
                // 所有请求都是通知，返回 202 Accepted
                res.status(202).json({
                    jsonrpc: '2.0',
                    result: { accepted: true, message: 'Notifications processed' },
                    id: null
                });
            }

            this.emit('requestProcessed', {
                sessionId: session.id,
                method,
                requestCount: requests.length,
                responseCount: responses.length,
                processingTime
            });

        } catch (error) {
            console.error('HTTP 请求处理失败:', error);

            res.status(error.code === -32600 ? 400 : 500).json({
                jsonrpc: '2.0',
                error: {
                    code: error.code || -32603,
                    message: error.message || 'Internal server error'
                },
                id: null
            });
        }
    }

    // 生成会话 ID
    generateSessionId() {
        return `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 获取会话信息
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    // 获取所有会话
    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    // 清理过期会话
    cleanupSessions(maxAge = 3600000) { // 默认1小时
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - session.lastActivity.getTime() > maxAge) {
                this.sessions.delete(id);
                this.emit('sessionExpired', id);
            }
        }
    }

    // 关闭传输层
    close() {
        this.sessions.clear();
        this.emit('close');
        console.log('HTTP 传输层已关闭');
    }
}

module.exports = HTTPTransport;