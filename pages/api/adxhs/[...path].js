//import { NextResponse } from 'next/server';
//import { Auth } from '../../../models';
import adXHS from '../service/adxhs';
import { addDate } from '../../../lib';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '../../../lib/jwt';
import { findUserById, isValidRefreshToken, saveRefreshToken } from '../../../lib/token'  //'../../lib/token';
import { serialize } from 'cookie';
import { NextResponse } from 'next/server';

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
    //res.setHeader('Cookie', `token=${refreshToken}; secure=true;sameSite=none;HttpOnly; Path=/; Max-Age=604800`);
    //const response = NextResponse.json({ token: accessToken });
    // 更新cookie中的刷新令牌
    /*response.cookies.set({
        name: 'token',
        value: accessToken,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
    });*/
    try {
        let data = {};
        if (req.method === 'GET') {
            switch (fullPath) {
                case 'auth-status':
                    const auth = await adXHS.getAccessTokenFromDB();
                    if (auth.code === -2) data = { code: 1, status: '未授权', reAuth: true, token: 'refreshToken' }
                    else if (auth.code === -1) data = { code: -1, status: '系统错误', reAuth: true, token: 'refreshToken' }
                    else {
                        const tokenExpired = addDate(new Date(auth.data.update_time), auth.data.access_token_expires_in, 'second');
                        const refreshTokenExpired = addDate(new Date(auth.data.update_time), auth.data.refresh_token_expires_in, 'second');
                        const reAuth = adXHS.isRefreshTokenExpired(auth.data) === true;
                        data = { code: 0, status: 'Token正常', expireDate: tokenExpired, expired: adXHS.isAccessTokenExpired(auth.data), refreshExpireDate: refreshTokenExpired, refreshExpired: adXHS.isRefreshTokenExpired(auth.data), reAuth: reAuth, token: 'refreshToken' }
                    }
                    break;
            }
        }
        else if (req.method === 'POST') {
            switch (fullPath) {
                case 'refresh-token':
                    const token = req.cookies ? req.cookies['token'] : null;
                    if (!token) { data = { code: 1, status: 'fail', msg: '无效token', data: {}, reAuth: false }; }
                    else {
                        const payload = await verifyAccessToken(token);
                        if (!payload) data = { code: 2, status: 'fail', msg: 'token过期', data: {} , reAuth: false};
                        else {
                            let auth = await adXHS.getAccessTokenFromDB();
                            const refreshExpired = adXHS.isRefreshTokenExpired(auth.data);
                            const scope = encodeURIComponent(`["report_service","ad_query","ad_manage","account_manage"]`)
                            const redirectUri = encodeURIComponent(process.env.ADXHS_AUTH_REDIRECT_URL)
                            const authUrl = `https://ad-market.xiaohongshu.com/auth?appId=${process.env.ADXHS_APPID}&scope=${scope}&redirectUri=${redirectUri}&state=ADXHS`
                            if (refreshExpired) data = { code: 3, status: 'fail', msg: 'refresh_token过期，需重新授权', data: {}, reAuth: true, authUrl: authUrl };
                            else {
                                auth = await adXHS.refreshToken(auth.data.refresh_token)
                                if (!auth || !auth.data) data = { code: 4, status: 'fail', msg: '更新access_token失败', data: {}, reAuth: false };
                                else {
                                    const newToken = await adXHS.saveAccessToken(auth.data);
                                    if (!newToken || newToken.code !== 0) data = { code: 5, status: 'fail', msg: '保存新的token失败', data: {}, reAuth: false };
                                    else {
                                        const tokenExpired = addDate(new Date(auth.data.update_time), auth.data.access_token_expires_in, 'second');
                                        const refreshTokenExpired = addDate(new Date(auth.data.update_time), auth.data.refresh_token_expires_in, 'second');
                                        const reAuth = adXHS.isRefreshTokenExpired(auth.data) === true;
                                        data = { code: 0, status: 'Token正常', expireDate: tokenExpired, expired: adXHS.isAccessTokenExpired(auth.data), refreshExpireDate: refreshTokenExpired, refreshExpired: adXHS.isRefreshTokenExpired(auth.data), reAuth: reAuth }
                                    }
                                }
                            }
                        }
                    }

            }
        }
        res.json(data);
    }
    catch (error) {
        console.error(`[${context.requestId}] 请求错误:`, error);
        res.status(500).json({ success: 'false', code: -1, msg: error.message || 'Internal server error' });
    }

    //return res;
}