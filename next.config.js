/** @type {import('next').NextConfig} */
/*
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 如果是 turbopack 的问题，可以尝试禁用
  turbo: {
    enabled: false, // 全局关闭 Turbopack
  },
  experimental: {
    esmExternals: 'loose' // 告诉 Next.js 尝试自动修复 ESM 错误
  },
  // 确保正确处理 node 模块
  webpack: (config, { isServer }) => {
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
    return config;
  },
}

module.exports = nextConfig