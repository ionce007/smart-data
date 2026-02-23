// lib/init.js
/*const db = require('../models');

async function initializeDatabase() {
  try {
    console.log('开始同步数据库...');
    
    // 同步所有模型
    await db.sequelize.sync({ alter: true }); // 使用 alter 而不是 force，避免数据丢失
    // 或者使用 { force: true } 强制重建（会删除现有数据）
    // await db.sequelize.sync({ force: true });
    
    console.log('✅ 数据库同步完成');
    
    // 检查表是否创建成功
    const tables = await db.sequelize.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'",
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    console.log('现有表:', tables.map(t => t.TABLE_NAME).join(', '));
    
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
  }
}

module.exports = initializeDatabase;
*/
// lib/init.js
const initializeDatabase = async () => {
  // 检查是否在浏览器环境
  if (typeof window !== 'undefined') {
    console.log('浏览器环境，跳过数据库初始化');
    return;
  }

  try {
    // 动态导入 Node.js 模块
    const db = await import('../models');

    console.log('开始同步数据库...');
    await db.sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    await db.sequelize.sync({ force: false, alter: false });
    //await db.sequelize.sync();
    console.log('✅ 数据库同步完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
};

// 只在服务器端执行
if (typeof window === 'undefined') {
  initializeDatabase();
}

export default initializeDatabase;