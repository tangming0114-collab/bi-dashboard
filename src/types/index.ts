// 数据类型定义

export interface MediaData {
  媒介: string;
  组别: string;
  刊例价总和: number;
  净价总和: number;
  订单数: number;
  返点率: number;
}

export interface GroupStats {
  组别: string;
  媒介数: number;
  刊例价总和: number;
  净价总和: number;
  返点率: number;
  订单数: number;
  平均下单量: number;
}

export interface QuadrantData {
  媒介: string;
  组别: string;
  下单量: number;
  返点率: number;
  占比: number;
  圆点大小: number;
  平均下单量: number;
  平均返点率: number;
}

export interface FilterOptions {
  zoudan: '全部' | '是' | '否';
  coopType: '全部' | '报备' | '非报备' | '其它';
  platforms: string[];      // 投放平台（多选）
  customers: string[];      // 客户名称（多选）
  brands: string[];         // 投放品牌（多选）
  groups: string[];         // 所属组别（多选）
  applicants: string[];     // 排期申请人（多选）
  months: string[];         // 月份（多选，如：1月、2月）
  startMonth: string;       // 自定义开始年月（如：2025-01）
  endMonth: string;         // 自定义结束年月（如：2025-06）
  industries: string[];     // 客户行业（多选）
}

// 筛选选项列表
export interface FilterChoices {
  platforms: string[];
  customers: string[];
  brands: string[];
  groups: string[];
  applicants: string[];
  months: string[];
  industries: string[];
}

// ==================== 行业核心机构类型 ====================

// 行业类型
export type IndustryType = '互联网电商' | '食品' | '母婴';

// 平台类型
export type CorePlatformType = '抖音' | '小红书';

// 核心机构
export interface CoreMCN {
  id: string;
  name: string;           // 机构名称
  industry: IndustryType; // 所属行业
  platform: CorePlatformType; // 所属平台
}

// 行业政策（按MCN存储）
export interface IndustryPolicy {
  mcnId: string;          // 关联的MCN ID
  policy2026: string;     // 26年行业政策
  updatedAt: string;      // 更新时间
}

// 核心机构统计数据
export interface CoreMCNStats {
  mcnId: string;
  mcnName: string;
  industry: IndustryType;
  platform: CorePlatformType;
  刊例总额: number;       // 投放刊例总额
  净价总额: number;
  返点率: number;         // 返点率
  订单数: number;
  行业总刊例: number;     // 该行业该平台总刊例（用于计算占比）
  下单占比: number;       // 该机构占行业比例
}
