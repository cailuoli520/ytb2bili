import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FirebaseUser, VIPStatus, UserProfile } from '@/types';
import { auth } from '@/lib/firebase';
import { firebaseUserApi } from '@/lib/firebaseApi';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseAuthUser,
} from 'firebase/auth';

interface FirebaseUserState {
  // 状态
  currentUser: FirebaseAuthUser | null;
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  vipStatus: VIPStatus | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setCurrentUser: (user: FirebaseAuthUser | null) => void;
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setVIPStatus: (status: VIPStatus | null) => void;
  
  // 认证操作
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // 数据获取
  fetchUserProfile: () => Promise<void>;
  fetchVIPStatus: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  
  // 工具方法
  isVIP: () => boolean;
  getVIPTier: () => string | null;
  hasVIPTier: (tier: 'basic' | 'premium' | 'enterprise') => boolean;
  
  // 初始化
  initializeAuth: () => void;
}

export const useFirebaseUserStore = create<FirebaseUserState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentUser: null,
      firebaseUser: null,
      userProfile: null,
      vipStatus: null,
      isLoading: true,
      isInitialized: false,
      error: null,

      // 设置当前用户
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // 设置Firebase用户信息
      setFirebaseUser: (user) => set({ firebaseUser: user }),
      
      // 设置VIP状态
      setVIPStatus: (status) => set({ vipStatus: status }),

      // 邮箱密码登录
      signInWithEmail: async (email, password) => {
        if (!auth) {
          throw new Error('Firebase auth not initialized');
        }
        set({ isLoading: true, error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          set({ currentUser: userCredential.user });
          
          // 获取用户详细信息
          await get().fetchUserProfile();
          await get().fetchVIPStatus();
        } catch (error: any) {
          const errorMessage = error.message || 'Login failed';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // 邮箱密码注册
      signUpWithEmail: async (email, password, displayName) => {
        if (!auth) {
          throw new Error('Firebase auth not initialized');
        }
        set({ isLoading: true, error: null });
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          set({ currentUser: userCredential.user });
          
          // 获取用户信息
          await get().fetchUserProfile();
        } catch (error: any) {
          const errorMessage = error.message || 'Sign up failed';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // 退出登录
      signOut: async () => {
        if (!auth) {
          console.warn('Firebase auth not initialized');
          return;
        }
        set({ isLoading: true, error: null });
        try {
          await firebaseSignOut(auth);
          set({ 
            currentUser: null, 
            firebaseUser: null, 
            userProfile: null,
            vipStatus: null 
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Sign out failed';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // 获取用户详细信息
      fetchUserProfile: async () => {
        const { currentUser } = get();
        if (!currentUser) return;

        set({ isLoading: true, error: null });
        try {
          const response = await firebaseUserApi.getUserProfile();
          if (response.code === 200 && response.data) {
            set({ userProfile: response.data });
            
            // 同步firebaseUser信息
            const firebaseUser: FirebaseUser = {
              uid: response.data.uid,
              email: response.data.email,
              display_name: response.data.display_name,
              is_vip: response.data.vip_status?.is_vip || false,
              vip_tier: response.data.vip_status?.tier || '',
              vip_status: response.data.vip_status,
              power: response.data.power,
            };
            set({ firebaseUser });
          }
        } catch (error: any) {
          console.error('Failed to fetch user profile:', error);
          set({ error: error.message || 'Failed to fetch user profile' });
        } finally {
          set({ isLoading: false });
        }
      },

      // 获取VIP状态
      fetchVIPStatus: async () => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          const response = await firebaseUserApi.getVIPStatus();
          if (response.code === 200 && response.data) {
            set({ vipStatus: response.data });
            
            // 同步到firebaseUser
            const { firebaseUser } = get();
            if (firebaseUser) {
              set({
                firebaseUser: {
                  ...firebaseUser,
                  is_vip: response.data.is_vip,
                  vip_tier: response.data.tier,
                  vip_status: response.data,
                },
              });
            }
          }
        } catch (error: any) {
          console.error('Failed to fetch VIP status:', error);
        }
      },

      // 刷新所有用户数据
      refreshUserData: async () => {
        await Promise.all([
          get().fetchUserProfile(),
          get().fetchVIPStatus(),
        ]);
      },

      // 检查是否为VIP
      isVIP: () => {
        const { vipStatus } = get();
        return vipStatus?.is_vip || false;
      },

      // 获取VIP等级
      getVIPTier: () => {
        const { vipStatus } = get();
        return vipStatus?.tier || null;
      },

      // 检查是否拥有特定VIP等级
      hasVIPTier: (tier) => {
        const tierLevels: Record<string, number> = {
          basic: 1,
          premium: 2,
          enterprise: 3,
        };
        
        const currentTier = get().getVIPTier();
        if (!currentTier) return false;
        
        const currentLevel = tierLevels[currentTier] || 0;
        const requiredLevel = tierLevels[tier] || 0;
        
        return currentLevel >= requiredLevel;
      },

      // 初始化认证监听
      initializeAuth: () => {
        if (typeof window === 'undefined') {
          console.log('Skip auth init: not in browser');
          return;
        }
        
        if (!auth) {
          console.error('Firebase auth not initialized');
          set({ isInitialized: true, isLoading: false });
          return;
        }

        console.log('Initializing Firebase auth listener...');
        onAuthStateChanged(auth, async (user) => {
          console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
          set({ currentUser: user, isLoading: true });
          
          if (user) {
            // 用户已登录，获取详细信息
            try {
              await get().fetchUserProfile();
              await get().fetchVIPStatus();
            } catch (error) {
              console.error('Failed to fetch user data on auth change:', error);
            }
          } else {
            // 用户未登录，清除数据
            set({ 
              firebaseUser: null, 
              userProfile: null,
              vipStatus: null 
            });
          }
          
          // 标记初始化完成
          set({ isInitialized: true, isLoading: false });
        });
      },
    }),
    {
      name: 'firebase-user-storage',
      partialize: (state) => ({
        // 只持久化部分状态
        firebaseUser: state.firebaseUser,
        vipStatus: state.vipStatus,
      }),
    }
  )
);

// 自动初始化
if (typeof window !== 'undefined') {
  useFirebaseUserStore.getState().initializeAuth();
}
