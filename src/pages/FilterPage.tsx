import { useMemo, useState } from 'react';
import { StatsTable } from '@/components/StatsTable';
import { QuadrantChart } from '@/components/QuadrantChart';
import { MultiSelect } from '@/components/MultiSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter, X, TrendingUp, Percent, Building2, BarChart3, AlertTriangle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { filterData, processData, generateQuadrantData, getCascadingFilterChoices } from '@/utils/dataProcessor';
import type { FilterOptions, FilterChoices } from '@/types';

interface FilterPageProps {
  rawData: any[];
  filterChoices: FilterChoices;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  onUploadClick: () => void;
}

interface PeriodData {
  组别: string;
  periodKey: string;
  year: number;
  period: number;
  下单量: number;
  订单数: number;
  返点率: number;
  报备订单数: number;
}

interface AnomalyDetail {
  类型: string;
  描述: string;
  涉及品牌?: string;
  涉及达人?: string;
  影响金额?: number;
}

type ViewMode = 'weekly' | 'monthly';

// 核心四个组
const CORE_GROUPS = ['Elite', 'OOPs', 'Rocket', 'C star'];

// 报备合作列表
const BAOBEI_OPTIONS = [
  '星图1-20s视频', '星图21-60s视频', '星图60s以上视频',
  '星任务星图1-20s视频', '星任务星图21-60s视频', '星任务星图60s以上视频', '星任务短直合作',
  '京魔方星图60s以上视频', '短直种草',
  '报备图文笔记', '报备视频笔记', '星任务报备图文笔记', '星任务报备视频笔记',
  '小红盟图文笔记', '小红盟视频笔记', '小红链图文笔记', '小红链视频笔记', '小红团图文笔记', '小红团视频笔记',
  '平台-视频号发布', '平台-首篇文章', '平台-第二篇文章', '平台-第3-N篇文章', '平台-清单植入',
  '平台微任务直发', '平台微任务转发', '平台微任务原创图文', '平台微任务原创视频',
  '定制视频', '植入视频', '直发动态', '转发动态', '线上直播', '线下直播',
  '平台视频推广',
  '特邀文章', '特邀视频', '特邀回答', '素人众测', '专业测评', '招募回答', '招募文章', '复用文章', '复用回答',
  '原创视频', '原创图文', '发布费', '供稿图文', '原创图文',
  '种草秀', '短视频', '视频', '图文', '原创文案',
  '淘内短视频', '淘内图文', '口播', '定制单集', '冠名',
  '小宇宙-平台【不收平台服务费（25年优惠政策）】'
];

const groupColors: Record<string, string> = {
  'Elite': '#52C41A',
  'Promise': '#FF9A56',
  'Rocket': '#13C2C2',
  'C star': '#722ED1',
  'OOPs': '#FAAD14',
  'Sparks': '#1890FF'
};

// 提取组别
function extractGroup(groupStr: string): string {
  if (!groupStr) return '未知';
  const parts = groupStr.split('|');
  return parts[parts.length - 1].trim();
}

// 解析Excel日期
function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
    return null;
  }
  
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) return date;
    return null;
  }
  
  return null;
}

// 获取自然周（从每年1月1日开始，每7天为一周）
// 定义：1月1日-1月4日为W01，1月5日-1月11日为W02，依此类推
function getNaturalWeek(date: Date): { year: number; week: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  const year = d.getFullYear();
  
  // 获取该年1月1日
  const yearStart = new Date(year, 0, 1);
  
  // 计算目标日期与1月1日的天数差
  const daysDiff = Math.floor((d.getTime() - yearStart.getTime()) / 86400000);
  
  // 计算周数（从1开始）
  // 1月1日-1月4日为W01（天数差0-3），1月5日-1月11日为W02（天数差4-10），依此类推
  const week = Math.floor((daysDiff + 3) / 7) + 1;
  
  return { year, week };
}

