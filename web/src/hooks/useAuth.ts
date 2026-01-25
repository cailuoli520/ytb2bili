import { useState, useEffect, useCallback } from 'react';
import { useFirebaseUserStore } from '@/store/firebaseUserStore';
import { getFullApiBaseUrl, apiFetch } from '@/lib/api';

interface UserInfo {
  id: string;
  uid: string;  // Firebase UID，与 id 相同
  name: string;
  mid: string;
  avatar?: string;
}

/**
 * 认证Hook - 整合 Firebase 和 Bilibili 登录状态
 * 优先使用 Firebase 认证，兼容 Bilibili 扫码登录
 */
export function useAuth() {
  const { 
    currentUser, 
    firebaseUser, 
    isLoading, 
    isInitialized,
    signOut: firebaseSignOut 
  } = useFirebaseUserStore();
  
  const [bilibiliUser, setBilibiliUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查 Bilibili 登录状态（用于扫码登录）
  const checkBilibiliAuthStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/auth/status');
      const data = await response.json();
      
      console.log('Auth status response:', data);
      
      // 新的响应格式: { code: 200, data: { bilibili_connected, bilibili_user } }
      if (data.code === 200 && data.data?.bilibili_connected && data.data?.bilibili_user) {
        console.log('Bilibili user is connected:', data.data.bilibili_user);
        setBilibiliUser({
          id: data.data.bilibili_user.mid,
          uid: data.data.bilibili_user.mid,
          name: data.data.bilibili_user.name,
          mid: data.data.bilibili_user.mid,
          avatar: data.data.bilibili_user.avatar,
        });
      } else {
        console.log('Bilibili not connected');
        setBilibiliUser(null);
      }
    } catch (error) {
      console.error('检查 Bilibili 登录状态失败:', error);
    }
  }, []);

  // 初始化：等待 Firebase 认证完成，然后检查 Bilibili 状态
  useEffect(() => {
    if (isInitialized) {
      checkBilibiliAuthStatus().finally(() => setLoading(false));
    }
  }, [isInitialized, checkBilibiliAuthStatus]);

  // 计算最终用户信息（优先使用 Firebase，其次 Bilibili）
  console.log('Auth State:', { 
    hasCurrentUser: !!currentUser, 
    hasFirebaseUser: !!firebaseUser, 
    hasBilibiliUser: !!bilibiliUser,
    isInitialized,
    currentUserData: currentUser ? {
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      email: currentUser.email,
      photoURL: currentUser.photoURL
    } : null,
    firebaseUserData: firebaseUser
  });

  let user: UserInfo | null = null;

  // 优先使用 Firebase currentUser（实时认证状态）
  if (currentUser) {
    user = {
      id: currentUser.uid,
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email || 'Firebase User',
      mid: currentUser.uid,
      avatar: currentUser.photoURL || '',
    };
  }
  // 其次使用持久化的 firebaseUser
  else if (firebaseUser) {
    user = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name: firebaseUser.display_name || firebaseUser.email || 'Firebase User',
      mid: firebaseUser.uid,
      avatar: '',
    };
  }
  // 最后使用 Bilibili 用户
  else if (bilibiliUser) {
    user = bilibiliUser;
  }
  
  console.log('Final user:', user);

  const handleLoginSuccess = (userData: UserInfo) => {
    // 如果是 Bilibili 登录，更新 Bilibili 用户状态
    setBilibiliUser(userData);
  };

  const handleRefreshStatus = async () => {
    // 重新检查登录状态，用于二维码登录成功后的状态同步
    await checkBilibiliAuthStatus();
  };

  const handleLogout = async () => {
    try {
      // 退出 Firebase
      if (currentUser || firebaseUser) {
        await firebaseSignOut();
      }
      
      // 退出 Bilibili
      if (bilibiliUser) {
        await apiFetch('/auth/logout', { method: 'POST' });
        setBilibiliUser(null);
      }
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return {
    user,
    loading: loading || isLoading,
    handleLoginSuccess,
    handleRefreshStatus,
    handleLogout,
  };
}