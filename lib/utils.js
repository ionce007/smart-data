// 工具函数：日期加减（支持天/小时/分钟/秒）
function addDate(date, amount, unit) {
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

module.exports = {
    addDate
}