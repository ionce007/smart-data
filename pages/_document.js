import { Html, Head, Main, NextScript } from 'next/document'
import { useEffect, useState } from 'react';
import initializeDatabase from '../config/init';

export default function Document() {
    const [mcpStatus, setMcpStatus] = useState('checking');

    useEffect(() => {
        // 初始化数据库
        initializeDatabase();
    }, []);

    return (
        <Html lang="zh-CN">
            <Head>
                <link rel="icon" href="/favicon.ico" />
                <script src="https://cdn.tailwindcss.com"></script>
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}