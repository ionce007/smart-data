// pages/api/mcp/modules/base.module.js
/**
 * 模块基类，所有业务模块继承此类
 */
export class BaseModule {
  constructor(name) {
    this.name = name;
    this.middleware = [];
  }

  // 使用中间件
  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  // 执行中间件
  async runMiddleware(req, context) {
    for (const middleware of this.middleware) {
      const result = await middleware(req, context);
      if (result === false) {
        return false;
      }
    }
    return true;
  }

  // 注册方法到模块
  registerMethod(name, handler) {
    this[name] = handler;
  }

  // 获取模块信息
  getInfo() {
    return {
      name: this.name,
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        .filter(method => method !== 'constructor' && !method.startsWith('_')),
      middleware: this.middleware.length
    };
  }
}