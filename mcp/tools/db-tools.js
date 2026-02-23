// mcp/tools/db-tools.js
const db = require('../../models');
const JSONRPC = require('../protocol/jsonrpc');

class DatabaseTools {
  constructor() {
    this.namespace = 'db';
  }

  getToolDefinitions() {
    return [
      {
        name: 'db.query',
        description: '执行原始SQL查询（只读，仅限SELECT）',
        parameters: {
          type: 'object',
          required: ['sql'],
          properties: {
            sql: { type: 'string', description: 'SQL查询语句' },
            replacements: { type: 'object', description: '参数替换' },
            limit: { type: 'integer', description: '结果数量限制', default: 100 }
          }
        }
      },
      {
        name: 'db.stats',
        description: '获取数据库统计信息',
        parameters: {
          type: 'object',
          properties: {
            detailed: { type: 'boolean', default: false }
          }
        }
      },
      {
        name: 'db.tables',
        description: '获取所有表信息',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      // 新增 MSSQL 特定工具
      {
        name: 'db.mssql.procedures',
        description: '获取 MSSQL 存储过程列表',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'db.mssql.executeProcedure',
        description: '执行 MSSQL 存储过程',
        parameters: {
          type: 'object',
          required: ['procedureName'],
          properties: {
            procedureName: { type: 'string', description: '存储过程名称' },
            parameters: { type: 'object', description: '存储过程参数' }
          }
        }
      }
    ];
  }

  async execute(toolName, params, context = {}) {
    switch (toolName) {
      case 'db.query':
        return await this.executeQuery(params);
      case 'db.stats':
        return await this.getDatabaseStats(params);
      case 'db.tables':
        return await this.getTables();
      case 'db.mssql.procedures':
        return await this.getMSSQLProcedures();
      case 'db.mssql.executeProcedure':
        return await this.executeMSSQLProcedure(params);
      default:
        throw JSONRPC.ERROR_CODES.METHOD_NOT_FOUND;
    }
  }

  async executeQuery({ sql, replacements = {}, limit = 100 }) {
    // 安全检查：只允许SELECT语句
    const normalizedSql = sql.trim().toUpperCase();
    if (!normalizedSql.startsWith('SELECT')) {
      throw {
        code: -40300,
        message: 'Only SELECT queries are allowed for security reasons'
      };
    }

    // 根据数据库方言调整SQL
    const dialect = db.sequelize.getDialect();
    
    // MSSQL 特定的 TOP 语法
    if (dialect === 'mssql' && !normalizedSql.includes('TOP') && limit) {
      // 将 SELECT * FROM table 转换为 SELECT TOP 10 * FROM table
      sql = sql.replace(/SELECT\s+/i, `SELECT TOP ${limit} `);
    } else if (!normalizedSql.includes('LIMIT') && limit && dialect !== 'mssql') {
      sql += ` LIMIT ${limit}`;
    }

    try {
      const [results, metadata] = await db.sequelize.query(sql, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: results,
        rowCount: results.length,
        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        dialect
      };
    } catch (error) {
      throw {
        code: -50000,
        message: `Query execution failed: ${error.message}`
      };
    }
  }

  async getDatabaseStats({ detailed = false }) {
    const stats = {
      dialect: db.sequelize.getDialect(),
      tables: {},
      counts: {}
    };

    // 获取各表记录数
    stats.counts.users = await db.User.count();
    stats.counts.posts = await db.Post.count();

    if (detailed) {
      // 获取更详细的统计信息
      stats.tables.users = {
        active: await db.User.count({ where: { is_active: true } }),
        byRole: await db.User.findAll({
          attributes: ['role', [db.Sequelize.fn('COUNT', '*'), 'count']],
          group: ['role']
        })
      };

      stats.tables.posts = {
        byStatus: await db.Post.findAll({
          attributes: ['status', [db.Sequelize.fn('COUNT', '*'), 'count']],
          group: ['status']
        }),
        totalViews: await db.Post.sum('views'),
        totalLikes: await db.Post.sum('likes')
      };

      // 根据数据库类型获取特定信息
      if (stats.dialect === 'mssql') {
        const [dbSize] = await db.sequelize.query(`
          SELECT 
            DB_NAME() AS database_name,
            SUM(size * 8 / 1024) AS size_mb
          FROM sys.master_files
          WHERE type_desc = 'ROWS'
          GROUP BY DB_NAME()
        `);
        stats.databaseSize = dbSize[0]?.size_mb || 0;
      }
    }

    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };
  }

  async getTables() {
    const dialect = db.sequelize.getDialect();
    const tables = [];

    // 获取所有模型定义的表
    for (const modelName of Object.keys(db)) {
      if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
        const model = db[modelName];
        if (model.tableName) {
          tables.push({
            name: model.tableName,
            modelName: modelName,
            columns: Object.keys(model.rawAttributes).map(attr => ({
              name: attr,
              type: model.rawAttributes[attr].type.key,
              primaryKey: model.rawAttributes[attr].primaryKey || false
            }))
          });
        }
      }
    }

    // 如果是 MSSQL，还可以获取额外的表信息
    if (dialect === 'mssql') {
      const [systemTables] = await db.sequelize.query(`
        SELECT 
          TABLE_NAME,
          TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
      
      return {
        success: true,
        data: tables,
        systemTables,
        count: tables.length,
        dialect
      };
    }

    return {
      success: true,
      data: tables,
      count: tables.length,
      dialect
    };
  }

  // MSSQL 特定：获取存储过程列表
  async getMSSQLProcedures() {
    const dialect = db.sequelize.getDialect();
    
    if (dialect !== 'mssql') {
      throw {
        code: -40000,
        message: 'This tool is only available for MSSQL databases'
      };
    }

    const [procedures] = await db.sequelize.query(`
      SELECT 
        SPECIFIC_NAME AS procedure_name,
        ROUTINE_DEFINITION AS definition,
        CREATED AS created_date,
        LAST_ALTERED AS modified_date
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY SPECIFIC_NAME
    `);

    return {
      success: true,
      data: procedures,
      count: procedures.length
    };
  }

  // MSSQL 特定：执行存储过程
  async executeMSSQLProcedure({ procedureName, parameters = {} }) {
    const dialect = db.sequelize.getDialect();
    
    if (dialect !== 'mssql') {
      throw {
        code: -40000,
        message: 'This tool is only available for MSSQL databases'
      };
    }

    try {
      // 构建存储过程调用 SQL
      const paramNames = Object.keys(parameters);
      const paramPlaceholders = paramNames.map(name => `@${name}`).join(', ');
      
      let sql;
      if (paramNames.length > 0) {
        sql = `EXEC ${procedureName} ${paramPlaceholders}`;
      } else {
        sql = `EXEC ${procedureName}`;
      }

      const results = await db.sequelize.query(sql, {
        replacements: parameters,
        type: db.Sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: results,
        procedureName,
        parameters
      };
    } catch (error) {
      throw {
        code: -50000,
        message: `Failed to execute stored procedure: ${error.message}`
      };
    }
  }
}

module.exports = DatabaseTools;