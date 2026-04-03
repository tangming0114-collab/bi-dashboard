import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============ 配置开关 ============
// 设置为 true 则强制使用 localStorage 模式，不连接 Supabase
// 设置为 false 则优先使用 Supabase（如果配置了环境变量）
const FORCE_LOCAL_MODE = true;
// =================================

// Supabase 配置
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 调试日志（生产环境也会打印，方便排查）
console.log('[Supabase] 强制本地模式:', FORCE_LOCAL_MODE);
console.log('[Supabase] URL 是否存在:', !!SUPABASE_URL);
console.log('[Supabase] KEY 是否存在:', !!SUPABASE_ANON_KEY);

// 安全初始化：未配置时不抛出错误，避免应用白屏
// 所有实际调用处都已通过 isSupabaseConfigured() 判断，不会真正请求占位地址
export const supabase: SupabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createClient('https://placeholder.supabase.co', 'placeholder');

// 检查 Supabase 是否已配置
export const isSupabaseConfigured = (): boolean => {
  // 如果强制本地模式，始终返回 false
  if (FORCE_LOCAL_MODE) return false;
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
};
