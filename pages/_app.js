import '../assets/css/globals.css'
import MCPStatusIndicator from '../components/MCPStatusIndicator';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <MCPStatusIndicator />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
/*
import '../assets/css/globals.css'
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import initializeDatabase from '../config/init';

function MyApp({ Component, pageProps }) {
  const [mcpStatus, setMcpStatus] = useState('checking');

  useEffect(() => {
    // 初始化数据库
    initializeDatabase();

    // 检查 MCP 服务器状态
    const checkMCPStatus = async () => {
      try {
        const res = await fetch('/api/mcp/info');
        const data = await res.json();
        setMcpStatus(`running (${data.tools?.length || 0} tools)`);
      } catch (error) {
        console.error('MCP status check failed:', error);
        setMcpStatus('stopped');
      }
    };

    checkMCPStatus();
  }, []);


  return (
    <Layout>
      <Component {...pageProps} />
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 300,
        background: mcpStatus === 'stopped' ? '#f44336' : '#4CAF50',
        color: 'white',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 12,
        zIndex: 11
      }}>
        MCP: {mcpStatus}
      </div>
    </Layout>
  );
}
export default MyApp
*/