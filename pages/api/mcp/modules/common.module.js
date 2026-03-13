// pages/api/mcp/modules/common.module.js
import { BaseModule } from './base.module';

export class CommonModule extends BaseModule {
    constructor() {
        super('common');
    }

    // 服务器信息
    async info(params, context) {
        return {
            name: process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP',
            version: process.env.MCP_SERVER_VERSION || '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    // Ping
    async ping(params, context) {
        return { pong: true, timestamp: new Date().toISOString() };
    }

    // 健康检查
    async health(params, context) {
        return { status: 'healthy', timestamp: new Date().toISOString() };
    }

    // 回显
    async echo(params, context) {
        return { received: params, timestamp: new Date().toISOString() };
    }

    // 获取服务器时间
    async time(params, context) {
        return { iso: new Date().toISOString(), timestamp: Date.now(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
}