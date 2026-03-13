import { addDate, parseBoolean, formatDate } from '@/lib'
import adXHS from './adxhs';

const platform = 'adxhs';
const rootUrl = 'https://adapi.xiaohongshu.com'

const xhsData = {
    // 缓存 Promise 避免重复调用
    _token: null,

    _getVars: async () => {
        if (!xhsData._token) {
            const data = await adXHS.getAccessTokenFromDB(platform);
            if (data && data.code === 0) xhsData._token = data.data;
            else xhsData._token = null;
        }
        return xhsData._token;
    },

    access_token: async () => {
        let token = await xhsData._getVars();
        if (!token) return null;

        if (!adXHS.isRefreshTokenExpired(token)) {
            const expiredDate = addDate(new Date(token.update_time), token.access_token_expires_in - 10 * 60, 'second');//提前10分钟更新access_token
            const canRefresh = expiredDate < Date.now();
            if ((adXHS.isAccessTokenExpired(token) || canRefresh)) {
                xhsData._token = null;
                const newToken = await adXHS.refreshToken(token.refresh_token, platform);
                if (newToken && newToken.code === 0) {
                    await adXHS.saveAccessToken(newToken.data, platform);
                    xhsData._token = await xhsData._getVars();
                }
            }
        }
        else return null;
        return token?.access_token;
    },

    advertiser_id: async () => {
        const token = await xhsData._getVars();
        return token?.approval_advertisers[0]?.advertiser_id;
    },

    app_id: async () => {
        const token = await xhsData._getVars();
        return token?.app_id;
    },
    //检查MCP状态
    checkAuthStatus: async () => {
        let data = {}
        try {
            const auth = await adXHS.getAccessTokenFromDB();
            if (auth.code === -2) data = { code: 1, status: '未授权', reAuth: true, token: 'refreshToken' }
            else if (auth.code === -1) data = { code: -2, status: '系统错误', reAuth: true, token: 'refreshToken' }
            else {
                const tokenExpired = addDate(new Date(auth.data.update_time), auth.data.access_token_expires_in, 'second');
                const refreshTokenExpired = addDate(new Date(auth.data.update_time), auth.data.refresh_token_expires_in, 'second');
                const reAuth = adXHS.isRefreshTokenExpired(auth.data) === true;
                data = { code: 0, status: 'Token正常', expireDate: tokenExpired, expired: adXHS.isAccessTokenExpired(auth.data), refreshExpireDate: refreshTokenExpired, refreshExpired: adXHS.isRefreshTokenExpired(auth.data), reAuth: reAuth, token: 'refreshToken' }
            }
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    refreshToken: async (token) => {
        if (!token) return { code: 1, status: 'fail', msg: '无效token', data: {}, reAuth: false };

        const payload = await verifyAccessToken(token);
        if (!payload) data = { code: 2, status: 'fail', msg: 'token过期', data: {}, reAuth: false };
        let auth = await adXHS.getAccessTokenFromDB();
        const refreshExpired = adXHS.isRefreshTokenExpired(auth.data);
        const scope = encodeURIComponent(`["report_service","ad_query","ad_manage","account_manage"]`)
        const redirectUri = encodeURIComponent(process.env.ADXHS_AUTH_REDIRECT_URL)
        const authUrl = `https://ad-market.xiaohongshu.com/auth?appId=${process.env.ADXHS_APPID}&scope=${scope}&redirectUri=${redirectUri}&state=ADXHS`
        if (refreshExpired) return { code: 3, status: 'fail', msg: 'refresh_token过期，需重新授权', data: {}, reAuth: true, authUrl: authUrl };

        auth = await adXHS.refreshToken(auth.data.refresh_token)
        if (!auth || !auth.data) return { code: 4, status: 'fail', msg: '更新access_token失败', data: {}, reAuth: false };

        const newToken = await adXHS.saveAccessToken(auth.data);
        if (!newToken || newToken.code !== 0) return { code: 5, status: 'fail', msg: '保存新的token失败', data: {}, reAuth: false };

        const tokenExpired = addDate(new Date(auth.data.update_time), auth.data.access_token_expires_in, 'second');
        const refreshTokenExpired = addDate(new Date(auth.data.update_time), auth.data.refresh_token_expires_in, 'second');
        const reAuth = adXHS.isRefreshTokenExpired(auth.data) === true;
        return { code: 0, status: 'success', msg: 'ok', expireDate: tokenExpired, expired: adXHS.isAccessTokenExpired(auth.data), refreshExpireDate: refreshTokenExpired, refreshExpired: adXHS.isRefreshTokenExpired(auth.data), reAuth: reAuth }
    },
    //行业类目
    taxonomy: async () => {
        try {
            const url = `${rootUrl}/api/open/jg/keyword/industry/taxonomy`;
            const ad_id = await xhsData.advertiser_id();
            const access_token = await xhsData.access_token();
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify({ advertiser_id: ad_id })
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //行业类目属性
    taxonomyAttr: async (params) => {
        try {
            const { taxId } = params;
            if (!taxId) { return { code: -3, success: false, msg: `未知的类目`, data: null }; }
            const access_token = await xhsData.access_token();
            const ad_id = await xhsData.advertiser_id();

            const url = `${rootUrl}/api/open/jg/keyword/industry/taxonomy/attribute`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify({ advertiser_id: ad_id, taxonomy_id: taxId })
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //获取关键词匹配词库信息
    keywordMatch: async (params) => {
        try {
            const { keys } = params;
            if (!keys) { return { code: -3, success: false, msg: `关键词不能为空`, data: null }; }
            const arrKey = keys.split(',');

            const access_token = await xhsData.access_token();
            const ad_id = await xhsData.advertiser_id();

            const url = `${rootUrl}/api/open/jg/target/keyword/match`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify({ advertiser_id: ad_id, keywords: arrKey })
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //获取定向信息
    targetInfo: async (params) => {
        try {
            const { market } = params;
            market = (!market || isNaN(market)) ? 3 : parseInt(market);
            const access_token = await xhsData.access_token();
            const ad_id = await xhsData.advertiser_id();

            const url = `${rootUrl}/api/open/jg/target/get_available_target_info`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify({ advertiser_id: ad_id, marketing_target: market })
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //获取行业商品列表
    product: async (params) => {
        try {
            const ad_id = await xhsData.advertiser_id();
            const token = await xhsData.access_token();
            const url = `${rootUrl}/api/open/jg/data/product/search`;

            const { pn, ps, ids, pf } = params;

            let json = { advertiser_id: ad_id };
            json.page_index = !pn ? 1 : parseInt(pn);
            json.page_size = !ps ? 20 : parseInt(ps);
            if (ids) json.industry_item_ids = ids.split(',');
            if (pf) json.platforms = pf.split(',');
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': token },
                body: JSON.stringify(json)
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //获取笔记列表
    notelist: async (params) => {
        try {
            const access_token = await xhsData.access_token();
            let json = {};
            json.advertiser_id = await xhsData.advertiser_id();
            const { nt, kw, of, ot, nct, pt, spu_id, ft, mt, spu_type, pn, ps, bo, cst, cet, ust, uet } = params;
            json.note_type = !nt ? 1 : parseInt(nt);
            if (kw) json.keyword = kw;
            if (of) json.order_field = of;
            json.order_type = ot ? ot : 'desc';
            if (nct) json.note_content_type = parseInt(nct);
            if (pt) json.placement_type = parseInt(pt);
            if (spu_id) json.spu_id = spu_id;
            if (ft) json.filter_taobao = parseInt(ft);
            if (mt) json.market_target = parseInt(mt);
            if (spu_type) json.spu_type = parseInt(spu_type);
            json.page = pn ? parseInt(pn) : 1;
            json.page_size = ps ? parseInt(ps) : 20;
            json.base_only = parseBoolean(bo).value === undefined ? false : parseBoolean(bo).value;
            if (cst) json.create_start_time = formatDate(cst, 'yyyy-MM-dd');
            if (cet) json.create_end_time = formatDate(cet, 'yyyy-MM-dd');
            if (ust) json.update_start_time = formatDate(ust, 'yyyy-MM-dd');
            if (uet) json.update_end_time = formatDate(uet, 'yyyy-MM-dd');
            const url = `${rootUrl}/api/open/jg/note/list`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify(json)
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //定向推词-以词推词
    recommend: async (params) => {
        try {
            let json = {};
            json.advertiser_id = await xhsData.advertiser_id();
            const access_token = await xhsData.access_token();

            const url = `${rootUrl}/api/open/jg/keyword/common/recommend`;
            let { rt, pt, rrf, keyword, ids, taxId, al, anl, rank } = params;
            if (!rt) return { code: -3, success: false, msg: `“推词类型”参数不存在`, data: null };
            rt = rt.trim().toLowerCase();
            json.request_type = rt;
            if (pt) json.promotion_target = parseInt(pt);
            if (rrf) json.recommend_reason_filter = rrf.split(',');
            if ((rt === 'search' || rt === 'session') && !keyword) return { code: -4, success: false, msg: `“关键词”参数不存在`, data: null };
            if (keyword) json.keyword = keyword;
            if (ids === 'note' && !ids) return { code: -5, success: false, msg: `“笔记ID”参数不存在`, data: null };
            if (ids) json.item_ids = ids.split(',');
            if (taxId) json.taxonomy_id = taxId;
            if (al) json.attribute_list = al;
            if (anl) json.attribute_name_list = anl;
            if (rank) json.rank = parseInt(rank);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify(json)
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //获取推荐关键词信息
    keywordInfo: async (params) => {
        try {
            const url = `${rootUrl}/api/open/jg/target/keyword/recommend`;
            let { ids, keyword } = params;
            let json = {};
            json.advertiser_id = await xhsData.advertiser_id();
            const access_token = await xhsData.access_token();
            if (ids) json.note_ids = ids.split(',');
            if (keyword) json.keyword = keyword;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify(json)
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //词包推荐
    baglist: async (params) => {
        try {
            const url = `${rootUrl}/api/open/jg/keyword/word/bag/list`;
            let { name, category, pn, ps, st, et } = params;
            let json = {};
            json.advertiser_id = await xhsData.advertiser_id();
            const access_token = await xhsData.access_token();
            if (name) json.name = name;
            if (category) json.category = category;
            json.page_num = !pn || isNaN(pn) ? 1 : parseInt(pn);
            json.page_size = !ps || isNaN(ps) ? 5 : parseInt(ps);
            if (st) json.start_time = formatDate(st, 'yyyy-MM-dd');
            if (et) json.end_time = formatDate(et, 'yyyy-MM-dd');

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify(json)
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //人群预估
    crowdEstimate: async (params) => {
        try {
            const url = `${rootUrl}/api/open/jg/crowd/estimate`;
            let { mt, placement, ot, tt, tc } = params;
            let json = {};
            json.advertiser_id = await xhsData.advertiser_id();
            const access_token = await xhsData.access_token();
            if (!mt || isNaN(mt)) return { code: -3, success: false, msg: `“营销目标”参数错误或不存在`, data: null };
            mt = parseInt(mt)
            if ([3, 4, 8, 9, 10, 13, 14].indexOf(mt) < 0) return { code: -3, success: false, msg: `不支持的“营销目标”参数`, data: null };
            json.marketing_target = mt;

            if (!placement || isNaN(placement)) return { code: -3, success: false, msg: `“广告类型”参数错误或不存在`, data: null };
            placement = parseInt(placement);
            if ([1, 2, 4, 7].indexOf(placement) < 0) return { code: -3, success: false, msg: `不支持的“广告类型”参数`, data: null };
            json.placement = placement;

            if (!ot || isNaN(ot)) return { code: -3, success: false, msg: `“推广目标”参数错误或不存在`, data: null };
            ot = parseInt(ot);
            if ([0, 1, 3, 4, 5, 6, 11, 12, 13, 14, 18, 20, 21, 23, 24, 25].indexOf(ot) < 0) return { code: -3, success: false, msg: `不支持的“推广目标”参数`, data: null };
            json.optimize_target = ot;

            if (!tt || isNaN(tt)) return { code: -3, success: false, msg: `“定向类型”参数错误或不存在`, data: null };
            tt = parseInt(tt);
            if ([1, 2, 3].indexOf(tt) < 0) return { code: -3, success: false, msg: `不支持的“定向类型”参数`, data: null };
            json.target_type = tt;

            if (!tc) tc = { target_gender: 'all', target_age: 'all', target_area_code: -1, target_device: 'all' }
            else tc = JSON.parase(tc);
            json.target_config = tc;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify(json)
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
    //计划单元名称重复性校验
    checkDup: async (params) => {
        try {
            let { type, name } = params;
            type = (!type || isNaN(type)) ? 1 : parseInt(type);
            if (!name) return { code: -3, success: false, msg: `“计划名称/单元名称集合”参数错误或不存在`, data: null };
            name = name.split(',');
            const access_token = await xhsData.access_token();
            const ad_id = await xhsData.advertiser_id();

            const url = `${rootUrl}/api/open/jg/data/check/name/dup`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Access-Token': access_token },
                body: JSON.stringify({ advertiser_id: ad_id, type: type, name: name })
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log(error);
            return { code: -1, success: false, msg: error.message, data: null };
        }
    },
};

export default xhsData;