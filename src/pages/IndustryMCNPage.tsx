import { useState, useMemo, useEffect } from 'react';
import { Building2, TrendingUp, Percent, Settings, Edit2, Check, X, Filter, RotateCcw, Lightbulb, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { CoreMCNManager } from '@/components/CoreMCNManager';
import { getCoreMCNList, getIndustryPolicy, saveIndustryPolicy } from '@/utils/coreMCNStorage';
import { extractFilterChoices, extractGroup, getCoopType } from '@/utils/dataProcessor';
import type { IndustryType, CorePlatformType, CoreMCNStats, FilterOptions } from '@/types';

const INDUSTRIES: IndustryType[] = ['互联网电商', '食品', '母婴'];
const PLATFORMS: CorePlatformType[] = ['抖音', '小红书'];

interface IndustryMCNPageProps {
  rawData: any[];
}

export function IndustryMCNPage({ rawData }: IndustryMCNPageProps) {
  const [activeIndustry, setActiveIndustry] = useState<IndustryType>('互联网电商');
  const [showManager, setShowManager] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [policies, setPolicies] = useState<Record<string, string>>({});
  const [editingMCNId, setEditingMCNId] = useState<string | null>(null);
  const [policyInput, setPolicyInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [mcnList, setMcnList] = useState<any[]>([]);

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

  // 筛选选项
  const filterChoices = useMemo(() => {
    return extractFilterChoices(rawData);
  }, [rawData]);

  // 加载MCN列表和政策数据
  useEffect(() => {
    const loadMCNData = async () => {
      const list = await getCoreMCNList();
      setMcnList(list);

      const policyMap: Record<string, string> = {};
      for (const mcn of list) {
        const policy = await getIndustryPolicy(mcn.id);
        policyMap[mcn.id] = policy?.policy2026 || '';
      }
      setPolicies(policyMap);
    };
    loadMCNData();
  }, [refreshKey]);

  // 筛选数据（应用所有筛选条件）
  const filteredRawData = useMemo(() => {
    return rawData.filter(row => {
      const coopWay = row['合作方式'];
      const isZoudan = row['是否客户指定走单'];
      const platform = row['发布平台'];
      const customer = row['对客项目客户名称'];
      const brand = row['投放品牌'];
      const group = row['排期申请人所属组别'];
      const applicant = row['排期申请人'];
      const date = row['下单日期'];
      const industry = row['行业'];

      // 走单筛选
      if (filters.zoudan === '否' && isZoudan === '是') return false;
      if (filters.zoudan === '是' && isZoudan !== '是') return false;

      // 合作形式筛选
      const coopType = getCoopType(coopWay);
      if (filters.coopType === '报备' && coopType !== '报备') return false;
      if (filters.coopType === '非报备' && coopType !== '非报备') return false;
      if (filters.coopType === '其它' && coopType !== '其它') return false;

      // 投放平台筛选
      if (filters.platforms.length > 0) {
        if (!platform || !filters.platforms.includes(platform.trim())) return false;
      }

      // 客户名称筛选
      if (filters.customers.length > 0) {
        if (!customer || !filters.customers.includes(customer.trim())) return false;
      }

      // 投放品牌筛选
      if (filters.brands.length > 0) {
        if (!brand || !filters.brands.includes(brand.trim())) return false;
      }

      // 所属组别筛选
      if (filters.groups.length > 0) {
        const groupName = group ? extractGroup(group) : '';
        if (!groupName || !filters.groups.includes(groupName)) return false;
      }

      // 排期申请人筛选
      if (filters.applicants.length > 0) {
        if (!applicant || !filters.applicants.includes(applicant.trim())) return false;
      }

      // 月份筛选
      if (filters.months.length > 0) {
        const month = date ? extractMonth(date) : null;
        if (!month || !filters.months.includes(month)) return false;
      }

      // 自定义年月范围筛选
      if (filters.startMonth || filters.endMonth) {
        const yearMonth = date ? extractYearMonth(date) : null;
        if (!yearMonth) return false;
        if (filters.startMonth && yearMonth < filters.startMonth) return false;
        if (filters.endMonth && yearMonth > filters.endMonth) return false;
      }

      // 客户行业筛选
      if (filters.industries.length > 0) {
        if (!industry || !filters.industries.includes(industry.trim())) return false;
      }

      return true;
    });
  }, [rawData, filters]);

  // 计算核心机构统计数据（基于筛选后的数据）
  const mcnStats = useMemo((): CoreMCNStats[] => {
    if (filteredRawData.length === 0 || mcnList.length === 0) return [];

    const stats: CoreMCNStats[] = [];

    // 获取筛选后的数据总金额（用于计算占比）
    const totalAmount = filteredRawData.reduce((sum, row) => {
      return sum + (Number(row['Kol刊例单价(元)']) || 0);
    }, 0);

    // 遍历所有核心机构，在筛选后的数据中匹配
    mcnList.forEach(mcn => {
      // 匹配该机构的数据（根据【机构别称/达人昵称】或【采买工商主体】模糊匹配）
      const mcnData = filteredRawData.filter(row => {
        const orgAlias = (row['机构别称/达人昵称'] || '').toLowerCase();
        const supplier = (row['采买工商主体'] || '').toLowerCase();
        const talentName = (row['达人昵称'] || '').toLowerCase();
        const mcnName = mcn.name.toLowerCase();

        // 模糊匹配机构名称
        return orgAlias.includes(mcnName) ||
               mcnName.includes(orgAlias) ||
               supplier.includes(mcnName) ||
               mcnName.includes(supplier) ||
               talentName.includes(mcnName) ||
               mcnName.includes(talentName);
      });

      // 如果没有匹配到数据，仍然显示该机构（数据为0）
      const 刊例总额 = mcnData.reduce((sum, row) => {
        return sum + (Number(row['Kol刊例单价(元)']) || 0);
      }, 0);

      const 净价总额 = mcnData.reduce((sum, row) => {
        return sum + (Number(row['kol净价(元)']) || 0);
      }, 0);

      const 订单数 = mcnData.length;
      const 返点率 = 刊例总额 > 0 ? ((刊例总额 - 净价总额) / 刊例总额 * 100) : 0;
      const 下单占比 = totalAmount > 0 ? (刊例总额 / totalAmount * 100) : 0;

      stats.push({
        mcnId: mcn.id,
        mcnName: mcn.name,
        industry: mcn.industry,
        platform: mcn.platform,
        刊例总额,
        净价总额,
        返点率,
        订单数,
        行业总刊例: totalAmount,
        下单占比
      });
    });

    return stats;
  }, [filteredRawData, refreshKey]);

  // 获取当前行业的统计数据
  const currentIndustryStats = useMemo(() => {
    return mcnStats.filter(s => s.industry === activeIndustry);
  }, [mcnStats, activeIndustry]);

  // 按平台分组（按下单量降序排序）
  const statsByPlatform = useMemo(() => {
    const result: Record<CorePlatformType, CoreMCNStats[]> = {
      '抖音': [],
      '小红书': []
    };
    currentIndustryStats.forEach(stat => {
      result[stat.platform].push(stat);
    });
    // 每个平台按刊例总额降序排序
    PLATFORMS.forEach(platform => {
      result[platform].sort((a, b) => b.刊例总额 - a.刊例总额);
    });
    return result;
  }, [currentIndustryStats]);

  // 生成智能建议
  const platformSuggestions = useMemo(() => {
    const suggestions: Record<CorePlatformType, { type: 'increase' | 'decrease' | 'maintain'; title: string; content: string }[]> = {
      '抖音': [],
      '小红书': []
    };

    PLATFORMS.forEach(platform => {
      const platformStats = statsByPlatform[platform];
      if (platformStats.length === 0) return;

      // 计算平台整体数据
      const totalAmount = platformStats.reduce((sum, s) => sum + s.刊例总额, 0);
      const avgRebate = totalAmount > 0
        ? platformStats.reduce((sum, s) => sum + s.刊例总额 * s.返点率, 0) / totalAmount
        : 0;

      // 找出头部机构（前3名）
      const topMCNs = platformStats.slice(0, 3);
      const topAmount = topMCNs.reduce((sum, s) => sum + s.刊例总额, 0);
      const topRatio = totalAmount > 0 ? (topAmount / totalAmount * 100) : 0;

      // 找出高返点但低下单量的机构
      const highRebateLowAmount = platformStats.filter(s => s.返点率 >= 35 && s.刊例总额 < totalAmount / platformStats.length / 2);

      // 找出低返点但高下单量的机构
      const lowRebateHighAmount = platformStats.filter(s => s.返点率 < 25 && s.刊例总额 > totalAmount / platformStats.length);

      // 建议1：集中度分析
      if (topRatio > 70) {
        suggestions[platform].push({
          type: 'decrease',
          title: '下单过于集中',
          content: `前3家机构占平台总下单量的${topRatio.toFixed(1)}%，建议适当分散风险，增加其他优质机构合作。`
        });
      } else if (topRatio < 40) {
        suggestions[platform].push({
          type: 'increase',
          title: '机构分散度过高',
          content: `前3家机构仅占平台总下单量的${topRatio.toFixed(1)}%，建议集中资源培养2-3家核心机构，提升议价能力。`
        });
      }

      // 建议2：高返点机构分析
      if (highRebateLowAmount.length > 0) {
        const names = highRebateLowAmount.slice(0, 2).map(s => s.mcnName).join('、');
        suggestions[platform].push({
          type: 'increase',
          title: '发现高返点潜力机构',
          content: `${names}等机构返点率较高（≥35%）但下单量偏低，建议增加合作力度，有望获得更好价格。`
        });
      }

      // 建议3：低返点机构分析
      if (lowRebateHighAmount.length > 0) {
        const names = lowRebateHighAmount.slice(0, 2).map(s => s.mcnName).join('、');
        suggestions[platform].push({
          type: 'decrease',
          title: '低返点机构需优化',
          content: `${names}等机构下单量高但返点率偏低（<25%），建议重新谈判价格或考虑替换。`
        });
      }

      // 建议4：平均返点率分析
      if (avgRebate < 25) {
        suggestions[platform].push({
          type: 'increase',
          title: '整体返点率偏低',
          content: `平台平均返点率仅${avgRebate.toFixed(1)}%，建议引入返点率更高的新机构，或重新谈判现有机构价格。`
        });
      } else if (avgRebate > 40) {
        suggestions[platform].push({
          type: 'maintain',
          title: '返点率表现优秀',
          content: `平台平均返点率达${avgRebate.toFixed(1)}%，价格优势明显，建议维持现有机构结构。`
        });
      }

      // 建议5：机构数量建议
      const activeMCNs = platformStats.filter(s => s.刊例总额 > 0).length;
      if (activeMCNs < 3) {
        suggestions[platform].push({
          type: 'increase',
          title: '建议增加合作机构',
          content: `当前仅${activeMCNs}家机构有下单，建议拓展至5-8家，增强供应稳定性和议价能力。`
        });
      } else if (activeMCNs > 15) {
        suggestions[platform].push({
          type: 'decrease',
          title: '建议精简机构数量',
          content: `当前${activeMCNs}家机构过于分散，建议精简至8-10家核心机构，提升管理效率。`
        });
      }
    });

    return suggestions;
  }, [statsByPlatform]);

  // 平台汇总数据
  const platformSummary = useMemo(() => {
    const summary: Record<CorePlatformType, { 总刊例: number; 总订单: number; 平均返点率: number }> = {
      '抖音': { 总刊例: 0, 总订单: 0, 平均返点率: 0 },
      '小红书': { 总刊例: 0, 总订单: 0, 平均返点率: 0 }
    };

    PLATFORMS.forEach(platform => {
      const platformStats = statsByPlatform[platform];
      const 总刊例 = platformStats.reduce((sum, s) => sum + s.刊例总额, 0);
      const 总订单 = platformStats.reduce((sum, s) => sum + s.订单数, 0);
      const 加权返点 = platformStats.reduce((sum, s) => sum + s.刊例总额 * s.返点率, 0);
      const 平均返点率 = 总刊例 > 0 ? 加权返点 / 总刊例 : 0;

      summary[platform] = { 总刊例, 总订单, 平均返点率 };
    });

    return summary;
  }, [statsByPlatform]);

  // 保存政策
  const handleSavePolicy = async (mcnId: string) => {
    await saveIndustryPolicy(mcnId, policyInput);
    setPolicies(prev => ({ ...prev, [mcnId]: policyInput }));
    setEditingMCNId(null);
    setPolicyInput('');
  };

  // 开始编辑政策
  const startEditPolicy = (mcnId: string) => {
    setEditingMCNId(mcnId);
    setPolicyInput(policies[mcnId] || '');
  };

  // 取消编辑政策
  const cancelEditPolicy = () => {
    setEditingMCNId(null);
    setPolicyInput('');
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // 清除所有筛选
  const clearFilters = () => {
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
  };

  // 获取当前筛选描述
  const getFilterSummary = () => {
    const parts: string[] = [];
    if (filters.zoudan !== '全部') parts.push(`是否走单=${filters.zoudan}`);
    if (filters.coopType !== '全部') parts.push(`合作形式=${filters.coopType}`);
    if (filters.platforms.length > 0) parts.push(`平台=${filters.platforms.length}个`);
    if (filters.customers.length > 0) parts.push(`客户=${filters.customers.length}个`);
    if (filters.brands.length > 0) parts.push(`品牌=${filters.brands.length}个`);
    if (filters.groups.length > 0) parts.push(`组别=${filters.groups.length}个`);
    if (filters.applicants.length > 0) parts.push(`申请人=${filters.applicants.length}个`);
    if (filters.months.length > 0) parts.push(`月份=${filters.months.length}个`);
    if (filters.industries.length > 0) parts.push(`行业=${filters.industries.length}个`);
    if (filters.startMonth) parts.push(`开始年月=${filters.startMonth}`);
    if (filters.endMonth) parts.push(`结束年月=${filters.endMonth}`);
    return parts.length > 0 ? parts.join('，') : '无筛选条件';
  };

  // 从日期提取月份
  function extractMonth(dateValue: any): string | null {
    if (!dateValue) return null;
    try {
      let date: Date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'number') {
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else {
        date = new Date(dateValue);
      }
      if (isNaN(date.getTime())) return null;
      return `${date.getMonth() + 1}月`;
    } catch {
      return null;
    }
  }

  // 从日期提取年月
  function extractYearMonth(dateValue: any): string | null {
    if (!dateValue) return null;
    try {
      let date: Date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'number') {
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else {
        date = new Date(dateValue);
      }
      if (isNaN(date.getTime())) return null;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    } catch {
      return null;
    }
  }

  // 渲染筛选面板
  const renderFilterPanel = () => {
    if (!showFilters) return null;

    return (
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            数据筛选
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 是否走单 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">是否走单</label>
              <Select value={filters.zoudan} onValueChange={(v) => setFilters(prev => ({ ...prev, zoudan: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部">全部</SelectItem>
                  <SelectItem value="是">是</SelectItem>
                  <SelectItem value="否">否</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 合作形式 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">合作形式</label>
              <Select value={filters.coopType} onValueChange={(v) => setFilters(prev => ({ ...prev, coopType: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部">全部</SelectItem>
                  <SelectItem value="报备">报备</SelectItem>
                  <SelectItem value="非报备">非报备</SelectItem>
                  <SelectItem value="其它">其它</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 所属组别 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">所属组别</label>
              <Select
                value={filters.groups[0] || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, groups: v === 'all' ? [] : [v] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择组别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部组别</SelectItem>
                  {filterChoices.groups.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 排期申请人 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">排期申请人</label>
              <Select
                value={filters.applicants[0] || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, applicants: v === 'all' ? [] : [v] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择申请人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部申请人</SelectItem>
                  {filterChoices.applicants.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 投放平台 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">投放平台</label>
              <Select
                value={filters.platforms[0] || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, platforms: v === 'all' ? [] : [v] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  {filterChoices.platforms.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 客户名称 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">客户名称</label>
              <Select
                value={filters.customers[0] || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, customers: v === 'all' ? [] : [v] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部客户</SelectItem>
                  {filterChoices.customers.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 投放品牌 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">投放品牌</label>
              <Select
                value={filters.brands[0] || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, brands: v === 'all' ? [] : [v] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择品牌" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部品牌</SelectItem>
                  {filterChoices.brands.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 月份 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">月份</label>
              <Select
                value={filters.months[0] || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, months: v === 'all' ? [] : [v] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择月份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部月份</SelectItem>
                  {filterChoices.months.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 客户行业 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">客户行业</label>
              <Select
                value={filters.industries[0] || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, industries: v === 'all' ? [] : [v] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择行业" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部行业</SelectItem>
                  {filterChoices.industries.map(i => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 开始年月 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">开始年月</label>
              <Input
                type="month"
                value={filters.startMonth}
                onChange={(e) => setFilters(prev => ({ ...prev, startMonth: e.target.value }))}
              />
            </div>

            {/* 结束年月 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">结束年月</label>
              <Input
                type="month"
                value={filters.endMonth}
                onChange={(e) => setFilters(prev => ({ ...prev, endMonth: e.target.value }))}
              />
            </div>
          </div>

          {/* 筛选摘要和清除按钮 */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              当前筛选：<span className="text-gray-700">{getFilterSummary()}</span>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              清除所有筛选
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染平台数据卡片
  const renderPlatformCard = (platform: CorePlatformType) => {
    const stats = statsByPlatform[platform];
    const summary = platformSummary[platform];

    return (
      <div key={platform} className="space-y-4">
        {/* 平台汇总 */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">投放刊例总额</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                ¥{(summary.总刊例 / 10000).toFixed(1)}万
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Percent className="w-4 h-4" />
                <span className="text-sm">平均返点率</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {summary.平均返点率.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">核心机构数</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {stats.length}家
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 机构明细表格 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{platform} - 核心机构投放数据</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无数据</p>
                <p className="text-sm mt-1">请上传排期数据或添加核心机构</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">机构名称</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">投放刊例总额</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">返点率</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">下单占比</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">订单数</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">26年行业政策</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.map(stat => (
                      <tr key={stat.mcnId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{stat.mcnName}</td>
                        <td className="px-4 py-3 text-right">
                          ¥{(stat.刊例总额 / 10000).toFixed(1)}万
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`${stat.返点率 >= 30 ? 'text-green-600' : 'text-gray-600'}`}>
                            {stat.返点率.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min(stat.下单占比, 100)}%` }}
                              />
                            </div>
                            <span>{stat.下单占比.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{stat.订单数}单</td>
                        <td className="px-4 py-3">
                          {editingMCNId === stat.mcnId ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={policyInput}
                                onChange={(e) => setPolicyInput(e.target.value)}
                                placeholder="输入26年政策..."
                                className="w-48 text-sm"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSavePolicy(stat.mcnId)}
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditPolicy}
                              >
                                <X className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 truncate max-w-[150px]">
                                {policies[stat.mcnId] || '未设置'}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditPolicy(stat.mcnId)}
                              >
                                <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">行业核心机构监测</h1>
          <p className="text-gray-500 mt-1">监测互联网电商、食品、母婴行业的核心MCN机构投放数据</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            刷新数据
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="w-4 h-4" />
            {showFilters ? '收起筛选' : '数据筛选'}
          </Button>
          <Button onClick={() => setShowManager(!showManager)} className="gap-2">
            <Settings className="w-4 h-4" />
            {showManager ? '收起管理' : '机构管理'}
          </Button>
        </div>
      </div>

      {/* 筛选面板 */}
      {renderFilterPanel()}

      {/* 机构管理面板 */}
      {showManager && (
        <CoreMCNManager onMCNChange={handleRefresh} />
      )}

      {/* 行业选择 */}
      <Tabs value={activeIndustry} onValueChange={(v) => setActiveIndustry(v as IndustryType)}>
        <TabsList className="grid w-full grid-cols-3">
          {INDUSTRIES.map(industry => (
            <TabsTrigger key={industry} value={industry}>{industry}</TabsTrigger>
          ))}
        </TabsList>

        {INDUSTRIES.map(industry => (
          <TabsContent key={industry} value={industry} className="space-y-6">
            {/* 平台数据 */}
            <div className="space-y-8">
              {PLATFORMS.map(platform => (
                <div key={platform}>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">
                      {platform === '抖音' ? '抖' : '红'}
                    </span>
                    {platform}平台
                  </h3>
                  {renderPlatformCard(platform)}

                  {/* 智能建议 */}
                  {platformSuggestions[platform].length > 0 && (
                    <Card className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-amber-500" />
                          智能建议
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {platformSuggestions[platform].map((suggestion, index) => (
                            <div
                              key={index}
                              className={`flex items-start gap-3 p-3 rounded-lg ${
                                suggestion.type === 'increase'
                                  ? 'bg-green-100/50'
                                  : suggestion.type === 'decrease'
                                  ? 'bg-red-100/50'
                                  : 'bg-blue-100/50'
                              }`}
                            >
                              <div className={`mt-0.5 ${
                                suggestion.type === 'increase'
                                  ? 'text-green-600'
                                  : suggestion.type === 'decrease'
                                  ? 'text-red-600'
                                  : 'text-blue-600'
                              }`}>
                                {suggestion.type === 'increase' ? (
                                  <Plus className="w-5 h-5" />
                                ) : suggestion.type === 'decrease' ? (
                                  <Minus className="w-5 h-5" />
                                ) : (
                                  <TrendingUp className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className={`font-medium ${
                                  suggestion.type === 'increase'
                                    ? 'text-green-700'
                                    : suggestion.type === 'decrease'
                                    ? 'text-red-700'
                                    : 'text-blue-700'
                                }`}>
                                  {suggestion.title}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {suggestion.content}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
