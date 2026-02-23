/*
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Auth extends Model {
        static associate(models) { }
    }

    Auth.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        platform: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: [1, 50],
                notEmpty: true
            }
        },
        token: {
            type: DataTypes.STRING(2000),
            allowNull: false,
            validate: {
                len: [1, 2000],
                notEmpty: true
            }
        }
    }, {
        sequelize,
        modelName: 'Auth',
        tableName: 'auths',
        timestamps: true,
        underscored: true,
        hooks: {
            beforeCreate: (auth) => {
                auth.created_at = new Date();
                auth.updated_at = new Date();
            },
            beforeUpdate: (auth) => {
                auth.updated_at = new Date();
            }
        }
    })

    return Auth;
}
    */

// models/User.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Auth extends Model {
        static associate(models) {

        }
    }

    Auth.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        platform: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: [3, 50],
                notEmpty: true
            }
        },
        token: {
            type: DataTypes.STRING(2000),
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Auth',
        tableName: 'auths',
        timestamps: true,
        underscored: true,
        // MSSQL 特定的配置
        ...(sequelize.getDialect() === 'mssql' && {
            // MSSQL 需要设置 schema（可选）
            schema: 'dbo',
            // 设置字符集和排序规则
            charset: 'utf8',
            collate: 'Chinese_PRC_CI_AS' // 根据你的数据库设置调整
        }),
        hooks: {
            beforeCreate: (user) => {
                user.created_at = new Date();
                user.updated_at = new Date();
            },
            beforeUpdate: (user) => {
                user.updated_at = new Date();
            }
        }
    });

    return Auth;
};