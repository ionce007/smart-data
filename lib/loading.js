// 全局唯一的 loading 实例
let loadingInstance = null;
// 存储关闭时的回调函数
let resolveHidePromise = null;

// 创建 loading 元素
const createLoadingElement = (text = '加载中...') => {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.id = 'global-loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  `;

  // 创建弹窗主体
  const box = document.createElement('div');
  box.style.cssText = `
    background-color: #ffffff;
    padding: 24px 32px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  `;

  // 创建加载动画
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #409eff;
    border-radius: 50%;
    animation: loading-spin 1s linear infinite;
  `;

  // 创建加载文本
  const textEl = document.createElement('p');
  textEl.textContent = text;
  textEl.style.cssText = `
    font-size: 14px;
    color: #666666;
    margin: 0;
  `;

  // 组装元素
  box.appendChild(spinner);
  box.appendChild(textEl);
  overlay.appendChild(box);

  // 添加动画关键帧
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes loading-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  return overlay;
};

// 显示 loading
const showLoading = (text = '加载中...') => {
  // 确保在浏览器环境执行
  if (typeof window === 'undefined') return Promise.resolve();

  // 如果已有实例，先销毁
  if (loadingInstance) {
    hideLoading();
  }

  // 创建新实例
  const loadingEl = createLoadingElement(text);
  document.body.appendChild(loadingEl);
  
  // 触发显示动画
  setTimeout(() => {
    loadingEl.style.opacity = '1';
    loadingEl.style.visibility = 'visible';
  }, 0);

  // 保存实例引用
  loadingInstance = loadingEl;

  // 返回 Promise，支持 await 等待关闭
  return new Promise(resolve => {
    resolveHidePromise = resolve;
  });
};

// 隐藏 loading
const hideLoading = () => {
  // 确保在浏览器环境执行
  if (typeof window === 'undefined' || !loadingInstance) return;

  // 触发隐藏动画
  loadingInstance.style.opacity = '0';
  loadingInstance.style.visibility = 'hidden';

  // 动画结束后移除元素
  setTimeout(() => {
    if (loadingInstance && loadingInstance.parentNode) {
      loadingInstance.parentNode.removeChild(loadingInstance);
    }
    loadingInstance = null;
    
    // 执行回调
    if (resolveHidePromise) {
      resolveHidePromise();
      resolveHidePromise = null;
    }
  }, 300);
};

// 全局 Loading 服务
const Loading = {
  show: showLoading,
  hide: hideLoading
};

// 挂载到 window（可选，方便全局调用）
if (typeof window !== 'undefined') {
  window.$loading = Loading;
}

export default Loading;