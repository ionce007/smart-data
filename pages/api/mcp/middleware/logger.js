// pages/api/mcp/middleware/logger.js
import fs from 'fs';
import path from 'path';

/**
 * 日志级别枚举
 */
const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

/**
 * 日志中间件
 * 记录所有 MCP 请求的详细信息，支持控制台输出和文件存储
 */
export class LoggerMiddleware {
    constructor(options = {}) {
        this.options = {
            logToConsole: true,
            logToFile: process.env.LOG_TO_FILE === 'true', //process.env.NODE_ENV === 'production',
            logDir: path.join(process.cwd(), 'logs'),
            logLevel: process.env.LOG_LEVEL || 'INFO',
            maxLogSize: 10 * 1024 * 1024, // 10MB
            maxLogFiles: 5,
            ...options
        };

        // 确保日志目录存在
        if (this.options.logToFile) {
            this._ensureLogDir();
        }

        // 日志文件路径
        this.accessLogPath = path.join(this.options.logDir, 'mcp-access.log');
        this.errorLogPath = path.join(this.options.logDir, 'mcp-error.log');
        this.auditLogPath = path.join(this.options.logDir, 'mcp-audit.log');
    }

    /**
     * 确保日志目录存在
     */
    _ensureLogDir() {
        if (!fs.existsSync(this.options.logDir)) {
            fs.mkdirSync(this.options.logDir, { recursive: true });
        }
    }

