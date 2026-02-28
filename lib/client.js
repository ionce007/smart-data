/**
 * 仅客户端：localStorage 封装
 */
export const storage = {
  set(key, value) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  },
  get(key, defaultValue = null) {
    if (typeof window === 'undefined') return defaultValue;
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  },
  remove(key) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  },
};

/**
 * 复制文本到剪贴板
 * @param {string} text
 */
export async function copyToClipboard(text) {
  if (typeof window === 'undefined') return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('复制失败', err);
    return false;
  }
}

/**
 * 滚动到顶部
 */
export function scrollToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}