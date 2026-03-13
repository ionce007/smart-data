// pages/api/mcp/sse.js
//import { getMCPServer } from '../../mcp/server';
import { getMCPServer } from '../../../mcp/server';

// 全局MCP服务器实例
let mcpServer = null;

export default async function handler(req, res) {
  // 只处理GET请求
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 初始化MCP服务器（如果未初始化）
    if (!mcpServer) {
      const SSEMCPServer = require('../../../mcp/server/sse-server');
      mcpServer = new SSEMCPServer({
        port: process.env.MCP_PORT || 3000,
        name: process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP',
        enableAuth: process.env.MCP_ENABLE_AUTH === 'true',
        apiKey: process.env.MCP_API_KEY
      });

      // 不在这里启动HTTP服务器，只处理单个请求
      console.log('MCP服务器实例已创建');
    }

    // 设置SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 允许跨域（Cherry Studio需要）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理SSE连接
    const clientId = mcpServer.mcpServer.handleSSEConnection(req, res);

    // 发送endpoint事件（MCP协议要求）
    const baseUrl = process.env.MCP_BASE_URL || `http://${req.headers.host}`;
    res.write(`event: endpoint\n`);
    res.write(`data: ${baseUrl}/api/mcp/messages?clientId=${clientId}\n\n`);

    // 处理连接关闭
    req.on('close', () => {
      console.log(`SSE连接关闭: ${clientId}`);
    });

  } catch (error) {
    console.error('SSE处理失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
}

// 禁用Next.js的默认bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};