// lib/mcp-state.js 统一管理SSE中的clientId
class MCPState {
    constructor() {
        this.clients = new Map();
        this.sessions = new Map();
    }

    addClient(clientId, res) {
        this.clients.set(clientId, {
            id: clientId,
            res,
            connectedAt: new Date(),
            lastActivity: new Date()
        });
    }

    getClient(clientId) {
        return this.clients.get(clientId);
    }

    removeClient(clientId) {
        this.clients.delete(clientId);
    }

    isValidClient(clientId) {
        return this.clients.has(clientId);
    }

    updateActivity(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastActivity = new Date();
        }
    }

    // 清理过期客户端
    cleanup(maxAge = 300000) { // 默认5分钟
        const now = Date.now();
        for (const [id, client] of this.clients) {
            if (now - client.lastActivity.getTime() > maxAge) {
                try {
                    if (client.res && !client.res.writableEnded) {
                        client.res.end();
                    }
                } catch (error) {
                    console.error(`Error closing client ${id}:`, error);
                }
                this.clients.delete(id);
            }
        }
    }
}

export const mcpState = new MCPState();