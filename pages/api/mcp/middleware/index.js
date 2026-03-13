// pages/api/mcp/middleware/index.js
import { loggerMiddleware } from './logger';

export const middleware = [
    loggerMiddleware,
    // 其他中间件...
];