import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 配置
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 安全初始化：未配置时不抛出错误，避免应用白屏
// 所有实际调用处都已通过 isSupabaseConfigured() 判断，不会真正请求占位地址
export const supabase: SupabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createClient('https://placeholder.supabase.co', 'placeholder');

// 检查 Supabase 是否已配置
export const isSupabaseConfigured = (): boolean => {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
};
