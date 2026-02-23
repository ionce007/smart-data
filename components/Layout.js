import { useState } from 'react'
import TopMenu from './TopMenu'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100">
      <TopMenu 
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} 
        sidebarCollapsed={sidebarCollapsed}
      />
      <Sidebar collapsed={sidebarCollapsed} className={`${sidebarCollapsed ? 'sm:overflow-visible' : ''}`} />
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'pl-20' : 'pl-48'} pt-16`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}