    /**
     * 检查日志级别是否允许记录
     */
    _shouldLog(level) {
        const levels = Object.values(LogLevel);
        const currentLevelIndex = levels.indexOf(this.options.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    /**
     * 格式化日志消息
     */
    _formatLogEntry(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const requestId = data.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
            timestamp,
            level,
            requestId,
            message,
            ...data,
            environment: process.env.NODE_ENV || 'development',
            pid: process.pid
        };
    }

    /**
     * 写入日志文件
     */
    async _writeToFile(logPath, logEntry) {
        if (!this.options.logToFile) return;
        try {
            const logLine = JSON.stringify(logEntry) + '\n';

            // 检查文件大小
            if (fs.existsSync(logPath)) {
                const stats = fs.statSync(logPath);
                if (stats.size >= this.options.maxLogSize) {
                    await this._rotateLog(logPath);
                }
            }

            fs.appendFileSync(logPath, logLine);
        } catch (error) {
            console.error('Failed to write log file:', error);
        }
    }

    /**
     * 日志轮转
     */
    async _rotateLog(logPath) {
        try {
            for (let i = this.options.maxLogFiles - 1; i > 0; i--) {
                const oldFile = `${logPath}.${i}`;
                const newFile = `${logPath}.${i + 1}`;
                if (fs.existsSync(oldFile)) {
                    fs.renameSync(oldFile, newFile);
                }
            }

            if (fs.existsSync(logPath)) {
                fs.renameSync(logPath, `${logPath}.1`);
            }
        } catch (error) {
            console.error('Failed to rotate log:', error);
        }
    }

    /**
     * 记录访问日志
     */
    async log(level, message, data = {}) {
        if (!this._shouldLog(level)) return;
        const logEntry = this._formatLogEntry(level, message, data);

        // 控制台输出
        if (this.options.logToConsole) {
            const consoleMessage = `[${logEntry.timestamp}] [${level}] ${message}`;

            switch (level) {
                case LogLevel.ERROR:
                    console.error(consoleMessage, data.error || '');
                    break;
                case LogLevel.WARN:
                    console.warn(consoleMessage, data);
                    break;
                case LogLevel.DEBUG:
                    console.debug(consoleMessage, data);
                    break;
                default:
                    console.log(consoleMessage, data);
            }
        }

        // 文件输出
        if (level === LogLevel.ERROR) {
            await this._writeToFile(this.errorLogPath, logEntry);
        } else {
            await this._writeToFile(this.accessLogPath, logEntry);
        }
    }

    /**
     * 审计日志（记录敏感操作）
     */
    async audit(action, userId, data = {}) {
        const auditEntry = this._formatLogEntry('AUDIT', action, {
            userId,
            ...data,
            userAgent: data.userAgent,
            ip: data.ip
        });

        await this._writeToFile(this.auditLogPath, auditEntry);

        if (this.options.logToConsole) {
            console.log(`[AUDIT] ${action} - User: ${userId}`, data);
        }
    }

    /**
     * 调试日志
     */
    debug(message, data = {}) {
        return this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * 信息日志
     */
    info(message, data = {}) {
        return this.log(LogLevel.INFO, message, data);
    }

    /**
     * 警告日志
     */
    warn(message, data = {}) {
        return this.log(LogLevel.WARN, message, data);
    }

    /**
     * 错误日志
     */
    error(message, error, data = {}) {
        return this.log(LogLevel.ERROR, message, {
            ...data,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            }
        });
    }

    /**
     * 请求日志中间件函数
     */
    middleware() {
        return async (req, context = {}) => {
            const startTime = Date.now();
            const requestId = context.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 记录请求开始
            this.info(`Request started: ${req.method} ${req.url}`, {
                requestId,
                method: req.method,
                url: req.url,
                ip: req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
                referer: req.headers.referer,
                query: req.query
            });

            // 记录请求体（如果有）
            if (req.body && Object.keys(req.body).length > 0) {
                this.debug('Request body', {
                    requestId,
                    body: this._sanitizeBody(req.body)
                });
            }

            // 记录响应
            const originalEnd = res.end;
            res.end = function (chunk, encoding) {
                const duration = Date.now() - startTime;

                // 记录请求完成
                this.info(`Request completed: ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, {
                    requestId,
                    statusCode: res.statusCode,
                    duration,
                    contentLength: res.getHeader('content-length')
                });

                // 审计敏感操作
                if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
                    this.audit(`${req.method} ${req.url}`, context.userId, {
                        requestId,
                        statusCode: res.statusCode,
                        duration
                    });
                }

                originalEnd.call(this, chunk, encoding);
            }.bind(this);

            return true;
        };
    }

    /**
     * 清洗敏感数据（避免记录密码等）
     */
    _sanitizeBody(body) {
        const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey'];
        const sanitized = { ...body };

        const sanitize = (obj) => {
            for (const key in obj) {
                if (sensitiveFields.includes(key.toLowerCase())) {
                    obj[key] = '***REDACTED***';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitize(obj[key]);
                }
            }
        };

        sanitize(sanitized);
        return sanitized;
    }

    /**
     * 获取日志文件列表
     */
    getLogFiles() {
        if (!fs.existsSync(this.options.logDir)) {
            return [];
        }

        return fs.readdirSync(this.options.logDir)
            .filter(file => file.startsWith('mcp-') && file.endsWith('.log'))
            .map(file => ({
                name: file,
                path: path.join(this.options.logDir, file),
                size: fs.statSync(path.join(this.options.logDir, file)).size,
                modified: fs.statSync(path.join(this.options.logDir, file)).mtime
            }))
            .sort((a, b) => b.modified - a.modified);
    }

    /**
     * 读取日志文件内容
     */
    readLogFile(filename, lines = 100) {
        const filePath = path.join(this.options.logDir, filename);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Log file not found: ${filename}`);
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const logLines = content.split('\n').filter(line => line.trim());

        return logLines.slice(-lines).map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return { raw: line };
            }
        });
    }

    /**
     * 清理旧日志
     */
    cleanup() {
        const files = this.getLogFiles();
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天

        files.forEach(file => {
            if (now - file.modified.getTime() > maxAge) {
                fs.unlinkSync(file.path);
                this.info(`Deleted old log file: ${file.name}`);
            }
        });
    }
}

// 创建单例实例
const loggerInstance = new LoggerMiddleware({
    logToConsole: true,
    logToFile: process.env.LOG_TO_FILE === 'true', // process.env.NODE_ENV === 'production',
    logLevel: process.env.LOG_LEVEL || 'INFO'
});

// 导出日志中间件函数
export const loggerMiddleware = loggerInstance.middleware();

// 导出日志记录方法
export const logger = {
    debug: (message, data) => loggerInstance.debug(message, data),
    info: (message, data) => loggerInstance.info(message, data),
    warn: (message, data) => loggerInstance.warn(message, data),
    error: (message, error, data) => loggerInstance.error(message, error, data),
    audit: (action, userId, data) => loggerInstance.audit(action, userId, data),
    getLogFiles: () => loggerInstance.getLogFiles(),
    readLogFile: (filename, lines) => loggerInstance.readLogFile(filename, lines),
    cleanup: () => loggerInstance.cleanup()
};

// 导出日志级别
export { LogLevel };