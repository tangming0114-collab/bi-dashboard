import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, Users, Building2, Tag, Lightbulb, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openAIAssistant } from '@/utils/aiAssistantBus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface KPIAnalyzerProps {
  rawData: any[];
}

interface GroupAnalysis {
  组别: string;
  下单量: number;
  目标完成率: number;
  返点率: number;
  返点率达标: boolean;
  目标下单量: number;
  目标返点率: number;
  媒介数: number;
  订单数: number;
  平均订单金额: number;
  状态: '优秀' | '良好' | '需改进' | '危险';
}

interface CustomerAnalysis {
  客户名称: string;
  下单量: number;
  返点率: number;
  订单数: number;
  媒介数: number;
  品牌数: number;
  表现: '优秀' | '良好' | '一般' | '较差';
  建议: string;
}

interface BrandAnalysis {
  品牌名称: string;
  客户名称: string;
  下单量: number;
  返点率: number;
  订单数: number;
  表现: '优秀' | '良好' | '一般' | '较差';
  建议: string;
}

interface MediaAnalysis {
  媒介: string;
  组别: string;
  下单量: number;
  返点率: number;
  订单数: number;
  平均订单金额: number;
  表现: '优秀' | '良好' | '一般' | '较差';
  建议: string;
}

// 各组KPI目标
const GROUP_KPI_TARGETS: Record<string, { 下单量: number; 返点率: number }> = {
  'Elite': { 下单量: 190000000, 返点率: 27 },    // 1.9亿，返点率27%
  'C star': { 下单量: 120000000, 返点率: 30 },   // 1.2亿，返点率30%
  'OOPs': { 下单量: 155000000, 返点率: 30 },     // 1.55亿，返点率30%
  'Rocket': { 下单量: 220000000, 返点率: 30 },   // 2.2亿，返点率30%
};

const CORE_GROUPS = ['Elite', 'OOPs', 'Rocket', 'C star'];

