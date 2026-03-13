// models/Post.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Post extends Model {
        static associate(models) {
            Post.belongsTo(models.User, {
                foreignKey: 'author_id',
                as: 'author',
                targetKey: 'id',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            });
        }
    }

    Post.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        summary: {
            type: DataTypes.STRING(500)
        },
        author_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'author_id',
            references: {
                model: 'users',  // 确保这里与 User 表名一致
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('draft', 'published', 'archived'),
            defaultValue: 'draft'
        },
        views: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        likes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        published_at: {
            type: DataTypes.DATE,
            field: 'published_at'
        },
        tags: {
            type: DataTypes.STRING(500),
            defaultValue: ''
        },
        cover_image: {
            type: DataTypes.STRING(500),
            field: 'cover_image'
        }
    }, {
        sequelize,
        modelName: 'Post',
        tableName: 'posts',
        timestamps: true,
        underscored: true,
        hooks: {
            beforeCreate: (post) => {
                if (post.status === 'published' && !post.published_at) {
                    post.published_at = new Date();
                }
            },
            beforeUpdate: (post) => {
                if (post.changed('status') && post.status === 'published' && !post.published_at) {
                    post.published_at = new Date();
                }
            }
        }
    });

    return Post;
};