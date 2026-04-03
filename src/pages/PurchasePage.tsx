import { useMemo, useState } from 'react';
import { PurchaseAnalysis } from '@/components/PurchaseAnalysis';
import { AbilityMap } from '@/components/AbilityMap';
import { MultiSelect } from '@/components/MultiSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TrendingUp, Filter, Star, BarChart3 } from 'lucide-react';
import { getCascadingFilterChoices, filterData } from '@/utils/dataProcessor';
import type { FilterOptions } from '@/types';

interface PurchasePageProps {
  rawData: any[];
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  onUploadClick: () => void;
}

export function PurchasePage({ rawData, filters, setFilters, onUploadClick }: PurchasePageProps) {
  // 视图切换状态
  const [activeView, setActiveView] = useState<'analysis' | 'ability'>('analysis');

  // 根据筛选条件过滤数据
  const filteredData = useMemo(() => {
    if (rawData.length === 0) return [];
    return filterData(rawData, filters);
  }, [rawData, filters]);

  // 构建筛选状态文本
  const getFilterStatusText = () => {
    const parts: string[] = [];
    parts.push(`是否走单=${filters.zoudan}`);
    parts.push(`合作形式=${filters.coopType}`);
    if (filters.platforms.length > 0) {
      parts.push(`平台=${filters.platforms.length}个`);
    }
    if (filters.customers.length > 0) {
      parts.push(`客户=${filters.customers.length}个`);
    }
    if (filters.brands.length > 0) {
      parts.push(`品牌=${filters.brands.length}个`);
    }
    if (filters.groups.length > 0) {
      parts.push(`组别=${filters.groups.length}个`);
    }
    if (filters.applicants.length > 0) {
      parts.push(`申请人=${filters.applicants.length}个`);
    }
    if (filters.months.length > 0) {
      parts.push(`月份=${filters.months.join('、')}`);
    }
    if (filters.startMonth || filters.endMonth) {
      parts.push(`年月范围=${filters.startMonth || '不限'} 至 ${filters.endMonth || '不限'}`);
    }
    if (filters.industries.length > 0) {
      parts.push(`行业=${filters.industries.length}个`);
    }
    return parts.join('，');
  };

  // 清除所有筛选
  const clearAllFilters = () => {
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

  if (!rawData || rawData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <TrendingUp className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">采买方式使用情况分析</h2>
        <p className="text-gray-500 mb-6">请先上传Excel文件以查看采买分析</p>
        <button
          onClick={onUploadClick}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          上传Excel文件
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选条件 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            数据筛选
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* 走单筛选 */}
            <div className="flex flex-col gap-2">
              <Label>是否走单</Label>
              <Select
                value={filters.zoudan}
                onValueChange={(value: any) => setFilters({ ...filters, zoudan: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择走单状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部">全部</SelectItem>
                  <SelectItem value="是">是（走单）</SelectItem>
                  <SelectItem value="否">否（非走单）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 合作形式筛选 */}
            <div className="flex flex-col gap-2">
              <Label>合作形式</Label>
              <Select
                value={filters.coopType}
                onValueChange={(value: any) => setFilters({ ...filters, coopType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择合作形式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部">全部</SelectItem>
                  <SelectItem value="报备">报备合作</SelectItem>
                  <SelectItem value="非报备">非报备合作</SelectItem>
                  <SelectItem value="其它">其它</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 所属组别筛选 */}
            <MultiSelect
              label="所属组别"
              options={getCascadingFilterChoices(rawData, filters, 'groups').groups}
              selected={filters.groups}
              onChange={(selected) => setFilters({ ...filters, groups: selected })}
              placeholder="选择所属组别"
            />

            {/* 排期申请人筛选 */}
            <MultiSelect
              label="排期申请人"
              options={getCascadingFilterChoices(rawData, filters, 'applicants').applicants}
              selected={filters.applicants}
              onChange={(selected) => setFilters({ ...filters, applicants: selected })}
              placeholder="选择排期申请人"
            />

            {/* 投放平台筛选 */}
            <MultiSelect
              label="投放平台"
              options={getCascadingFilterChoices(rawData, filters, 'platforms').platforms}
              selected={filters.platforms}
              onChange={(selected) => setFilters({ ...filters, platforms: selected })}
              placeholder="选择投放平台"
            />

            {/* 客户名称筛选 */}
            <MultiSelect
              label="客户名称"
              options={getCascadingFilterChoices(rawData, filters, 'customers').customers}
              selected={filters.customers}
              onChange={(selected) => setFilters({ ...filters, customers: selected })}
              placeholder="选择客户名称"
            />

            {/* 投放品牌筛选 */}
            <MultiSelect
              label="投放品牌"
              options={getCascadingFilterChoices(rawData, filters, 'brands').brands}
              selected={filters.brands}
              onChange={(selected) => setFilters({ ...filters, brands: selected })}
              placeholder="选择投放品牌"
            />

            {/* 月份筛选 */}
            <MultiSelect
              label="月份"
              options={getCascadingFilterChoices(rawData, filters, 'months').months}
              selected={filters.months}
              onChange={(selected) => setFilters({ ...filters, months: selected })}
              placeholder="选择月份"
            />

            {/* 客户行业筛选 */}
            <MultiSelect
              label="客户行业"
              options={getCascadingFilterChoices(rawData, filters, 'industries').industries}
              selected={filters.industries}
              onChange={(selected) => setFilters({ ...filters, industries: selected })}
              placeholder="选择客户行业"
            />
          </div>

          {/* 自定义年月范围筛选 */}
          <div className="mt-4 pt-4 border-t">
            <Label className="mb-2 block text-sm font-medium text-gray-700">自定义年月范围</Label>
            <div className="flex items-center gap-4 max-w-md">
              <div className="flex-1">
                <Select
                  value={filters.startMonth || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, startMonth: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="开始年月" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">不限</SelectItem>
                    {Array.from(new Set(rawData.map(row => {
                      const date = row['下单日期'];
                      if (!date) return null;
                      try {
                        let d: Date;
                        if (date instanceof Date) {
                          d = date;
                        } else if (typeof date === 'number') {
                          d = new Date((date - 25569) * 86400 * 1000);
                        } else {
                          d = new Date(date);
                        }
                        if (isNaN(d.getTime())) return null;
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        return `${year}-${month}`;
                      } catch { return null; }
                    }).filter((v): v is string => v !== null && v !== ''))).sort().map(ym => (
                      <SelectItem key={ym} value={ym}>{ym}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-gray-500">至</span>
              <div className="flex-1">
                <Select
                  value={filters.endMonth || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, endMonth: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="结束年月" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">不限</SelectItem>
                    {Array.from(new Set(rawData.map(row => {
                      const date = row['下单日期'];
                      if (!date) return null;
                      try {
                        let d: Date;
                        if (date instanceof Date) {
                          d = date;
                        } else if (typeof date === 'number') {
                          d = new Date((date - 25569) * 86400 * 1000);
                        } else {
                          d = new Date(date);
                        }
                        if (isNaN(d.getTime())) return null;
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        return `${year}-${month}`;
                      } catch { return null; }
                    }).filter((v): v is string => v !== null && v !== ''))).sort().map(ym => (
                      <SelectItem key={ym} value={ym}>{ym}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 当前筛选状态和清除按钮 */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              当前筛选：<span className="font-medium text-gray-700">{getFilterStatusText()}</span>
            </div>
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              清除所有筛选
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 筛选结果统计 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">筛选后数据量</p>
            <p className="text-2xl font-bold text-emerald-600">{filteredData.length} 条</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">原始数据量</p>
            <p className="text-2xl font-bold text-gray-600">{rawData.length} 条</p>
          </CardContent>
        </Card>
      </div>

      {/* 视图切换 */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('analysis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeView === 'analysis'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          采买分析
        </button>
        <button
          onClick={() => setActiveView('ability')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeView === 'ability'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Star className="w-4 h-4" />
          能力图谱
        </button>
      </div>

      {/* 内容区域 */}
      {activeView === 'analysis' ? (
        <PurchaseAnalysis rawData={filteredData} />
      ) : (
        <AbilityMap rawData={filteredData} />
      )}
    </div>
  );
}
