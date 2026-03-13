// lib/jwt.js
import * as jose from 'jose';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-access-secret-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// 将密钥转换为 Uint8Array（jose 需要的格式）
const accessSecret = new TextEncoder().encode(ACCESS_TOKEN_SECRET);
const refreshSecret = new TextEncoder().encode(REFRESH_TOKEN_SECRET);

// 生成访问令牌
export async function generateAccessToken(user) {
    const jwt = await new jose.SignJWT({
        id: user.id,
        username: user.username,
        role: user.role,
        nonce: Math.random().toString(36).substring(2, 15),
        timestamp: Date.now()
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('3m')
        .sign(accessSecret);

    return jwt;
}

// 生成刷新令牌
export async function generateRefreshToken(userId) {
    const jwt = await new jose.SignJWT({ id: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(refreshSecret);

    return jwt;
}

// 验证访问令牌
export async function verifyAccessToken(token) {
    try {
        const { payload } = await jose.jwtVerify(token, accessSecret);
        return payload;
    } catch (error) {
        return null;
    }
}

// 验证刷新令牌
export async function verifyRefreshToken(token) {
    try {
        const { payload } = await jose.jwtVerify(token, refreshSecret);
        return payload;
    } catch (error) {
        return null;
    }
}