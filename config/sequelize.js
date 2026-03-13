// lib/sequelize.js
const { Sequelize } = require('sequelize');
import tedious from 'tedious'; //显式导入，避免EdgeOne打包时的错误
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const env = process.env.NODE_ENV || 'development';

// 数据库配置
const config = {
    development: {
        // 原有 SQLite/PostgreSQL/MySQL 配置保持不变...

        // 新增 MSSQL 配置
        mssql: {
            dialect: 'mssql',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 1433,
            database: process.env.DB_NAME || 'testdb',
            username: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || 'password',
            dialectOptions: {
                options: {
                    encrypt: false,  // 禁用加密
                    trustServerCertificate: true,  // 信任自签名证书
                    enableArithAbort: true,
                    connectTimeout: 30000,
                    requestTimeout: 30000,
                    cryptoCredentialsDetails: {
                        minVersion: 'TLSv1'
                    }
                }
            },
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            logging: console.log,
            define: {
                timestamps: true,
                underscored: true,
                underscoredAll: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at'
            }
        }
    },
    production: {
        // 生产环境 MSSQL 配置
        mssql: {
            dialect: 'mssql',
            host: process.env.DB_HOST_MSSQL,
            port: parseInt(process.env.DB_PORT_MSSQL) || 1433,
            database: process.env.DB_NAME_MSSQL,
            username: process.env.DB_USER_MSSQL,
            password: process.env.DB_PASSWORD_MSSQL,
            dialectOptions: {
                options: {
                    encrypt: true, // Azure SQL 必须为 true
                    trustServerCertificate: false,
                    enableArithAbort: true,
                    connectTimeout: 30000,
                    requestTimeout: 30000,
                }
            },
            pool: {
                max: 20,
                min: 5,
                acquire: 60000,
                idle: 30000
            },
            logging: false,
            define: {
                timestamps: true,
                underscored: true,
                underscoredAll: true
            }
        }
    }
};

// 根据环境变量选择数据库类型
//const dbType = process.env.DB_TYPE || 'sqlite'; // sqlite, postgres, mysql, mssql
const dbType = process.env.DB_DIALECT || 'sqlite'; // sqlite, postgres, mysql, mssql

// 创建 Sequelize 实例
let sequelize;
if (dbType === 'mssql') {
    sequelize = new Sequelize(config[env].mssql);
} else {
    // 原有的其他数据库配置
    sequelize = new Sequelize(config[env]);
}
//console.log('同步数据库......')
//await sequelize.sync();
// 测试连接
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✓ 数据库连接成功');
        console.log(`  方言: ${dbType}`);
        if (dbType === 'mssql') {
            console.log(`  服务器: ${config[env].mssql.host}:${config[env].mssql.port}`);
            console.log(`  数据库: ${config[env].mssql.database}`);
        } else {
            console.log(`  数据库: ${config[env][dbType]?.database || config[env].storage}`);
        }
    } catch (error) {
        console.error('✗ 数据库连接失败:', error.message);
        process.exit(1);
    }
};

testConnection();

module.exports = sequelize;
module.exports.config = config[env][dbType] || config[env];