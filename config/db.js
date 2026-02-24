const sequelize = require('./sequelize');
import tedious from 'tedious'; //显式导入，避免EdgeOne打包时的错误

// 数据库工具函数
const db = {
  // 同步所有模型（开发环境使用）
  sync: async (options = { force: false }) => {
    try {
      await sequelize.sync(options);
      console.log(`✓ 数据库同步完成${options.force ? ' (强制同步)' : ''}`);
    } catch (error) {
      console.error('✗ 数据库同步失败:', error.message);
      throw error;
    }
  },

  // 获取 Sequelize 实例
  getSequelize: () => sequelize,

  // 事务包装器
  transaction: async (callback) => {
    const t = await sequelize.transaction();
    try {
      const result = await callback(t);
      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  // 关闭连接
  close: async () => {
    try {
      await sequelize.close();
      console.log('✓ 数据库连接已关闭');
    } catch (error) {
      console.error('✗ 关闭数据库连接失败:', error.message);
      throw error;
    }
  }
};

module.exports = db;