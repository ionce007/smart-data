import { Auth } from '../../../models';
import adXHS from '../service/adxhs';
import util from '../../../lib/utils';

export default async function handler(req, res) {
    const { path } = req.query;
    const fullPath = (path ? path.join('/') : '').toLowerCase();

    console.log('path = ', path, '    fullPath = ', fullPath);
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Client-ID');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // 创建请求上下文
    const context = {
        startTime: Date.now(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        clientIp: req.socket.remoteAddress
    };

    // 记录请求
    //console.log(`[${new Date().toISOString()}] [${context.requestId}] ${req.method} /api/mcp/${fullPath}`);

    try {
        let data = {};
        if (req.method === 'GET') {
            switch(fullPath){
                case 'auth-status':
                    const auth = await adXHS.getAccessTokenFromDB();
                    if(auth.code === -2) data = { code: 1, status: '未授权', }
                    else if(auth.code === -1) data = { code: -1, status: '系统错误'}
                    else{
                        const tokenExpired = util.addDate(new Date(auth.data.update_time), auth.data.access_token_expires_in, 'second');
                        const refreshTokenExpired = util.addDate(new Date(auth.data.update_time), auth.data.refresh_token_expires_in, 'second');
                        if(adXHS.isAccessTokenExpired(auth.data)) data = { code: 2, status: 'Token过期', expired: tokenExpired, refreshEdpired: refreshTokenExpired }
                        else data = { code: 0, status: 'Token正常', expired: tokenExpired, refreshEdpired: refreshTokenExpired }
                    }
                    break;
            }
        }
        res.json(data);
    }
    catch (error) {
        console.error(`[${context.requestId}] 请求错误:`, error);
        res.status(500).json({ success: 'false', code: -1, msg: error.message || 'Internal server error' });
    }
}