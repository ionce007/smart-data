// models/User.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Post, {
        foreignKey: 'author_id',
        as: 'posts',
        onDelete: 'CASCADE'
      });
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    full_name: {
      type: DataTypes.STRING(100),
      field: 'full_name'
    },
    age: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 150
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    avatar: {
      type: DataTypes.STRING(255)
    },
    bio: {
      type: DataTypes.TEXT
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'editor'),
      defaultValue: 'user'
    },
    last_login: {
      type: DataTypes.DATE,
      field: 'last_login'
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    // MSSQL 特定的配置
    ...(sequelize.getDialect() === 'mssql' && {
      // MSSQL 需要设置 schema（可选）
      schema: 'dbo',
      // 设置字符集和排序规则
      charset: 'utf8',
      collate: 'Chinese_PRC_CI_AS' // 根据你的数据库设置调整
    }),
    hooks: {
      beforeCreate: (user) => {
        user.created_at = new Date();
        user.updated_at = new Date();
      },
      beforeUpdate: (user) => {
        user.updated_at = new Date();
      }
    }
  });

  return User;
};