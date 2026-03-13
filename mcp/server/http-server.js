// mcp/server/http-server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const MCPServer = require('./index');
const HTTPTransport = require('../protocol/http-transport');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * HTTP MCP 服务器
 * 提供基于 HTTP 的 MCP 服务
 */
class HTTPMCPServer {
    constructor(options = {}) {
        this.port = options.port || parseInt(process.env.MCP_HTTP_PORT) || 3002;
        this.baseUrl = options.baseUrl || process.env.MCP_BASE_URL || `http://localhost:${this.port}`;

        // 创建 HTTP 传输层
        this.httpTransport = new HTTPTransport(options.transport);

        // 创建 MCP 核心服务器
        this.mcpServer = new MCPServer({
            name: options.name || process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP (HTTP)',
            version: options.version || process.env.MCP_SERVER_VERSION || '1.0.0',
            enableAuth: options.enableAuth || process.env.MCP_ENABLE_AUTH === 'true',
            apiKey: options.apiKey || process.env.MCP_API_KEY
        });

        // 注入 HTTP 传输层
        this.mcpServer.httpTransport = this.httpTransport;

        // 创建 Express 应用
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();

        // 存储服务器实例
        this.server = null;

        // 启动会话清理定时器
        this.cleanupInterval = setInterval(() => {
            this.httpTransport.cleanupSessions();
        }, 60000); // 每分钟清理一次
    }

    // 设置中间件
    setupMiddleware() {
        // CORS 配置
        const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || 'http://localhost:3000,app://cherry-studio').split(',');

