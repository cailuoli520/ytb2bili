import axios from 'axios';
import type { 
  ApiResponse,
  FirebaseUser,
  UserProfile,
  VIPStatus,
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
} from '@/types';
import { auth } from './firebase';

// Firebase Backend API 基础URL
const FIREBASE_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8096/api/v1';

const firebaseApi = axios.create({
  baseURL: FIREBASE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加Firebase UID
firebaseApi.interceptors.request.use(
  async (config) => {
    try {
      // 从Firebase Auth获取当前用户
      const currentUser = auth?.currentUser;
      
      if (currentUser) {
        // 添加Firebase UID到请求头
        config.headers['X-Firebase-UID'] = currentUser.uid;
        
        // 可选：添加ID Token用于验证
        const idToken = await currentUser.getIdToken();
        config.headers['Authorization'] = `Bearer ${idToken}`;
      }
    } catch (error) {
      console.error('Failed to get Firebase user:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
firebaseApi.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('Firebase API Error:', error);
    
    // 处理特定错误
    if (error.response?.status === 401) {
      console.warn('Unauthorized - User may need to login');
    } else if (error.response?.status === 403) {
      console.warn('Forbidden - VIP access required');
    }
    
    return Promise.reject(error);
  }
);

// Firebase用户相关API
export const firebaseUserApi = {
  // 获取用户个人信息
  getUserProfile: (): Promise<ApiResponse<UserProfile>> => {
    return firebaseApi.get('/firebase/user/profile');
  },

  // 获取VIP状态
  getVIPStatus: (): Promise<ApiResponse<VIPStatus>> => {
    return firebaseApi.get('/firebase/user/vip-status');
  },

  // 获取用户订单列表
  getUserOrders: (limit = 20): Promise<ApiResponse<Order[]>> => {
    return firebaseApi.get(`/firebase/user/orders?limit=${limit}`);
  },
};

// 订单相关API
export const firebaseOrderApi = {
  // 创建订单
  createOrder: (data: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> => {
    return firebaseApi.post('/firebase/orders/create', data);
  },

  // 查询订单状态
  getOrderStatus: (orderNo: string): Promise<ApiResponse<Order>> => {
    return firebaseApi.get(`/firebase/orders/${orderNo}`);
  },
};

// VIP功能相关API
export const firebaseVIPApi = {
  // 获取VIP专属功能
  getVIPFeatures: (): Promise<ApiResponse<any>> => {
    return firebaseApi.get('/firebase/vip/features');
  },
};

// 健康检查
export const healthCheck = {
  checkFirebase: (): Promise<ApiResponse<any>> => {
    return firebaseApi.get('/firebase/health');
  },
};

export default firebaseApi;
