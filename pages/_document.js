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
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      </Head>
      <body>
        {/*<div style={{ position: 'fixed', top: 20, right: 300, 'zIndex': 11, background: '#f0f0f0', padding: 5, borderRadius: 5, fontSize: 12 }}>
          MCP: {mcpStatus}
        </div>*/}
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}