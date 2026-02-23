// pages/api/mcp/modules/index.js
import { UserModule } from './user.module';
//import { PostModule } from './post.module';
import { DatabaseModule } from './database.module';
import { CommonModule } from './common.module';

class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.initialized = false;
  }

  // 注册所有模块
  registerModules() {
    if (this.initialized) return;

    // 注册各个模块
    this.register('user', new UserModule());
    //this.register('post', new PostModule());
    this.register('database', new DatabaseModule());
    this.register('common', new CommonModule());

    this.initialized = true;
    console.log('✅ MCP 模块注册完成:', Array.from(this.modules.keys()));
  }

  // 注册单个模块
  register(name, module) {
    this.modules.set(name, module);
    console.log(`  📦 注册模块: ${name}`);
  }

  // 获取模块
  getModule(name) {
    return this.modules.get(name);
  }

  // 获取所有模块信息
  getAllModules() {
    const info = {};
    this.modules.forEach((module, name) => {
      info[name] = module.getInfo();
    });
    return info;
  }

  // 调用模块方法
  async call(moduleName, methodName, params, context) {
    const module = this.modules.get(moduleName);
    
    if (!module) {
      throw new Error(`Module '${moduleName}' not found`);
    }

    if (typeof module[methodName] !== 'function') {
      throw new Error(`Method '${methodName}' not found in module '${moduleName}'`);
    }

    // 执行中间件
    const middlewarePassed = await module.runMiddleware({ module: moduleName, method: methodName, params }, context);
    if (!middlewarePassed) {
      throw new Error('Middleware validation failed');
    }

    // 调用方法
    return await module[methodName](params, context);
  }

  // 获取所有可用的工具列表（用于 MCP 协议发现）
  getToolsList() {
    const tools = [];
    this.modules.forEach((module, moduleName) => {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(module))
        .filter(method => method !== 'constructor' && !method.startsWith('_'));
      
      methods.forEach(methodName => {
        tools.push({
          name: `${moduleName}.${methodName}`,
          description: module.getMethodDescription?.(methodName) || `${moduleName} module method`,
          parameters: module.getMethodParameters?.(methodName) || {}
        });
      });
    });
    return tools;
  }
}

export const moduleRegistry = new ModuleRegistry();