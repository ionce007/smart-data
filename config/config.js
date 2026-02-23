const { logging } = require('@/next.config');

// config/config.js
require('dotenv').config({ path: '.env.local' });

const dbType = process.env.DB_TYPE || 'sqlite';

const baseConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 1433,
  dialect: 'mssql',
  logging: false,
  dialectOptions: {
    options: {
      encrypt: false,  // 禁用加密以兼容旧版 SQL Server
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000,
      cryptoCredentialsDetails: {
        minVersion: 'TLSv1',
        maxVersion: 'TLSv1.2'
      }
    }
  },
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

module.exports = {
  development: dbType === 'mssql' ? baseConfig : {
    // 其他数据库配置
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.DB_STORAGE || './data/database.sqlite',
    logging: false //console.log
  },
  test: {
    // 测试环境配置
    ...baseConfig,
    logging: false
  },
  production: {
    // 生产环境配置
    ...baseConfig,
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 30000
    }
  }
};