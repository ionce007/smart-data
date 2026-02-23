// mcp/protocol/jsonrpc.js
/**
 * JSON-RPC 2.0 协议实现
 * MCP基于JSON-RPC进行通信
 */
class JSONRPC {
  static VERSION = '2.0';

  // 创建请求对象
  static createRequest(method, params, id = null) {
    const request = {
      jsonrpc: this.VERSION,
      method,
      params
    };
    
    if (id !== null) {
      request.id = id;
    }
    
    return request;
  }

  // 创建响应对象
  static createResponse(result, id) {
    return {
      jsonrpc: this.VERSION,
      result,
      id
    };
  }

  // 创建错误对象
  static createError(error, id = null) {
    const errorResponse = {
      jsonrpc: this.VERSION,
      error: {
        code: error.code || -32603,
        message: error.message || 'Internal error',
        data: error.data
      }
    };
    
    if (id !== null) {
      errorResponse.id = id;
    }
    
    return errorResponse;
  }

  // 解析消息
  static parse(message) {
    try {
      const parsed = typeof message === 'string' ? JSON.parse(message) : message;
      
      // 验证JSON-RPC版本
      if (parsed.jsonrpc !== this.VERSION) {
        throw new Error('Invalid JSON-RPC version');
      }
      
      return parsed;
    } catch (error) {
      throw new Error('Parse error');
    }
  }

  // 判断是否为请求
  static isRequest(message) {
    return message.method !== undefined;
  }

  // 判断是否为响应
  static isResponse(message) {
    return message.result !== undefined || message.error !== undefined;
  }

  // 判断是否为通知（没有id的请求）
  static isNotification(message) {
    return this.isRequest(message) && message.id === null;
  }

  // 标准错误码
  static get ERROR_CODES() {
    return {
      PARSE_ERROR: { code: -32700, message: 'Parse error' },
      INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
      METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
      INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
      INTERNAL_ERROR: { code: -32603, message: 'Internal error' }
    };
  }
}

module.exports = JSONRPC;