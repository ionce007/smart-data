// pages/api/mcp/modules/database.module.js
import { BaseModule } from './base.module';
import db from '../../../../models';
import { Sequelize } from 'sequelize';

export class DatabaseModule extends BaseModule {
    constructor() {
        super('database');

        // 方法描述
        this.methodDescriptions = {
            // 查询相关
            query: '执行原始 SQL 查询（只读，仅限 SELECT）',
            execute: '执行存储过程或函数',

            // 表信息相关
            listTables: '获取所有表列表',
            getTableInfo: '获取表结构信息',
            getTableStats: '获取表统计信息',

            // 数据库状态相关
            getStatus: '获取数据库连接状态',
            getMetrics: '获取数据库性能指标',
            testConnection: '测试数据库连接',

            // 备份和恢复（只读操作）
            getBackupInfo: '获取备份信息',
            getTransactionLog: '获取事务日志信息',

            // 索引管理
            listIndexes: '列出表的索引',
            getIndexStats: '获取索引统计信息',

            // 数据库配置
            getConfig: '获取数据库配置信息',
            getVersion: '获取数据库版本',

            // 性能分析
            getSlowQueries: '获取慢查询日志',
            getActiveConnections: '获取活跃连接数',
            getLockInfo: '获取锁信息'
        };

        // 方法参数定义
        this.methodParameters = {
            query: {
                type: 'object',
                required: ['sql'],
                properties: {
                    sql: { type: 'string', description: 'SQL 查询语句' },
                    replacements: { type: 'object', description: '参数替换' },
                    limit: { type: 'integer', description: '结果数量限制', default: 100 },
                    timeout: { type: 'integer', description: '查询超时时间(ms)', default: 30000 }
                }
            },

            execute: {
                type: 'object',
                required: ['procedure'],
                properties: {
                    procedure: { type: 'string', description: '存储过程名称' },
                    parameters: { type: 'object', description: '存储过程参数' },
                    timeout: { type: 'integer', description: '执行超时时间(ms)', default: 60000 }
                }
            },

            listTables: {
                type: 'object',
                properties: {
                    schema: { type: 'string', description: '数据库模式（仅部分数据库支持）' },
                    detailed: { type: 'boolean', description: '是否返回详细信息', default: false }
                }
            },

            getTableInfo: {
                type: 'object',
                required: ['tableName'],
                properties: {
                    tableName: { type: 'string', description: '表名' },
                    schema: { type: 'string', description: '数据库模式' }
                }
            },

            getTableStats: {
                type: 'object',
                required: ['tableName'],
                properties: {
                    tableName: { type: 'string', description: '表名' },
                    schema: { type: 'string', description: '数据库模式' }
                }
            },

            getSlowQueries: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 10 },
                    duration: { type: 'integer', description: '最小执行时间(ms)', default: 1000 },
                    since: { type: 'string', description: '起始时间' }
                }
            },

            getActiveConnections: {
                type: 'object',
                properties: {
                    detailed: { type: 'boolean', default: false }
                }
            }
        };
    }

    getMethodDescription(methodName) {
        return this.methodDescriptions[methodName] || `${this.name} module method`;
    }

    getMethodParameters(methodName) {
        return this.methodParameters[methodName] || {};
    }

    /**
     * 获取当前数据库方言
     */
    _getDialect() {
        return db.sequelize.options.dialect;
    }

    /**
     * 安全检查：只允许 SELECT 查询
     */
    _isSelectQuery(sql) {
        const normalizedSql = sql.trim().toUpperCase();
        return normalizedSql.startsWith('SELECT');
    }

    /**
     * 根据数据库方言添加 LIMIT 子句
     */
    _addLimitClause(sql, limit, dialect) {
        const normalizedSql = sql.trim().toUpperCase();

        if (limit <= 0) return sql;

        // 如果已经包含 LIMIT 或 TOP，不再添加
        if (normalizedSql.includes('LIMIT') || normalizedSql.includes('TOP')) {
            return sql;
        }

        switch (dialect) {
            case 'mssql':
                // SQL Server 使用 SELECT TOP n
                return sql.replace(/SELECT\s+/i, `SELECT TOP ${limit} `);

            case 'mysql':
            case 'mariadb':
            case 'postgres':
            case 'sqlite':
                return `${sql} LIMIT ${limit}`;

            default:
                return sql;
        }
    }

    /**
     * 执行 SQL 查询（只读）
     */
    async query(params, context) {
        const { sql, replacements = {}, limit = 100, timeout = 30000 } = params;

        // 安全检查
        if (!this._isSelectQuery(sql)) {
            throw {
                code: -40300,
                message: 'Only SELECT queries are allowed for security reasons'
            };
        }

        const dialect = this._getDialect();
        const finalSql = this._addLimitClause(sql, limit, dialect);

        try {
            // 设置查询超时
            const queryOptions = {
                replacements,
                type: db.Sequelize.QueryTypes.SELECT,
                timeout,
                logging: (log) => console.log(`[Database Query] ${log}`)
            };

            const startTime = Date.now();
            const results = await db.sequelize.query(finalSql, queryOptions);
            const executionTime = Date.now() - startTime;

            return {
                success: true,
                data: results,
                metadata: {
                    rowCount: results.length,
                    executionTimeMs: executionTime,
                    dialect,
                    truncated: results.length >= limit,
                    sql: finalSql.substring(0, 200) + (finalSql.length > 200 ? '...' : '')
                }
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Query execution failed: ${error.message}`,
                data: { sql: finalSql.substring(0, 200) }
            };
        }
    }

    /**
     * 执行存储过程
     */
    async execute(params, context) {
        const { procedure, parameters = {}, timeout = 60000 } = params;
        const dialect = this._getDialect();

        try {
            let sql;
            const replacements = {};

            // 根据数据库方言构建存储过程调用语法
            switch (dialect) {
                case 'mssql':
                    // SQL Server: EXEC procedure @param1=:value1, @param2=:value2
                    const paramList = Object.entries(parameters)
                        .map(([key, value]) => {
                            replacements[key] = value;
                            return `@${key}=:${key}`;
                        })
                        .join(', ');

                    sql = paramList ? `EXEC ${procedure} ${paramList}` : `EXEC ${procedure}`;
                    break;

                case 'mysql':
                    // MySQL: CALL procedure(:param1, :param2)
                    const placeholders = Object.keys(parameters)
                        .map(key => {
                            replacements[key] = parameters[key];
                            return `:${key}`;
                        })
                        .join(', ');

                    sql = `CALL ${procedure}(${placeholders})`;
                    break;

                case 'postgres':
                    // PostgreSQL: SELECT * FROM procedure(param1, param2)
                    const pgParams = Object.values(parameters).map(val => {
                        if (typeof val === 'string') return `'${val}'`;
                        return val;
                    }).join(', ');

                    sql = `SELECT * FROM ${procedure}(${pgParams})`;
                    break;

                default:
                    throw new Error(`Stored procedures not supported for dialect: ${dialect}`);
            }

            const startTime = Date.now();
            const results = await db.sequelize.query(sql, {
                replacements,
                timeout,
                type: db.Sequelize.QueryTypes.SELECT
            });
            const executionTime = Date.now() - startTime;

            return {
                success: true,
                data: results,
                metadata: {
                    procedure,
                    executionTimeMs: executionTime,
                    dialect,
                    rowCount: results.length
                }
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Procedure execution failed: ${error.message}`,
                data: { procedure }
            };
        }
    }

    /**
     * 列出所有表
     */
    async listTables(params, context) {
        const { schema, detailed = false } = params;
        const dialect = this._getDialect();

        try {
            let tables = [];
            let tableList = [];

            // 根据数据库方言获取表列表
            if (dialect === 'mssql') {
                const sql = schema
                    ? `SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = :schema`
                    : `SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES`;

                tables = await db.sequelize.query(sql, {
                    replacements: { schema },
                    type: db.Sequelize.QueryTypes.SELECT
                });

                if (detailed) {
                    // 获取每个表的详细信息
                    for (const table of tables) {
                        const stats = await this.getTableStats({
                            tableName: table.TABLE_NAME,
                            schema: table.TABLE_SCHEMA
                        });
                        tableList.push({
                            ...table,
                            stats: stats.data
                        });
                    }
                } else {
                    tableList = tables;
                }
            }
            else if (dialect === 'mysql') {
                const sql = schema
                    ? `SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = :schema`
                    : `SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES`;

                tables = await db.sequelize.query(sql, {
                    replacements: { schema: schema || db.sequelize.config.database },
                    type: db.Sequelize.QueryTypes.SELECT
                });
                tableList = tables;
            }
            else if (dialect === 'postgres') {
                const sql = schema
                    ? `SELECT tablename FROM pg_tables WHERE schemaname = :schema`
                    : `SELECT tablename, schemaname FROM pg_tables WHERE schemaname NOT IN ('information_schema', 'pg_catalog')`;

                tables = await db.sequelize.query(sql, {
                    replacements: { schema },
                    type: db.Sequelize.QueryTypes.SELECT
                });
                tableList = tables;
            }
            else if (dialect === 'sqlite') {
                tables = await db.sequelize.query(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
                    { type: db.Sequelize.QueryTypes.SELECT }
                );
                tableList = tables;
            }

            // 获取模型定义的表（Sequelize 模型）
            const modelTables = Object.keys(db)
                .filter(key => key !== 'sequelize' && key !== 'Sequelize')
                .map(key => ({
                    modelName: key,
                    tableName: db[key].tableName
                }));

            return {
                success: true,
                data: {
                    tables: tableList,
                    modelTables,
                    count: tableList.length
                },
                dialect
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Failed to list tables: ${error.message}`
            };
        }
    }

    /**
     * 获取表结构信息
     */
    async getTableInfo(params, context) {
        const { tableName, schema } = params;
        const dialect = this._getDialect();

        try {
            let columns = [];

            if (dialect === 'mssql') {
                columns = await db.sequelize.query(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH as MAX_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT as DEFAULT_VALUE,
            COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IS_IDENTITY,
            (
              SELECT COUNT(*)
              FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
              WHERE kcu.TABLE_NAME = cols.TABLE_NAME
                AND kcu.COLUMN_NAME = cols.COLUMN_NAME
                AND kcu.CONSTRAINT_NAME LIKE '%PK%'
            ) as IS_PRIMARY_KEY
          FROM INFORMATION_SCHEMA.COLUMNS cols
          WHERE TABLE_NAME = :tableName
          ${schema ? 'AND TABLE_SCHEMA = :schema' : ''}
          ORDER BY ORDINAL_POSITION
        `, {
                    replacements: { tableName, schema },
                    type: db.Sequelize.QueryTypes.SELECT
                });
            }
            else if (dialect === 'mysql') {
                columns = await db.sequelize.query(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH as MAX_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT as DEFAULT_VALUE,
            COLUMN_KEY as KEY_TYPE,
            EXTRA
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = :tableName
          ${schema ? 'AND TABLE_SCHEMA = :schema' : ''}
          ORDER BY ORDINAL_POSITION
        `, {
                    replacements: { tableName, schema },
                    type: db.Sequelize.QueryTypes.SELECT
                });
            }
            else if (dialect === 'postgres') {
                columns = await db.sequelize.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length as max_length,
            is_nullable,
            column_default as default_value
          FROM information_schema.columns
          WHERE table_name = :tableName
          ${schema ? 'AND table_schema = :schema' : ''}
          ORDER BY ordinal_position
        `, {
                    replacements: { tableName, schema },
                    type: db.Sequelize.QueryTypes.SELECT
                });
            }

            return {
                success: true,
                data: {
                    tableName,
                    schema,
                    columns,
                    columnCount: columns.length
                }
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Failed to get table info: ${error.message}`
            };
        }
    }

    /**
     * 获取表统计信息
     */
    async getTableStats(params, context) {
        const { tableName, schema } = params;
        const dialect = this._getDialect();

        try {
            let rowCount = 0;
            let tableSize = 0;
            let indexCount = 0;

            if (dialect === 'mssql') {
                // 获取行数
                const countResult = await db.sequelize.query(
                    `SELECT COUNT(*) as count FROM ${tableName}`,
                    { type: db.Sequelize.QueryTypes.SELECT }
                );
                rowCount = countResult[0].count;

                // 获取表大小
                const sizeResult = await db.sequelize.query(`
          SELECT 
            SUM(reserved_page_count) * 8 / 1024 as size_mb
          FROM sys.dm_db_partition_stats
          WHERE object_id = OBJECT_ID(:tableName)
        `, {
                    replacements: { tableName },
                    type: db.Sequelize.QueryTypes.SELECT
                });
                tableSize = sizeResult[0]?.size_mb || 0;

                // 获取索引数量
                const indexResult = await db.sequelize.query(`
          SELECT COUNT(*) as count
          FROM sys.indexes
          WHERE object_id = OBJECT_ID(:tableName)
            AND name IS NOT NULL
            AND type_desc != 'HEAP'
        `, {
                    replacements: { tableName },
                    type: db.Sequelize.QueryTypes.SELECT
                });
                indexCount = indexResult[0].count;
            }
            else if (dialect === 'mysql') {
                const stats = await db.sequelize.query(`
          SELECT 
            TABLE_ROWS as row_count,
            DATA_LENGTH + INDEX_LENGTH as total_size_bytes,
            INDEX_LENGTH as index_size_bytes
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_NAME = :tableName
        `, {
                    replacements: { tableName },
                    type: db.Sequelize.QueryTypes.SELECT
                });

                rowCount = stats[0]?.row_count || 0;
                tableSize = Math.round((stats[0]?.total_size_bytes || 0) / 1024 / 1024);
            }

            return {
                success: true,
                data: {
                    tableName,
                    rowCount,
                    tableSizeMB: tableSize,
                    indexCount,
                    lastAnalyzed: new Date().toISOString()
                }
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Failed to get table stats: ${error.message}`
            };
        }
    }

    /**
     * 获取数据库状态
     */
    async getStatus(params, context) {
        const dialect = this._getDialect();

        try {
            let status = {
                dialect,
                connected: true,
                timestamp: new Date().toISOString()
            };

            // 获取连接池状态
            if (db.sequelize.connectionManager && db.sequelize.connectionManager.pool) {
                const pool = db.sequelize.connectionManager.pool;
                status.pool = {
                    size: pool.size,
                    available: pool.available,
                    waiting: pool.waitingCount || 0
                };
            }

            // 获取数据库特定状态
            if (dialect === 'mssql') {
                const [dbInfo] = await db.sequelize.query(`
          SELECT 
            DB_NAME() as database_name,
            @@VERSION as version,
            @@SERVERNAME as server_name
        `);
                status.database = dbInfo[0];
            }
            else if (dialect === 'mysql') {
                const [dbInfo] = await db.sequelize.query('SELECT DATABASE() as database_name, VERSION() as version');
                status.database = dbInfo[0];
            }
            else if (dialect === 'postgres') {
                const [dbInfo] = await db.sequelize.query('SELECT current_database() as database_name, version() as version');
                status.database = dbInfo[0];
            }

            return {
                success: true,
                data: status
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Failed to get database status: ${error.message}`
            };
        }
    }

    /**
     * 获取数据库版本
     */
    async getVersion(params, context) {
        const dialect = this._getDialect();

        try {
            let version = '';

            if (dialect === 'mssql') {
                const [result] = await db.sequelize.query('SELECT @@VERSION as version');
                version = result[0].version;
            }
            else if (dialect === 'mysql') {
                const [result] = await db.sequelize.query('SELECT VERSION() as version');
                version = result[0].version;
            }
            else if (dialect === 'postgres') {
                const [result] = await db.sequelize.query('SELECT VERSION() as version');
                version = result[0].version;
            }
            else if (dialect === 'sqlite') {
                const [result] = await db.sequelize.query('SELECT sqlite_version() as version');
                version = result[0].version;
            }

            return {
                success: true,
                data: {
                    dialect,
                    version,
                    fullVersion: version
                }
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Failed to get database version: ${error.message}`
            };
        }
    }

    /**
     * 测试数据库连接
     */
    async testConnection(params, context) {
        try {
            const startTime = Date.now();
            await db.sequelize.authenticate();
            const endTime = Date.now();

            return {
                success: true,
                data: {
                    connected: true,
                    latency: endTime - startTime,
                    dialect: this._getDialect(),
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                data: {
                    connected: false,
                    error: error.message,
                    dialect: this._getDialect(),
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * 获取活跃连接数
     */
    async getActiveConnections(params, context) {
        const { detailed = false } = params;
        const dialect = this._getDialect();

        try {
            let connections = [];

            if (dialect === 'mssql') {
                connections = await db.sequelize.query(`
          SELECT 
            session_id,
            login_name,
            status,
            last_request_start_time,
            last_request_end_time,
            reads,
            writes
          FROM sys.dm_exec_sessions
          WHERE is_user_process = 1
        `, { type: db.Sequelize.QueryTypes.SELECT });
            }
            else if (dialect === 'mysql') {
                connections = await db.sequelize.query('SHOW PROCESSLIST', {
                    type: db.Sequelize.QueryTypes.SELECT
                });
            }
            else if (dialect === 'postgres') {
                connections = await db.sequelize.query(`
          SELECT 
            pid,
            usename,
            application_name,
            client_addr,
            state,
            query_start
          FROM pg_stat_activity
          WHERE state = 'active'
        `, { type: db.Sequelize.QueryTypes.SELECT });
            }

            return {
                success: true,
                data: {
                    count: connections.length,
                    connections: detailed ? connections : connections.length,
                    dialect
                }
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Failed to get active connections: ${error.message}`
            };
        }
    }

    /**
     * 获取慢查询日志
     */
    async getSlowQueries(params, context) {
        const { limit = 10, duration = 1000, since } = params;
        const dialect = this._getDialect();

        try {
            let slowQueries = [];

            if (dialect === 'mssql') {
                slowQueries = await db.sequelize.query(`
          SELECT TOP ${limit}
            qs.total_elapsed_time / 1000000 as duration_seconds,
            qs.execution_count,
            qs.total_logical_reads,
            qs.total_logical_writes,
            SUBSTRING(st.text, (qs.statement_start_offset/2) + 1,
              ((CASE qs.statement_end_offset
                WHEN -1 THEN DATALENGTH(st.text)
                ELSE qs.statement_end_offset
              END - qs.statement_start_offset)/2) + 1) as query_text,
            qs.last_execution_time
          FROM sys.dm_exec_query_stats qs
          CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
          WHERE qs.total_elapsed_time / 1000000 >= :duration
          ORDER BY qs.total_elapsed_time DESC
        `, {
                    replacements: { duration },
                    type: db.Sequelize.QueryTypes.SELECT
                });
            }
            else if (dialect === 'mysql') {
                slowQueries = await db.sequelize.query(`
          SELECT 
            query_time as duration_seconds,
            rows_examined,
            rows_sent,
            sql_text as query_text
          FROM mysql.slow_log
          WHERE query_time >= :duration
          ORDER BY query_time DESC
          LIMIT :limit
        `, {
                    replacements: { duration, limit },
                    type: db.Sequelize.QueryTypes.SELECT
                });
            }

            return {
                success: true,
                data: slowQueries,
                metadata: {
                    limit,
                    duration,
                    count: slowQueries.length
                }
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Failed to get slow queries: ${error.message}`
            };
        }
    }

    /**
     * 获取锁信息
     */
    async getLockInfo(params, context) {
        const dialect = this._getDialect();

        try {
            let locks = [];

            if (dialect === 'mssql') {
                locks = await db.sequelize.query(`
          SELECT 
            request_session_id,
            resource_type,
            resource_database_id,
            resource_description,
            request_mode,
            request_status
          FROM sys.dm_tran_locks
          WHERE request_status != 'GRANT'
        `, { type: db.Sequelize.QueryTypes.SELECT });
            }
            else if (dialect === 'mysql') {
                locks = await db.sequelize.query('SHOW OPEN TABLES WHERE In_use > 0', {
                    type: db.Sequelize.QueryTypes.SELECT
                });
            }
            else if (dialect === 'postgres') {
                locks = await db.sequelize.query(`
          SELECT 
            l.pid,
            l.mode,
            l.granted,
            a.query
          FROM pg_locks l
          JOIN pg_stat_activity a ON l.pid = a.pid
          WHERE NOT l.granted
        `, { type: db.Sequelize.QueryTypes.SELECT });
            }

            return {
                success: true,
                data: {
                    locks,
                    count: locks.length,
                    hasDeadlocks: locks.length > 0
                }
            };
        } catch (error) {
            throw {
                code: -50000,
                message: `Failed to get lock info: ${error.message}`
            };
        }
    }
}