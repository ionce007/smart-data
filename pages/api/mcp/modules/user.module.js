// pages/api/mcp/modules/user.module.js
import { BaseModule } from './base.module';
import db from '../../../../models';
import bcrypt from 'bcryptjs';

export class UserModule extends BaseModule {
    constructor() {
        super('user');

        // 注册方法描述（用于 MCP 协议）
        this.methodDescriptions = {
            list: '获取用户列表，支持分页和搜索',
            get: '根据ID获取用户详情',
            create: '创建新用户',
            update: '更新用户信息',
            delete: '删除用户',
            stats: '获取用户统计信息'
        };

        this.methodParameters = {
            list: {
                type: 'object',
                properties: {
                    page: { type: 'integer', default: 1 },
                    limit: { type: 'integer', default: 10 },
                    search: { type: 'string' },
                    includePosts: { type: 'boolean', default: false }
                }
            },
            get: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' },
                    includePosts: { type: 'boolean', default: true }
                }
            },
            create: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                    username: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    full_name: { type: 'string' },
                    age: { type: 'integer' },
                    role: { type: 'string', enum: ['user', 'admin', 'editor'] }
                }
            }
        };
    }

    getMethodDescription(methodName) {
        return this.methodDescriptions[methodName] || `${this.name} module method`;
    }

    getMethodParameters(methodName) {
        return this.methodParameters[methodName] || {};
    }

    // 用户列表
    async list(params, context) {
        const { page = 1, limit = 10, search = '', includePosts = false } = params;
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

    // 获取单个用户
    async get(params, context) {
        const { id, includePosts = true } = params;

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

    // 创建用户
    async create(params, context) {
        const { username, email, password, ...rest } = params;

        // 检查用户是否存在
        const existingUser = await db.User.findOne({
            where: {
                [db.Sequelize.Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            throw { code: -40900, message: 'Username or email already exists' };
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await db.User.create({
            username,
            email,
            password: hashedPassword,
            ...rest
        });

        const userWithoutPassword = user.toJSON();
        delete userWithoutPassword.password;

        return { success: true, data: userWithoutPassword };
    }

    // 更新用户
    async update(params, context) {
        const { id, ...updateData } = params;

        const user = await db.User.findByPk(id);
        if (!user) {
            throw { code: -40400, message: 'User not found' };
        }

        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        await user.update(updateData);

        const updatedUser = await db.User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });

        return { success: true, data: updatedUser };
    }

    // 删除用户
    async delete(params, context) {
        const { id, cascade = false } = params;

        const user = await db.User.findByPk(id);
        if (!user) {
            throw { code: -40400, message: 'User not found' };
        }

        if (!cascade) {
            const postCount = await db.Post.count({ where: { author_id: id } });
            if (postCount > 0) {
                throw { code: -40900, message: 'User has associated posts' };
            }
        }

        await user.destroy();
        return { success: true, message: 'User deleted successfully' };
    }

    // 统计信息
    async stats(params, context) {
        const { groupBy = 'role' } = params;

        const stats = await db.User.findAll({
            attributes: [
                groupBy,
                [db.Sequelize.fn('COUNT', db.Sequelize.col('*')), 'count']
            ],
            group: [groupBy]
        });

        return { success: true, data: stats };
    }
}