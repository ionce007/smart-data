const db = require('../../../models');
const util = require('../../../lib');

async function getAccessTokenFromAdxhs(authCode) {
    try {
        const url = `https://adapi.xiaohongshu.com/api/open/oauth2/access_token`;
        const jsonData = { app_id: Number(process.env.ADXHS_APPID), secret: process.env.ADXHS_SECRET, auth_code: authCode }
        const data = JSON.stringify(jsonData)
        const response = await fetch(url, {
            headers: { "content-type": "application/json", },
            body: data,
            method: "POST"
        });
        const result = await response.json();
        return result;
    }
    catch (error) {
        console.log('getAccessTokenFromAdxhs error： ', error);
        return { code: -1, success: false, msg: error.message, data: null };
    }
}
async function refreshToken(refresh_token, platform = 'adxhs'){
    try {
        const url = `https://adapi.xiaohongshu.com/api/open/oauth2/refresh_token`;
        const jsonData = { app_id: Number(process.env.ADXHS_APPID), secret: process.env.ADXHS_SECRET, refresh_token: refresh_token }
        const data = JSON.stringify(jsonData)
        const response = await fetch(url, {
            headers: { "content-type": "application/json", },
            body: data,
            method: "POST"
        });
        const result = await response.json();
        return result;
    }
    catch (error) {
        console.log('refreshToken error： ', error);
        return { code: -1, success: false, msg: error.message, data: null };
    }
}
async function getAccessTokenFromDB(platform = 'adxhs') {
    try {
        let token = await db.Auth.findOne({ where: { platform: platform }, raw: true });
        if (!token) return { code: -2, success: false, msg: '获取的 Token 为空。', data: null };
        const json = JSON.parse(token.token);
        return { code: 0, success: true, msg: '获取的 Token 成功。', lastupdate: token.updated_at, data: json };
    }
    catch (error) {
        console.log('getAccessTokenFromDB error： ', error);
        return { code: -1, success: false, msg: error.message, data: null };
    }
}

async function isExistToken(platform = 'adxhs') {
    const token = await getAccessTokenFromDB(platform);
    if (token.code !== 0) return false;
    return true;
}
async function saveAccessToken(token, platform = 'adxhs') {
    try {
        let newToken = {}
        if (await isExistToken(platform)) {
            let dbToken = await db.Auth.findOne({ where: { platform: platform }, raw: true });
            newToken.token = JSON.stringify(token);
            newToken.platform = platform;
            await db.Auth.update(newToken, {where: { platform: platform } })
        }
        else {
            newToken = await db.Auth.create({ platform: platform, token: JSON.stringify(token) });
        }
        return {code: 0, success: true, msg: '成功', data: newToken };
    }
    catch (error) {
        console.log(error);
        return { code: -1, success: false, msg: error.message, data: null };
    }
}
function isAccessTokenExpired(token, platform = 'adxhs'){
    try{
        const expiredDate = util.addDate(new Date(token.update_time), token.access_token_expires_in, 'second');
        return expiredDate <= new Date();
    }
    catch(error){
        console.log(error);
        return true;
    }
}
function isRefreshTokenExpired(token, platform = 'adxhs'){
    try{
        const expiredDate = util.addDate(new Date(token.update_time), token.refresh_token_expires_in, 'second');
        return expiredDate <= new Date();
    }
    catch(error){
        console.log(error);
        return true;
    }
}
async function refreshAccessToken(oldToken, platform = 'adxhs'){
    if(!isAccessTokenExpired(oldToken, platform) && !isRefreshTokenExpired(oldToken, platform)) return oldToken;
    let newToken;
    if(isRefreshTokenExpired(oldToken, platform)) newToken = authorize(platform);
    else if(isAccessTokenExpired(oldToken, platform))  newToken = await refreshToken(oldToken.token.refresh_token, platform);
    return newToken;
}
function authorize(platform = 'adxhs'){
    const scope = encodeURIComponent(`["report_service","ad_query","ad_manage","account_manage"]`);
    const redirectUri = encodeURIComponent(process.env.ADXHS_AUTH_REDIRECT_URL);
    const url = `https://ad-market.xiaohongshu.com/auth?appId=${process.env.ADXHS_APPID}&scope=${scope}&redirectUri=${redirectUri}&state=ADXHS`
    return {code: 0, status: true, msg: '小红书授权', url: url};
}
module.exports = {
    getAccessTokenFromAdxhs,
    getAccessTokenFromDB,
    isExistToken,
    saveAccessToken,
    isAccessTokenExpired,
    isRefreshTokenExpired,
    refreshAccessToken,
    refreshToken,
    authorize
}