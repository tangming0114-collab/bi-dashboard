import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  AlertTriangle, 
  Building2, 
  User,
  FileText,
  Download,
  RefreshCw,
  BarChart3,
  Percent,
  Calendar,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { openAIAssistant } from '@/utils/aiAssistantBus';
import ReactECharts from 'echarts-for-react';

interface WeeklyReportPageProps {
  rawData: any[];
  onUploadClick: () => void;
}

interface PeriodData {
  组别: string;
  periodKey: string;
  year: number;
  period: number; // 周数或月份
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

export function WeeklyReportPage({ rawData, onUploadClick }: WeeklyReportPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  
  // 存储每个组当前选中的周期异常分析
  const [selectedPeriodAnomalies, setSelectedPeriodAnomalies] = useState<Record<string, {
    periodKey: string;
    anomalies: AnomalyDetail[];
    rebateAnalysis: any;
  } | null>>({});
  
  // 数据筛选状态
  const [showFilters, setShowFilters] = useState(false);
  const [brandFilter, setBrandFilter] = useState('');
  const [talentFilter, setTalentFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [minRebate, setMinRebate] = useState('');
  const [maxRebate, setMaxRebate] = useState('');

  // 处理所有数据（根据视图模式决定按周或按月统计）
  const periodDataByGroup = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return { data: {}, periods: [] };
    }

    // 处理每条数据
    const processedData = rawData.map(row => {
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
        period = orderDate.getMonth() + 1; // 月份 1-12
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
        viewMode,
        组别: group,
        下单量: amount,
        kol净价: net,
        是否报备合作: isValidBaobei,
        投放品牌: row['投放品牌'] || '',
        达人昵称: row['达人昵称'] || ''
      };
    }).filter(Boolean) as any[];

    // 只保留核心四个组且为报备合作的数据（去走单）
    let coreData = processedData.filter(d => CORE_GROUPS.includes(d.组别) && d.是否报备合作);
    
    // 应用数据筛选条件
    if (brandFilter.trim()) {
      const brandKeyword = brandFilter.trim().toLowerCase();
      coreData = coreData.filter(d => d.投放品牌 && d.投放品牌.toLowerCase().includes(brandKeyword));
    }
    if (talentFilter.trim()) {
      const talentKeyword = talentFilter.trim().toLowerCase();
      coreData = coreData.filter(d => d.达人昵称 && d.达人昵称.toLowerCase().includes(talentKeyword));
    }
    if (minAmount) {
      coreData = coreData.filter(d => d.下单量 >= Number(minAmount) * 10000);
    }
    if (maxAmount) {
      coreData = coreData.filter(d => d.下单量 <= Number(maxAmount) * 10000);
    }
    if (minRebate) {
      coreData = coreData.filter(d => {
        const rebate = d.下单量 > 0 ? ((d.下单量 - d.kol净价) / d.下单量 * 100) : 0;
        return rebate >= Number(minRebate);
      });
    }
    if (maxRebate) {
      coreData = coreData.filter(d => {
        const rebate = d.下单量 > 0 ? ((d.下单量 - d.kol净价) / d.下单量 * 100) : 0;
        return rebate <= Number(maxRebate);
      });
    }

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

    // 计算返点率（使用汇总后的数据，避免重复计算）
    CORE_GROUPS.forEach(group => {
      groupPeriodMap[group].forEach((item, key) => {
        // 直接使用groupPeriodMap中汇总的下单量，避免重复遍历coreData
        const amount = item.下单量;
        // 从coreData中计算净价（因为groupPeriodMap中没有存储kol净价）
        const periodData = coreData.filter(d => d.组别 === group && d.periodKey === key);
        const net = periodData.reduce((sum, d) => sum + d.kol净价, 0);
        item.返点率 = amount > 0 ? ((amount - net) / amount * 100) : 0;
      });
    });

