import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  getCurrentUser,
  logout as authLogout,
  login as authLogin,
  registerUser as authRegisterUser
} from '@/utils/supabaseAuth';
import { getUserData, saveUserData } from '@/utils/supabaseStorage';
import type { User } from '@/utils/supabaseAuth';
import type { UserStoredData } from '@/utils/supabaseStorage';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string; user?: User }>;
  register: (username: string, password: string, name: string) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => void;
  loadUserData: () => Promise<UserStoredData | null>;
  saveUserSession: (data: Omit<UserStoredData, 'userId'>) => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查登录状态
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const result = await authLogin(username, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const register = async (username: string, password: string, name: string) => {
    const result = await authRegisterUser(username, password, name);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const logout = () => {
    authLogout();
    setUser(null);
  };

  const loadUserData = async (): Promise<UserStoredData | null> => {
    if (!user) return null;
    return await getUserData(user.id);
  };

  const saveUserSession = async (data: Omit<UserStoredData, 'userId'>): Promise<boolean> => {
    if (!user) return false;
    return await saveUserData(user.id, data);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        loadUserData,
        saveUserSession
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
