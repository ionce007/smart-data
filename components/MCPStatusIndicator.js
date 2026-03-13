// components/MCPStatusIndicator.js
import { useState, useEffect } from 'react';

export default function MCPStatusIndicator() {
    const [status, setStatus] = useState('checking');
    const [details, setDetails] = useState(null);

    useEffect(() => {
        let mounted = true;
        let intervalId;

        const checkStatus = async () => {
            try {
                const res = await fetch('/api/mcp/info');
                if (!res.ok) throw new Error('Failed to fetch');

                const data = await res.json();

                if (mounted) {
                    setStatus('running');
                    setDetails({
                        tools: data?.tools || 0,
                        connections: data.connections || 0,
                        version: data.version
                    });
                }
            } catch (error) {
                if (mounted) {
                    setStatus('stopped');
                    setDetails(null);
                }
            }
        };

        // 立即检查一次
        checkStatus();

        // 每30秒检查一次
        intervalId = setInterval(checkStatus, 180 * 1000);

        return () => {
            mounted = false;
            clearInterval(intervalId);
        };
    }, []);

    const getStatusColor = () => {
        switch (status) {
            case 'running': return '#4CAF50';
            case 'stopped': return '#f44336';
            default: return '#ff9800';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'running':
                return `MCP: 运行中 (${details?.tools || 0}工具)`;
            case 'stopped':
                return 'MCP: 已停止';
            default:
                return 'MCP: 检测中...';
        }
    };
    //{/*style={{ position: 'fixed', top: 16, right: 300, background: getStatusColor(), color: 'white', padding: '8px 12px', borderRadius: '20px', fontSize: 12, fontFamily: 'monospace', zIndex: 11, boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer' }}*/}
    return (
        <div
            style={{ background: getStatusColor(), color: 'white', padding: '8px 12px', borderRadius: '20px', fontSize: 12, fontFamily: 'monospace', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer' }}
            onClick={() => window.open('/api/mcp/info', '_blank')}
            title="点击查看详细信息">
            {getStatusText()}
            {details?.connections > 0 && ` | ${details.connections}连接`}
        </div>
    );
}