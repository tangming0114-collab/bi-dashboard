// 用户认证工具 - 基于 localStorage 的简单认证

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  avatar?: string;
}

const AUTH_KEY = 'kol_bi_auth';
const USERS_KEY = 'kol_bi_users';

// 默认用户列表
const DEFAULT_USERS = [
  { id: '1', username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin' as const },
  { id: '2', username: 'manager', password: 'manager123', name: '媒介总监', role: 'manager' as const },
  { id: '3', username: 'user', password: 'user123', name: '媒介专员', role: 'user' as const },
];

// 初始化默认用户
export function initDefaultUsers(): void {
  const existingUsers = localStorage.getItem(USERS_KEY);
  if (!existingUsers) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  }
}

// 登录
export function login(username: string, password: string): User | null {
  initDefaultUsers();
  
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find((u: any) => u.username === username && u.password === password);
  
  if (user) {
    const { password, ...userWithoutPassword } = user;
    localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPassword));
    return userWithoutPassword;
  }
  
  return null;
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

// 修改密码
export function changePassword(userId: string, oldPassword: string, newPassword: string): boolean {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const userIndex = users.findIndex((u: any) => u.id === userId && u.password === oldPassword);
  
  if (userIndex !== -1) {
    users[userIndex].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  }
  
  return false;
}

// 注册用户
export function registerUser(username: string, password: string, name: string): { success: boolean; message: string } {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  
  // 检查用户名是否已存在
  if (users.some((u: any) => u.username === username)) {
    return { success: false, message: '用户名已存在' };
  }
  
  // 检查用户名长度
  if (username.length < 3) {
    return { success: false, message: '用户名至少需要3个字符' };
  }
  
  // 检查密码长度
  if (password.length < 6) {
    return { success: false, message: '密码至少需要6个字符' };
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
  
  return { success: true, message: '注册成功' };
}

// 添加新用户（仅管理员）
export function addUser(username: string, password: string, name: string, role: 'admin' | 'manager' | 'user'): boolean {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  
  // 检查用户名是否已存在
  if (users.some((u: any) => u.username === username)) {
    return false;
  }
  
  const newUser = {
    id: Date.now().toString(),
    username,
    password,
    name,
    role
  };
  
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return true;
}

// 获取所有用户（仅管理员）
export function getAllUsers(): Omit<User, 'id'>[] {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  return users.map(({ password, ...user }: any) => user);
}

// 检查用户是否存在
export function checkUserExists(username: string): { exists: boolean; name?: string } {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find((u: any) => u.username === username);
  return { exists: !!user, name: user?.name };
}

// 重置密码（无需旧密码，用于找回密码功能）
export function resetPassword(username: string, newPassword: string): { success: boolean; message: string } {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const userIndex = users.findIndex((u: any) => u.username === username);
  
  if (userIndex === -1) {
    return { success: false, message: '用户不存在' };
  }
  
  // 检查密码长度
  if (newPassword.length < 6) {
    return { success: false, message: '密码至少需要6个字符' };
  }
  
  users[userIndex].password = newPassword;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  return { success: true, message: '密码重置成功' };
}

// 获取用户统计信息（仅管理员）
export function getUserStats(): { total: number; users: Array<{ id: string; username: string; name: string; role: string; createdAt?: string }> } {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  return {
    total: users.length,
    users: users.map(({ password, ...user }: any) => ({
      ...user,
      createdAt: user.id ? new Date(Number(user.id)).toLocaleString() : '未知'
    }))
  };
}

// 删除用户（仅管理员）
export function deleteUser(userId: string): boolean {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const filteredUsers = users.filter((u: any) => u.id !== userId);
  
  if (filteredUsers.length < users.length) {
    localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
    return true;
  }
  
  return false;
}

// 将用户设为管理员（仅管理员可操作）
export function promoteToAdmin(userId: string): boolean {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const userIndex = users.findIndex((u: any) => u.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].role = 'admin';
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  }
  
  return false;
}

// 修改用户角色（仅管理员）
export function changeUserRole(userId: string, newRole: 'admin' | 'manager' | 'user'): boolean {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const userIndex = users.findIndex((u: any) => u.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].role = newRole;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  }
  
  return false;
}
