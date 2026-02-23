// mcp/server/index.js
const EventEmitter = require('events');
//const { v4: uuidv4 } = require('uuid');
const JSONRPC = require('../protocol/jsonrpc');
const UserTools = require('../tools/user-tools');
const PostTools = require('../tools/post-tools');
const DatabaseTools = require('../tools/db-tools');
const SSETransport = require('../protocol/sse-transport');
import { v4 as uuidv4 } from 'uuid';
/**
 * MCP服务器主类
 * 处理JSON-RPC请求、工具注册和调用、客户端管理
 */
class MCPServer extends EventEmitter {
    constructor(options = {}) {
        super();

        this.name = options.name || 'MCP Server';
        this.version = options.version || '1.0.0';
        this.sseTransport = new SSETransport(options.sse);

        // 工具注册表
        this.tools = new Map();

        // 会话存储
        this.sessions = new Map();

        // 请求处理超时
        this.requestTimeout = options.requestTimeout || 30000;

        // 认证配置
        this.enableAuth = options.enableAuth || false;
        this.apiKey = options.apiKey;

        // 注册内置工具
        this.registerTools();

        // 设置SSE传输事件监听
        this.setupTransportEvents();
    }

    // 注册所有工具
    registerTools() {
        const userTools = new UserTools();
        const postTools = new PostTools();
        const dbTools = new DatabaseTools();

        // 注册工具定义
        this.registerToolSet(userTools);
        this.registerToolSet(postTools);
        this.registerToolSet(dbTools);
    }

    // 注册工具集
    registerToolSet(toolSet) {
        const definitions = toolSet.getToolDefinitions();

        for (const def of definitions) {
            this.tools.set(def.name, {
                definition: def,
                handler: toolSet.execute.bind(toolSet)
            });
        }

        console.log(`已注册 ${definitions.length} 个工具从 ${toolSet.constructor.name}`);
    }

    // 设置传输层事件
    setupTransportEvents() {
        this.sseTransport.on('connection', (clientId) => {
            console.log(`新客户端连接: ${clientId}`);
            this.emit('clientConnected', clientId);

            // 创建会话
            this.sessions.set(clientId, {
                id: clientId,
                connectedAt: new Date(),
                lastActivity: new Date(),
                context: {}
            });
        });

        this.sseTransport.on('disconnect', (clientId) => {
            console.log(`客户端断开: ${clientId}`);
            this.sessions.delete(clientId);
            this.emit('clientDisconnected', clientId);
        });
    }

    // 处理SSE连接
    handleSSEConnection(req, res) {
        const clientId = uuidv4();
        this.sseTransport.handleConnection(req, res, clientId);

        // 发送初始化信息
        this.sseTransport.sendMessage(clientId, {
            jsonrpc: '2.0',
            method: 'server/initialized',
            params: {
                serverName: this.name,
                serverVersion: this.version,
                clientId: clientId,
                tools: this.getToolsList()
            }
        });

        return clientId;
    }

    // 处理消息端点请求（POST请求）
    async handleMessageRequest(req, res) {
        const { clientId } = req.query;

        if (!clientId || !this.sessions.has(clientId)) {
            return res.status(400).json(JSONRPC.createError({
                code: -32000,
                message: 'Invalid or expired client ID'
            }));
        }

        try {
            // 解析请求体
            const body = req.body;
            const message = JSONRPC.parse(body);

            // 更新会话活动时间
            const session = this.sessions.get(clientId);
            session.lastActivity = new Date();

            // 处理请求
            const response = await this.handleMessage(clientId, message);

            // 如果是请求且有ID，发送响应
            if (JSONRPC.isRequest(message) && message.id !== null) {
                res.json(response);
            } else {
                // 通知无需响应
                res.status(202).end();
            }
        } catch (error) {
            console.error('处理消息失败:', error);

            if (error.message === 'Parse error') {
                res.status(400).json(JSONRPC.createError(JSONRPC.ERROR_CODES.PARSE_ERROR));
            } else {
                res.status(500).json(JSONRPC.createError(JSONRPC.ERROR_CODES.INTERNAL_ERROR));
            }
        }
    }

