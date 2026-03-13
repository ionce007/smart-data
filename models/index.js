// models/index.js
'use strict';

const Sequelize = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const db = {};

// 根据数据库类型创建连接
let sequelize;

if (process.env.DB_TYPE === 'mssql') {
    sequelize = new Sequelize({
        dialect: 'mssql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 1433,
        database: process.env.DB_NAME || 'testdb',
        username: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || 'password',
        databaseVersion: '10.50.1600', // SQL Server 2008 R2 的版本号
        dialectOptions: {
            options: {
                encrypt: false,
                trustServerCertificate: true,
                enableArithAbort: true,
                connectTimeout: 30000,
                requestTimeout: 30000
            }
        },
        logging: false,//console.log,
        define: {
            timestamps: true,
            underscored: true
        }
    });
} else {
    const config = require('../config/sequelize.js');
    sequelize = new Sequelize(config);
}

// 手动导入模型（不自动加载）
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Post = require('./Post')(sequelize, Sequelize.DataTypes);
const Auth = require('./Auth')(sequelize, Sequelize.DataTypes);

db.User = User;
db.Post = Post;
db.Auth = Auth;

// 建立模型关联
if (db.User.associate) db.User.associate(db);
if (db.Post.associate) db.Post.associate(db);
//if (db.Auth.associate) db.Auth.associate(db); //Auth表没有关联关系，不用执行该行代码。

//sequelize.sync();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log('✅ 模型加载完成:', Object.keys(db).filter(key => key !== 'sequelize' && key !== 'Sequelize'));

module.exports = db;