// mcp/server/sse-server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const MCPServer = require('./index');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * SSE MCP服务器封装
 * 提供Express路由和HTTP端点
 */
class SSEMCPServer {
  constructor(options = {}) {
    this.port = options.port || parseInt(process.env.MCP_PORT) || 3000;
    this.baseUrl = options.baseUrl || process.env.MCP_BASE_URL || 'http://localhost:3000';
    
    // 创建MCP核心服务器
    this.mcpServer = new MCPServer({
      name: options.name || process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP',
      version: options.version || process.env.MCP_SERVER_VERSION || '1.0.0',
      enableAuth: options.enableAuth || process.env.MCP_ENABLE_AUTH === 'true',
      apiKey: options.apiKey || process.env.MCP_API_KEY
    });

    // 创建Express应用
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    // 存储活跃的HTTP服务器实例
    this.server = null;
  }

  // 设置中间件
  setupMiddleware() {
    // CORS配置（允许Cherry Studio访问）
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

    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // 请求日志中间件
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });

    // 认证中间件（可选）
    if (this.mcpServer.enableAuth) {
      this.app.use((req, res, next) => {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        
        if (!apiKey || apiKey !== this.mcpServer.apiKey) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        next();
      });
    }
  }

  // 设置路由
  setupRoutes() {
    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: this.mcpServer.name,
        connections: this.mcpServer.sseTransport.getConnectionCount()
      });
    });

    // 服务器信息端点（用于发现）
    this.app.get('/mcp/info', (req, res) => {
      res.json({
        name: this.mcpServer.name,
        version: this.mcpServer.version,
        tools: this.mcpServer.getToolsList(),
        endpoints: {
          sse: `${this.baseUrl}/api/mcp/sse`,
          messages: `${this.baseUrl}/api/mcp/messages`,
          http: `${this.baseUrl}/api/mcp/http`
        },
        protocol: 'MCP 2024-11-05',
        transport: ['sse', 'http']
      });
    });

    // SSE端点（Cherry Studio主要使用这个）
    this.app.get('/api/mcp/sse', (req, res) => {
      // 设置SSE相关headers
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      
      // 处理连接
      const clientId = this.mcpServer.handleSSEConnection(req, res);
      
      // 发送endpoint事件（MCP协议要求）
      res.write(`event: endpoint\n`);
      res.write(`data: ${this.baseUrl}/api/mcp/messages?clientId=${clientId}\n\n`);
    });

    // 消息端点（处理客户端发来的消息）
    this.app.post('/api/mcp/messages', async (req, res) => {
      await this.mcpServer.handleMessageRequest(req, res);
    });

    // HTTP API端点（可选，兼容HTTP协议）
    this.app.post('/api/mcp/http', async (req, res) => {
      try {
        const { method, params, id } = req.body;
        
        if (!method) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid Request' },
            id: id || null
          });
        }

        const result = await this.mcpServer.executeMethod('http-client', method, params);
        
        res.json({
          jsonrpc: '2.0',
          result,
          id: id || null
        });
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: error.code || -32603, message: error.message },
          id: req.body.id || null
        });
      }
    });

    // 静态文件服务（用于MCP协议文档）
    this.app.get('/mcp/protocol', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MCP Server Protocol</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>MCP Server: ${this.mcpServer.name}</h1>
          <p>Version: ${this.mcpServer.version}</p>
          <p>Protocol: MCP 2024-11-05</p>
          
          <h2>Endpoints</h2>
          <ul>
            <li><strong>SSE Endpoint:</strong> <code>${this.baseUrl}/api/mcp/sse</code></li>
            <li><strong>Messages Endpoint:</strong> <code>${this.baseUrl}/api/mcp/messages</code></li>
            <li><strong>HTTP Endpoint:</strong> <code>${this.baseUrl}/api/mcp/http</code></li>
          </ul>
          
          <h2>Available Tools</h2>
          <ul>
            ${this.mcpServer.getToolsList().map(tool => `
              <li><strong>${tool.name}</strong>: ${tool.description}</li>
            `).join('')}
          </ul>
          
          <h2>Cherry Studio Configuration</h2>
          <pre>
{
  "mcpServers": {
    "${this.mcpServer.name}": {
      "type": "sse",
      "url": "${this.baseUrl}/api/mcp/sse",
      "messagesUrl": "${this.baseUrl}/api/mcp/messages"
    }
  }
}
          </pre>
        </body>
        </html>
      `);
    });
  }

  // 启动服务器
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`
==========================================
MCP服务器已启动
------------------------------------------
名称: ${this.mcpServer.name}
版本: ${this.mcpServer.version}
端口: ${this.port}
SSE端点: http://localhost:${this.port}/api/mcp/sse
消息端点: http://localhost:${this.port}/api/mcp/messages
工具数量: ${this.mcpServer.getToolsList().length}
------------------------------------------
Cherry Studio配置:
{
  "mcpServers": {
    "${this.mcpServer.name}": {
      "type": "sse",
      "url": "http://localhost:${this.port}/api/mcp/sse",
      "messagesUrl": "http://localhost:${this.port}/api/mcp/messages"
    }
  }
}
==========================================
          `);
          resolve(this.server);
        });

        this.server.on('error', (error) => {
          console.error('服务器启动失败:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 停止服务器
  async stop() {
    if (this.server) {
      this.mcpServer.close();
      await new Promise((resolve) => this.server.close(resolve));
      console.log('MCP服务器已停止');
    }
  }
}

module.exports = SSEMCPServer;