import * as XLSX from 'xlsx';
import type { MediaData, GroupStats, QuadrantData, FilterOptions, FilterChoices } from '@/types';

// ==================== 筛选维度定义（根据KOL下单-合作方式-最优返点计算.xlsx更新）====================

// 投放平台（23个）
export const PLATFORM_OPTIONS = [
  '抖音', '小红书', '微信', '微博', 'B站', '快手', '知乎', 'keep', 
  '大众点评', '得物', '网媒/门户', '今日头条', '京东', '葩趣', 
  '识货', '淘宝逛逛', '一直播', '最右APP', '美丽修行', 
  '线下活动', '虎牙', '百度', '小宇宙'
];

// 报备合作方式（76个）
export const BAOBEI_OPTIONS = [
  // 抖音
  '星图1-20s视频', '星图21-60s视频', '星图60s以上视频',
  '星任务星图1-20s视频', '星任务星图21-60s视频', '星任务星图60s以上视频', '星任务短直合作',
  '京魔方星图60s以上视频', '短直种草',
  // 小红书
  '报备图文笔记', '报备视频笔记', '星任务报备图文笔记', '星任务报备视频笔记',
  '小红盟图文笔记', '小红盟视频笔记', '小红链图文笔记', '小红链视频笔记', '小红团图文笔记', '小红团视频笔记',
  // 微信
  '平台-视频号发布', '平台-首篇文章', '平台-第二篇文章', '平台-第3-N篇文章', '平台-清单植入',
  // 微博
  '平台微任务直发', '平台微任务转发', '平台微任务原创图文', '平台微任务原创视频',
  // B站
  '定制视频', '植入视频', '直发动态', '转发动态', '线上直播', '线下直播',
  // 快手
  '平台视频推广',
  // 知乎
  '特邀文章', '特邀视频', '特邀回答', '素人众测', '专业测评', '招募回答', '招募文章', '复用文章', '复用回答',
  // keep
  '原创视频', '原创图文',
  // 大众点评
  '原创图文', '原创视频',
  // 得物
  '原创图文', '原创视频',
  // 网媒/门户
  '发布费',
  // 今日头条
  '供稿图文', '原创图文',
  // 京东
  '种草秀', '短视频', '视频', '图文',
  // 葩趣
  '原创文案',
  // 识货
  '原创图文',
  // 淘宝逛逛
  '淘内短视频', '淘内图文',
  // 最右APP
  '原创视频', '原创图文',
  // 美丽修行
  '原创图文', '原创视频',
  // 百度
  '原创图文', '原创视频',
  // 小宇宙
  '口播', '定制单集', '冠名', '小宇宙-平台【不收平台服务费（25年优惠政策）】'
];

// 非报备合作方式（19个）
export const NON_BAOBEI_OPTIONS = [
  // 抖音
  '非星图1-20s视频', '非星图1-20s视频（原非星图视频拆分）', '非星图20-60s视频', '非星图60s以上视频', '非星图视频',
  // 小红书
  '非报备图文', '非报备视频',
  // 微信
  '非平台-视频号发布', '非平台-首篇文章', '非平台-第二篇文章', '非平台-第3-N篇文章', '非平台-清单植入',
  // 微博
  '线下微任务直发', '线下微任务转发', '线下微任务原创图文', '线下微任务原创视频',
  '线下非微任务直发', '线下非微任务原创图文', '线下非微任务原创视频',
  // B站
  '非花火视频',
  // 快手
  '非平台视频推广'
];

// 其它合作形式（32个）
export const OTHER_OPTIONS = [
  '授权', '退款', '素材购买', '赔付', '推荐费', '资源包(请于备注详细描述)', 
  '短视频任务合集', '线下', '抖音图文', '资源包', '阿里妈妈UD', '星图招募任务',
  '品牌推广专场', '品牌推广专场（按天）', '品牌推广专场（按小时）',
  '坑位', '纯佣金', '店铺直播', '电商带货专场', '定金', '短视频共创',
  'KOC', '艺人', '共创合作', '薯条', '朋友圈分发', '社群', 
  '商业起飞', 'koc', '流量助推', '其他', '二次推广', '助推加热'
];

