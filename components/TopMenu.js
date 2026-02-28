import { useState } from 'react'
import MCPStatusIndicator from '../components/MCPStatusIndicator';

export default function TopMenu({ onToggleSidebar, sidebarCollapsed }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo区域和菜单折叠按钮 */}
          <div className="flex items-center">
            <button
              onClick={onToggleSidebar}
              className="p-2 mr-4 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none"
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-800">
                {sidebarCollapsed ? 'A' : 'Admin System'}
              </h1>
            </div>
          </div>

          {/* 右侧菜单（保持不变） */}
          <div className="flex items-center space-x-4">
            <div className='relative'>
                <MCPStatusIndicator />
            </div>
            {/* 通知图标 */}
            <button className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* 消息图标 */}
            <button className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>

            {/* 用户菜单 */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">Admin User</span>
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 下拉菜单 */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">个人资料</a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">账号设置</a>
                  <div className="border-t border-gray-100"></div>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">退出登录</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}