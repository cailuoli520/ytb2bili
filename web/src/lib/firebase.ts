// Firebase配置文件
// 请在 .env.local 中配置您的Firebase项目凭据

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Firebase配置接口
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// 从环境变量获取Firebase配置
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 初始化Firebase应用
let app: FirebaseApp;
let auth: Auth;

if (typeof window !== 'undefined') {
  // 避免重复初始化
  if (!getApps().length) {
    console.log('Initializing Firebase app...');
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  console.log('Firebase auth initialized:', !!auth);
} else {
  console.log('Firebase skipped: not in browser environment');
}

// @ts-ignore - 在服务器端可能未定义，但客户端组件会处理
export { app, auth };
export default firebaseConfig;
