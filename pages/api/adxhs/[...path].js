import adXHS from '@/lib/services/adxhs';  
import { addDate } from '@/lib';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '@/lib/jwt';
import { findUserById, isValidRefreshToken, saveRefreshToken } from '@/lib/token'
import xhsData from '@/lib/services/xhsdata';

const METHOD = ['GET', 'POST'];

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

    const user = findUserById(1);
    const accessToken = await generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);
    saveRefreshToken(user.id, refreshToken);

    const getParams = (req) => {
        const params = { ...req.query, ...req.body };
        Object.keys(params).forEach(key => {
            if (params[key] === undefined) delete params[key];
        });
        return params;
    };

    try {
        let data = {};
        const params = getParams(req);
        switch (fullPath) {
            case 'auth-status':
                data = await xhsData.checkAuthStatus();
                break;
            case 'refresh-token':
                if (req.method !== 'POST') return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null };
                const token = req.cookies ? req.cookies['token'] : null;
                data = await xhsData.refreshToken(token);
                break;
            case 'reauth':
                const scope = encodeURIComponent(`["report_service","ad_query","ad_manage","account_manage"]`)
                const redirectUri = encodeURIComponent(process.env.ADXHS_AUTH_REDIRECT_URL)
                const authUrl = `https://ad-market.xiaohongshu.com/auth?appId=${process.env.ADXHS_APPID}&scope=${scope}&redirectUri=${redirectUri}&state=ADXHS`
                data = { code: 0, status: 'success', msg: 'ok', url: authUrl }
                break;
            case 'taxonomy': //行业类目
                if (METHOD.indexOf(req.method) < 0) return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null };
                data = await xhsData.taxonomy();
                break;
            case 'taxonomy-attr': //行业类目属性
                if (METHOD.indexOf(req.method) < 0) return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null };
                data = await xhsData.taxonomyAttr(params);
                break;
            case 'keyword-match': //获取关键词匹配词库信息
                if (METHOD.indexOf(req.method) < 0) { return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null }; }
                data = await xhsData.keywordMatch(params);
                break;
            case 'target-info'://获取定向信息
                if (METHOD.indexOf(req.method) < 0) { return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null }; }
                data = await xhsData.targetInfo(params);
                break;
            case 'product':  //获取行业商品列表
                if (METHOD.indexOf(req.method) < 0) { return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null }; }
                data = await xhsData.product(params);
                break;
            case 'notelist': //获取笔记列表
                if (req.method !== 'POST') { return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null }; }
                data = await xhsData.notelist(params);
                break;
            case 'recommend': //定向推词-以词推词
                if (req.method !== 'POST') return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null };
                data = await xhsData.recommend(params);
                break;
            case 'keyword-info'://获取推荐关键词信息
                if (req.method !== 'POST') return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null };
                data = await xhsData.keywordInfo(params);
                break;
            case 'baglist': //词包推荐
                if (req.method !== 'POST') return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null };
                data = await xhsData.baglist(params);
                break;
            case 'crowd-estimate': //人群预估
                if (req.method !== 'POST') return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null };
                data = await xhsData.crowdEstimate(params);
                break;
            case 'check-dup': //计划单元名称重复性校验
                if (req.method !== 'POST') return { code: -2, success: false, msg: `不支持“${req.method}”的访问`, data: null };
                data = await xhsData.checkDup(params);
                break;
        }
        res.json(data);
    }
    catch (error) {
        console.error(`[${context.requestId}] 请求错误:`, error);
        res.status(500).json({ success: 'false', code: -1, msg: error.message || 'Internal server error' });
    }
}