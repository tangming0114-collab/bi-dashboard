import { supabase, isSupabaseConfigured } from './supabase';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  avatar?: string;
}

// 本地存储的key（降级方案）
const AUTH_KEY = 'kol_bi_auth';
const USERS_KEY = 'kol_bi_users';

// 默认管理员账号
const DEFAULT_ADMIN = {
  id: 'admin-001',
  username: 'admin',
  password: 'admin123',
  name: '系统管理员',
  role: 'admin' as const
};

// 初始化本地默认用户（降级方案）
function initLocalUsers(): void {
  const existingUsers = localStorage.getItem(USERS_KEY);
  if (!existingUsers) {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
  }
}

// ============ Supabase 认证 ============

// 注册用户
export async function registerUser(
  username: string,
  password: string,
  name: string
): Promise<{ success: boolean; message: string; user?: User }> {
  // 检查用户名格式
  if (username.length < 3) {
    return { success: false, message: '用户名至少需要3个字符' };
  }
  if (password.length < 6) {
    return { success: false, message: '密码至少需要6个字符' };
  }

  // 如果Supabase已配置，使用Supabase
  if (isSupabaseConfigured()) {
    try {
      // 检查用户名是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        return { success: false, message: '用户名已存在' };
      }

      // 创建新用户
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username,
          password, // 注意：生产环境应该加密密码
          name,
          role: 'user'
        }])
        .select()
        .single();

      if (error) {
        console.error('注册失败:', error);
        return { success: false, message: '注册失败，请稍后重试' };
      }

      const user: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role
      };

      return { success: true, message: '注册成功', user };
    } catch (error) {
      console.error('注册错误:', error);
      return { success: false, message: '注册失败，请稍后重试' };
    }
  }

  // 降级方案：使用 localStorage
  initLocalUsers();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');

  if (users.some((u: any) => u.username === username)) {
    return { success: false, message: '用户名已存在' };
  }

  const newUser = {
    id: Date.now().toString(),
    username,
    password,
    name,
    role: 'user' as const
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const { password: _, ...userWithoutPassword } = newUser;
  return { success: true, message: '注册成功', user: userWithoutPassword };
}

// 登录
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> {
  // 如果Supabase已配置，使用Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password) // 注意：生产环境应该使用加密比较
        .single();

      if (error || !data) {
        return { success: false, message: '用户名或密码错误' };
      }

      const user: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role
      };

      // 保存登录状态到本地
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));

      return { success: true, message: '登录成功', user };
    } catch (error) {
      console.error('登录错误:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    }
  }

  // 降级方案：使用 localStorage
  initLocalUsers();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find((u: any) => u.username === username && u.password === password);

  if (user) {
    const { password, ...userWithoutPassword } = user;
    localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPassword));
    return { success: true, message: '登录成功', user: userWithoutPassword };
  }

  return { success: false, message: '用户名或密码错误' };
}

// 登出
export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

// 获取当前用户
export function getCurrentUser(): User | null {
  const auth = localStorage.getItem(AUTH_KEY);
  return auth ? JSON.parse(auth) : null;
}

// 检查是否已登录
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

// ============ 管理员功能 ============

// 获取所有用户（仅管理员）
export async function getAllUsers(): Promise<User[]> {
  // 如果Supabase已配置，使用Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, role, created_at');

      if (error) {
        console.error('获取用户列表失败:', error);
        return [];
      }

      return data.map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        createdAt: u.created_at
      }));
    } catch (error) {
      console.error('获取用户列表错误:', error);
      return [];
    }
  }

  // 降级方案
  initLocalUsers();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  return users.map(({ password, ...user }: any) => user);
}

// 获取用户统计（仅管理员）
export async function getUserStats(): Promise<{ total: number; users: Array<User & { createdAt?: string }> }> {
  const users = await getAllUsers();
  return {
    total: users.length,
    users: users.map((u: any) => ({
      ...u,
      createdAt: u.created_at || u.createdAt || new Date(Number(u.id) || Date.now()).toLocaleString()
    }))
  };
}

// 删除用户（仅管理员）
export async function deleteUser(userId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('删除用户失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('删除用户错误:', error);
      return false;
    }
  }

  // 降级方案
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const filteredUsers = users.filter((u: any) => u.id !== userId);

  if (filteredUsers.length < users.length) {
    localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
    return true;
  }

  return false;
}

// 修改用户角色（仅管理员）
export async function changeUserRole(userId: string, newRole: 'admin' | 'manager' | 'user'): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('修改用户角色失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('修改用户角色错误:', error);
      return false;
    }
  }

  // 降级方案
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const userIndex = users.findIndex((u: any) => u.id === userId);

  if (userIndex !== -1) {
    users[userIndex].role = newRole;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  }

  return false;
}

// 修改密码
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      // 验证旧密码
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('password', oldPassword)
        .single();

      if (!user) {
        return false;
      }

      // 更新密码
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', userId);

      if (error) {
        console.error('修改密码失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('修改密码错误:', error);
      return false;
    }
  }

  // 降级方案
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const userIndex = users.findIndex((u: any) => u.id === userId && u.password === oldPassword);

  if (userIndex !== -1) {
    users[userIndex].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  }

  return false;
}

// 重置密码
export async function resetPassword(
  username: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (newPassword.length < 6) {
    return { success: false, message: '密码至少需要6个字符' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('username', username);

      if (error) {
        console.error('重置密码失败:', error);
        return { success: false, message: '重置密码失败' };
      }

      return { success: true, message: '密码重置成功' };
    } catch (error) {
      console.error('重置密码错误:', error);
      return { success: false, message: '重置密码失败' };
    }
  }

  // 降级方案
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const userIndex = users.findIndex((u: any) => u.username === username);

  if (userIndex === -1) {
    return { success: false, message: '用户不存在' };
  }

  users[userIndex].password = newPassword;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  return { success: true, message: '密码重置成功' };
}

// 检查用户是否存在
export async function checkUserExists(username: string): Promise<{ exists: boolean; name?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('username', username)
        .single();

      if (error || !data) {
        return { exists: false };
      }

      return { exists: true, name: data.name };
    } catch (error) {
      console.error('检查用户错误:', error);
      return { exists: false };
    }
  }

  // 降级方案
  initLocalUsers();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find((u: any) => u.username === username);
  return { exists: !!user, name: user?.name };
}