    // 处理单个消息
    async handleMessage(clientId, message) {
        // 如果是响应（通常不会由服务器收到）
        if (JSONRPC.isResponse(message)) {
            this.emit('response', clientId, message);
            return null;
        }

        // 处理请求
        if (JSONRPC.isRequest(message)) {
            const { method, params, id } = message;

            try {
                // 执行方法
                const result = await this.executeMethod(clientId, method, params);

                // 如果有ID，返回响应
                if (id !== null) {
                    return JSONRPC.createResponse(result, id);
                }
                // 通知不需要响应
                return null;
            } catch (error) {
                console.error(`执行方法 ${method} 失败:`, error);

                if (id !== null) {
                    return JSONRPC.createError(error, id);
                }
                return null;
            }
        }

        throw JSONRPC.ERROR_CODES.INVALID_REQUEST;
    }

    // mcp/server/index.js 添加以下方法

    // 执行方法（支持 HTTP）
    async executeMethod(clientId, method, params, context = {}) {
        // 处理内置方法
        if (method.startsWith('server/')) {
            return await this.handleServerMethod(method, params, clientId);
        }

        // 处理工具调用
        if (this.tools.has(method)) {
            const tool = this.tools.get(method);

            // 获取会话上下文
            let session;
            if (this.httpTransport) {
                session = this.httpTransport.getSession(clientId);
            } else if (this.sseTransport) {
                session = this.sessions.get(clientId);
            }

            const sessionContext = session?.context || {};

            // 合并上下文
            const execContext = {
                ...sessionContext,
                ...context,
                clientId,
                transport: context.http ? 'http' : 'sse'
            };

            // 执行工具
            const result = await tool.handler(method, params, execContext);

            // 更新会话上下文
            if (result._context && session) {
                session.context = { ...sessionContext, ...result._context };
                delete result._context;
            }

            return result;
        }

        throw JSONRPC.ERROR_CODES.METHOD_NOT_FOUND;
    }

    // 执行方法
    async executeMethod(clientId, method, params) {
        // 处理内置方法
        if (method.startsWith('server/')) {
            return await this.handleServerMethod(method, params, clientId);
        }

        // 处理工具调用
        if (this.tools.has(method)) {
            const tool = this.tools.get(method);

            // 获取会话上下文
            const session = this.sessions.get(clientId);
            const context = session?.context || {};

            // 执行工具
            const result = await tool.handler(method, params, context);

            // 更新会话上下文（工具可以返回上下文更新）
            if (result._context) {
                if (session) {
                    session.context = { ...session.context, ...result._context };
                }
                delete result._context;
            }

            return result;
        }

        throw JSONRPC.ERROR_CODES.METHOD_NOT_FOUND;
    }

    // 处理服务器内置方法
    async handleServerMethod(method, params, clientId) {
        switch (method) {
            case 'server/info':
                return {
                    name: this.name,
                    version: this.version,
                    tools: this.getToolsList(),
                    capabilities: {
                        streaming: true,
                        functionCalling: true,
                        contextWindow: 4096
                    }
                };

            case 'server/tools':
                return this.getToolsList();

            case 'server/ping':
                return { pong: true, timestamp: new Date().toISOString() };

            case 'server/session':
                return this.sessions.get(clientId) || null;

            default:
                throw JSONRPC.ERROR_CODES.METHOD_NOT_FOUND;
        }
    }

    // 获取工具列表（用于协议发现）
    getToolsList() {
        const tools = [];
        for (const [name, tool] of this.tools) {
            tools.push({
                name,
                description: tool.definition.description,
                parameters: tool.definition.parameters
            });
        }
        return tools;
    }

    // 广播消息给所有客户端
    broadcast(method, params) {
        const message = JSONRPC.createRequest(method, params, null);
        return this.sseTransport.broadcast(message);
    }

    // 发送消息给特定客户端
    sendToClient(clientId, method, params) {
        const message = JSONRPC.createRequest(method, params, null);
        return this.sseTransport.sendMessage(clientId, message);
    }

    // 获取服务器状态
    getStatus() {
        return {
            name: this.name,
            version: this.version,
            uptime: process.uptime(),
            connections: this.sseTransport.getConnectionCount(),
            toolsCount: this.tools.size,
            sessionsCount: this.sessions.size,
            memoryUsage: process.memoryUsage()
        };
    }

    // 关闭服务器
    close() {
        this.sseTransport.closeAll();
        this.sessions.clear();
        this.emit('close');
        console.log('MCP服务器已关闭');
    }
}

module.exports = MCPServer;