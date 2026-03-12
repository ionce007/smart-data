// pages/api/mcp/[...path].js
import { moduleRegistry } from './modules';
import { authMiddleware } from './middleware/auth';
import { loggerMiddleware, logger } from './middleware/logger';
import SSETransport from '../../../mcp/protocol/sse-transport';

// 初始化模块注册器
moduleRegistry.registerModules();

// SSE 传输层实例
const sseTransport = new SSETransport();

export default async function handler(req, res) {
  const { path } = req.query;
  const fullPath = path ? path.join('/') : '';

  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Client-ID');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 创建请求上下文
  const context = {
    startTime: Date.now(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    clientIp: req.socket.remoteAddress
  };

  logger.info('Processing MCP request', {
    requestId: context.requestId,
    method: req.method,
    path: req.query.path
  });
  // 记录请求
  console.log(`[${new Date().toISOString()}] [${context.requestId}] ${req.method} /api/mcp/${fullPath}`);

  try {
    // SSE 端点处理
    if (fullPath === 'sse' && req.method === 'GET') {
      // 设置 SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 处理 SSE 连接
      sseTransport.handleConnection(req, res, clientId);

      // 发送端点信息
      const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      res.write(`event: endpoint\n`);
      res.write(`data: ${baseUrl}/api/mcp/messages?clientId=${clientId}\n\n`);

      // 连接关闭时清理
      req.on('close', () => {
        sseTransport.handleDisconnect(clientId);
      });

      return;
    }

    // 消息端点处理
    if (fullPath === 'messages' && req.method === 'POST') {
      const { clientId } = req.query;

      if (!clientId) {
        return res.status(400).json({ error: 'Missing clientId' });
      }

      // 解析请求体
      const body = req.body;
      const { method, params, id } = body;

      if (!method) {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: id || null });
      }

      // 解析方法名（格式：module.method）
      const [moduleName, methodName] = method.split('.');

      try {
        // 执行模块方法
        const result = await moduleRegistry.call(moduleName, methodName, params || {}, context);

        // 如果有 ID，返回响应
        if (id !== null && id !== undefined) {
          res.json({ jsonrpc: '2.0', result, id });
        } else {
          // 通知，无需响应
          res.status(202).end();
        }
      } catch (error) {
        console.error(`[${context.requestId}] 执行方法失败:`, error);

        if (id !== null && id !== undefined) {
          res.status(400).json({ jsonrpc: '2.0', error: { code: error.code || -32603, message: error.message || 'Internal error' }, id });
        } else {
          res.status(202).end();
        }
      }

      return;
    }

    // HTTP RPC 端点
    if (fullPath === 'rpc' && req.method === 'POST') {
      const { method, params, id } = req.body;

      if (!method) {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: id || null });
      }

      const [moduleName, methodName] = method.split('.');

      try {
        const result = await moduleRegistry.call(moduleName, methodName, params || {}, context);

        res.json({ jsonrpc: '2.0', result, id: id || null });
      } catch (error) {
        res.status(400).json({ jsonrpc: '2.0', error: { code: error.code || -32603, message: error.message || 'Internal error' }, id: id || null });
      }

      return;
    }

    // GET 方式的 RPC
    if (fullPath === 'rpc' && req.method === 'GET') {
      const { method, ...queryParams } = req.query;

      if (!method) {
        return res.status(400).json({ error: 'Missing method parameter' });
      }

      const [moduleName, methodName] = method.split('.');

      try {
        const result = await moduleRegistry.call(moduleName, methodName, queryParams, context);
        res.json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }

      return;
    }

    // 获取模块列表
    if (fullPath === 'module' && req.method === 'GET') {
      return res.json({
        modules: moduleRegistry.getAllModules(),
        tools: moduleRegistry.getToolsList()
      });
    }

    // 获取服务器信息
    if (fullPath === 'info' && req.method === 'GET') {
      res.json({
        name: process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
        modules: Array.from(moduleRegistry.modules.keys()),
        tools: moduleRegistry.getToolsList().length,
        connections: sseTransport.getConnectionCount()
      })
    }

    // 健康检查
    if (fullPath === 'health' && req.method === 'GET') {
      return res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connections: sseTransport.getConnectionCount()
      });
    }

    // 404 - 未知路径
    return res.status(404).json({ error: 'Not found', path: fullPath });

  } catch (error) {
    console.error(`[${context.requestId}] MCP API Error:`, error);

    res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: error.message || 'Internal server error' } });
  }


}


// 配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};