// 格式化周显示
function formatWeek(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function FilterPage({ rawData, filterChoices: _filterChoices, filters, setFilters, onUploadClick }: FilterPageProps) {
  // 视图模式（周报/月报）
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  
  // 存储每个组当前选中的周期异常分析
  const [selectedPeriodAnomalies, setSelectedPeriodAnomalies] = useState<Record<string, {
    periodKey: string;
    anomalies: AnomalyDetail[];
    rebateAnalysis: any;
    rollingAvgRebate: number;
  } | null>>({});

  // 处理筛选后的数据
  const { mediaData, groupStats } = useMemo(() => {
    if (rawData.length === 0) return { mediaData: [], groupStats: [] };
    const filtered = filterData(rawData, filters);
    return processData(filtered);
  }, [rawData, filters]);

  // 处理周期数据（用于图表展示）
  const periodDataByGroup = useMemo(() => {
    if (rawData.length === 0) return { data: {}, periods: [] };
    
    // 先筛选数据
    const filtered = filterData(rawData, filters);
    
    // 处理每条数据
    const processedData = filtered.map(row => {
      const orderDate = parseExcelDate(row['下单日期']);
      if (!orderDate) return null;
      
      // 根据视图模式决定按周或按月
      let year: number, period: number, periodKey: string;
      if (viewMode === 'weekly') {
        const naturalWeek = getNaturalWeek(orderDate);
        year = naturalWeek.year;
        period = naturalWeek.week;
        periodKey = formatWeek(naturalWeek.year, naturalWeek.week);
      } else {
        year = orderDate.getFullYear();
        period = orderDate.getMonth() + 1;
        periodKey = `${year}-${String(period).padStart(2, '0')}`;
      }
      
      const group = extractGroup(row['排期申请人所属组别'] || '');
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      const isZoudan = row['是否客户指定走单'] === '是';
      const coopWay = row['合作方式'] || '';
      const isBaobei = BAOBEI_OPTIONS.includes(coopWay);
      const isValidBaobei = !isZoudan && isBaobei;

      return {
        year,
        period,
        periodKey,
        组别: group,
        下单量: amount,
        kol净价: net,
        是否报备合作: isValidBaobei,
        投放品牌: row['投放品牌'] || '',
        达人昵称: row['达人昵称'] || ''
      };
    }).filter(Boolean) as any[];

    // 只保留核心四个组且为报备合作的数据（去走单）
    const coreData = processedData.filter(d => CORE_GROUPS.includes(d.组别) && d.是否报备合作);

    // 按组别和周期汇总
    const groupPeriodMap: Record<string, Map<string, PeriodData>> = {};
    CORE_GROUPS.forEach(g => groupPeriodMap[g] = new Map());

    coreData.forEach(d => {
      const key = d.periodKey;
      const map = groupPeriodMap[d.组别];
      
      if (!map.has(key)) {
        map.set(key, {
          组别: d.组别,
          periodKey: key,
          year: d.year,
          period: d.period,
          下单量: 0,
          订单数: 0,
          返点率: 0,
          报备订单数: 0
        });
      }
      
      const item = map.get(key)!;
      item.下单量 += d.下单量;
      item.订单数 += 1;
      item.报备订单数 += 1;
    });

    // 计算返点率
    CORE_GROUPS.forEach(group => {
      groupPeriodMap[group].forEach((item, key) => {
        const amount = item.下单量;
        const periodData = coreData.filter(d => d.组别 === group && d.periodKey === key);
        const net = periodData.reduce((sum, d) => sum + d.kol净价, 0);
        item.返点率 = amount > 0 ? ((amount - net) / amount * 100) : 0;
      });
    });

    // 获取所有周期并排序
    let allPeriodKeys = Array.from(new Set(coreData.map(d => d.periodKey))).sort();
    
    // 剔除非2026年的周数据
    allPeriodKeys = allPeriodKeys.filter(key => key.startsWith('2026-'));

    // 转换为数组格式
    const periodDataByGroup: Record<string, PeriodData[]> = {};
    CORE_GROUPS.forEach(group => {
      periodDataByGroup[group] = allPeriodKeys.map(periodKey => {
        const data = groupPeriodMap[group].get(periodKey);
        if (data) return data;
        const [year, p] = viewMode === 'weekly' 
          ? periodKey.split('-W').map(Number)
          : periodKey.split('-').map(Number);
        return {
          组别: group,
          periodKey: periodKey,
          year: year,
          period: p,
          下单量: 0,
          订单数: 0,
          返点率: 0,
          报备订单数: 0
        };
      });
    });

    return { data: periodDataByGroup, periods: allPeriodKeys };
  }, [rawData, filters, viewMode]);

  // 生成图表配置
  const generateAmountChart = (groupData: PeriodData[]) => {
    const weeks = groupData.map(d => d.periodKey);
    const amounts = groupData.map(d => (d.下单量 / 10000).toFixed(1));
    
    return {
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: weeks,
        axisLabel: { fontSize: 10, rotate: 45 }
      },
      yAxis: {
        type: 'value',
        name: '万元',
        nameTextStyle: { fontSize: 10 }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => `${params[0].name}<br/>下单量: ¥${params[0].value}万`
      },
      series: [{
        data: amounts,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ]
          }
        }
      }]
    };
  };

  // 计算滚动累计平均返点率（从W01到当前周）
  const calculateRollingAvgRebate = (groupData: PeriodData[]): number[] => {
    const rollingAvgs: number[] = [];
    let cumulativeAmount = 0;
    let cumulativeNet = 0;
    
    for (let i = 0; i < groupData.length; i++) {
      cumulativeAmount += groupData[i].下单量;
      // 根据返点率反推净价
      const net = groupData[i].下单量 * (1 - groupData[i].返点率 / 100);
      cumulativeNet += net;
      
      const avgRebate = cumulativeAmount > 0 ? ((cumulativeAmount - cumulativeNet) / cumulativeAmount * 100) : 0;
      rollingAvgs.push(avgRebate);
    }
    
    return rollingAvgs;
  };

  const generateRebateChart = (groupData: PeriodData[]) => {
    const weeks = groupData.map(d => d.periodKey);
    const rebates = groupData.map(d => d.返点率.toFixed(2));
    
    // 计算滚动累计平均返点率
    const rollingAvgRebates = calculateRollingAvgRebate(groupData);
    
    return {
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      legend: {
        data: ['返点率', '累计平均'],
        top: 0,
        textStyle: { fontSize: 10 }
      },
      xAxis: {
        type: 'category',
        data: weeks,
        axisLabel: { fontSize: 10, rotate: 45 }
      },
      yAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { fontSize: 10 },
        min: 0,
        max: 50
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const weekRebate = params[0]?.value || 0;
          const rollingAvg = params[1]?.value || 0;
          const diff = (parseFloat(weekRebate) - parseFloat(rollingAvg)).toFixed(2);
          const diffText = parseFloat(diff) >= 0 ? `+${diff}` : diff;
          return `${params[0].name}<br/>返点率: ${weekRebate}%<br/>累计平均: ${parseFloat(rollingAvg).toFixed(2)}%<br/>差异: ${diffText}pp<br/><span style="color:#8b5cf6;font-size:12px;">👆 点击查看详情</span>`;
        }
      },
      series: [
        {
          name: '返点率',
          data: rebates,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#8b5cf6', width: 2 },
          itemStyle: { color: '#8b5cf6' },
          emphasis: {
            scale: 1.5,
            itemStyle: { 
              color: '#a78bfa',
              borderColor: '#fff',
              borderWidth: 2
            }
          }
        },
        {
          name: '累计平均',
          data: rollingAvgRebates.map(v => v.toFixed(2)),
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#10b981', width: 2, type: 'solid' },
          itemStyle: { color: '#10b981' }
        }
      ]
    };
  };

  // 分析单个周期的异常情况（用于点击图表时）
  const analyzeSinglePeriodAnomalies = (
    group: string, 
    periodKey: string, 
    groupData: PeriodData[],
    groupAvgRebate: number
  ): { anomalies: AnomalyDetail[]; rebateAnalysis: any } => {
    const anomalies: AnomalyDetail[] = [];
    const periodIndex = groupData.findIndex(d => d.periodKey === periodKey);
    if (periodIndex === -1) return { anomalies: [], rebateAnalysis: null };
    
    const curr = groupData[periodIndex];
    const prev = periodIndex > 0 ? groupData[periodIndex - 1] : null;
    
    // 下单量大幅下降（与上一周期对比）
    if (prev && prev.下单量 > 0) {
      const dropRate = (curr.下单量 - prev.下单量) / prev.下单量 * 100;
      if (dropRate < -30) {
        anomalies.push({
          类型: '下单量大幅下降',
          描述: `${curr.periodKey} 下单量从 ¥${(prev.下单量 / 10000).toFixed(1)}万 降至 ¥${(curr.下单量 / 10000).toFixed(1)}万，环比下降 ${Math.abs(dropRate).toFixed(1)}%`,
          影响金额: prev.下单量 - curr.下单量
        });
      }
    }
    
    // 返点率大幅下降（与上一周期对比）
    if (prev && curr.返点率 > 0 && prev.返点率 > 0) {
      const rebateDrop = curr.返点率 - prev.返点率;
      if (rebateDrop < -3) {
        anomalies.push({
          类型: '返点率大幅下降',
          描述: `${curr.periodKey} 返点率从 ${prev.返点率.toFixed(2)}% 降至 ${curr.返点率.toFixed(2)}%，下降 ${Math.abs(rebateDrop).toFixed(2)}个百分点`
        });
      }
    }
    
    // 返点率过低（与组均对比）
    if (curr.返点率 > 0 && curr.返点率 < 20) {
      anomalies.push({
        类型: '返点率过低',
        描述: `${curr.periodKey} 返点率仅 ${curr.返点率.toFixed(2)}%，远低于正常水平`
      });
    }
    
    // 返点率低于组均
    if (curr.返点率 > 0 && curr.返点率 < groupAvgRebate - 5) {
      anomalies.push({
        类型: '返点率低于组均',
        描述: `${curr.periodKey} 返点率 ${curr.返点率.toFixed(2)}% 低于组均 ${groupAvgRebate.toFixed(2)}%，差距 ${(groupAvgRebate - curr.返点率).toFixed(2)}个百分点`
      });
    }
    
    // 获取返点率深度分析
    let rebateAnalysis = null;
    if (curr.返点率 > 0) {
      rebateAnalysis = analyzeRebateDrop(group, periodKey, prev?.periodKey || '', groupAvgRebate);
    }
    
    return { anomalies, rebateAnalysis };
  };

  // 深入分析返点率下降原因
  const analyzeRebateDrop = (group: string, currPeriodKey: string, prevPeriodKey: string, _groupAvgRebate: number) => {
    const getPeriodKey = (date: Date): string => {
      if (viewMode === 'weekly') {
        const naturalWeek = getNaturalWeek(date);
        return formatWeek(naturalWeek.year, naturalWeek.week);
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    // 获取当前周期数据
    const filtered = filterData(rawData, filters);
    const currData = filtered.filter(row => {
      const orderDate = parseExcelDate(row['下单日期']);
      if (!orderDate) return false;
      const rowGroup = extractGroup(row['排期申请人所属组别'] || '');
      const rowPeriodKey = getPeriodKey(orderDate);
      const isZoudan = row['是否客户指定走单'] === '是';
      const coopWay = row['合作方式'] || '';
      const isBaobei = BAOBEI_OPTIONS.includes(coopWay);
      return rowGroup === group && rowPeriodKey === currPeriodKey && !isZoudan && isBaobei;
    });

    // 获取上一周期数据
    const prevData = filtered.filter(row => {
      const orderDate = parseExcelDate(row['下单日期']);
      if (!orderDate) return false;
      const rowGroup = extractGroup(row['排期申请人所属组别'] || '');
      const rowPeriodKey = getPeriodKey(orderDate);
      const isZoudan = row['是否客户指定走单'] === '是';
      const coopWay = row['合作方式'] || '';
      const isBaobei = BAOBEI_OPTIONS.includes(coopWay);
      return rowGroup === group && rowPeriodKey === prevPeriodKey && !isZoudan && isBaobei;
    });

    const currTotalAmount = currData.reduce((sum, row) => sum + (Number(row['Kol刊例单价(元)']) || 0), 0);
    const currTotalNet = currData.reduce((sum, row) => sum + (Number(row['kol净价(元)']) || 0), 0);
    const currRebate = currTotalAmount > 0 ? ((currTotalAmount - currTotalNet) / currTotalAmount * 100) : 0;

    const prevTotalAmount = prevData.reduce((sum, row) => sum + (Number(row['Kol刊例单价(元)']) || 0), 0);
    const prevTotalNet = prevData.reduce((sum, row) => sum + (Number(row['kol净价(元)']) || 0), 0);
    const prevRebate = prevTotalAmount > 0 ? ((prevTotalAmount - prevTotalNet) / prevTotalAmount * 100) : 0;

    // 计算返点率变化（当前周期 vs 上一周期）
    const rebateChange = currRebate - prevRebate;
    const AMOUNT_THRESHOLD = 10000;  // 金额阈值：≥1万元
    const REBATE_DIFF_THRESHOLD = 1; // 返点率差异阈值：≥1pp

    // 按品牌汇总当前周期数据
    const brandMap = new Map<string, { amount: number; net: number; count: number }>();
    currData.forEach(row => {
      const brand = row['投放品牌'] || '未知品牌';
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      if (!brandMap.has(brand)) {
        brandMap.set(brand, { amount: 0, net: 0, count: 0 });
      }
      const item = brandMap.get(brand)!;
      item.amount += amount;
      item.net += net;
      item.count += 1;
    });

    // 按品牌汇总并筛选需要展示的品牌
    // 用户点击时，总是显示当周所有金额>=1万的品牌（帮助用户全面了解当周情况）
    const lowRebateBrands = Array.from(brandMap.entries())
      .map(([brand, data]) => {
        const rebate = data.amount > 0 ? ((data.amount - data.net) / data.amount * 100) : 0;
        const amountRatio = currTotalAmount > 0 ? (data.amount / currTotalAmount * 100) : 0;
        return { brand, amount: data.amount, rebate, amountRatio, count: data.count };
      })
      .filter(b => b.amount >= AMOUNT_THRESHOLD)
      .sort((a, b) => a.rebate - b.rebate);

    // 找出上周有但本周没有的品牌
    const prevBrandMap = new Map<string, { amount: number; net: number }>();
    prevData.forEach(row => {
      const brand = row['投放品牌'] || '未知品牌';
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      if (!prevBrandMap.has(brand)) {
        prevBrandMap.set(brand, { amount: 0, net: 0 });
      }
      const item = prevBrandMap.get(brand)!;
      item.amount += amount;
      item.net += net;
    });

    // 找出上周有但本周没有的品牌（金额>=1万）
    const lostHighRebateBrands = Array.from(prevBrandMap.entries())
      .filter(([brand]) => !brandMap.has(brand))
      .map(([brand, data]) => {
        const rebate = data.amount > 0 ? ((data.amount - data.net) / data.amount * 100) : 0;
        const amountRatio = prevTotalAmount > 0 ? (data.amount / prevTotalAmount * 100) : 0;
        return { brand, amount: data.amount, rebate, amountRatio };
      })
      .filter(b => b.amount >= AMOUNT_THRESHOLD)
      .sort((a, b) => b.rebate - a.rebate);

    // 对每个品牌，找出达人（金额>=1万 且 |返点率-组均|>=1pp）
    const brandDetailAnalysis = lowRebateBrands.map(brandInfo => {
      const brandData = currData.filter(row => (row['投放品牌'] || '') === brandInfo.brand);
      
      const talentMap = new Map<string, { amount: number; net: number }>();
      brandData.forEach(row => {
        const talent = row['达人昵称'] || '未知达人';
        const amount = Number(row['Kol刊例单价(元)']) || 0;
        const net = Number(row['kol净价(元)']) || 0;
        if (!talentMap.has(talent)) {
          talentMap.set(talent, { amount: 0, net: 0 });
        }
        const item = talentMap.get(talent)!;
        item.amount += amount;
        item.net += net;
      });

      const abnormalTalents = Array.from(talentMap.entries())
        .map(([talent, data]) => {
          const rebate = data.amount > 0 ? ((data.amount - data.net) / data.amount * 100) : 0;
          return { talent, amount: data.amount, rebate };
        })
        .filter(t => t.amount >= AMOUNT_THRESHOLD && Math.abs(t.rebate - currRebate) >= REBATE_DIFF_THRESHOLD)
        .sort((a, b) => a.rebate - b.rebate);

      return {
        brand: brandInfo.brand,
        brandRebate: brandInfo.rebate,
        brandAmount: brandInfo.amount,
        amountRatio: brandInfo.amountRatio,
        talents: abnormalTalents
      };
    });

    return {
      rebateChange,
      lowRebateBrands: brandDetailAnalysis,
      lostHighRebateBrands
    };
  };

  // 计算总计
  const totalAmount = groupStats.reduce((sum, g) => sum + g.刊例价总和, 0);
  const totalNet = groupStats.reduce((sum, g) => sum + g.净价总和, 0);
  const totalMedia = groupStats.reduce((sum, g) => sum + g.媒介数, 0);
  const totalOrders = groupStats.reduce((sum, g) => sum + g.订单数, 0);
  const avgRebate = totalAmount > 0 ? ((totalAmount - totalNet) / totalAmount * 100) : 0;

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
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Filter className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">数据筛选</h2>
        <p className="text-gray-500 mb-6">请先上传Excel文件以使用筛选功能</p>
        <button
          onClick={onUploadClick}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
          <div className="mt-4 pt-4 border-t flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-gray-500">
              当前筛选：<span className="font-medium text-gray-700">{getFilterStatusText()}</span>
            </div>
            <div className="flex items-center gap-3">
              {/* 周报/月报切换 */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'weekly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  周报
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'monthly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  月报
                </button>
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
          </div>
        </CardContent>
      </Card>

      {/* 筛选结果统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">总下单量</p>
            <p className="text-2xl font-bold text-blue-600">¥{(totalAmount / 10000).toFixed(2)}万</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">平均返点率</p>
            <p className="text-2xl font-bold text-purple-600">{avgRebate.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">媒介总数</p>
            <p className="text-2xl font-bold text-green-600">{totalMedia}人</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">订单总数</p>
            <p className="text-2xl font-bold text-orange-600">{totalOrders}个</p>
          </CardContent>
        </Card>
      </div>

      {/* 各组趋势分析 */}
      {Object.keys(periodDataByGroup.data).length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            各组趋势分析
          </h3>
          {CORE_GROUPS.filter(group => periodDataByGroup.data[group]?.some(d => d.下单量 > 0)).map(group => {
            const groupData = periodDataByGroup.data[group] || [];
            const totalAmount = groupData.reduce((sum, d) => sum + d.下单量, 0);
            const totalNet = groupData.reduce((sum, d) => sum + d.下单量 * (1 - d.返点率 / 100), 0);
            const avgRebate = totalAmount > 0 ? ((totalAmount - totalNet) / totalAmount * 100) : 0;
            
            return (
              <Card key={group} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-gray-800">{group}</span>
                      <div className="flex items-center gap-4 text-sm font-normal text-gray-500 mt-1">
                        <span>累计: ¥{(totalAmount / 10000).toFixed(1)}万</span>
                        <span className="flex items-center gap-1">
                          组内平均返点率:
                          <span className="font-medium text-emerald-600">{avgRebate.toFixed(2)}%</span>
                        </span>
                        <span>分析{viewMode === 'weekly' ? '周数' : '月数'}: {groupData.filter(d => d.下单量 > 0).length}{viewMode === 'weekly' ? '周' : '月'}</span>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {/* 图表区域 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* 下单量趋势图 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        下单量趋势（万元）
                      </h4>
                      <div className="h-48">
                        <ReactECharts 
                          option={generateAmountChart(groupData)} 
                          style={{ height: '100%', width: '100%' }}
                        />
                      </div>
                    </div>

                    {/* 返点率趋势图 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Percent className="w-4 h-4 text-purple-500" />
                        返点率波动（%）
                        <span className="text-xs text-emerald-600 ml-auto">
                          绿色线为累计平均返点率（W01-当周），点击数据点查看详情
                        </span>
                      </h4>
                      <div className="h-48">
                        <ReactECharts 
                          option={generateRebateChart(groupData)} 
                          style={{ height: '100%', width: '100%' }}
                          onEvents={{
                            click: (params: any) => {
                              const clickedPeriod = params.name;
                              // 计算到该周期为止的累计平均返点率
                              const rollingAvgRebates = calculateRollingAvgRebate(groupData);
                              const periodIndex = groupData.findIndex(d => d.periodKey === clickedPeriod);
                              const rollingAvgRebate = periodIndex >= 0 ? rollingAvgRebates[periodIndex] : avgRebate;
                              const analysis = analyzeSinglePeriodAnomalies(group, clickedPeriod, groupData, rollingAvgRebate);
                              setSelectedPeriodAnomalies(prev => ({
                                ...prev,
                                [group]: {
                                  periodKey: clickedPeriod,
                                  anomalies: analysis.anomalies,
                                  rebateAnalysis: analysis.rebateAnalysis,
                                  rollingAvgRebate: rollingAvgRebate
                                }
                              }));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 选中周期的异常详情（点击图表后显示） */}
                  {selectedPeriodAnomalies[group] && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-purple-800 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          {selectedPeriodAnomalies[group]!.periodKey} 周期分析
                        </h4>
                        <button
                          onClick={() => setSelectedPeriodAnomalies(prev => ({ ...prev, [group]: null }))}
                          className="p-1 hover:bg-purple-100 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4 text-purple-600" />
                        </button>
                      </div>
                      
                      {/* 异常预警 */}
                      {selectedPeriodAnomalies[group]!.anomalies.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {selectedPeriodAnomalies[group]!.anomalies.map((anomaly, idx) => (
                            <div key={idx} className="p-3 bg-white rounded-lg border border-purple-100">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <Badge variant="secondary" className="mb-1">{anomaly.类型}</Badge>
                                  <p className="text-sm text-gray-700">{anomaly.描述}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* 返点率深度分析 - 始终显示（如果有rebateAnalysis数据） */}
                      {selectedPeriodAnomalies[group]!.rebateAnalysis && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-purple-700">
                            📊 返点率归因分析（累计平均返点率 {selectedPeriodAnomalies[group]!.rollingAvgRebate.toFixed(1)}%）：
                          </p>
                          
                          {/* 如果没有品牌数据，显示提示 */}
                          {selectedPeriodAnomalies[group]!.rebateAnalysis.lowRebateBrands.length === 0 && 
                           selectedPeriodAnomalies[group]!.rebateAnalysis.lostHighRebateBrands.length === 0 && (
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                              当周没有金额≥1万元的品牌数据，无法进行分析归因。
                            </div>
                          )}
                          
                          {/* 低返点率品牌 */}
                          {selectedPeriodAnomalies[group]!.rebateAnalysis.lowRebateBrands.map((brandAnalysis: any, bIdx: number) => (
                            <div key={bIdx} className="bg-white rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-blue-500" />
                                  <span className="font-medium text-gray-800">{brandAnalysis.brand}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="text-gray-500">¥{(brandAnalysis.brandAmount / 10000).toFixed(1)}万 ({brandAnalysis.amountRatio.toFixed(1)}%)</span>
                                  <span className="text-red-600 font-medium">
                                    返点率 {brandAnalysis.brandRebate.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              
                              {brandAnalysis.talents.length > 0 && (
                                <div className="ml-6 mt-2">
                                  <p className="text-xs text-gray-500 mb-2">
                                    达人明细（共{brandAnalysis.talents.length}人）：
                                  </p>
                                  {/* 两列布局：低返点率放左，高返点率放右 */}
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* 左侧：返点率 < 30% 的达人 */}
                                    <div>
                                      <p className="text-xs text-red-500 font-medium mb-1">低返点率（&lt;30%）</p>
                                      <div className="space-y-1">
                                        {brandAnalysis.talents
                                          .filter((t: any) => t.rebate < 30)
                                          .map((talent: any, tIdx: number) => (
                                            <div key={`low-${tIdx}`} className="flex items-center justify-between text-xs py-1 px-2 bg-red-50 rounded">
                                              <span className="text-gray-700 truncate max-w-[100px]">{talent.talent}</span>
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-400">¥{(talent.amount / 10000).toFixed(1)}万</span>
                                                <span className="text-red-500 font-medium">{talent.rebate.toFixed(1)}%</span>
                                              </div>
                                            </div>
                                          ))}
                                        {brandAnalysis.talents.filter((t: any) => t.rebate < 30).length === 0 && (
                                          <p className="text-xs text-gray-400 py-1">无</p>
                                        )}
                                      </div>
                                    </div>
                                    {/* 右侧：返点率 >= 30% 的达人 */}
                                    <div>
                                      <p className="text-xs text-green-600 font-medium mb-1">高返点率（≥30%）</p>
                                      <div className="space-y-1">
                                        {brandAnalysis.talents
                                          .filter((t: any) => t.rebate >= 30)
                                          .map((talent: any, tIdx: number) => (
                                            <div key={`high-${tIdx}`} className="flex items-center justify-between text-xs py-1 px-2 bg-green-50 rounded">
                                              <span className="text-gray-700 truncate max-w-[100px]">{talent.talent}</span>
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-400">¥{(talent.amount / 10000).toFixed(1)}万</span>
                                                <span className="text-green-600 font-medium">{talent.rebate.toFixed(1)}%</span>
                                              </div>
                                            </div>
                                          ))}
                                        {brandAnalysis.talents.filter((t: any) => t.rebate >= 30).length === 0 && (
                                          <p className="text-xs text-gray-400 py-1">无</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* 流失的高返点率品牌 */}
                          {selectedPeriodAnomalies[group]!.rebateAnalysis.lostHighRebateBrands.length > 0 && (
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-2">📉 上期有但本期缺失的高返点率品牌：</p>
                              {selectedPeriodAnomalies[group]!.rebateAnalysis.lostHighRebateBrands.map((brand: any, bIdx: number) => (
                                <div key={bIdx} className="flex items-center justify-between text-sm py-1">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">{brand.brand}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-400">上期 ¥{(brand.amount / 10000).toFixed(1)}万</span>
                                    <span className="text-gray-500">
                                      返点率 {brand.rebate.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 无异常且无归因分析时显示正常 */}
                      {selectedPeriodAnomalies[group]!.anomalies.length === 0 && 
                       (!selectedPeriodAnomalies[group]!.rebateAnalysis || 
                        (selectedPeriodAnomalies[group]!.rebateAnalysis.lowRebateBrands.length === 0 && 
                         selectedPeriodAnomalies[group]!.rebateAnalysis.lostHighRebateBrands.length === 0)) && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <TrendingUp className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-green-700 text-sm">该周期KPI表现正常，未发现异常</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 数据展示 */}
      {mediaData.length > 0 ? (
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="table">数据表格</TabsTrigger>
            <TabsTrigger value="quadrant">四象限图</TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            <StatsTable groupStats={groupStats} mediaData={mediaData} />
          </TabsContent>

          <TabsContent value="quadrant">
            <div className="space-y-6">
              {groupStats.map((group) => {
                const quadrantData = generateQuadrantData(mediaData, group.组别);
                return (
                  <Card key={group.组别}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: groupColors[group.组别] || '#666' }}
                        />
                        {group.组别}组 - 四象限分析
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <QuadrantChart
                        data={quadrantData}
                        groupName={group.组别}
                        color={groupColors[group.组别] || '#666'}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-1">暂无匹配数据</h3>
            <p className="text-sm text-gray-400">当前筛选条件下没有找到符合条件的数据，请调整筛选条件</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
