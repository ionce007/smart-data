// pages/api/mcp/messages.js
import { getMCPServer } from '../../mcp/server';

let mcpServer = null;

export default async function handler(req, res) {
  // 只处理POST请求
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 初始化MCP服务器
    if (!mcpServer) {
      const { SSEMCPServer } = require('../../mcp/server/sse-server');
      mcpServer = new SSEMCPServer({
        port: process.env.MCP_PORT || 3000,
        name: process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP'
      });
    }

    // 处理消息
    await mcpServer.mcpServer.handleMessageRequest(req, res);

  } catch (error) {
    console.error('消息处理失败:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: error.message },
        id: null
      });
    }
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};