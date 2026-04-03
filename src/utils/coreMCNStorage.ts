import type { CoreMCN, IndustryPolicy, IndustryType, CorePlatformType } from '@/types';
import {
  getUserCoreMCNList,
  saveUserCoreMCNList,
  getUserIndustryPolicies,
  saveUserIndustryPolicies
} from './supabaseStorage';
import { getCurrentUser } from './supabaseAuth';

// ==================== 核心机构管理 ====================

// 获取当前用户ID
function getCurrentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id || null;
}

// 获取所有核心机构
export async function getCoreMCNList(): Promise<CoreMCN[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    return getDefaultCoreMCNList();
  }
  return await getUserCoreMCNList(userId);
}

// 保存核心机构列表
export async function saveCoreMCNList(list: CoreMCN[]): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;
  await saveUserCoreMCNList(userId, list);
}

// 添加核心机构
export async function addCoreMCN(mcn: Omit<CoreMCN, 'id'>): Promise<CoreMCN> {
  const list = await getCoreMCNList();
  const newMCN: CoreMCN = {
    ...mcn,
    id: `mcn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  list.push(newMCN);
  await saveCoreMCNList(list);
  return newMCN;
}

// 删除核心机构
export async function deleteCoreMCN(id: string): Promise<void> {
  const list = await getCoreMCNList();
  const filtered = list.filter(m => m.id !== id);
  await saveCoreMCNList(filtered);
}

// 更新核心机构
export async function updateCoreMCN(id: string, updates: Partial<CoreMCN>): Promise<void> {
  const list = await getCoreMCNList();
  const index = list.findIndex(m => m.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    await saveCoreMCNList(list);
  }
}

// 按行业和平台筛选机构
export async function getMCNByIndustryAndPlatform(
  industry: IndustryType,
  platform: CorePlatformType
): Promise<CoreMCN[]> {
  const list = await getCoreMCNList();
  return list.filter(m => m.industry === industry && m.platform === platform);
}

// 默认核心机构列表（示例数据）
function getDefaultCoreMCNList(): CoreMCN[] {
  return [
    // 互联网电商 - 抖音
    { id: 'mcn_1', name: '无忧传媒', industry: '互联网电商', platform: '抖音' },
    { id: 'mcn_2', name: '遥望网络', industry: '互联网电商', platform: '抖音' },
    { id: 'mcn_3', name: '谦寻文化', industry: '互联网电商', platform: '抖音' },
    // 互联网电商 - 小红书
    { id: 'mcn_4', name: '如涵文化', industry: '互联网电商', platform: '小红书' },
    { id: 'mcn_5', name: '宸帆电商', industry: '互联网电商', platform: '小红书' },
    // 食品 - 抖音
    { id: 'mcn_6', name: '李子柒', industry: '食品', platform: '抖音' },
    { id: 'mcn_7', name: 'papitube', industry: '食品', platform: '抖音' },
    // 食品 - 小红书
    { id: 'mcn_8', name: '摘星阁', industry: '食品', platform: '小红书' },
    // 母婴 - 抖音
    { id: 'mcn_9', name: '洋葱视频', industry: '母婴', platform: '抖音' },
    // 母婴 - 小红书
    { id: 'mcn_10', name: '二咖传媒', industry: '母婴', platform: '小红书' },
  ];
}

// ==================== 行业政策管理 ====================

// 获取所有行业政策
export async function getIndustryPolicies(): Promise<IndustryPolicy[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }
  return await getUserIndustryPolicies(userId);
}

// 获取指定MCN的政策
export async function getIndustryPolicy(mcnId: string): Promise<IndustryPolicy | undefined> {
  const policies = await getIndustryPolicies();
  return policies.find(p => p.mcnId === mcnId);
}

// 保存/更新行业政策
export async function saveIndustryPolicy(mcnId: string, policy2026: string): Promise<IndustryPolicy> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录');
  }

  const policies = await getUserIndustryPolicies(userId);
  const index = policies.findIndex((p: any) => p.mcnId === mcnId);

  const newPolicy: IndustryPolicy = {
    mcnId,
    policy2026,
    updatedAt: new Date().toISOString()
  };

  if (index !== -1) {
    policies[index] = newPolicy;
  } else {
    policies.push(newPolicy);
  }

  await saveUserIndustryPolicies(userId, policies);
  return newPolicy;
}

// 重置为默认数据
export async function resetCoreMCNData(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;

  await saveUserCoreMCNList(userId, getDefaultCoreMCNList());
  await saveUserIndustryPolicies(userId, []);
}
