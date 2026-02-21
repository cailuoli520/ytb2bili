import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface UserInfo {
  id: string;
  name: string;
  mid: string;
  avatar?: string;
  username?: string;
  email?: string;
}

/**
 * 认证Hook - 管理员登录 + Bilibili 账号
 */
export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查管理员登录状态
  const checkAdminAuth = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    
    if (token && userStr) {
      try {
        const adminUser = JSON.parse(userStr);
        return adminUser;
      } catch (e) {
        console.error('Failed to parse admin user:', e);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    return null;
  }, []);

  // 检查 Bilibili 登录状态
  const checkBilibiliAuthStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/auth/status');
      const data = await response.json();
      
      if (data.code === 200 && data.data?.bilibili_connected && data.data?.bilibili_user) {
        return {
          id: data.data.bilibili_user.mid,
          name: data.data.bilibili_user.name,
          mid: data.data.bilibili_user.mid,
          avatar: data.data.bilibili_user.avatar,
        };
      }
    } catch (error) {
      console.error('检查 Bilibili 登录状态失败:', error);
    }
    return null;
  }, []);

  // 初始化：检查登录状态
  useEffect(() => {
    const initialize = async () => {
      // 检查管理员登录
      const adminUser = checkAdminAuth();
      
      if (adminUser) {
        // 如果管理员已登录，同时检查是否有 Bilibili 账号
        const bilibiliUser = await checkBilibiliAuthStatus();
        
        // 合并用户信息，确保 mid 字段始终存在
        setUser({
          id: adminUser.id,
          name: adminUser.name || adminUser.username || 'Admin',
          mid: bilibiliUser?.mid || adminUser.id, // 如果没有 Bilibili 账号，使用 id 作为 mid
          avatar: bilibiliUser?.avatar || adminUser.avatar,
          username: adminUser.username,
          email: adminUser.email,
        });
      }
      
      setLoading(false);
    };

    initialize();
  }, [checkAdminAuth, checkBilibiliAuthStatus]);

  const handleLoginSuccess = (userData: UserInfo) => {
    setUser(userData);
  };

  const handleRefreshStatus = async () => {
    // 重新检查 Bilibili 登录状态
    const adminUser = checkAdminAuth();
    if (adminUser) {
      const bilibiliUser = await checkBilibiliAuthStatus();
      setUser({
        id: adminUser.id,
        name: adminUser.name || adminUser.username || 'Admin',
        mid: bilibiliUser?.mid || adminUser.id,
        avatar: bilibiliUser?.avatar || adminUser.avatar,
        username: adminUser.username,
        email: adminUser.email,
      });
    }
  };

  const handleLogout = async () => {
    try {
      // 退出 Bilibili（如果已连接）
      if (user?.mid) {
        await apiFetch('/auth/logout', { method: 'POST' });
      }
      
      // 清除管理员登录状态
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      setUser(null);
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return {
    user,
    loading,
    handleLoginSuccess,
    handleRefreshStatus,
    handleLogout,
  };
}