        this.app.use(cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin) || origin.endsWith('cherry-studio')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            optionsSuccessStatus: 200
        }));

        // 请求体解析
        this.app.use(bodyParser.json({ limit: '10mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '10mb' }));

        // 请求日志
        this.app.use((req, res, next) => {
            console.log(`[HTTP] [${new Date().toISOString()}] ${req.method} ${req.url}`);
            next();
        });

        // 认证中间件
        if (this.mcpServer.enableAuth) {
            this.app.use((req, res, next) => {
                // 健康检查和信息端点不需要认证
                if (req.path === '/health' || req.path === '/info' || req.path === '/protocol') {
                    return next();
                }

                const apiKey = req.headers['x-api-key'] || req.query.apiKey;

                if (!apiKey || apiKey !== this.mcpServer.apiKey) {
                    return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' } });
                }

                next();
            });
        }

        // 速率限制中间件（可选）
        this.setupRateLimiting();
    }

    // 设置速率限制
    setupRateLimiting() {
        const rateLimit = {};
        const windowMs = 60000; // 1分钟
        const maxRequests = 100; // 最大请求数

        this.app.use((req, res, next) => {
            const clientIP = req.socket.remoteAddress;
            const now = Date.now();

            if (!rateLimit[clientIP]) {
                rateLimit[clientIP] = {
                    count: 1,
                    resetTime: now + windowMs
                };
            } else {
                if (now > rateLimit[clientIP].resetTime) {
                    rateLimit[clientIP] = {
                        count: 1,
                        resetTime: now + windowMs
                    };
                } else {
                    rateLimit[clientIP].count++;

                    if (rateLimit[clientIP].count > maxRequests) {
                        return res.status(429).json({
                            jsonrpc: '2.0',
                            error: { code: -32029, message: 'Too many requests' }
                        });
                    }
                }
            }

            next();
        });
    }

    // 设置路由
    setupRoutes() {
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                server: this.mcpServer.name,
                sessions: this.httpTransport.getAllSessions().length,
                uptime: process.uptime()
            });
        });

        // 服务器信息
        this.app.get('/info', (req, res) => {
            res.json({
                name: this.mcpServer.name,
                version: this.mcpServer.version,
                tools: this.mcpServer.getToolsList(),
                endpoints: {
                    rpc: `${this.baseUrl}/rpc`,
                    batch: `${this.baseUrl}/batch`,
                    stream: `${this.baseUrl}/stream`
                },
                protocol: 'JSON-RPC 2.0 over HTTP',
                transport: 'http',
                capabilities: {
                    batch: true,
                    streaming: false,
                    sessions: true,
                    auth: this.mcpServer.enableAuth
                }
            });
        });

        // JSON-RPC 端点（单个请求）
        this.app.post('/rpc', async (req, res) => {
            await this.httpTransport.handleRequest(req, res, this.mcpServer);
        });

        // 批处理端点
        this.app.post('/batch', async (req, res) => {
            await this.httpTransport.handleRequest(req, res, this.mcpServer);
        });

        // GET 请求支持（通过查询参数）
        this.app.get('/rpc', async (req, res) => {
            await this.httpTransport.handleRequest(req, res, this.mcpServer);
        });

        // 会话管理
        this.app.get('/sessions', (req, res) => {
            const sessions = this.httpTransport.getAllSessions().map(s => ({
                id: s.id,
                createdAt: s.createdAt,
                lastActivity: s.lastActivity,
                metadata: s.metadata
            }));

            res.json({
                count: sessions.length,
                sessions
            });
        });

        this.app.get('/sessions/:sessionId', (req, res) => {
            const session = this.httpTransport.getSession(req.params.sessionId);

            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            res.json({
                id: session.id,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                metadata: session.metadata
            });
        });

        this.app.delete('/sessions/:sessionId', (req, res) => {
            const session = this.httpTransport.getSession(req.params.sessionId);

            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            this.httpTransport.sessions.delete(req.params.sessionId);
            res.json({ message: 'Session deleted' });
        });

        // 流式响应端点（使用 Server-Sent Events）
        this.app.get('/stream', (req, res) => {
            const sessionId = req.query.sessionId || this.httpTransport.generateSessionId();

            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            res.write(`event: connected\n`);
            res.write(`data: ${JSON.stringify({ sessionId, message: 'Stream connected' })}\n\n`);

            // 定期发送心跳
            const interval = setInterval(() => {
                res.write(`event: ping\n`);
                res.write(`data: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
            }, 30000);

            req.on('close', () => {
                clearInterval(interval);
            });
        });

        // 协议文档
        this.app.get('/protocol', (req, res) => {
            res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MCP HTTP Server Protocol</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            h2 { color: #666; margin-top: 30px; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
            code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
            .endpoint { background: #e8f4f8; padding: 15px; margin: 10px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>MCP HTTP Server: ${this.mcpServer.name}</h1>
          <p>Version: ${this.mcpServer.version}</p>
          <p>Protocol: JSON-RPC 2.0 over HTTP</p>
          
          <h2>Endpoints</h2>
          
          <div class="endpoint">
            <h3>JSON-RPC Endpoint</h3>
            <p><strong>URL:</strong> <code>POST ${this.baseUrl}/rpc</code></p>
            <p><strong>Description:</strong> Single JSON-RPC request</p>
            <p><strong>Request Body:</strong></p>
            <pre>
{
  "jsonrpc": "2.0",
  "method": "user.list",
  "params": { "page": 1, "limit": 10 },
  "id": 1
}
            </pre>
          </div>
          
          <div class="endpoint">
            <h3>Batch Endpoint</h3>
            <p><strong>URL:</strong> <code>POST ${this.baseUrl}/batch</code></p>
            <p><strong>Description:</strong> Batch JSON-RPC requests</p>
            <p><strong>Request Body:</strong></p>
            <pre>
[
  {
    "jsonrpc": "2.0",
    "method": "user.list",
    "params": { "limit": 5 },
    "id": 1
  },
  {
    "jsonrpc": "2.0",
    "method": "server/ping",
    "id": 2
  }
]
            </pre>
          </div>
          
          <div class="endpoint">
            <h3>GET Request Support</h3>
            <p><strong>URL:</strong> <code>GET ${this.baseUrl}/rpc?method=server/ping&id=1</code></p>
            <p><strong>Description:</strong> Simple GET requests with query parameters</p>
          </div>
          
          <h2>Available Tools</h2>
          <ul>
            ${this.mcpServer.getToolsList().map(tool => `
              <li>
                <strong>${tool.name}</strong>: ${tool.description}
                <br><small>Parameters: ${JSON.stringify(tool.parameters)}</small>
              </li>
            `).join('')}
          </ul>
          
          <h2>Examples</h2>
          
          <h3>Using curl</h3>
          <pre>
# Single request
curl -X POST ${this.baseUrl}/rpc \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"server/info","id":1}'

# With authentication
curl -X POST ${this.baseUrl}/rpc \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{"jsonrpc":"2.0","method":"user.list","id":1}'

# Batch request
curl -X POST ${this.baseUrl}/batch \\
  -H "Content-Type: application/json" \\
  -d '[{"jsonrpc":"2.0","method":"server/ping","id":1},{"jsonrpc":"2.0","method":"server/info","id":2}]'

# GET request
curl "${this.baseUrl}/rpc?method=server/ping&id=1"
          </pre>
          
          <h2>Session Management</h2>
          <p>Include session ID in headers for stateful operations:</p>
          <pre>
curl -X POST ${this.baseUrl}/rpc \\
  -H "Content-Type: application/json" \\
  -H "X-Session-Id: your-session-id" \\
  -d '{"jsonrpc":"2.0","method":"user.list","id":1}'
          </pre>
          
          <h2>Cherry Studio Configuration</h2>
          <p>For HTTP protocol in Cherry Studio:</p>
          <pre>
{
  "mcpServers": {
    "${this.mcpServer.name}": {
      "type": "http",
      "url": "${this.baseUrl}/rpc",
      "headers": {
        "X-API-Key": "your-api-key"
      }
    }
  }
}
          </pre>
        </body>
        </html>
      `);
        });

        // 默认路由
        this.app.all('/', (req, res) => {
            res.redirect('/protocol');
        });
    }

    // 启动服务器
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    console.log(`
==========================================
MCP HTTP 服务器已启动
------------------------------------------
名称: ${this.mcpServer.name}
版本: ${this.mcpServer.version}
端口: ${this.port}
RPC端点: http://localhost:${this.port}/rpc
批处理端点: http://localhost:${this.port}/batch
流式端点: http://localhost:${this.port}/stream
工具数量: ${this.mcpServer.getToolsList().length}
会话数: 0
------------------------------------------
Cherry Studio配置:
{
  "mcpServers": {
    "${this.mcpServer.name}": {
      "type": "http",
      "url": "http://localhost:${this.port}/rpc"
    }
  }
}
==========================================
          `);
                    resolve(this.server);
                });

                this.server.on('error', (error) => {
                    console.error('HTTP 服务器启动失败:', error);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // 停止服务器
    async stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        if (this.server) {
            this.httpTransport.close();
            this.mcpServer.close();
            await new Promise((resolve) => this.server.close(resolve));
            console.log('MCP HTTP 服务器已停止');
        }
    }
}

module.exports = HTTPMCPServer;