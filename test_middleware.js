// middleware.js
import { NextResponse } from 'next/server';
import { verifyAccessToken } from './lib/jwt';
import { generateAccessToken, generateRefreshToken } from './lib/jwt';
import { findUserById, isValidRefreshToken, saveRefreshToken } from './lib/token' 

// 公开路由（不需要认证）
const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/adxhs/auth-status',
    '/auth/auth-status'
];

// 管理员路由
const adminRoutes = ['/admin', '/api/admin'];

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    console.log('middleware -> pathname = ', pathname);
    const response = NextResponse.next();

    if (pathname.toLowerCase() === '/auth/auth-status') {
        const user = findUserById(1);
        const accessToken = await generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user.id);
        saveRefreshToken(user.id, refreshToken);
        
        response.cookies.set({
            name: 'token',
            value: accessToken,
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60
        });
        response.headers.set('x-middleware-cache', 'no-cache');

        /*response.headers.set(
            'Cookie',
            serialize('token', refreshToken, {
                httpOnly: true,
                secure: true,//process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 // 7天
            })
        );*/
    }
    // 1. 允许公开路由
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        //return NextResponse.next();
        return response;
    }

    // 2. 检查API路由和页面路由的认证
    let token = null;

    // 从Authorization头获取token（API请求）
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    // 从cookie获取token（页面请求）
    if (!token) {
        token = request.cookies.get('accessToken')?.value || null;
    }

    // 3. 如果没有token，重定向到登录
    if (!token) {
        // API路由返回401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { message: '未提供访问令牌' },
                { status: 401 }
            );
        }

        // 页面路由重定向到登录
        /*const url = new URL('/login', request.url);
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);*/

        const url = new URL('/', request.url);
        return NextResponse.redirect(url);
    }

    // 4. 验证token
    const payload = verifyAccessToken(token);
    if (!payload) {
        // API路由返回401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { message: '无效或过期的令牌' },
                { status: 401 }
            );
        }

        // 页面路由重定向到登录
        /*const url = new URL('/login', request.url);
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);*/

        const url = new URL('/', request.url);
        return NextResponse.redirect(url);
    }

    // 5. 检查管理员权限
    if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (payload.role !== 'admin') {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { message: '需要管理员权限' },
                    { status: 403 }
                );
            }
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    // 6. 将用户信息添加到请求头（供API路由使用）
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.id.toString());
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-username', payload.username);

    // 7. 继续处理请求
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

// 配置中间件匹配的路由
export const config = {
    matcher: [
        '/dashboard/:path*',
        '/profile/:path*',
        '/admin/:path*',
        '/api/:path*',
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};