    // 获取所有周期并排序
    let allPeriodKeys = Array.from(new Set(coreData.map(d => d.periodKey))).sort();
    
    // 剔除非2026年的周数据（只保留2026年的数据）
    allPeriodKeys = allPeriodKeys.filter(key => key.startsWith('2026-'));

    // 转换为数组格式
    const periodDataByGroup: Record<string, PeriodData[]> = {};
    CORE_GROUPS.forEach(group => {
      periodDataByGroup[group] = allPeriodKeys.map(periodKey => {
        const data = groupPeriodMap[group].get(periodKey);
        if (data) return data;
        // 如果没有数据，返回0值
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
  }, [rawData, viewMode, brandFilter, talentFilter, minAmount, maxAmount, minRebate, maxRebate]);

  // 分析异常（全量对比分析）
  const analyzeAnomalies = (groupData: PeriodData[]): AnomalyDetail[] => {
    const anomalies: AnomalyDetail[] = [];
    
    for (let i = 1; i < groupData.length; i++) {
      const curr = groupData[i];
      const prev = groupData[i - 1];
      
      if (curr.下单量 === 0 && prev.下单量 === 0) continue;
      
      // 下单量大幅下降
      if (prev.下单量 > 0) {
        const dropRate = (curr.下单量 - prev.下单量) / prev.下单量 * 100;
        if (dropRate < -30) {
          anomalies.push({
            类型: '下单量大幅下降',
            描述: `${curr.periodKey} 下单量从 ¥${(prev.下单量 / 10000).toFixed(1)}万 降至 ¥${(curr.下单量 / 10000).toFixed(1)}万，环比下降 ${Math.abs(dropRate).toFixed(1)}%`,
            影响金额: prev.下单量 - curr.下单量
          });
        }
      }
      
      // 返点率大幅下降
      if (curr.返点率 > 0 && prev.返点率 > 0) {
        const rebateDrop = curr.返点率 - prev.返点率;
        if (rebateDrop < -3) {
          anomalies.push({
            类型: '返点率大幅下降',
            描述: `${curr.periodKey} 返点率从 ${prev.返点率.toFixed(2)}% 降至 ${curr.返点率.toFixed(2)}%，下降 ${Math.abs(rebateDrop).toFixed(2)}个百分点`
          });
        }
      }
      
      // 返点率过低
      if (curr.返点率 > 0 && curr.返点率 < 20) {
        anomalies.push({
          类型: '返点率过低',
          描述: `${curr.periodKey} 返点率仅 ${curr.返点率.toFixed(2)}%，远低于正常水平`
        });
      }
    }
    
    return anomalies;
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
    
    // 返点率低于组均（新增异常类型）
    if (curr.返点率 > 0 && curr.返点率 < groupAvgRebate - 5) {
      anomalies.push({
        类型: '返点率低于组均',
        描述: `${curr.periodKey} 返点率 ${curr.返点率.toFixed(2)}% 低于组均 ${groupAvgRebate.toFixed(2)}%，差距 ${(groupAvgRebate - curr.返点率).toFixed(2)}个百分点`
      });
    }
    
    // 获取返点率深度分析
    let rebateAnalysis = null;
    if (prev && anomalies.some(a => a.类型 === '返点率大幅下降')) {
      rebateAnalysis = analyzeRebateDrop(group, periodKey, prev.periodKey, groupAvgRebate);
    } else if (curr.返点率 > 0) {
      // 即使没有大幅下降，也分析当周的品牌构成
      rebateAnalysis = analyzeRebateDrop(group, periodKey, prev?.periodKey || '', groupAvgRebate);
    }
    
    return { anomalies, rebateAnalysis };
  };

  // 深入分析返点率下降原因 - 找出真正拉低返点率的因素
  const analyzeRebateDrop = (group: string, currPeriodKey: string, prevPeriodKey: string, groupAvgRebate: number) => {
    // 根据视图模式决定按周或按月筛选
    const getPeriodKey = (date: Date): string => {
      if (viewMode === 'weekly') {
        const naturalWeek = getNaturalWeek(date);
        return formatWeek(naturalWeek.year, naturalWeek.week);
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    // 获取当前周期数据
    const currData = rawData.filter(row => {
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
    const prevData = rawData.filter(row => {
      const orderDate = parseExcelDate(row['下单日期']);
      if (!orderDate) return false;
      const rowGroup = extractGroup(row['排期申请人所属组别'] || '');
      const rowPeriodKey = getPeriodKey(orderDate);
      const isZoudan = row['是否客户指定走单'] === '是';
      const coopWay = row['合作方式'] || '';
      const isBaobei = BAOBEI_OPTIONS.includes(coopWay);
      return rowGroup === group && rowPeriodKey === prevPeriodKey && !isZoudan && isBaobei;
    });

    // 计算当周总返点率
    const currTotalAmount = currData.reduce((sum, row) => sum + (Number(row['Kol刊例单价(元)']) || 0), 0);
    const currTotalNet = currData.reduce((sum, row) => sum + (Number(row['kol净价(元)']) || 0), 0);
    const currRebate = currTotalAmount > 0 ? ((currTotalAmount - currTotalNet) / currTotalAmount * 100) : 0;

    // 计算上周总返点率
    const prevTotalAmount = prevData.reduce((sum, row) => sum + (Number(row['Kol刊例单价(元)']) || 0), 0);
    const prevTotalNet = prevData.reduce((sum, row) => sum + (Number(row['kol净价(元)']) || 0), 0);
    const prevRebate = prevTotalAmount > 0 ? ((prevTotalAmount - prevTotalNet) / prevTotalAmount * 100) : 0;

    const rebateDrop = prevRebate - currRebate;

    // 金额阈值：对大盘有实际影响的最低金额（1万元）
    const AMOUNT_THRESHOLD = 10000;
    // 异常返点率阈值：与组均差异超过5个百分点
    const REBATE_DIFF_THRESHOLD = 5;

    // === 分析1: 按品牌汇总当周数据 ===
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

    // 找出低返点率品牌（返点率低于组均，且金额占比超过3%或超过1万元）
    const lowRebateBrands = Array.from(brandMap.entries())
      .map(([brand, data]) => {
        const rebate = data.amount > 0 ? ((data.amount - data.net) / data.amount * 100) : 0;
        const amountRatio = currTotalAmount > 0 ? (data.amount / currTotalAmount * 100) : 0;
        return { brand, amount: data.amount, rebate, amountRatio, count: data.count };
      })
      .filter(b => b.rebate < groupAvgRebate - REBATE_DIFF_THRESHOLD && (b.amountRatio > 3 || b.amount >= AMOUNT_THRESHOLD))
      .sort((a, b) => a.rebate - b.rebate);

    // === 分析2: 找出上周有但本周没有的高返点率品牌 ===
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

    const lostHighRebateBrands = Array.from(prevBrandMap.entries())
      .filter(([brand]) => !brandMap.has(brand)) // 上周有但本周没有
      .map(([brand, data]) => {
        const rebate = data.amount > 0 ? ((data.amount - data.net) / data.amount * 100) : 0;
        const amountRatio = prevTotalAmount > 0 ? (data.amount / prevTotalAmount * 100) : 0;
        return { brand, amount: data.amount, rebate, amountRatio };
      })
      .filter(b => b.rebate > groupAvgRebate + REBATE_DIFF_THRESHOLD && (b.amountRatio > 3 || b.amount >= AMOUNT_THRESHOLD))
      .sort((a, b) => b.rebate - a.rebate);

    // === 分析3: 对每个低返点率品牌，找出所有异常达人 ===
    const brandDetailAnalysis = lowRebateBrands.map(brandInfo => {
      const brandData = currData.filter(row => (row['投放品牌'] || '') === brandInfo.brand);
      
      // 按达人汇总
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

      // 找出所有异常达人（返点率与组均差异超过5pp，且金额>=1万元）
      const abnormalTalents = Array.from(talentMap.entries())
        .map(([talent, data]) => {
          const rebate = data.amount > 0 ? ((data.amount - data.net) / data.amount * 100) : 0;
          return { talent, amount: data.amount, rebate };
        })
        .filter(t => Math.abs(t.rebate - groupAvgRebate) >= REBATE_DIFF_THRESHOLD && t.amount >= AMOUNT_THRESHOLD)
        .sort((a, b) => a.rebate - b.rebate); // 低返点率在前

      return {
        brand: brandInfo.brand,
        brandRebate: brandInfo.rebate,
        brandAmount: brandInfo.amount,
        amountRatio: brandInfo.amountRatio,
        talents: abnormalTalents
      };
    });

    return {
      rebateDrop,
      lowRebateBrands: brandDetailAnalysis,
      lostHighRebateBrands
    };
  };



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

  const generateRebateChart = (groupData: PeriodData[], groupAvgRebate: number) => {
    const weeks = groupData.map(d => d.periodKey);
    const rebates = groupData.map(d => d.返点率.toFixed(2));
    
    // 使用传入的组内平均返点率（按总金额加权，与KPI追踪模块一致）
    const avgRebate = groupAvgRebate;
    
    return {
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
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
          const weekRebate = params[0].value;
          const diff = (parseFloat(weekRebate) - avgRebate).toFixed(2);
          const diffText = parseFloat(diff) >= 0 ? `+${diff}` : diff;
          return `${params[0].name}<br/>返点率: ${weekRebate}%<br/>组均: ${avgRebate.toFixed(2)}%<br/>差异: ${diffText}pp<br/><span style="color:#8b5cf6;font-size:12px;">👆 点击查看详情</span>`;
        }
      },
      series: [{
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
        },
        markLine: {
          silent: true,
          data: [
            { 
              yAxis: 20, 
              lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
              label: { formatter: '警戒线 20%', fontSize: 9, position: 'start' }
            },
            { 
              yAxis: avgRebate, 
              lineStyle: { color: '#10b981', type: 'solid', width: 2 },
              label: { 
                formatter: `组均 ${avgRebate.toFixed(1)}%`, 
                fontSize: 10, 
                position: 'end',
                color: '#10b981'
              }
            }
          ]
        }
      }]
    };
  };

  // AI 生成解读
  const openWeeklyAI = () => {
    const summaries = CORE_GROUPS.map(group => {
      const data = periodDataByGroup.data[group] || [];
      const totalAmount = data.reduce((sum, d) => sum + d.下单量, 0);
      const avgRebate = data.filter(d => d.返点率 > 0).reduce((sum, d) => sum + d.返点率, 0) / data.filter(d => d.返点率 > 0).length || 0;
      const anomalies = analyzeAnomalies(data);
      const latest = data[data.length - 1];
      return `${group}: 累计¥${(totalAmount / 10000).toFixed(1)}万, 平均返点率${avgRebate.toFixed(2)}%, 最近周期${latest?.periodKey || '-'}, 最近下单¥${(latest?.下单量 || 0 / 10000).toFixed(1)}万, 异常${anomalies.length}项`;
    }).join('\n');

    const allAnomalies = CORE_GROUPS.flatMap(group => {
      const data = periodDataByGroup.data[group] || [];
      return analyzeAnomalies(data).map(a => `[${group}] ${a.类型}: ${a.描述}`);
    }).slice(0, 10).join('\n');

    openAIAssistant({
      pageName: viewMode === 'weekly' ? '周报解读' : '月报解读',
      contextData: `四组核心数据：\n${summaries}\n\n主要异常点（前10）：\n${allAnomalies || '无'}`,
      defaultQuestion: `请生成一份${viewMode === 'weekly' ? '周报' : '月报'}的Executive Summary（200-400字），包含整体趋势、亮点、风险和下一步行动建议。`,
    });
  };

  // 导出报告
  const exportReport = () => {
    const lines: string[] = [];
    const modeText = viewMode === 'weekly' ? '周报' : '月报';
    lines.push(`【媒介复盘 - ${modeText} - 四组KPI分析】`);
    lines.push(`生成时间: ${new Date().toLocaleString()}`);
    lines.push('');

    CORE_GROUPS.forEach(group => {
      const data = periodDataByGroup.data[group];
      if (!data || data.length === 0) return;

      const totalAmount = data.reduce((sum, d) => sum + d.下单量, 0);
      const avgRebate = data.filter(d => d.返点率 > 0).reduce((sum, d) => sum + d.返点率, 0) / data.filter(d => d.返点率 > 0).length || 0;
      const anomalies = analyzeAnomalies(data);

      lines.push(`\n${'='.repeat(60)}`);
      lines.push(`【${group}】`);
      lines.push(`${'='.repeat(60)}`);
      lines.push(`累计下单量: ¥${(totalAmount / 10000).toFixed(1)}万`);
      lines.push(`平均返点率: ${avgRebate.toFixed(2)}%`);
      lines.push(`分析${viewMode === 'weekly' ? '周数' : '月数'}: ${data.length}${viewMode === 'weekly' ? '周' : '月'}`);
      
      if (anomalies.length > 0) {
        lines.push(`\n⚠️ 异常预警 (${anomalies.length}项):`);
        anomalies.forEach(a => {
          lines.push(`  • ${a.类型}: ${a.描述}`);
        });
      } else {
        lines.push('\n✅ 无异常');
      }
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `媒介复盘_${modeText}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!rawData || rawData.length === 0) {
    return (
      <div className="text-center py-20">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">暂无数据</h3>
        <p className="text-gray-500 mb-6">请先上传Excel数据以生成周报</p>
        <Button onClick={onUploadClick}>
          <RefreshCw className="w-4 h-4 mr-2" />
          上传数据
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">媒介复盘</h2>
          <p className="text-gray-500 mt-1">
            四组KPI全年趋势分析（仅统计报备合作数据，剔除走单业务）
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 数据筛选按钮 */}
          <Button 
            onClick={() => setShowFilters(!showFilters)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            数据筛选
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
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
              <Calendar className="w-4 h-4" />
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
              <Calendar className="w-4 h-4" />
              月报
            </button>
          </div>
          <Button onClick={exportReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出{viewMode === 'weekly' ? '周报' : '月报'}
          </Button>
          <Button
            onClick={openWeeklyAI}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI 生成解读
          </Button>
        </div>
      </div>

      {/* 数据筛选面板 */}
      {showFilters && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                数据筛选条件
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setBrandFilter('');
                  setTalentFilter('');
                  setMinAmount('');
                  setMaxAmount('');
                  setMinRebate('');
                  setMaxRebate('');
                }}
              >
                重置筛选
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">品牌筛选</label>
                <Input
                  placeholder="输入品牌名称"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">达人筛选</label>
                <Input
                  placeholder="输入达人名称"
                  value={talentFilter}
                  onChange={(e) => setTalentFilter(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">最小金额（万元）</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">最大金额（万元）</label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">最小返点率（%）</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minRebate}
                    onChange={(e) => setMinRebate(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">最大返点率（%）</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={maxRebate}
                    onChange={(e) => setMaxRebate(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
            {(brandFilter || talentFilter || minAmount || maxAmount || minRebate || maxRebate) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-blue-600">
                  已应用筛选条件，数据已更新
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 四个组模块 */}
      {CORE_GROUPS.map(group => {
        const groupData = periodDataByGroup.data[group] || [];
        
        // 计算总下单量（累计刊例价）
        const totalAmount = groupData.reduce((sum, d) => sum + d.下单量, 0);
        
        // 计算总净价（与KPI追踪模块一致：按总金额加权平均）
        const totalNet = groupData.reduce((sum, d) => {
          // 根据返点率反推净价
          const net = d.下单量 * (1 - d.返点率 / 100);
          return sum + net;
        }, 0);
        
        // 按总金额加权的平均返点率（与KPI追踪模块一致）
        const avgRebate = totalAmount > 0 ? ((totalAmount - totalNet) / totalAmount * 100) : 0;

        return (
          <Card key={group} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
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
                      <span>分析{viewMode === 'weekly' ? '周数' : '月数'}: {groupData.length}{viewMode === 'weekly' ? '周' : '月'}</span>
                    </div>
                  </div>
                </CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              {/* 趋势图 */}
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
                      绿色线为组内平均返点率，点击数据点查看详情
                    </span>
                  </h4>
                  <div className="h-48">
                    <ReactECharts 
                      option={generateRebateChart(groupData, avgRebate)} 
                      style={{ height: '100%', width: '100%' }}
                      onEvents={{
                        click: (params: any) => {
                          const clickedPeriod = params.name;
                          const analysis = analyzeSinglePeriodAnomalies(group, clickedPeriod, groupData, avgRebate);
                          setSelectedPeriodAnomalies(prev => ({
                            ...prev,
                            [group]: {
                              periodKey: clickedPeriod,
                              anomalies: analysis.anomalies,
                              rebateAnalysis: analysis.rebateAnalysis
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
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
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
                  
                  {selectedPeriodAnomalies[group]!.anomalies.length > 0 ? (
                    <div className="space-y-3">
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
                      
                      {/* 返点率深度分析 */}
                      {selectedPeriodAnomalies[group]!.rebateAnalysis && 
                       (selectedPeriodAnomalies[group]!.rebateAnalysis.lowRebateBrands.length > 0 || 
                        selectedPeriodAnomalies[group]!.rebateAnalysis.lostHighRebateBrands.length > 0) && (
                        <div className="mt-4 space-y-3 border-t border-purple-200 pt-3">
                          <p className="text-xs font-medium text-purple-700">
                            📊 返点率归因分析（组均返点率 {avgRebate.toFixed(1)}%）：
                          </p>
                          
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
                                <div className="ml-6 mt-2 space-y-1">
                                  <p className="text-xs text-gray-500 mb-1">
                                    异常达人（共{brandAnalysis.talents.length}人）：
                                  </p>
                                  {brandAnalysis.talents.map((talent: any, tIdx: number) => (
                                    <div key={tIdx} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                      <div className="flex items-center gap-2">
                                        <User className="w-3 h-3 text-purple-400" />
                                        <span className="text-gray-700">{talent.talent}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-gray-400">¥{(talent.amount / 10000).toFixed(1)}万</span>
                                        <span className={`text-xs ${talent.rebate < avgRebate ? 'text-red-500' : 'text-green-600'}`}>
                                          返点率 {talent.rebate.toFixed(1)}%
                                          {talent.rebate < avgRebate ? ' (↓)' : ' (↑)'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
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
                    </div>
                  ) : (
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

      {/* 说明 */}
      <div className="text-xs text-gray-400 bg-gray-50 p-4 rounded-lg">
        <p className="font-medium mb-1">📊 数据说明（仅统计报备合作数据）：</p>
        <p>• {viewMode === 'weekly' ? '自然周定义：周一至周日为一个自然周' : '自然月定义：按自然月统计（1日-月末）'}</p>
        <p>• 统计范围：仅统计去走单+报备合作的达人（剔除所有走单业务）</p>
        <p>• 下单量：报备合作的刊例价总和</p>
        <p>• 返点率：报备合作的平均返点率</p>
        <p>• 异常阈值：下单量环比下降&gt;30%、返点率&lt;20%、返点率环比下降&gt;3pp</p>
      </div>
    </div>
  );
}
