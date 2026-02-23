// lib/validation.js
/**
 * 数据验证工具函数
 */

// 验证结果类
class ValidationResult {
  constructor() {
    this.errors = [];
    this.isValid = true;
  }

  addError(field, message) {
    this.errors.push({ field, message });
    this.isValid = false;
  }

  getErrors() {
    return this.errors;
  }
}

// 验证器函数
const validators = {
  // 必填字段验证
  required(value, fieldName) {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} 是必填字段`;
    }
    return null;
  },

  // 邮箱验证
  email(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return '邮箱格式不正确';
    }
    return null;
  },

  // 长度验证
  length(value, min, max, fieldName) {
    if (value) {
      const len = value.length;
      if (min !== undefined && len < min) {
        return `${fieldName} 长度不能小于 ${min}`;
      }
      if (max !== undefined && len > max) {
        return `${fieldName} 长度不能大于 ${max}`;
      }
    }
    return null;
  },

  // 数字范围验证
  range(value, min, max, fieldName) {
    if (value !== undefined && value !== null) {
      const num = Number(value);
      if (isNaN(num)) {
        return `${fieldName} 必须是数字`;
      }
      if (min !== undefined && num < min) {
        return `${fieldName} 不能小于 ${min}`;
      }
      if (max !== undefined && num > max) {
        return `${fieldName} 不能大于 ${max}`;
      }
    }
    return null;
  },

  // 枚举值验证
  enum(value, allowedValues, fieldName) {
    if (value && !allowedValues.includes(value)) {
      return `${fieldName} 必须是以下值之一: ${allowedValues.join(', ')}`;
    }
    return null;
  },

  // 正则表达式验证
  pattern(value, regex, fieldName, message) {
    if (value && !regex.test(value)) {
      return message || `${fieldName} 格式不正确`;
    }
    return null;
  }
};

// 验证函数
function validate(data, rules) {
  const result = new ValidationResult();

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // 遍历该字段的所有验证规则
    for (const validator of rule) {
      let error = null;

      if (typeof validator === 'function') {
        // 自定义验证函数
        error = validator(value, field, data);
      } else if (validator.type && validators[validator.type]) {
        // 内置验证器
        const { type, ...params } = validator;
        error = validators[type](value, ...Object.values(params), field);
      }

      if (error) {
        result.addError(field, error);
        break; // 一旦有错误就停止验证该字段
      }
    }
  }

  return result;
}

// 导出验证工具
module.exports = {
  validate,
  validators,
  ValidationResult
};