// 获取合作形式类型
export function getCoopType(coopWay: string): '报备' | '非报备' | '其它' {
  if (!coopWay) return '其它';
  const way = coopWay.trim();
  if (BAOBEI_OPTIONS.includes(way)) return '报备';
  if (NON_BAOBEI_OPTIONS.includes(way)) return '非报备';
  return '其它';
}

// 提取组别名称
export function extractGroup(groupStr: string): string {
  if (!groupStr) return '未知';
  const parts = groupStr.split('|');
  return parts[parts.length - 1].trim();
}

// 正确的sheet名称
const CORRECT_SHEET_NAME = 'KOl明细数据';

// 解析Excel文件并校验sheet名称
export async function parseExcel(file: File): Promise<{ data: any[]; sheetName: string; isValid: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetNames = workbook.SheetNames;
        
        // 查找正确的sheet
        const targetSheetName = sheetNames.find(name => name === CORRECT_SHEET_NAME);
        
        if (!targetSheetName) {
          // 没有找到正确的sheet，返回第一个sheet的数据但标记为无效
          const firstSheet = workbook.Sheets[sheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve({
            data: jsonData,
            sheetName: sheetNames[0],
            isValid: false
          });
          return;
        }
        
        // 找到了正确的sheet
        const sheet = workbook.Sheets[targetSheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        resolve({
          data: jsonData,
          sheetName: targetSheetName,
          isValid: true
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

// 导出正确的sheet名称供外部使用
export { CORRECT_SHEET_NAME };

// 从日期提取月份（格式：X月）
export function extractMonth(dateValue: any): string | null {
  if (!dateValue) return null;
  try {
    // 处理Excel日期（可能是Date对象或数字）
    let date: Date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      // Excel serial date number
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

// 从日期提取年月（格式：YYYY-MM）
export function extractYearMonth(dateValue: any): string | null {
  if (!dateValue) return null;
  try {
    // 处理Excel日期（可能是Date对象或数字）
    let date: Date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      // Excel serial date number
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

// 提取筛选选项（从原始数据中提取平台、客户名称、投放品牌、组别、申请人、月份、行业的唯一值）
export function extractFilterChoices(data: any[]): FilterChoices {
  const platforms = new Set<string>();
  const customers = new Set<string>();
  const brands = new Set<string>();
  const groups = new Set<string>();
  const applicants = new Set<string>();
  const months = new Set<string>();
  const industries = new Set<string>();

  data.forEach(row => {
    const platform = row['发布平台'];
    const customer = row['对客项目客户名称'];
    const brand = row['投放品牌'];
    const group = row['排期申请人所属组别'];
    const applicant = row['排期申请人'];
    const date = row['下单日期'];
    const industry = row['行业'];

    if (platform && typeof platform === 'string') {
      platforms.add(platform.trim());
    }
    if (customer && typeof customer === 'string') {
      customers.add(customer.trim());
    }
    if (brand && typeof brand === 'string') {
      brands.add(brand.trim());
    }
    if (group && typeof group === 'string') {
      groups.add(extractGroup(group));
    }
    if (applicant && typeof applicant === 'string') {
      applicants.add(applicant.trim());
    }
    if (date) {
      const month = extractMonth(date);
      if (month) months.add(month);
    }
    if (industry && typeof industry === 'string') {
      industries.add(industry.trim());
    }
  });

  // 月份按数字顺序排序
  const sortedMonths = Array.from(months).sort((a, b) => {
    const monthA = parseInt(a.replace('月', ''));
    const monthB = parseInt(b.replace('月', ''));
    return monthA - monthB;
  });

  return {
    platforms: Array.from(platforms).sort(),
    customers: Array.from(customers).sort(),
    brands: Array.from(brands).sort(),
    groups: Array.from(groups).sort(),
    applicants: Array.from(applicants).sort(),
    months: sortedMonths,
    industries: Array.from(industries).sort()
  };
}

// 筛选数据（带筛选条件）
export function filterData(data: any[], filters: FilterOptions): any[] {
  return data.filter(row => {
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
    
    // 投放平台筛选（多选）
    if (filters.platforms.length > 0) {
      if (!platform || !filters.platforms.includes(platform.trim())) return false;
    }
    
    // 客户名称筛选（多选）
    if (filters.customers.length > 0) {
      if (!customer || !filters.customers.includes(customer.trim())) return false;
    }
    
    // 投放品牌筛选（多选）
    if (filters.brands.length > 0) {
      if (!brand || !filters.brands.includes(brand.trim())) return false;
    }
    
    // 所属组别筛选（多选）
    if (filters.groups.length > 0) {
      const groupName = group ? extractGroup(group) : '';
      if (!groupName || !filters.groups.includes(groupName)) return false;
    }
    
    // 排期申请人筛选（多选）
    if (filters.applicants.length > 0) {
      if (!applicant || !filters.applicants.includes(applicant.trim())) return false;
    }
    
    // 月份筛选（多选）
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
    
    // 客户行业筛选（多选）
    if (filters.industries.length > 0) {
      if (!industry || !filters.industries.includes(industry.trim())) return false;
    }
    
    return true;
  });
}

// 处理数据
export function processData(data: any[]): { mediaData: MediaData[], groupStats: GroupStats[] } {
  // 提取组别
  const processedData = data.map(row => ({
    ...row,
    组别: extractGroup(row['排期申请人所属组别']),
    媒介: row['排期申请人'],
    kol净价: Number(row['kol净价(元)']) || 0,
    Kol刊例单价: Number(row['Kol刊例单价(元)']) || 0,
    执行单编号: row['执行单编号']
  }));
  
  // 按媒介汇总
  const mediaMap = new Map<string, MediaData>();
  
  processedData.forEach(row => {
    const key = `${row.组别}-${row.媒介}`;
    if (!mediaMap.has(key)) {
      mediaMap.set(key, {
        媒介: row.媒介,
        组别: row.组别,
        刊例价总和: 0,
        净价总和: 0,
        订单数: 0,
        返点率: 0
      });
    }
    const media = mediaMap.get(key)!;
    media.刊例价总和 += row.Kol刊例单价;
    media.净价总和 += row.kol净价;
    media.订单数 += 1;
  });
  
  // 计算返点率
  const mediaData = Array.from(mediaMap.values()).map(media => ({
    ...media,
    返点率: media.刊例价总和 > 0 
      ? ((media.刊例价总和 - media.净价总和) / media.刊例价总和 * 100)
      : 0
  }));
  
  // 按组别统计
  const groupMap = new Map<string, GroupStats>();
  
  mediaData.forEach(media => {
    if (!groupMap.has(media.组别)) {
      groupMap.set(media.组别, {
        组别: media.组别,
        媒介数: 0,
        刊例价总和: 0,
        净价总和: 0,
        返点率: 0,
        订单数: 0,
        平均下单量: 0
      });
    }
    const group = groupMap.get(media.组别)!;
    group.媒介数 += 1;
    group.刊例价总和 += media.刊例价总和;
    group.净价总和 += media.净价总和;
    group.订单数 += media.订单数;
  });
  
  // 计算组别返点率和平均下单量（按刊例价排序）
  const groupStats = Array.from(groupMap.values()).map(group => ({
    ...group,
    返点率: group.刊例价总和 > 0
      ? ((group.刊例价总和 - group.净价总和) / group.刊例价总和 * 100)
      : 0,
    平均下单量: group.媒介数 > 0 ? group.刊例价总和 / group.媒介数 : 0
  })).sort((a, b) => b.刊例价总和 - a.刊例价总和);
  
  return { mediaData, groupStats };
}

// 生成四象限数据（使用刊例价）
export function generateQuadrantData(mediaData: MediaData[], groupName: string): QuadrantData[] {
  const groupMedia = mediaData.filter(m => m.组别 === groupName);
  const totalAmount = groupMedia.reduce((sum, m) => sum + m.刊例价总和, 0);

  // 计算该组的加权平均返点率
  const weightedRebate = totalAmount > 0
    ? groupMedia.reduce((sum, m) => sum + m.刊例价总和 * m.返点率, 0) / totalAmount
    : 0;

  // 计算该组的平均下单量
  const avgAmount = groupMedia.length > 0
    ? groupMedia.reduce((sum, m) => sum + m.刊例价总和, 0) / groupMedia.length
    : 0;

  // 生成四象限数据
  return groupMedia.map(media => {
    const 占比 = totalAmount > 0 ? media.刊例价总和 / totalAmount : 0;

    return {
      媒介: media.媒介,
      组别: media.组别,
      下单量: media.刊例价总和,
      返点率: media.返点率,
      占比,
      圆点大小: 150 + 占比 * 3000,
      平均下单量: avgAmount,
      平均返点率: weightedRebate
    };
  });
}

// ==================== 级联筛选逻辑 ====================

// 根据当前筛选条件，计算每个维度在当前条件下的可选值
// excludeField: 当前正在计算的维度，计算时排除该维度的筛选条件
export function getCascadingFilterChoices(
  data: any[], 
  filters: FilterOptions,
  excludeField: keyof FilterOptions
): FilterChoices {
  // 构建临时筛选条件（排除当前计算的维度）
  const tempFilters: FilterOptions = {
    zoudan: excludeField === 'zoudan' ? '全部' : filters.zoudan,
    coopType: excludeField === 'coopType' ? '全部' : filters.coopType,
    platforms: excludeField === 'platforms' ? [] : filters.platforms,
    customers: excludeField === 'customers' ? [] : filters.customers,
    brands: excludeField === 'brands' ? [] : filters.brands,
    groups: excludeField === 'groups' ? [] : filters.groups,
    applicants: excludeField === 'applicants' ? [] : filters.applicants,
    months: excludeField === 'months' ? [] : filters.months,
    startMonth: excludeField === 'startMonth' ? '' : filters.startMonth,
    endMonth: excludeField === 'endMonth' ? '' : filters.endMonth,
    industries: excludeField === 'industries' ? [] : filters.industries,
  };

  // 先用临时条件筛选数据
  const filteredData = filterData(data, tempFilters);

  // 从筛选后的数据中提取各维度的可选值
  const platforms = new Set<string>();
  const customers = new Set<string>();
  const brands = new Set<string>();
  const groups = new Set<string>();
  const applicants = new Set<string>();
  const months = new Set<string>();
  const industries = new Set<string>();

  filteredData.forEach(row => {
    const platform = row['发布平台'];
    const customer = row['对客项目客户名称'];
    const brand = row['投放品牌'];
    const group = row['排期申请人所属组别'];
    const applicant = row['排期申请人'];
    const date = row['下单日期'];
    const industry = row['行业'];

    if (platform && typeof platform === 'string') {
      platforms.add(platform.trim());
    }
    if (customer && typeof customer === 'string') {
      customers.add(customer.trim());
    }
    if (brand && typeof brand === 'string') {
      brands.add(brand.trim());
    }
    if (group && typeof group === 'string') {
      groups.add(extractGroup(group));
    }
    if (applicant && typeof applicant === 'string') {
      applicants.add(applicant.trim());
    }
    if (date) {
      const month = extractMonth(date);
      if (month) months.add(month);
    }
    if (industry && typeof industry === 'string') {
      industries.add(industry.trim());
    }
  });
  
  // 月份按数字顺序排序
  const sortedMonths = Array.from(months).sort((a, b) => {
    const monthA = parseInt(a.replace('月', ''));
    const monthB = parseInt(b.replace('月', ''));
    return monthA - monthB;
  });

  return {
    platforms: Array.from(platforms).sort(),
    customers: Array.from(customers).sort(),
    brands: Array.from(brands).sort(),
    groups: Array.from(groups).sort(),
    applicants: Array.from(applicants).sort(),
    months: sortedMonths,
    industries: Array.from(industries).sort()
  };
}
