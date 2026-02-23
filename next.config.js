/** @type {import('next').NextConfig} */
/*
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
*/
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 核心：禁用 Turbopack（Next.js 16 专属配置）
  turbo: {
    enabled: false, // 全局关闭 Turbopack
  },
  // 可选：显式指定 Webpack 配置（确保 Webpack 生效）
  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      // 告诉 Webpack 在服务端构建时，将这些模块视为“外部”模块，不要打包
      // 这里需要根据你的确切依赖来添加
      config.externals = [
        ...(config.externals || []),
        'tedious',      // 主要的 MSSQL 驱动
        'mssql',        // 如果你直接用了 mssql 包
        // 如果使用了其他数据库驱动，也列在这里
      ];
      // 客户端不打包 node 模块
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        sequelize: false,
      };
    }
    // 保留原有 Webpack 配置（如有），无需额外修改
    return config;
  },
  // 其他原有配置（如 reactStrictMode、images 等）保留
  reactStrictMode: true,
};

module.exports = nextConfig;