import { useState, useCallback, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Target, Filter, TrendingUp, BarChart3, AlertCircle, LogOut, User, Users, Building2, Bot } from 'lucide-react';
import { FileUpload } from '@/components/FileUpload';
import { LoginPage } from '@/components/LoginPage';
import { KPITrackingPage } from '@/pages/KPITrackingPage';
import { FilterPage } from '@/pages/FilterPage';
import { PurchasePage } from '@/pages/PurchasePage';
import { IndustryMCNPage } from '@/pages/IndustryMCNPage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LLMConfigDialog } from '@/components/LLMConfigDialog';
import { AIAssistant } from '@/components/AIAssistant';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { extractFilterChoices, extractGroup, CORRECT_SHEET_NAME } from '@/utils/dataProcessor';
import { getUserStats, deleteUser, changeUserRole } from '@/utils/supabaseAuth';
import type { FilterOptions, FilterChoices } from '@/types';

// 导航菜单配置（KPI追踪仅管理员可见）
const getNavItems = (isAdmin: boolean) => {
  const items = [
    { path: '/filter', label: '数据筛选', icon: Filter },
    { path: '/purchase', label: '采买分析', icon: TrendingUp },
    { path: '/industry-mcn', label: '行业核心机构', icon: Building2 },
  ];
  // 管理员才能看到KPI追踪
  if (isAdmin) {
    items.unshift({ path: '/', label: 'KPI追踪', icon: Target });
  }
  return items;
};

