import { NavLink, Outlet } from 'react-router-dom';
import { Target, Filter, TrendingUp, BarChart3 } from 'lucide-react';

interface LayoutProps {
  fileName: string;
  onReupload: () => void;
}

export function Layout({ fileName, onReupload }: LayoutProps) {
  const navItems = [
    { path: '/', label: 'KPI追踪', icon: Target },
    { path: '/filter', label: '数据筛选', icon: Filter },
    { path: '/purchase', label: '采买分析', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-gray-800">KOL媒介BI看板</span>
            </div>

            {/* 导航菜单 */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* 文件信息和重新上传按钮 */}
            {fileName && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{fileName}</span>
                <button
                  onClick={onReupload}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                >
                  重新上传
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
