import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Building2, User, TrendingUp, PieChart, Target, Truck } from 'lucide-react';

interface PurchaseAnalysisProps {
  rawData: any[];
}

// 达人类型：机构、个人、供应商
type TalentType = '机构' | '个人' | '供应商';

interface TalentAnalysis {
  名称: string;
  类型: TalentType;
  下单量: number;
  净价: number;
  返点率: number;
  订单数: number;
  占比: number;
}

interface IndustryAnalysis {
  行业: string;
  总下单量: number;
  机构列表: TalentAnalysis[];
  个人列表: TalentAnalysis[];
  供应商列表: TalentAnalysis[];
}

interface PlatformAnalysis {
  平台: string;
  总下单量: number;
  机构列表: TalentAnalysis[];
  个人列表: TalentAnalysis[];
  供应商列表: TalentAnalysis[];
}

export function PurchaseAnalysis({ rawData }: PurchaseAnalysisProps) {
  if (!rawData || rawData.length === 0) return null;

  // 根据AS列（采买方式）判断达人类型
  const getTalentType = (row: any): TalentType => {
    const caimaiType = (row['采买方式'] || '').toString().trim();
    
    // 机构
    if (caimaiType === '机构') {
      return '机构';
    }
    
    // 供应商：供应商kol、供应商koc、供应商走单
    if (caimaiType.includes('供应商')) {
      return '供应商';
    }
    
    // 个人：个人、工作室
    if (caimaiType === '个人' || caimaiType === '工作室') {
      return '个人';
    }
    
    // 默认归为个人
    return '个人';
  };

  // 获取达人/机构/供应商名称
  const getTalentName = (row: any, type: TalentType): string => {
    if (type === '机构') {
      // 机构取 AW列（机构别称/达人昵称）
      return row['机构别称/达人昵称'] || '未知机构';
    } else if (type === '供应商') {
      // 供应商取 AX列（采买工商主体）
      return row['采买工商主体'] || '未知供应商';
    } else {
      // 个人取 U列（达人昵称）
      return row['达人昵称'] || '未知博主';
    }
  };

  // 按行业分析
  const analyzeByIndustry = useMemo((): IndustryAnalysis[] => {
    const industryMap: Record<string, {
      总下单量: number;
      机构: Record<string, { 下单量: number; 净价: number; 订单数: number }>;
      个人: Record<string, { 下单量: number; 净价: number; 订单数: number }>;
      供应商: Record<string, { 下单量: number; 净价: number; 订单数: number }>;
    }> = {};

    rawData.forEach(row => {
      const industry = row['行业'] || '未知行业';
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      const type = getTalentType(row);
      const name = getTalentName(row, type);

      if (!industryMap[industry]) {
        industryMap[industry] = { 总下单量: 0, 机构: {}, 个人: {}, 供应商: {} };
      }

      industryMap[industry].总下单量 += amount;

      let targetMap;
      if (type === '机构') {
        targetMap = industryMap[industry].机构;
      } else if (type === '个人') {
        targetMap = industryMap[industry].个人;
      } else {
        targetMap = industryMap[industry].供应商;
      }
      
      if (!targetMap[name]) {
        targetMap[name] = { 下单量: 0, 净价: 0, 订单数: 0 };
      }
      targetMap[name].下单量 += amount;
      targetMap[name].净价 += net;
      targetMap[name].订单数 += 1;
    });

    return Object.entries(industryMap)
      .map(([行业, data]) => {
        const 机构列表 = Object.entries(data.机构)
          .map(([名称, info]) => ({
            名称,
            类型: '机构' as const,
            下单量: info.下单量,
            净价: info.净价,
            返点率: info.下单量 > 0 ? ((info.下单量 - info.净价) / info.下单量 * 100) : 0,
            订单数: info.订单数,
            占比: data.总下单量 > 0 ? (info.下单量 / data.总下单量 * 100) : 0
          }))
          .sort((a, b) => b.下单量 - a.下单量)
          .slice(0, 10);

        const 个人列表 = Object.entries(data.个人)
          .map(([名称, info]) => ({
            名称,
            类型: '个人' as const,
            下单量: info.下单量,
            净价: info.净价,
            返点率: info.下单量 > 0 ? ((info.下单量 - info.净价) / info.下单量 * 100) : 0,
            订单数: info.订单数,
            占比: data.总下单量 > 0 ? (info.下单量 / data.总下单量 * 100) : 0
          }))
          .sort((a, b) => b.下单量 - a.下单量)
          .slice(0, 10);

        const 供应商列表 = Object.entries(data.供应商)
          .map(([名称, info]) => ({
            名称,
            类型: '供应商' as const,
            下单量: info.下单量,
            净价: info.净价,
            返点率: info.下单量 > 0 ? ((info.下单量 - info.净价) / info.下单量 * 100) : 0,
            订单数: info.订单数,
            占比: data.总下单量 > 0 ? (info.下单量 / data.总下单量 * 100) : 0
          }))
          .sort((a, b) => b.下单量 - a.下单量)
          .slice(0, 10);

        return { 行业, 总下单量: data.总下单量, 机构列表, 个人列表, 供应商列表 };
      })
      .sort((a, b) => b.总下单量 - a.总下单量);
  }, [rawData]);

  // 按平台分析（主要抖音和小红书）
  const analyzeByPlatform = useMemo((): PlatformAnalysis[] => {
    const platformMap: Record<string, {
      总下单量: number;
      机构: Record<string, { 下单量: number; 净价: number; 订单数: number }>;
      个人: Record<string, { 下单量: number; 净价: number; 订单数: number }>;
      供应商: Record<string, { 下单量: number; 净价: number; 订单数: number }>;
    }> = {};

    rawData.forEach(row => {
      const platform = row['发布平台'] || '未知平台';
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      const type = getTalentType(row);
      const name = getTalentName(row, type);

      if (!platformMap[platform]) {
        platformMap[platform] = { 总下单量: 0, 机构: {}, 个人: {}, 供应商: {} };
      }

      platformMap[platform].总下单量 += amount;

      let targetMap;
      if (type === '机构') {
        targetMap = platformMap[platform].机构;
      } else if (type === '个人') {
        targetMap = platformMap[platform].个人;
      } else {
        targetMap = platformMap[platform].供应商;
      }
      
      if (!targetMap[name]) {
        targetMap[name] = { 下单量: 0, 净价: 0, 订单数: 0 };
      }
      targetMap[name].下单量 += amount;
      targetMap[name].净价 += net;
      targetMap[name].订单数 += 1;
    });

    // 优先展示抖音和小红书
    const priorityOrder = ['抖音', '小红书'];
    const sortedPlatforms = Object.entries(platformMap)
      .sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a[0]);
        const bIndex = priorityOrder.indexOf(b[0]);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return b[1].总下单量 - a[1].总下单量;
      });

    return sortedPlatforms
      .map(([平台, data]) => {
        const 机构列表 = Object.entries(data.机构)
          .map(([名称, info]) => ({
            名称,
            类型: '机构' as const,
            下单量: info.下单量,
            净价: info.净价,
            返点率: info.下单量 > 0 ? ((info.下单量 - info.净价) / info.下单量 * 100) : 0,
            订单数: info.订单数,
            占比: data.总下单量 > 0 ? (info.下单量 / data.总下单量 * 100) : 0
          }))
          .sort((a, b) => b.下单量 - a.下单量)
          .slice(0, 10);

        const 个人列表 = Object.entries(data.个人)
          .map(([名称, info]) => ({
            名称,
            类型: '个人' as const,
            下单量: info.下单量,
            净价: info.净价,
            返点率: info.下单量 > 0 ? ((info.下单量 - info.净价) / info.下单量 * 100) : 0,
            订单数: info.订单数,
            占比: data.总下单量 > 0 ? (info.下单量 / data.总下单量 * 100) : 0
          }))
          .sort((a, b) => b.下单量 - a.下单量)
          .slice(0, 10);

        const 供应商列表 = Object.entries(data.供应商)
          .map(([名称, info]) => ({
            名称,
            类型: '供应商' as const,
            下单量: info.下单量,
            净价: info.净价,
            返点率: info.下单量 > 0 ? ((info.下单量 - info.净价) / info.下单量 * 100) : 0,
            订单数: info.订单数,
            占比: data.总下单量 > 0 ? (info.下单量 / data.总下单量 * 100) : 0
          }))
          .sort((a, b) => b.下单量 - a.下单量)
          .slice(0, 10);

        return { 平台, 总下单量: data.总下单量, 机构列表, 个人列表, 供应商列表 };
      });
  }, [rawData]);

  // 获取类型样式
  const getTypeStyle = (type: TalentType) => {
    switch (type) {
      case '机构':
        return 'bg-purple-100 text-purple-700';
      case '个人':
        return 'bg-green-100 text-green-700';
      case '供应商':
        return 'bg-orange-100 text-orange-700';
    }
  };

  // 渲染达人列表
  const renderTalentList = (list: TalentAnalysis[]) => {
    if (list.length === 0) {
      return <p className="text-sm text-gray-400 py-4 text-center">暂无数据</p>;
    }

    return (
      <div className="space-y-3">
        {list.map((item, index) => (
          <div key={item.名称} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-800">{item.名称}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${getTypeStyle(item.类型)}`}>
                  {item.类型}
                </span>
              </div>
              <span className="text-sm font-medium text-blue-600">
                ¥{(item.下单量 / 10000).toFixed(2)}万
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">返点率</span>
                <p className={`font-medium ${item.返点率 >= 30 ? 'text-green-600' : 'text-gray-700'}`}>
                  {item.返点率.toFixed(2)}%
                </p>
              </div>
              <div>
                <span className="text-gray-400">订单数</span>
                <p className="font-medium text-gray-700">{item.订单数}单</p>
              </div>
              <div>
                <span className="text-gray-400">占比</span>
                <div className="flex items-center gap-2">
                  <Progress value={item.占比} className="h-2 w-16" />
                  <span className="font-medium text-gray-700">{item.占比.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="industry" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="industry" className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            按行业分析
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-1">
            <PieChart className="w-4 h-4" />
            按平台分析
          </TabsTrigger>
        </TabsList>

        {/* 按行业分析 */}
        <TabsContent value="industry">
          <div className="space-y-6">
            {analyzeByIndustry.map((industry) => (
              <Card key={industry.行业}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      {industry.行业}
                    </div>
                    <span className="text-blue-600">
                      总下单量: ¥{(industry.总下单量 / 10000).toFixed(2)}万
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top10 机构 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-purple-500" />
                        Top10 机构
                      </h4>
                      {renderTalentList(industry.机构列表)}
                    </div>
                    {/* Top10 个人博主 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                        <User className="w-4 h-4 text-green-500" />
                        Top10 个人博主
                      </h4>
                      {renderTalentList(industry.个人列表)}
                    </div>
                    {/* Top10 供应商 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                        <Truck className="w-4 h-4 text-orange-500" />
                        Top10 供应商
                      </h4>
                      {renderTalentList(industry.供应商列表)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 按平台分析 */}
        <TabsContent value="platform">
          <div className="space-y-6">
            {analyzeByPlatform.map((platform) => (
              <Card key={platform.平台}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      {platform.平台}
                    </div>
                    <span className="text-blue-600">
                      总下单量: ¥{(platform.总下单量 / 10000).toFixed(2)}万
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top10 机构 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-purple-500" />
                        Top10 机构
                      </h4>
                      {renderTalentList(platform.机构列表)}
                    </div>
                    {/* Top10 个人博主 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                        <User className="w-4 h-4 text-green-500" />
                        Top10 个人博主
                      </h4>
                      {renderTalentList(platform.个人列表)}
                    </div>
                    {/* Top10 供应商 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                        <Truck className="w-4 h-4 text-orange-500" />
                        Top10 供应商
                      </h4>
                      {renderTalentList(platform.供应商列表)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
