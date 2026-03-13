// mcp/client/cherry-studio-helper.js
/**
 * Cherry Studio MCP助手
 * 用于生成Cherry Studio可直接导入的配置
 */

class CherryStudioHelper {
    /**
     * 生成Cherry Studio的MCP服务器配置
     * @param {Object} options 配置选项
     * @returns {Object} Cherry Studio配置对象
     */
    static generateConfig(options = {}) {
        const {
            name = process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP',
            baseUrl = process.env.MCP_BASE_URL || 'http://localhost:3000',
            apiKey = process.env.MCP_API_KEY,
            enableAuth = process.env.MCP_ENABLE_AUTH === 'true'
        } = options;

        const config = {
            mcpServers: {
                [name]: {
                    type: 'sse',
                    url: `${baseUrl}/api/mcp/sse`,
                    messagesUrl: `${baseUrl}/api/mcp/messages`,
                    description: 'Next.js + Sequelize 数据库操作MCP服务',
                    tools: [
                        'user.list', 'user.get', 'user.create', 'user.update', 'user.delete',
                        'post.list', 'post.get', 'post.create', 'post.update', 'post.delete',
                        'db.query', 'db.stats', 'db.tables'
                    ]
                }
            }
        };

        if (enableAuth && apiKey) {
            config.mcpServers[name].headers = {
                'X-API-Key': apiKey
            };
        }

        return config;
    }

    /**
     * 生成可导入Cherry Studio的JSON字符串
     */
    static getConfigString(options = {}) {
        return JSON.stringify(this.generateConfig(options), null, 2);
    }

    /**
     * 生成Cherry Studio导入URL
     */
    static getImportUrl(options = {}) {
        const config = this.generateConfig(options);
        const encoded = encodeURIComponent(JSON.stringify(config));
        return `cherry-studio://import/mcp?config=${encoded}`;
    }

    /**
     * 生成MCP协议发现文档
     */
    static getDiscoveryDocument(baseUrl) {
        return {
            name: process.env.MCP_SERVER_NAME || 'NextJS Sequelize MCP',
            version: process.env.MCP_SERVER_VERSION || '1.0.0',
            description: '通过自然语言操作数据库的MCP服务',
            endpoints: {
                sse: `${baseUrl}/api/mcp/sse`,
                messages: `${baseUrl}/api/mcp/messages`,
                http: `${baseUrl}/api/mcp/http`
            },
            tools: [
                {
                    name: 'user.*',
                    description: '用户管理：创建、查询、更新、删除用户'
                },
                {
                    name: 'post.*',
                    description: '文章管理：创建、查询、更新、删除文章'
                },
                {
                    name: 'db.query',
                    description: '执行SQL查询（只读）'
                }
            ],
            examples: [
                {
                    query: '帮我创建用户张三，邮箱zhangsan@example.com',
                    tool: 'user.create'
                },
                {
                    query: '显示所有已发布的文章',
                    tool: 'post.list',
                    params: { status: 'published' }
                }
            ]
        };
    }
}

module.exports = CherryStudioHelper;