// 主应用组件
function AppContent() {
  const { user, logout, loadUserData, saveUserSession } = useUser();
  
  const [rawData, setRawData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSheetError, setShowSheetError] = useState(false);
  const [sheetName, setSheetName] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserStats, setShowUserStats] = useState(false);
  const [userStats, setUserStats] = useState<{ total: number; users: any[] } | null>(null);
  const [showLLMConfig, setShowLLMConfig] = useState(false);

  // 筛选选项
  const [filterChoices, setFilterChoices] = useState<FilterChoices>({
    platforms: [],
    customers: [],
    brands: [],
    groups: [],
    applicants: [],
    months: [],
    industries: []
  });

  // 筛选条件
  const [filters, setFilters] = useState<FilterOptions>({
    zoudan: '全部',
    coopType: '全部',
    platforms: [],
    customers: [],
    brands: [],
    groups: [],
    applicants: [],
    months: [],
    startMonth: '',
    endMonth: '',
    industries: []
  });

  // 加载用户保存的数据
  useEffect(() => {
    if (user) {
      loadUserSavedData();
    }
  }, [user]);

  const loadUserSavedData = async () => {
    setIsLoadingData(true);
    try {
      const savedData = await loadUserData();
      if (savedData && savedData.rawData && savedData.rawData.length > 0) {
        setRawData(savedData.rawData);
        setFileName(savedData.fileName);
        if (savedData.filterChoices) {
          setFilterChoices(savedData.filterChoices);
        }
        if (savedData.filters) {
          setFilters(savedData.filters);
        }
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // 保存用户数据
  const saveUserData = useCallback(async () => {
    if (!user || rawData.length === 0) return;
    
    try {
      await saveUserSession({
        rawData,
        fileName,
        filters,
        filterChoices,
        uploadTime: new Date().toISOString()
      });
    } catch (error) {
      console.error('保存用户数据失败:', error);
    }
  }, [user, rawData, fileName, filters, filterChoices, saveUserSession]);

  // 自动保存数据（当数据变化时）
  useEffect(() => {
    if (user && rawData.length > 0) {
      const timer = setTimeout(() => {
        saveUserData();
      }, 2000); // 延迟2秒保存，避免频繁保存
      return () => clearTimeout(timer);
    }
  }, [user, rawData, fileName, filters, filterChoices, saveUserData]);

  // 处理文件上传成功
  const handleFileUpload = useCallback((data: any[], name: string) => {
    setRawData(data);
    setFileName(name);
    
    // 提取筛选选项
    const choices = extractFilterChoices(data);
    setFilterChoices(choices);
    
    // 重置筛选条件
    setFilters({
      zoudan: '全部',
      coopType: '全部',
      platforms: [],
      customers: [],
      brands: [],
      groups: [],
      applicants: [],
      months: [],
      startMonth: '',
      endMonth: '',
      industries: []
    });
  }, []);

  // 处理sheet名称错误
  const handleSheetError = useCallback((name: string) => {
    setSheetName(name);
    setShowSheetError(true);
  }, []);

  // 计算4个核心组的KPI数据
  const kpiStats = useMemo(() => {
    const coreGroups = ['Elite', 'OOPs', 'Rocket', 'C star'];
    
    const stats: Record<string, { 组别: string; 下单量: number; 返点率: number }> = {
      'Elite': { 组别: 'Elite', 下单量: 0, 返点率: 0 },
      'OOPs': { 组别: 'OOPs', 下单量: 0, 返点率: 0 },
      'Rocket': { 组别: 'Rocket', 下单量: 0, 返点率: 0 },
      'C star': { 组别: 'C star', 下单量: 0, 返点率: 0 },
    };

    // 下单量：包含所有数据（4个核心组）
    const allData = rawData.filter(row => {
      const group = row['排期申请人所属组别'];
      const groupName = extractGroup(group);
      return coreGroups.includes(groupName);
    });

    // 返点率数据：排除走单 + 仅报备合作（4个核心组）
    const baobeiOptions = ['星图1-20s视频', '星图21-60s视频', '星图60s以上视频',
      '星任务星图1-20s视频', '星任务星图21-60s视频', '星任务星图60s以上视频', '星任务短直合作',
      '京魔方星图60s以上视频', '短直种草',
      '报备图文笔记', '报备视频笔记', '星任务报备图文笔记', '星任务报备视频笔记',
      '小红盟图文笔记', '小红盟视频笔记', '小红链图文笔记', '小红链视频笔记', '小红团图文笔记', '小红团视频笔记',
      '平台-视频号发布', '平台-首篇文章', '平台-第二篇文章', '平台-第3-N篇文章', '平台-清单植入',
      '平台微任务直发', '平台微任务转发', '平台微任务原创图文', '平台微任务原创视频',
      '定制视频', '植入视频', '直发动态', '转发动态', '线上直播', '线下直播',
      '平台视频推广',
      '特邀文章', '特邀视频', '特邀回答', '素人众测', '专业测评', '招募回答', '招募文章', '复用文章', '复用回答',
      '原创视频', '原创图文',
      '发布费',
      '供稿图文', '原创图文',
      '种草秀', '短视频', '视频', '图文',
      '原创文案',
      '淘内短视频', '淘内图文',
      '口播', '定制单集', '冠名', '小宇宙-平台【不收平台服务费（25年优惠政策）】'];

    const rebateData = rawData.filter(row => {
      const isZoudan = row['是否客户指定走单'];
      const coopWay = row['合作方式'];
      const group = row['排期申请人所属组别'];
      
      if (isZoudan === '是') return false;
      if (!baobeiOptions.includes(coopWay)) return false;
      
      const groupName = extractGroup(group);
      return coreGroups.includes(groupName);
    });

    // 按组别汇总
    coreGroups.forEach(groupName => {
      // 下单量：所有数据
      const groupAllData = allData.filter(row => extractGroup(row['排期申请人所属组别']) === groupName);
      let totalAmount = 0;
      groupAllData.forEach(row => {
        totalAmount += Number(row['Kol刊例单价(元)']) || 0;
      });
      
      // 返点率：排除走单 + 仅报备合作
      const groupRebateData = rebateData.filter(row => extractGroup(row['排期申请人所属组别']) === groupName);
      let rebateAmount = 0;
      let rebateNet = 0;
      groupRebateData.forEach(row => {
        rebateAmount += Number(row['Kol刊例单价(元)']) || 0;
        rebateNet += Number(row['kol净价(元)']) || 0;
      });
      
      stats[groupName].下单量 = totalAmount;
      stats[groupName].返点率 = rebateAmount > 0 ? ((rebateAmount - rebateNet) / rebateAmount * 100) : 0;
    });

    return stats;
  }, [rawData]);

  // 重新上传
  const handleReupload = () => {
    setRawData([]);
    setFileName('');
    setFilters({
      zoudan: '全部',
      coopType: '全部',
      platforms: [],
      customers: [],
      brands: [],
      groups: [],
      applicants: [],
      months: [],
      startMonth: '',
      endMonth: '',
      industries: []
    });
    setFilterChoices({ platforms: [], customers: [], brands: [], groups: [], applicants: [], months: [], industries: [] });
    setShowUploadDialog(true);
  };

  // 处理登出
  const handleLogout = () => {
    logout();
    setRawData([]);
    setFileName('');
    setShowUserMenu(false);
  };

  // 查看用户统计（仅管理员）
  const handleViewUserStats = async () => {
    const stats = await getUserStats();
    setUserStats(stats);
    setShowUserStats(true);
    setShowUserMenu(false);
  };

  // 删除用户（仅管理员）
  const handleDeleteUser = async (userId: string) => {
    if (confirm('确定要删除该用户吗？此操作不可恢复。')) {
      await deleteUser(userId);
      const stats = await getUserStats();
      setUserStats(stats);
    }
  };

  // 修改用户角色（仅管理员）
  const handleChangeRole = async (userId: string, newRole: 'admin' | 'manager' | 'user') => {
    await changeUserRole(userId, newRole);
    const stats = await getUserStats();
    setUserStats(stats);
  };

  // 未登录显示登录页
  if (!user) {
    return <LoginPage />;
  }

  // 加载中显示loading
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">正在加载您的数据...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
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
                {getNavItems(user.role === 'admin').map((item) => (
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

              {/* 右侧：文件信息和用户信息 */}
              <div className="flex items-center gap-4">
                {/* AI 配置入口 */}
                <button
                  onClick={() => setShowLLMConfig(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  title="AI 助手配置"
                >
                  <Bot className="w-4 h-4" />
                  AI 配置
                </button>

                {/* 文件信息 */}
                {fileName && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{fileName}</span>
                    <button
                      onClick={handleReupload}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                    >
                      重新上传
                    </button>
                  </div>
                )}

                {/* 用户菜单 */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </button>

                  {/* 下拉菜单 */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border py-1 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role === 'admin' ? '管理员' : user.role === 'manager' ? '媒介总监' : '媒介专员'}</p>
                      </div>
                      {user.role === 'admin' && (
                        <button
                          onClick={handleViewUserStats}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          用户管理
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            {/* KPI追踪 - 仅管理员可访问 */}
            <Route 
              path="/" 
              element={
                user.role === 'admin' ? (
                  <KPITrackingPage 
                    rawData={rawData} 
                    kpiStats={kpiStats} 
                    onUploadClick={() => setShowUploadDialog(true)} 
                  />
                ) : (
                  <Navigate to="/filter" replace />
                )
              } 
            />
            <Route 
              path="/filter" 
              element={
                <FilterPage 
                  rawData={rawData}
                  filterChoices={filterChoices}
                  filters={filters}
                  setFilters={setFilters}
                  onUploadClick={() => setShowUploadDialog(true)}
                />
              } 
            />
            <Route 
              path="/purchase" 
              element={
                <PurchasePage 
                  rawData={rawData}
                  filters={filters}
                  setFilters={setFilters}
                  onUploadClick={() => setShowUploadDialog(true)}
                />
              } 
            />
            <Route 
              path="/industry-mcn" 
              element={
                <IndustryMCNPage 
                  rawData={rawData}
                />
              } 
            />
          </Routes>
        </main>

        {/* 文件上传弹窗 */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>上传Excel文件</DialogTitle>
              <DialogDescription>
                请上传包含KOL明细数据的Excel文件（需包含"{CORRECT_SHEET_NAME}"工作表）
              </DialogDescription>
            </DialogHeader>
            <FileUpload 
              onUploadSuccess={handleFileUpload} 
              onSheetError={handleSheetError}
              onClose={() => setShowUploadDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Sheet名称错误提示 */}
        <Dialog open={showSheetError} onOpenChange={setShowSheetError}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                工作表名称错误
              </DialogTitle>
              <DialogDescription>
                检测到工作表名称为"{sheetName}"，但需要的是"{CORRECT_SHEET_NAME}"。
                <br /><br />
                请将工作表重命名为"{CORRECT_SHEET_NAME}"后重新上传。
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* 用户统计弹窗（仅管理员） */}
        <Dialog open={showUserStats} onOpenChange={setShowUserStats}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                用户管理
              </DialogTitle>
              <DialogDescription>
                当前共有 <span className="font-bold text-blue-600">{userStats?.total || 0}</span> 位注册用户
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">用户名</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">姓名</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">角色</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">注册时间</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userStats?.users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{u.username}</td>
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {u.role === 'admin' ? '管理员' : u.role === 'manager' ? '媒介总监' : '媒介专员'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.createdAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* 角色选择下拉框 */}
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value as 'admin' | 'manager' | 'user')}
                            className="text-xs border rounded px-2 py-1 bg-white"
                          >
                            <option value="user">媒介专员</option>
                            <option value="manager">媒介总监</option>
                            <option value="admin">管理员</option>
                          </select>
                          
                          {/* 删除按钮 */}
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              <p>💡 提示：每个用户只能查看自己上传的数据，确保信息安全与独立。</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* LLM 配置弹窗 */}
        <LLMConfigDialog open={showLLMConfig} onOpenChange={setShowLLMConfig} />

        {/* 全局 AI 助手悬浮球 */}
        <AIAssistant rawData={rawData} onOpenConfig={() => setShowLLMConfig(true)} />

        {/* 点击外部关闭用户菜单 */}
        {showUserMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowUserMenu(false)}
          />
        )}
      </div>
    </BrowserRouter>
  );
}

// 根组件
function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
