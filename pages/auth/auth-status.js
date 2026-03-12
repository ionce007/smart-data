import Layout from '../../components/Layout'
import { useState, useEffect } from 'react';
import { formatDate } from '../../lib';
import Loading from '../../lib/loading';


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

    return () => {
      mounted = false;
    };
  }, []);

  const handleReAuthClick = async () => {
    try {
      Loading.show('正在更新Token...');
      const res = await fetch('/api/adxhs/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      if (data && data.code === 0) location.href = data.url;
    } catch (error) {
      console.log(error);
    }
    finally {
      Loading.hide();
    }
  }
  const handleRefreshTokenClick = async () => {
    try {
      Loading.show('正在更新Token...');
      const res = await fetch('/api/adxhs/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      if(data.code === 3) await handleReAuthClick();
      else setDetails(data);
    } catch (error) {
      setDetails(null);
    }
    finally {
      Loading.hide();
    }
  }

  const render = (code) => {
    if (code !== 0) {
      return (
        <div className="flex mt-2 mb-2 items-center justify-between">
          <div className="flex space-x-2">
            <div className="px-4 py-2 bg-blue-600 text-white rounded-md">
              授权状态
            </div>
            <div className="px-4 py-2 bg-blue-600 text-white rounded-md">
              {details?.status}
            </div>
          </div>
        </div>
      )
    }
    else {
      return (
        <div>
          <div className="flex mt-2 mb-2 items-center justify-between">
            <div className="flex space-x-2">
              <div className="px-4 bg-gray-200 w-[200px] flex-shrink-0 py-2 rounded-md">
                授权状态
              </div>
              <div className="px-4 w-[180px] flex-shrink-0 py-2 rounded-md">
                已授权
              </div>
            </div>
          </div>
          <div className="flex mt-2 mb-2 items-center justify-between">
            <div className="flex space-x-2">
              <div className="px-4 bg-gray-200 w-[200px] flex-shrink-0 py-2 rounded-md">
                Token是否过期
              </div>
              <div className="px-4 w-[180px] flex-shrink-0 py-2 rounded-md">
                {details?.expired ? '已过期' : '否'}
              </div>
            </div>
          </div>
          <div className="flex mt-2 mb-2 items-center justify-between">
            <div className="flex space-x-2">
              <div className="px-4 bg-gray-200 w-[200px] flex-shrink-0 py-2 rounded-md">
                Token过期时间
              </div>
              <div className="px-4 w-[180px] flex-shrink-0 py-2 rounded-md">
                {formatDate(details?.expireDate, 'yyyy-MM-dd HH:mm:ss')}
              </div>
            </div>
          </div>
          <div className="flex mt-2 mb-2 items-center justify-between">
            <div className="flex space-x-2">
              <div className="px-4 bg-gray-200 w-[200px] flex-shrink-0 py-2 rounded-md">
                refrshToken是否过期
              </div>
              <div className="px-4 w-[180px] flex-shrink-0 py-2 rounded-md">
                {details?.refreshExpire ? '已过期' : '正常'}
              </div>
            </div>
          </div>
          <div className="flex mt-2 mb-2 items-center justify-between">
            <div className="flex space-x-2">
              <div className="px-4 bg-gray-200 w-[200px] flex-shrink-0 py-2 rounded-md">
                refreshToken过期时间
              </div>
              <div className="px-4 w-[180px] flex-shrink-0 py-2 rounded-md">
                {formatDate(details?.refreshExpireDate, 'yyyy-MM-dd HH:mm:ss')}
              </div>
            </div>
          </div>
          <div className="flex mt-2 mb-2 items-center justify-between">
            <div className="flex space-x-2">
              <div className="px-4 bg-gray-200 w-[200px] flex-shrink-0 py-2 rounded-md">
                是否需要重新授权
              </div>
              <div className="px-4 w-[180px] flex-shrink-0 py-2 rounded-md">
                {details?.reAuth ? '是' : '否'}
              </div>
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">授权状态</h2>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {render(details?.code)}

            <div className="flex mt-6 items-center justify-between">
              <div className="flex space-x-2">
                <button onClick={() => handleReAuthClick()}
                  className="px-4 py-2 bg-red-400 text-white rounded-md">
                  {details?.code === 1 || details?.code < 0 ? '授权' : '重新授权'}
                </button>
                <button onClick={() => handleRefreshTokenClick()}
                  disabled={details?.code !== 0} className={`px-4 py-2 border border-gray-300 rounded-md ${details?.code !== 0 ? 'disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 disabled:opacity-75' : 'hover:bg-gray-50'}`}>
                  更新Token
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}