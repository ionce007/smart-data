// pages/api/mcp/sse.js
//import { getMCPServer } from '../../mcp/server';
//import { getMCPServer } from '../../../mcp/server';

//import { SSEServer } from '@/mcp/server/sse-server';

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
            mcpServer = new SSEMCPServer();
            /*mcpServer = new SSEMCPServer({
              port: process.env.MCP_PORT || 3000,
              name: process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP',
              enableAuth: process.env.MCP_ENABLE_AUTH === 'true',
              apiKey: process.env.MCP_API_KEY
            });*/

            // 不在这里启动HTTP服务器，只处理单个请求
            console.log('MCP服务器实例已创建');
        }
        /*
            // 设置SSE headers
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
        
            // 允许跨域（Cherry Studio需要）
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        */
        // 处理SSE连接
        const clientId = mcpServer.mcpServer.handleSSEConnection(req, res);
        /*
            // 发送endpoint事件（MCP协议要求）
            const baseUrl = process.env.MCP_BASE_URL || `http://${req.headers.host}`;
            res.write(`event: endpoint\n`);
            res.write(`data: ${baseUrl}/api/mcp/messages?clientId=${clientId}\n\n`);
            if (res.flush) res.flush(); // 某些框架有这个方法
        */
        /*
         const now = new Date();
         console.log(`sse.01`)
         // ✅ 关键：立即发送 endpoint 事件（必须第一个发送）
         const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
         const messagesUrl = `${baseUrl}/api/mcp/messages`;
     
         // 发送 endpoint 事件（这是 MCP 协议要求的第一个事件）
         res.write(`event: endpoint\n`);
         res.write(`data: ${messagesUrl}\n\n`);
     
         // 可选：发送连接确认（在 endpoint 之后）
         res.write(`event: connected\n`);
         res.write(`data: ${JSON.stringify({ clientId: `client_${Date.now()}`, timestamp: new Date().toISOString() })}\n\n`);
     
         // 强制刷新缓冲区
         if (res.flush) res.flush();
         */
        const interval = setInterval(() => {
            try {
                mcpServer.mcpServer.sseTransport.sendEvent(res, 'ping', ` ${JSON.stringify({ time: new Date().toISOString() })}`)
                /*res.write(`event: ping\n`);
                res.write(`data: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
                if (res.flush) res.flush();*/
            } catch (error) {
                console.error('Heartbeat error:', error);
                clearInterval(interval);
                res.end();
            }
        }, 60000); // 30秒心跳
        // 处理连接关闭
        req.on('close', () => {
            console.log(`SSE连接关闭: ${clientId}`);
            clearInterval(interval);
            res.end();
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
        externalResolver: true, // 告诉 Next.js 这个路由由外部解析器（你的 SSE 逻辑）处理
    },
};