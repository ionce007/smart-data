// lib/token.js   token管理
const bcrypt = require('bcryptjs');

// 模拟用户数据库
const users = [
    {
        id: 1,
        username: 'adxhs_guest',
        password: bcrypt.hashSync('adxhs_guest', 10),
        role: 'guest',
        createdAt: new Date('2024-01-01')
    },
    {
        id: 2,
        username: 'john',
        password: bcrypt.hashSync('john123', 10),
        role: 'user',
        createdAt: new Date('2024-01-02')
    },
    {
        id: 3,
        username: 'jane',
        password: bcrypt.hashSync('jane123', 10),
        role: 'user',
        createdAt: new Date('2024-01-03')
    }
];

// 模拟刷新令牌存储（生产环境应该用Redis）
const refreshTokens = new Map();

// 初始化一些刷新令牌
refreshTokens.set(1, []);
refreshTokens.set(2, []);
refreshTokens.set(3, []);

// 工具函数：通过用户名查找用户
function findUserByUsername(username) {
    return users.find(user => user.username === username);
}

// 工具函数：通过ID查找用户
function findUserById(id) {
    return users.find(user => user.id === id);
}

// 工具函数：保存刷新令牌
function saveRefreshToken(userId, token) {
    const userTokens = refreshTokens.get(userId) || [];
    // 限制每个用户最多保存5个刷新令牌
    userTokens.push(token);
    if (userTokens.length > 5) {
        userTokens.shift();
    }
    refreshTokens.set(userId, userTokens);
}

// 工具函数：验证刷新令牌是否存在
function isValidRefreshToken(userId, token) {
    const userTokens = refreshTokens.get(userId) || [];
    return userTokens.includes(token);
}

// 工具函数：删除刷新令牌（登出时使用）
function removeRefreshToken(userId, token) {
    const userTokens = refreshTokens.get(userId) || [];
    const index = userTokens.indexOf(token);
    if (index > -1) {
        userTokens.splice(index, 1);
        refreshTokens.set(userId, userTokens);
    }
}

module.exports = {
    users,
    refreshTokens,
    findUserByUsername,
    findUserById,
    saveRefreshToken,
    isValidRefreshToken,
    removeRefreshToken
};