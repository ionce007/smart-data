import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function Sidebar({ collapsed }) {
  const router = useRouter()
  const [expandedMenus, setExpandedMenus] = useState(['index'])
  const [activeFloatingMenu, setActiveFloatingMenu] = useState(null)
  const floatingMenuRef = useRef(null)

  const menuItems = [
    { 
      id: 'index', 
      label: '仪表盘', 
      path: '/',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      children: []
    },
    { 
      id: 'adxhs', 
      label: '小红书', 
      icon: 'M8 3H6C4.34315 3 3 4.34315 3 6V18C3 19.6569 4.34315 21 6 21H18C19.6569 21 21 19.6569 21 18V6C21 4.34315 19.6569 3 18 3H16 M8 8.5C8 7.11929 9.11929 6 10.5 6C11.8807 6 13 7.11929 13 8.5C13 9.88071 11.8807 11 10.5 11C9.11929 11 8 9.88071 8 8.5Z M16 10C14.8954 10 14 10.8954 14 12C14 13.1046 14.8954 14 16 14C17.1046 14 18 13.1046 18 12C18 10.8954 17.1046 10 16 10Z M10 14H14 M10 17H14',
      children: [
        { id: 'auth-status', label: '授权状态', path: '/auth/auth-status', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
        { id: 'user-add', label: '添加用户', path: '/user-add', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
        { id: 'user-roles', label: '角色权限', path: '/user-roles', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
      ]
    },
    { 
      id: 'product-management', 
      label: '产品管理', 
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      children: [
        { id: 'product-list', label: '产品列表', path: '/product-list', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
        { id: 'product-categories', label: '产品分类', path: '/product-categories', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        { id: 'product-inventory', label: '库存管理', path: '/product-inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' }
      ]
    },
    { 
      id: 'orders', 
      label: '订单管理', 
      icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      children: [
        { id: 'order-list', label: '订单列表', path: '/order-list', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
        { id: 'order-refunds', label: '退款管理', path: '/order-refunds', icon: 'M16 15v-1a4 4 0 00-8 0v1m8 0a4 4 0 01-8 0m8 0h2m-10 0H6m14 0h2m-2 0v1a4 4 0 01-8 0v-1m-2 0H8' }
      ]
    },
    { 
      id: 'settings', 
      label: '系统设置', 
      path: '/settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      children: [
        { id: 'general-settings', label: '通用设置', path: '/general-settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
        { id: 'security', label: '安全设置', path: '/security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
      ]
    },
    { 
      id: 'reports', 
      label: '数据报表', 
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      children: [
        { id: 'sales-report', label: '销售报表', path: '/sales-report', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { id: 'user-report', label: '用户报表', path: '/user-report', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
      ]
    }
  ]

  // 初始化展开的菜单
  useEffect(() => {
    // 找到当前路由所在的父菜单
    const findParentMenus = () => {
      const expanded = []
      
      menuItems.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => child.path === router.pathname)
          if (hasActiveChild) {
            expanded.push(item.id)
          }
        }
      })
      
      return expanded
    }

    setExpandedMenus(findParentMenus())
  }, [router.pathname]) // 当路由变化时重新计算

  // 判断当前路由是否激活
  const isActiveRoute = (item) => {
    if (item.path === router.pathname) return true
    if (item.children) {
      return item.children.some(child => child.path === router.pathname)
    }
    return false
  }

  // 点击外部关闭浮动菜单
  useEffect(() => {
    function handleClickOutside(event) {
      if (floatingMenuRef.current && !floatingMenuRef.current.contains(event.target)) {
        setActiveFloatingMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleSubMenu = (menuId) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }

  // 处理菜单点击
  const handleMenuClick = (item, e) => {
    e.preventDefault()
    if (item.path) {
      router.push(item.path)
    } else if (item.children && item.children.length > 0) {
      toggleSubMenu(item.id)
    }
  }

  // 处理折叠状态下的菜单点击
  const handleFloatingMenuClick = (itemId) => {
    if (activeFloatingMenu === itemId) {
      setActiveFloatingMenu(null)
    } else {
      setActiveFloatingMenu(itemId)
    }
  }

  const renderMenuItem = (item, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedMenus.includes(item.id)
    const isActive = isActiveRoute(item)
    const showFloatingMenu = activeFloatingMenu === item.id

    if (collapsed && depth === 0) {
      // 折叠状态：只显示图标，点击显示浮动菜单
      return (
        <div key={item.id} className="relative">
          <button
            onClick={() => handleFloatingMenuClick(item.id)}
            className={`
              w-full flex items-center justify-center px-2 py-3 text-sm font-medium rounded-md mx-2
              ${isActive || showFloatingMenu ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
            `}
          >
            <svg
              className={`h-5 w-5 ${isActive || showFloatingMenu ? 'text-blue-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
            </svg>
          </button>

          {/* 浮动菜单 */}
          {showFloatingMenu && (
            <div 
              ref={floatingMenuRef}
              className="absolute left-full top-0 ml-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[100]"
            >
              {hasChildren ? (
                // 显示子菜单
                <div className="py-2">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        router.push(child.path)
                        setActiveFloatingMenu(null)
                      }}
                      className={`
                        w-full flex items-center px-4 py-2.5 text-sm hover:bg-gray-50
                        ${router.pathname === child.path ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                      `}
                    >
                      <svg
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          router.pathname === child.path ? 'text-blue-500' : 'text-gray-400'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={child.icon} />
                      </svg>
                      <span className="flex-1 text-left">{child.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                // 显示当前菜单项
                <div className="py-2">
                  <button
                    onClick={() => {
                      router.push(item.path)
                      setActiveFloatingMenu(null)
                    }}
                    className={`
                      w-full flex items-center px-4 py-2.5 text-sm hover:bg-gray-50
                      ${router.pathname === item.path ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                    `}
                  >
                    <svg
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        router.pathname === item.path ? 'text-blue-500' : 'text-gray-400'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                    </svg>
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    // 展开状态的渲染
    return (
      <div key={item.id} className="space-y-1">
        <button
          onClick={(e) => handleMenuClick(item, e)}
          className={`
            w-40 group flex items-center px-2 py-2 text-sm font-medium rounded-md
            ${depth > 0 ? 'ml-6' : ''}
            ${isActive && !hasChildren ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
          `}
        >
          <svg
            className={`
              mr-3 h-5 w-5 flex-shrink-0
              ${isActive && !hasChildren ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
          </svg>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {hasChildren && (
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {item.children.map(child => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={`fixed left-0 top-16 bottom-0 bg-white shadow-lg sm:overflow-visible transition-all duration-300 z-20
      ${collapsed ? 'w-20' : 'w-48'}`}
    >
      <nav className="mt-5">
        <div className="space-y-1">
          {menuItems.map(item => renderMenuItem(item, 0))}
        </div>
      </nav>
    </aside>
  )
}