// mcp/tools/user-tools.js
const db = require('../../models');
const JSONRPC = require('../protocol/jsonrpc');
const { validationResult } = require('../../lib/validation');

/**
 * 用户相关MCP工具
 * 这些工具将通过MCP暴露给Cherry Studio调用
 */
class UserTools {
    constructor() {
        this.namespace = 'user';
    }

    // 获取工具定义（用于MCP协议发现）
    getToolDefinitions() {
        return [
            {
                name: 'user.list',
                description: '获取用户列表，支持分页和搜索',
                parameters: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', description: '页码', default: 1 },
                        limit: { type: 'integer', description: '每页数量', default: 10 },
                        search: { type: 'string', description: '搜索关键词' },
                        includePosts: { type: 'boolean', description: '是否包含文章', default: false }
                    }
                }
            },
            {
                name: 'user.get',
                description: '根据ID获取用户详情',
                parameters: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'integer', description: '用户ID' },
                        includePosts: { type: 'boolean', description: '是否包含文章', default: true }
                    }
                }
            },
            {
                name: 'user.create',
                description: '创建新用户',
                parameters: {
                    type: 'object',
                    required: ['username', 'email', 'password'],
                    properties: {
                        username: { type: 'string', description: '用户名', minLength: 3 },
                        email: { type: 'string', description: '邮箱', format: 'email' },
                        password: { type: 'string', description: '密码', minLength: 6 },
                        full_name: { type: 'string', description: '姓名' },
                        age: { type: 'integer', description: '年龄', minimum: 0, maximum: 150 },
                        role: { type: 'string', enum: ['user', 'admin', 'editor'], default: 'user' },
                        bio: { type: 'string', description: '简介' }
                    }
                }
            },
            {
                name: 'user.update',
                description: '更新用户信息',
                parameters: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'integer', description: '用户ID' },
                        username: { type: 'string', description: '用户名' },
                        email: { type: 'string', description: '邮箱', format: 'email' },
                        full_name: { type: 'string', description: '姓名' },
                        age: { type: 'integer', description: '年龄' },
                        role: { type: 'string', enum: ['user', 'admin', 'editor'] },
                        is_active: { type: 'boolean', description: '是否激活' },
                        bio: { type: 'string', description: '简介' }
                    }
                }
            },
            {
                name: 'user.delete',
                description: '删除用户',
                parameters: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'integer', description: '用户ID' },
                        cascade: { type: 'boolean', description: '是否级联删除关联数据', default: false }
                    }
                }
            },
            {
                name: 'user.stats',
                description: '获取用户统计信息',
                parameters: {
                    type: 'object',
                    properties: {
                        groupBy: { type: 'string', enum: ['role', 'status', 'month'], description: '分组方式' }
                    }
                }
            }
        ];
    }

    // 工具执行方法
    async execute(toolName, params, context = {}) {
        console.log(`执行工具 ${toolName}:`, params);

        switch (toolName) {
            case 'user.list':
                return await this.listUsers(params);
            case 'user.get':
                return await this.getUser(params);
            case 'user.create':
                return await this.createUser(params);
            case 'user.update':
                return await this.updateUser(params);
            case 'user.delete':
                return await this.deleteUser(params);
            case 'user.stats':
                return await this.getUserStats(params);
            default:
                throw JSONRPC.ERROR_CODES.METHOD_NOT_FOUND;
        }
    }

    // 实现具体方法
    async listUsers({ page = 1, limit = 10, search = '', includePosts = false }) {
        const offset = (page - 1) * limit;

        const whereCondition = search ? {
            [db.Sequelize.Op.or]: [
                { username: { [db.Sequelize.Op.like]: `%${search}%` } },
                { email: { [db.Sequelize.Op.like]: `%${search}%` } },
                { full_name: { [db.Sequelize.Op.like]: `%${search}%` } }
            ]
        } : {};

        const include = includePosts ? [{
            model: db.Post,
            as: 'posts',
            attributes: ['id', 'title', 'status', 'created_at'],
            limit: 5,
            order: [['created_at', 'DESC']]
        }] : [];

        const { count, rows } = await db.User.findAndCountAll({
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: { exclude: ['password'] },
            include,
            order: [['created_at', 'DESC']]
        });

        return {
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / limit)
            }
        };
    }

    async getUser({ id, includePosts = true }) {
        const user = await db.User.findByPk(id, {
            attributes: { exclude: ['password'] },
            include: includePosts ? [{
                model: db.Post,
                as: 'posts',
                order: [['created_at', 'DESC']]
            }] : []
        });

        if (!user) {
            throw { code: -40400, message: 'User not found' };
        }

        return { success: true, data: user };
    }

    async createUser(userData) {
        // 检查用户是否已存在
        const existingUser = await db.User.findOne({
            where: {
                [db.Sequelize.Op.or]: [
                    { username: userData.username },
                    { email: userData.email }
                ]
            }
        });

        if (existingUser) {
            throw { code: -40900, message: 'Username or email already exists' };
        }

        const user = await db.User.create(userData);

        // 不返回密码
        const userWithoutPassword = user.toJSON();
        delete userWithoutPassword.password;

        return {
            success: true,
            data: userWithoutPassword,
            message: 'User created successfully'
        };
    }

    async updateUser({ id, ...updateData }) {
        const user = await db.User.findByPk(id);

        if (!user) {
            throw { code: -40400, message: 'User not found' };
        }

        // 检查用户名/邮箱是否被其他用户使用
        if (updateData.username || updateData.email) {
            const whereCondition = {};
            if (updateData.username) whereCondition.username = updateData.username;
            if (updateData.email) whereCondition.email = updateData.email;

            const existingUser = await db.User.findOne({
                where: {
                    ...whereCondition,
                    id: { [db.Sequelize.Op.ne]: id }
                }
            });

            if (existingUser) {
                throw { code: -40900, message: 'Username or email already exists' };
            }
        }

        await user.update(updateData);

        // 重新获取更新后的数据
        const updatedUser = await db.User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });

        return {
            success: true,
            data: updatedUser,
            message: 'User updated successfully'
        };
    }

    async deleteUser({ id, cascade = false }) {
        const user = await db.User.findByPk(id);

        if (!user) {
            throw { code: -40400, message: 'User not found' };
        }

        if (!cascade) {
            // 检查是否有关联文章
            const postCount = await db.Post.count({ where: { author_id: id } });
            if (postCount > 0) {
                throw {
                    code: -40900,
                    message: 'User has associated posts. Use cascade=true to delete anyway.'
                };
            }
        }

        await user.destroy();

        return {
            success: true,
            message: 'User deleted successfully'
        };
    }

    async getUserStats({ groupBy = 'role' }) {
        let stats = [];

        switch (groupBy) {
            case 'role':
                stats = await db.User.findAll({
                    attributes: [
                        'role',
                        [db.Sequelize.fn('COUNT', db.Sequelize.col('*')), 'count']
                    ],
                    group: ['role']
                });
                break;
            case 'status':
                stats = await db.User.findAll({
                    attributes: [
                        'is_active',
                        [db.Sequelize.fn('COUNT', db.Sequelize.col('*')), 'count']
                    ],
                    group: ['is_active']
                });
                break;
            case 'month':
                stats = await db.User.findAll({
                    attributes: [
                        [db.Sequelize.fn('DATE_FORMAT', db.Sequelize.col('created_at'), '%Y-%m'), 'month'],
                        [db.Sequelize.fn('COUNT', db.Sequelize.col('*')), 'count']
                    ],
                    group: [db.Sequelize.fn('DATE_FORMAT', db.Sequelize.col('created_at'), '%Y-%m')],
                    order: [[db.Sequelize.literal('month'), 'DESC']],
                    limit: 12
                });
                break;
        }

        return {
            success: true,
            data: stats,
            groupBy
        };
    }
}

module.exports = UserTools;