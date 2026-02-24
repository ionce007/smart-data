import Layout from '../../components/Layout'
import { useState, useEffect } from 'react';

export default function XHSAuthStatus() {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let mounted = true;
    //let intervalId;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/adxhs/auth-status');
        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        if (mounted) {
          setDetails(data);
        }
      } catch (error) {
        if (mounted) {
          setDetails(null);
        }
      }
    };

    // 立即检查一次
    checkStatus();

    // 每30秒检查一次
    //intervalId = setInterval(checkStatus, 180 * 1000);

    return () => {
      mounted = false;
      //clearInterval(intervalId);
    };
  }, []);

  const render = (code) => {
    if (code === 1) {
      return (
        <div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              授权状态
            </span>
            <div className="bg-white rounded-lg px-4 py-4">{details?.status}</div>
          </div>
          <div>
            <button type="button" className="px-4 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">授权</button>
          </div>
        </div>
      )
    }
    else{
      return (<div></div>)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">授权状态</h2>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {render(details?.code)}
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系统名称
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="Admin System"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  管理员邮箱
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每页显示条数
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  defaultChecked
                />
                <label className="ml-2 block text-sm text-gray-900">
                  开启邮件通知
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  开启自动备份
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  保存设置
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}