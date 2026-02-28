// 工具函数：日期加减（支持天/小时/分钟/秒）
export function addDate(date, amount, unit) {
    // 复制原日期，避免修改原对象
    const newDate = new Date(date);
    const msMap = {
        year: 0,
        month: 0,
        day: 86400000,    // 1天 = 24*60*60*1000 毫秒
        hour: 3600000,    // 1小时 = 60*60*1000 毫秒
        minute: 60000,    // 1分钟 = 60*1000 毫秒
        second: 1000      // 1秒 = 1000 毫秒
    };

    if (!msMap[unit]) {
        throw new Error('unit 只能是 year/month/day/hour/minute/second');
    }
    if (unit === 'month') {
        newDate.setMonth(newDate.getMonth() + amount);
    } else if (unit === 'year') {
        newDate.setFullYear(newDate.getFullYear() + amount);
    } else {
        // 核心：修改时间戳（amount 为负数就是减）
        newDate.setTime(newDate.getTime() + amount * msMap[unit]);
    }
    return newDate;
}
/**
 * 通用日期格式化函数
 * @param {Date|number|string} date - 日期/时间戳/日期字符串
 * @param {string} format - 格式（YYYY-MM-DD HH:mm:ss W HH:mm:ss a）
 * @returns {string} 格式化后的日期
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    if(!date) date = new Date();
    const d = new Date(date);
    if (isNaN(d.getTime())) return ''; // 处理无效日期

    const map = {
        yyyy: d.getFullYear(),
        MM: String(d.getMonth() + 1).padStart(2, '0'),
        M: String(d.getMonth() + 1),
        dd: String(d.getDate()).padStart(2, '0'),
        D: String(d.getDate()),
        HH: String(d.getHours()).padStart(2, '0'),
        mm: String(d.getMinutes()).padStart(2, '0'),
        ss: String(d.getSeconds()).padStart(2, '0'),
        W: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], // 星期
        a: d.getHours() >= 12 ? '下午' : '上午' // 上午/下午
    };

    return format.replace(/yyyy|MM|M|dd|D|HH|mm|ss|W|a/g, k => map[k]);
}
/**
 * 防抖：延迟执行，频繁触发只执行最后一次
 * @param {Function} func
 * @param {number} delay
 * @returns
 */
export function debounce(func, delay = 300) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * 节流：固定间隔执行
 * @param {Function} func
 * @param {number} interval
 * @returns
 */
export function throttle(func, interval = 300) {
    let lastTime = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastTime >= interval) {
            lastTime = now;
            func.apply(this, args);
        }
    };
}

/**
 * 深拷贝
 * @param {any} obj
 * @returns
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        return Object.keys(obj).reduce((res, key) => {
            res[key] = deepClone(obj[key]);
            return res;
        }, {});
    }
}

/**
 * 对象转 FormData
 * @param {object} obj
 * @returns {FormData}
 */
export function objectToFormData(obj) {
    const formData = new FormData();
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined && value !== null) {
            formData.append(key, value);
        }
    });
    return formData;
}

/**
 * 数字千分位格式化
 * @param {number} num
 * @returns
 */
export function formatNumber(num) {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString();
}

/**
 * 手机号脱敏 138****1234
 * @param {string} phone
 * @returns
 */
export function maskPhone(phone) {
    if (!phone || phone.length !== 11) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 简单判空
 * @param {any} value
 * @returns
 */
export function isEmpty(value) {
    return (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && Object.keys(value).length === 0)
    );
}

/**
 * 睡眠函数
 * @param {number} ms
 * @returns
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取 URL 参数（通用，不依赖 window）
 * @param {string} url
 * @returns
 */
export function getUrlParams(url) {
    const params = {};
    new URL(url).searchParams.forEach((val, key) => {
        params[key] = val;
    });
    return params;
}

/**
 * 简单对象拼接成 query string
 * @param {object} params
 * @returns
 */
export function stringifyQuery(params) {
    return new URLSearchParams(params).toString();
}

/**
 * 数组去重
 * @param {Array} arr
 * @returns
 */
export function uniqueArray(arr) {
    return [...new Set(arr)];
}

/**
 * 数组根据 key 去重
 * @param {Array} arr
 * @param {string} key
 * @returns
 */
export function uniqueByKey(arr, key) {
    const map = new Map();
    arr.forEach(item => {
        if (!map.has(item[key])) map.set(item[key], item);
    });
    return [...map.values()];
}
