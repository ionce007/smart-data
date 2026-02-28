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
                if (parsedUrl.pathname.toLowerCase().trim() === CALLBACK_PATH.toLowerCase().trim()) {
                    const authCode = req.query?.auth_code || '';
                    const state = req.query?.state || 'ADXHS'; // 防CSRF，如有则校验
                    if(!authCode){
                        console.log('authCode值为空');
                        res.json({success: false, code: -1, msg: '获取的authCode值为空。'});
                    }
                    const token = await adxhs.getAccessTokenFromAdxhs(authCode);
                    if(token.code === 0 ) {
                        const data = await adxhs.saveAccessToken(token.data, 'adxhs');
                        if(data) res.json({code: data.ocde, success: false, msg: data.msg});
                        else res.json({code: -1, success: false, msg: 'Token存档失败！'});
                    }
                    res.json({code: 0, success: true, msg: 'ok'});
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
