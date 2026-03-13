// mcp/tools/post-tools.js
const db = require('../../models');
const JSONRPC = require('../protocol/jsonrpc');

class PostTools {
    constructor() {
        this.namespace = 'post';
    }

    getToolDefinitions() {
        return [
            {
                name: 'post.list',
                description: '获取文章列表，支持分页、筛选和搜索',
                parameters: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', default: 1 },
                        limit: { type: 'integer', default: 10 },
                        status: { type: 'string', enum: ['draft', 'published', 'archived'] },
                        author_id: { type: 'integer' },
                        search: { type: 'string' },
                        includeAuthor: { type: 'boolean', default: true }
                    }
                }
            },
            {
                name: 'post.get',
                description: '根据ID获取文章详情',
                parameters: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'integer' },
                        incrementViews: { type: 'boolean', default: true }
                    }
                }
            },
            {
                name: 'post.create',
                description: '创建新文章',
                parameters: {
                    type: 'object',
                    required: ['title', 'content', 'author_id'],
                    properties: {
                        title: { type: 'string', maxLength: 200 },
                        content: { type: 'string' },
                        summary: { type: 'string', maxLength: 500 },
                        author_id: { type: 'integer' },
                        status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
                        tags: { type: 'array', items: { type: 'string' } },
                        cover_image: { type: 'string' }
                    }
                }
            },
            {
                name: 'post.update',
                description: '更新文章',
                parameters: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        summary: { type: 'string' },
                        status: { type: 'string', enum: ['draft', 'published', 'archived'] },
                        tags: { type: 'array', items: { type: 'string' } },
                        cover_image: { type: 'string' }
                    }
                }
            },
            {
                name: 'post.delete',
                description: '删除文章',
                parameters: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'integer' }
                    }
                }
            },
            {
                name: 'post.search',
                description: '搜索文章（全文搜索）',
                parameters: {
                    type: 'object',
                    required: ['query'],
                    properties: {
                        query: { type: 'string' },
                        limit: { type: 'integer', default: 20 }
                    }
                }
            }
        ];
    }

    async execute(toolName, params, context = {}) {
        switch (toolName) {
            case 'post.list':
                return await this.listPosts(params);
            case 'post.get':
                return await this.getPost(params);
            case 'post.create':
                return await this.createPost(params);
            case 'post.update':
                return await this.updatePost(params);
            case 'post.delete':
                return await this.deletePost(params);
            case 'post.search':
                return await this.searchPosts(params);
            default:
                throw JSONRPC.ERROR_CODES.METHOD_NOT_FOUND;
        }
    }

    async listPosts({ page = 1, limit = 10, status, author_id, search, includeAuthor = true }) {
        const offset = (page - 1) * limit;
        const whereCondition = {};

        if (status) whereCondition.status = status;
        if (author_id) whereCondition.author_id = author_id;
        if (search) {
            whereCondition[db.Sequelize.Op.or] = [
                { title: { [db.Sequelize.Op.like]: `%${search}%` } },
                { content: { [db.Sequelize.Op.like]: `%${search}%` } }
            ];
        }

        const include = includeAuthor ? [{
            model: db.User,
            as: 'author',
            attributes: ['id', 'username', 'full_name', 'avatar']
        }] : [];

        const { count, rows } = await db.Post.findAndCountAll({
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
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

    async getPost({ id, incrementViews = true }) {
        const post = await db.Post.findByPk(id, {
            include: [{
                model: db.User,
                as: 'author',
                attributes: ['id', 'username', 'full_name', 'avatar', 'email']
            }]
        });

        if (!post) {
            throw { code: -40400, message: 'Post not found' };
        }

        if (incrementViews) {
            await post.increment('views');
            post.views += 1;
        }

        return { success: true, data: post };
    }

    async createPost(postData) {
        const author = await db.User.findByPk(postData.author_id);
        if (!author) {
            throw { code: -40000, message: 'Author not found' };
        }

        const post = await db.Post.create({
            ...postData,
            published_at: postData.status === 'published' ? new Date() : null
        });

        const createdPost = await db.Post.findByPk(post.id, {
            include: [{
                model: db.User,
                as: 'author',
                attributes: ['id', 'username', 'full_name', 'avatar']
            }]
        });

        return {
            success: true,
            data: createdPost,
            message: 'Post created successfully'
        };
    }

    async updatePost({ id, ...updateData }) {
        const post = await db.Post.findByPk(id);

        if (!post) {
            throw { code: -40400, message: 'Post not found' };
        }

        // 如果状态变为已发布且之前未发布，设置发布时间
        if (updateData.status === 'published' && post.status !== 'published' && !post.published_at) {
            updateData.published_at = new Date();
        }

        await post.update(updateData);

        const updatedPost = await db.Post.findByPk(id, {
            include: [{
                model: db.User,
                as: 'author',
                attributes: ['id', 'username', 'full_name', 'avatar']
            }]
        });

        return {
            success: true,
            data: updatedPost,
            message: 'Post updated successfully'
        };
    }

    async deletePost({ id }) {
        const post = await db.Post.findByPk(id);

        if (!post) {
            throw { code: -40400, message: 'Post not found' };
        }

        await post.destroy();

        return {
            success: true,
            message: 'Post deleted successfully'
        };
    }

    async searchPosts({ query, limit = 20 }) {
        // 简单的全文搜索
        const posts = await db.Post.findAll({
            where: {
                [db.Sequelize.Op.or]: [
                    { title: { [db.Sequelize.Op.like]: `%${query}%` } },
                    { content: { [db.Sequelize.Op.like]: `%${query}%` } }
                ],
                status: 'published'
            },
            include: [{
                model: db.User,
                as: 'author',
                attributes: ['id', 'username', 'full_name']
            }],
            limit: parseInt(limit),
            order: [['views', 'DESC']]
        });

        return {
            success: true,
            data: posts,
            query,
            count: posts.length
        };
    }
}

module.exports = PostTools;