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