export function KPIAnalyzer({ rawData }: KPIAnalyzerProps) {
  if (!rawData || rawData.length === 0) return null;

  const openGroupAI = () => {
    const summary = groupAnalysis.map(g =>
      `${g.组别}: 完成率${g.目标完成率.toFixed(1)}%, 返点率${g.返点率.toFixed(2)}%(${g.返点率达标 ? '达标' : '未达标'}), 媒介${g.媒介数}人, 订单${g.订单数}单, 状态:${g.状态}`
    ).join('\n');
    openAIAssistant({
      pageName: '各组分析',
      contextData: `四组核心KPI数据：\n${summary}`,
      defaultQuestion: '请基于以上各组KPI数据，给出3-5条具体的、可操作的管理建议，包括资源调配、培训和客户策略等方面。',
    });
  };

  const openCustomerAI = () => {
    const top = customerAnalysis.slice(0, 10).map(c =>
      `${c.客户名称}: 下单¥${(c.下单量 / 10000).toFixed(1)}万, 返点${c.返点率.toFixed(1)}%, ${c.订单数}单, 表现:${c.表现}`
    ).join('\n');
    openAIAssistant({
      pageName: '客户分析',
      contextData: `Top10客户表现数据：\n${top}`,
      defaultQuestion: '请分析客户结构，指出需要重点维护、潜力挖掘和风险关注的客户，并给出3-5条客户运营建议。',
    });
  };

  const openBrandAI = () => {
    const top = brandAnalysis.slice(0, 10).map(b =>
      `${b.品牌名称}(${b.客户名称}): 下单¥${(b.下单量 / 10000).toFixed(1)}万, 返点${b.返点率.toFixed(1)}%, 表现:${b.表现}`
    ).join('\n');
    openAIAssistant({
      pageName: '品牌分析',
      contextData: `Top10品牌表现数据：\n${top}`,
      defaultQuestion: '请分析品牌投放结构，指出明星品牌、潜力品牌和需要优化投入的品牌，并给出运营建议。',
    });
  };

  const openMediaAI = () => {
    const top = mediaAnalysis.slice(0, 10).map(m =>
      `${m.媒介}(${m.组别}): 下单¥${(m.下单量 / 10000).toFixed(1)}万, 返点${m.返点率.toFixed(1)}%, ${m.订单数}单, 表现:${m.表现}`
    ).join('\n');
    openAIAssistant({
      pageName: '媒介分析',
      contextData: `Top10媒介人员表现数据：\n${top}`,
      defaultQuestion: '请分析团队表现，指出标杆员工、需要培训和关注的员工，并给出团队管理建议。',
    });
  };

  // 提取组别名称
  const extractGroup = (groupStr: string): string => {
    if (!groupStr) return '未知';
    const parts = groupStr.split('|');
    return parts[parts.length - 1].trim();
  };

  // 计算各组KPI数据
  // 下单量：包含所有数据（走单+非走单，报备+非报备+其他）
  // 返点率：仅排除走单 + 仅报备合作
  const calculateGroupKPI = (): GroupAnalysis[] => {
    // 所有数据的下单量
    const groupAllData: Record<string, { 下单量: number; 媒介数: Set<string>; 订单数: number }> = {};
    // 排除走单+报备的返点率数据
    const groupRebateData: Record<string, { 下单量: number; 净价: number }> = {};
    
    CORE_GROUPS.forEach(g => {
      groupAllData[g] = { 下单量: 0, 媒介数: new Set(), 订单数: 0 };
      groupRebateData[g] = { 下单量: 0, 净价: 0 };
    });

    // 报备合作方式列表（用于判断）
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
      '视频',
      '口播', '定制单集', '冠名', '小宇宙-平台【不收平台服务费（25年优惠政策）】'];

    rawData.forEach(row => {
      const isZoudan = row['是否客户指定走单'];
      const coopWay = row['合作方式'];
      const group = extractGroup(row['排期申请人所属组别']);
      
      if (!CORE_GROUPS.includes(group)) return;
      
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      const media = row['排期申请人'];
      
      // 所有数据的下单量统计
      groupAllData[group].下单量 += amount;
      groupAllData[group].媒介数.add(media);
      groupAllData[group].订单数 += 1;
      
      // 排除走单+报备合作的返点率统计
      if (isZoudan !== '是' && baobeiOptions.includes(coopWay)) {
        groupRebateData[group].下单量 += amount;
        groupRebateData[group].净价 += net;
      }
    });

    return CORE_GROUPS.map(group => {
      const allData = groupAllData[group];
      const rebateData = groupRebateData[group];
      const target = GROUP_KPI_TARGETS[group];
      
      // 下单量基于所有数据，返点率基于排除走单+报备
      const rebateRate = rebateData.下单量 > 0 ? ((rebateData.下单量 - rebateData.净价) / rebateData.下单量 * 100) : 0;
      const completionRate = (allData.下单量 / target.下单量) * 100;
      
      let status: '优秀' | '良好' | '需改进' | '危险' = '危险';
      if (completionRate >= 100 && rebateRate >= target.返点率) status = '优秀';
      else if (completionRate >= 80 || rebateRate >= target.返点率) status = '良好';
      else if (completionRate >= 50) status = '需改进';
      
      return {
        组别: group,
        下单量: allData.下单量,
        目标完成率: completionRate,
        返点率: rebateRate,
        返点率达标: rebateRate >= target.返点率,
        目标下单量: target.下单量,
        目标返点率: target.返点率,
        媒介数: allData.媒介数.size,
        订单数: allData.订单数,
        平均订单金额: allData.订单数 > 0 ? allData.下单量 / allData.订单数 : 0,
        状态: status
      };
    });
  };

  // 分析客户表现
  const analyzeCustomers = (): CustomerAnalysis[] => {
    const customerMap: Record<string, { 
      下单量: number; 净价: number; 订单数: number; 
      媒介数: Set<string>; 品牌数: Set<string> 
    }> = {};

    rawData.forEach(row => {
      const isZoudan = row['是否客户指定走单'];
      const customer = row['对客项目客户名称'];
      const brand = row['投放品牌'];
      const media = row['排期申请人'];
      
      if (isZoudan === '是' || !customer) return;
      
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      
      if (!customerMap[customer]) {
        customerMap[customer] = { 
          下单量: 0, 净价: 0, 订单数: 0, 
          媒介数: new Set(), 品牌数: new Set() 
        };
      }
      
      customerMap[customer].下单量 += amount;
      customerMap[customer].净价 += net;
      customerMap[customer].订单数 += 1;
      customerMap[customer].媒介数.add(media);
      if (brand) customerMap[customer].品牌数.add(brand);
    });

    return Object.entries(customerMap)
      .map(([客户名称, data]) => {
        const rebateRate = data.下单量 > 0 ? ((data.下单量 - data.净价) / data.下单量 * 100) : 0;
        
        let 表现: '优秀' | '良好' | '一般' | '较差' = '较差';
        let 建议 = '';
        
        if (data.下单量 >= 10000000) { // 1000万以上
          if (rebateRate >= 30) {
            表现 = '优秀';
            建议 = '该客户下单量大且返点率高，是核心优质客户，建议重点维护并争取更多预算';
          } else {
            表现 = '良好';
            建议 = '该客户下单量大但返点率偏低，建议优化媒介组合或谈判更高返点';
          }
        } else if (data.下单量 >= 5000000) { // 500万以上
          if (rebateRate >= 25) {
            表现 = '良好';
            建议 = '该客户表现良好，有潜力成为大客户，建议加大投入';
          } else {
            表现 = '一般';
            建议 = '该客户有增长空间，建议优化投放策略提升返点率';
          }
        } else if (data.下单量 >= 1000000) { // 100万以上
          表现 = '一般';
          建议 = '该客户规模中等，建议深挖需求扩大合作';
        } else {
          表现 = '较差';
          建议 = '该客户规模较小，建议评估是否值得继续投入资源';
        }
        
        return {
          客户名称,
          下单量: data.下单量,
          返点率: rebateRate,
          订单数: data.订单数,
          媒介数: data.媒介数.size,
          品牌数: data.品牌数.size,
          表现,
          建议
        };
      })
      .sort((a, b) => b.下单量 - a.下单量);
  };

  // 分析品牌表现
  const analyzeBrands = (): BrandAnalysis[] => {
    const brandMap: Record<string, { 客户名称: string; 下单量: number; 净价: number; 订单数: number }> = {};

    rawData.forEach(row => {
      const isZoudan = row['是否客户指定走单'];
      const brand = row['投放品牌'];
      const customer = row['对客项目客户名称'];
      
      if (isZoudan === '是' || !brand) return;
      
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      const key = `${customer}-${brand}`;
      
      if (!brandMap[key]) {
        brandMap[key] = { 客户名称: customer, 下单量: 0, 净价: 0, 订单数: 0 };
      }
      
      brandMap[key].下单量 += amount;
      brandMap[key].净价 += net;
      brandMap[key].订单数 += 1;
    });

    return Object.entries(brandMap)
      .map(([key, data]) => {
        const rebateRate = data.下单量 > 0 ? ((data.下单量 - data.净价) / data.下单量 * 100) : 0;
        
        let 表现: '优秀' | '良好' | '一般' | '较差' = '较差';
        let 建议 = '';
        
        if (data.下单量 >= 5000000) { // 500万以上
          if (rebateRate >= 30) {
            表现 = '优秀';
            建议 = '该品牌下单量大且返点率高，是明星品牌，建议重点运营';
          } else {
            表现 = '良好';
            建议 = '该品牌下单量大，建议优化媒介结构提升返点率';
          }
        } else if (data.下单量 >= 2000000) { // 200万以上
          表现 = '良好';
          建议 = '该品牌有潜力，建议加大投放力度';
        } else if (data.下单量 >= 500000) { // 50万以上
          表现 = '一般';
          建议 = '该品牌规模中等，建议挖掘更多投放需求';
        } else {
          表现 = '较差';
          建议 = '该品牌规模较小，建议评估投入产出比';
        }
        
        return {
          品牌名称: key.split('-')[1] || key,
          客户名称: data.客户名称,
          下单量: data.下单量,
          返点率: rebateRate,
          订单数: data.订单数,
          表现,
          建议
        };
      })
      .sort((a, b) => b.下单量 - a.下单量);
  };

  // 分析媒介表现
  const analyzeMedias = (): MediaAnalysis[] => {
    const mediaMap: Record<string, { 
      组别: string; 下单量: number; 净价: number; 订单数: number 
    }> = {};

    rawData.forEach(row => {
      const isZoudan = row['是否客户指定走单'];
      const media = row['排期申请人'];
      const group = extractGroup(row['排期申请人所属组别']);
      
      if (isZoudan === '是' || !media) return;
      
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      
      if (!mediaMap[media]) {
        mediaMap[media] = { 组别: group, 下单量: 0, 净价: 0, 订单数: 0 };
      }
      
      mediaMap[media].下单量 += amount;
      mediaMap[media].净价 += net;
      mediaMap[media].订单数 += 1;
    });

    return Object.entries(mediaMap)
      .map(([媒介, data]) => {
        const rebateRate = data.下单量 > 0 ? ((data.下单量 - data.净价) / data.下单量 * 100) : 0;
        const avgOrderAmount = data.订单数 > 0 ? data.下单量 / data.订单数 : 0;
        
        let 表现: '优秀' | '良好' | '一般' | '较差' = '较差';
        let 建议 = '';
        
        if (data.下单量 >= 5000000) { // 500万以上
          if (rebateRate >= 30) {
            表现 = '优秀';
            建议 = '该媒介业绩突出且返点率高，是团队标杆，建议分享经验';
          } else {
            表现 = '良好';
            建议 = '该媒介业绩优秀，建议优化客户结构提升返点率';
          }
        } else if (data.下单量 >= 2000000) { // 200万以上
          表现 = '良好';
          建议 = '该媒介表现良好，有潜力成为Top媒介，建议重点培养';
        } else if (data.下单量 >= 500000) { // 50万以上
          表现 = '一般';
          建议 = '该媒介业绩中等，建议增加客户开发或提升客单价';
        } else {
          表现 = '较差';
          建议 = '该媒介业绩偏低，建议分析原因并制定改进计划';
        }
        
        return {
          媒介,
          组别: data.组别,
          下单量: data.下单量,
          返点率: rebateRate,
          订单数: data.订单数,
          平均订单金额: avgOrderAmount,
          表现,
          建议
        };
      })
      .sort((a, b) => b.下单量 - a.下单量);
  };

  // 生成整体建议
  const generateOverallSuggestions = (groupAnalysis: GroupAnalysis[]) => {
    const suggestions: string[] = [];
    
    // 计算各组目标总和
    const totalTarget = CORE_GROUPS.reduce((sum, g) => sum + GROUP_KPI_TARGETS[g].下单量, 0);
    const totalAmount = groupAnalysis.reduce((sum, g) => sum + g.下单量, 0);
    const totalCompletion = (totalAmount / totalTarget) * 100;
    
    // 统计达标情况
    const amountMetGroups = groupAnalysis.filter(g => g.目标完成率 >= 100);
    const rebateMetGroups = groupAnalysis.filter(g => g.返点率达标);
    const bothMetGroups = groupAnalysis.filter(g => g.目标完成率 >= 100 && g.返点率达标);
    
    // 整体完成情况
    if (bothMetGroups.length === 4) {
      suggestions.push('🎉 恭喜！4个核心组的下单量和返点率均已全面达标，建议保持当前策略并争取超额完成！');
    } else if (amountMetGroups.length === 4) {
      suggestions.push(`✅ 4个组下单量目标均已达成，但${4 - rebateMetGroups.length}个组返点率未达标，建议优化媒介组合提升返点率。`);
    } else if (rebateMetGroups.length === 4) {
      suggestions.push(`✅ 4个组返点率均已达标，但${4 - amountMetGroups.length}个组下单量未达标，建议加大客户开发力度。`);
    } else {
      suggestions.push(`⚠️ 当前整体KPI完成率${totalCompletion.toFixed(1)}%，${bothMetGroups.length}/4个组双达标，需要全面发力！`);
    }
    
    // 各组表现
    const excellentGroups = groupAnalysis.filter(g => g.状态 === '优秀');
    const dangerGroups = groupAnalysis.filter(g => g.状态 === '危险');
    const needImproveGroups = groupAnalysis.filter(g => g.状态 === '需改进');
    
    if (excellentGroups.length > 0) {
      suggestions.push(`👍 ${excellentGroups.map(g => g.组别).join('、')}组表现优秀，建议总结成功经验并推广到其他组。`);
    }
    
    if (needImproveGroups.length > 0) {
      suggestions.push(`📈 ${needImproveGroups.map(g => g.组别).join('、')}组需要改进，建议制定针对性的提升计划。`);
    }
    
    if (dangerGroups.length > 0) {
      suggestions.push(`🔥 ${dangerGroups.map(g => g.组别).join('、')}组需要重点关注，建议立即制定改进计划。`);
    }
    
    return suggestions;
  };

  const groupAnalysis = calculateGroupKPI();
  const customerAnalysis = analyzeCustomers();
  const brandAnalysis = analyzeBrands();
  const mediaAnalysis = analyzeMedias();
  const overallSuggestions = generateOverallSuggestions(groupAnalysis);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '优秀': return 'bg-green-100 text-green-700 border-green-200';
      case '良好': return 'bg-blue-100 text-blue-700 border-blue-200';
      case '需改进': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case '危险': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="mb-6 border-2 border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-purple-600" />
          KPI智能分析与建议
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 整体建议 */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-purple-100">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            整体完成情况与建议
          </h4>
          <div className="space-y-2">
            {overallSuggestions.map((suggestion, index) => (
              <p key={index} className="text-sm text-gray-600">{suggestion}</p>
            ))}
          </div>
        </div>

        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="groups">各组分析</TabsTrigger>
            <TabsTrigger value="customers">客户分析</TabsTrigger>
            <TabsTrigger value="brands">品牌分析</TabsTrigger>
            <TabsTrigger value="medias">媒介分析</TabsTrigger>
          </TabsList>

          {/* 各组分析 */}
          <TabsContent value="groups">
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={openGroupAI}
              >
                <Sparkles className="w-4 h-4 mr-1 text-purple-600" />
                AI 深度分析
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupAnalysis.map((group) => (
                <div key={group.组别} className="p-4 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-700">{group.组别}组</span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        目标: ¥{(group.目标下单量 / 100000000).toFixed(2)}亿 / 返点率{group.目标返点率}%
                      </p>
                    </div>
                    <Badge className={getStatusColor(group.状态)}>{group.状态}</Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">下单量完成率</span>
                        <span className={group.目标完成率 >= 100 ? 'text-green-600 font-medium' : 'text-gray-700'}>
                          {group.目标完成率.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.min(group.目标完成率, 100)} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>¥{(group.下单量 / 10000).toFixed(2)}万</span>
                        <span>目标: ¥{(group.目标下单量 / 10000).toFixed(2)}万</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">返点率</span>
                        <span className={group.返点率达标 ? 'text-green-600 font-medium' : 'text-red-600'}>
                          {group.返点率.toFixed(2)}% {group.返点率达标 ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">目标: {group.目标返点率}%</div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">媒介/订单</span>
                      <span className="text-gray-700">{group.媒介数}人 / {group.订单数}单</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 客户分析 */}
          <TabsContent value="customers">
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={openCustomerAI}
              >
                <Sparkles className="w-4 h-4 mr-1 text-purple-600" />
                AI 深度分析
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {customerAnalysis.slice(0, 20).map((customer) => (
                <div key={customer.客户名称} className="p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-700">{customer.客户名称}</span>
                    </div>
                    <Badge className={getStatusColor(customer.表现)}>{customer.表现}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-gray-500">下单量</span>
                      <p className="font-medium">¥{(customer.下单量 / 10000).toFixed(2)}万</p>
                    </div>
                    <div>
                      <span className="text-gray-500">返点率</span>
                      <p className="font-medium">{customer.返点率.toFixed(2)}%</p>
                    </div>
                    <div>
                      <span className="text-gray-500">订单数</span>
                      <p className="font-medium">{customer.订单数}单</p>
                    </div>
                    <div>
                      <span className="text-gray-500">媒介/品牌</span>
                      <p className="font-medium">{customer.媒介数}/{customer.品牌数}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    {customer.建议}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 品牌分析 */}
          <TabsContent value="brands">
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={openBrandAI}
              >
                <Sparkles className="w-4 h-4 mr-1 text-purple-600" />
                AI 深度分析
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {brandAnalysis.slice(0, 20).map((brand) => (
                <div key={`${brand.客户名称}-${brand.品牌名称}`} className="p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-700">{brand.品牌名称}</span>
                      <span className="text-xs text-gray-400">({brand.客户名称})</span>
                    </div>
                    <Badge className={getStatusColor(brand.表现)}>{brand.表现}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-gray-500">下单量</span>
                      <p className="font-medium">¥{(brand.下单量 / 10000).toFixed(2)}万</p>
                    </div>
                    <div>
                      <span className="text-gray-500">返点率</span>
                      <p className="font-medium">{brand.返点率.toFixed(2)}%</p>
                    </div>
                    <div>
                      <span className="text-gray-500">订单数</span>
                      <p className="font-medium">{brand.订单数}单</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    {brand.建议}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 媒介分析 */}
          <TabsContent value="medias">
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={openMediaAI}
              >
                <Sparkles className="w-4 h-4 mr-1 text-purple-600" />
                AI 深度分析
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mediaAnalysis.slice(0, 20).map((media) => (
                <div key={media.媒介} className="p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-700">{media.媒介}</span>
                      <span className="text-xs text-gray-400">({media.组别}组)</span>
                    </div>
                    <Badge className={getStatusColor(media.表现)}>{media.表现}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-gray-500">下单量</span>
                      <p className="font-medium">¥{(media.下单量 / 10000).toFixed(2)}万</p>
                    </div>
                    <div>
                      <span className="text-gray-500">返点率</span>
                      <p className="font-medium">{media.返点率.toFixed(2)}%</p>
                    </div>
                    <div>
                      <span className="text-gray-500">订单数</span>
                      <p className="font-medium">{media.订单数}单</p>
                    </div>
                    <div>
                      <span className="text-gray-500">平均客单价</span>
                      <p className="font-medium">¥{(media.平均订单金额 / 10000).toFixed(2)}万</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    {media.建议}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
