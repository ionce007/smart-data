const db = require('../../../models');
const util = require('../../../lib/utils');
const adxhs = require('../service/adxhs');
const bcrypt = require('bcryptjs');

//const url = require('url');

export default async function handler(req, res) {
    const { method } = req;
    const CALLBACK_PATH = process.env.ADXHS_AUTH_CALLBACK_PATH;
    try {
        switch (method) {
            case 'GET':
                const parsedUrl = new URL(req.url, `http://${req.headers.host}`);// url.parse(req.url, true);
                if (parsedUrl.pathname === CALLBACK_PATH) {
                    const authCode = parsedUrl.query?.auth_code || '';
                    const state = parsedUrl.query?.state || 'ADXHS'; // 防CSRF，如有则校验
                    if(!authCode){
                        console.log('authCode值为空');
                        res.json({success: false, code: -1, msg: '获取的authCode值为空。'});
                        return;
                    }
                    const token = await adxhs.getAccessTokenFromAdxhs(authCode);
                    if(token.code === 0 ) await adxhs.saveAccessToken(token.data, 'adxhs');
                    return token;
                }
                break;
            case 'POST':
                break;
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            code: -101,
            msg: error.message
        });
    }

}
