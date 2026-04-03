import { supabase, isSupabaseConfigured } from './supabase';

// 用户存储的数据类型
export interface UserStoredData {
  userId: string;
  rawData: any[];
  fileName: string;
  filters: any;
  filterChoices: any;
  uploadTime: string;
}

// 本地存储key
const USER_DATA_PREFIX = 'kol_bi_user_data_';

// ============ 用户排期数据 ============

// 获取用户数据
export async function getUserData(userId: string): Promise<UserStoredData | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        userId: data.user_id,
        rawData: data.raw_data || [],
        fileName: data.file_name || '',
        filters: data.filters || {},
        filterChoices: data.filter_choices || {},
        uploadTime: data.upload_time
      };
    } catch (error) {
      console.error('获取用户数据失败:', error);
      return null;
    }
  }

  // 降级方案
  const data = localStorage.getItem(`${USER_DATA_PREFIX}${userId}`);
  return data ? JSON.parse(data) : null;
}

// 保存用户数据
export async function saveUserData(
  userId: string,
  data: Omit<UserStoredData, 'userId'>
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      // 检查是否已有数据
      const { data: existingData } = await supabase
        .from('user_data')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingData) {
        // 更新
        const { error } = await supabase
          .from('user_data')
          .update({
            raw_data: data.rawData,
            file_name: data.fileName,
            filters: data.filters,
            filter_choices: data.filterChoices,
            upload_time: data.uploadTime
          })
          .eq('user_id', userId);

        if (error) {
          console.error('更新用户数据失败:', error);
          return false;
        }
      } else {
        // 插入
        const { error } = await supabase
          .from('user_data')
          .insert([{
            user_id: userId,
            raw_data: data.rawData,
            file_name: data.fileName,
            filters: data.filters,
            filter_choices: data.filterChoices,
            upload_time: data.uploadTime
          }]);

        if (error) {
          console.error('保存用户数据失败:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('保存用户数据错误:', error);
      return false;
    }
  }

  // 降级方案
  try {
    localStorage.setItem(
      `${USER_DATA_PREFIX}${userId}`,
      JSON.stringify({ userId, ...data })
    );
    return true;
  } catch (error) {
    console.error('本地保存用户数据失败:', error);
    return false;
  }
}

// 删除用户数据
export async function deleteUserData(userId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('user_data')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('删除用户数据失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('删除用户数据错误:', error);
      return false;
    }
  }

  // 降级方案
  localStorage.removeItem(`${USER_DATA_PREFIX}${userId}`);
  return true;
}

// ============ 用户核心机构配置 ============

const SUPABASE_CORE_MCN_PREFIX = 'core_mcn_';
const SUPABASE_POLICY_PREFIX = 'industry_policy_';

// 获取用户的核心机构列表
export async function getUserCoreMCNList(userId: string): Promise<any[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('user_configs')
        .select('config_value')
        .eq('user_id', userId)
        .eq('config_key', 'core_mcn_list')
        .single();

      if (error || !data) {
        return getDefaultCoreMCNList();
      }

      return data.config_value || getDefaultCoreMCNList();
    } catch (error) {
      console.error('获取用户核心机构失败:', error);
      return getDefaultCoreMCNList();
    }
  }

  // 降级方案
  try {
    const data = localStorage.getItem(`${SUPABASE_CORE_MCN_PREFIX}${userId}`);
    return data ? JSON.parse(data) : getDefaultCoreMCNList();
  } catch {
    return getDefaultCoreMCNList();
  }
}

// 保存用户的核心机构列表
export async function saveUserCoreMCNList(userId: string, list: any[]): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase
        .from('user_configs')
        .select('id')
        .eq('user_id', userId)
        .eq('config_key', 'core_mcn_list')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('user_configs')
          .update({ config_value: list })
          .eq('user_id', userId)
          .eq('config_key', 'core_mcn_list');

        if (error) {
          console.error('更新核心机构失败:', error);
          return false;
        }
      } else {
        const { error } = await supabase
          .from('user_configs')
          .insert([{
            user_id: userId,
            config_key: 'core_mcn_list',
            config_value: list
          }]);

        if (error) {
          console.error('保存核心机构失败:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('保存核心机构错误:', error);
      return false;
    }
  }

  // 降级方案
  try {
    localStorage.setItem(`${SUPABASE_CORE_MCN_PREFIX}${userId}`, JSON.stringify(list));
    return true;
  } catch (error) {
    console.error('本地保存核心机构失败:', error);
    return false;
  }
}

// 获取用户的行业政策
export async function getUserIndustryPolicies(userId: string): Promise<any[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('user_configs')
        .select('config_value')
        .eq('user_id', userId)
        .eq('config_key', 'industry_policies')
        .single();

      if (error || !data) {
        return [];
      }

      return data.config_value || [];
    } catch (error) {
      console.error('获取用户行业政策失败:', error);
      return [];
    }
  }

  // 降级方案
  try {
    const data = localStorage.getItem(`${SUPABASE_POLICY_PREFIX}${userId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 保存用户的行业政策
export async function saveUserIndustryPolicies(userId: string, policies: any[]): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase
        .from('user_configs')
        .select('id')
        .eq('user_id', userId)
        .eq('config_key', 'industry_policies')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('user_configs')
          .update({ config_value: policies })
          .eq('user_id', userId)
          .eq('config_key', 'industry_policies');

        if (error) {
          console.error('更新行业政策失败:', error);
          return false;
        }
      } else {
        const { error } = await supabase
          .from('user_configs')
          .insert([{
            user_id: userId,
            config_key: 'industry_policies',
            config_value: policies
          }]);

        if (error) {
          console.error('保存行业政策失败:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('保存行业政策错误:', error);
      return false;
    }
  }

  // 降级方案
  try {
    localStorage.setItem(`${SUPABASE_POLICY_PREFIX}${userId}`, JSON.stringify(policies));
    return true;
  } catch (error) {
    console.error('本地保存行业政策失败:', error);
    return false;
  }
}

// 默认核心机构列表
function getDefaultCoreMCNList(): any[] {
  return [
    { id: 'mcn_1', name: '无忧传媒', industry: '互联网电商', platform: '抖音' },
    { id: 'mcn_2', name: '遥望网络', industry: '互联网电商', platform: '抖音' },
    { id: 'mcn_3', name: '谦寻文化', industry: '互联网电商', platform: '抖音' },
    { id: 'mcn_4', name: '如涵文化', industry: '互联网电商', platform: '小红书' },
    { id: 'mcn_5', name: '宸帆电商', industry: '互联网电商', platform: '小红书' },
    { id: 'mcn_6', name: '李子柒', industry: '食品', platform: '抖音' },
    { id: 'mcn_7', name: 'papitube', industry: '食品', platform: '抖音' },
    { id: 'mcn_8', name: '摘星阁', industry: '食品', platform: '小红书' },
    { id: 'mcn_9', name: '洋葱视频', industry: '母婴', platform: '抖音' },
    { id: 'mcn_10', name: '二咖传媒', industry: '母婴', platform: '小红书' },
  ];
}
