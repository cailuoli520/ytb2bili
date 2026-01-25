'use client';

import { useState } from 'react';
import { useFirebaseUserStore } from '@/store/firebaseUserStore';
import { firebaseOrderApi } from '@/lib/firebaseApi';
import { Crown, Check, Loader2 } from 'lucide-react';
import type { VIPProduct, CreateOrderRequest } from '@/types';

// VIP产品配置
const VIP_PRODUCTS: VIPProduct[] = [
  {
    id: 'vip_basic_monthly',
    name: '基础会员',
    tier: 'basic',
    plan: 'monthly',
    price: 9.9,
    duration_days: 30,
    features: [
      '视频上传数量：10个/天',
      '视频最大时长：30分钟',
      '最高分辨率：1080P',
      'AI字幕生成',
      '基础翻译服务',
      '邮件支持',
    ],
  },
  {
    id: 'vip_premium_monthly',
    name: '高级会员',
    tier: 'premium',
    plan: 'monthly',
    price: 29.9,
    original_price: 39.9,
    duration_days: 30,
    popular: true,
    features: [
      '视频上传数量：50个/天',
      '视频最大时长：2小时',
      '最高分辨率：4K',
      'AI字幕生成（高级）',
      '多语言翻译',
      'AI元数据生成',
      '批量上传',
      '优先处理队列',
      '在线客服支持',
    ],
  },
  {
    id: 'vip_enterprise_monthly',
    name: '企业会员',
    tier: 'enterprise',
    plan: 'monthly',
    price: 99.9,
    duration_days: 30,
    features: [
      '视频上传数量：无限制',
      '视频最大时长：无限制',
      '最高分辨率：8K',
      '所有高级功能',
      'API访问权限',
      '自定义水印',
      '白标服务',
      '专属客户经理',
      '7×24小时技术支持',
      'SLA保证',
    ],
  },
];

interface VIPPricingProps {
  onSuccess?: () => void;
}

export default function VIPPricing({ onSuccess }: VIPPricingProps) {
  const { currentUser, firebaseUser, vipStatus, isVIP, hasVIPTier, isInitialized } = useFirebaseUserStore();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (product: VIPProduct) => {
    if (!currentUser && !firebaseUser) {
      setError('请先登录');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedProduct(product.id);

    try {
      const orderRequest: CreateOrderRequest = {
        product_id: product.id,
        pay_way: 'mock', // 测试环境使用mock，生产环境可选 alipay, wechat, paypal
        pay_type: 'h5',
        return_url: window.location.origin + '/vip/payment/success',
        callback_url: window.location.origin + '/api/payment/callback',
      };

      const response = await firebaseOrderApi.createOrder(orderRequest);
      
      if (response.code === 0) {
        console.log('Order created:', response.data);
        
        // 这里可以跳转到支付页面或显示支付二维码
        // 暂时只显示成功消息
        alert(`订单创建成功！\n订单号：${response.data.order_no}\n金额：¥${response.data.amount}`);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(response.message || '创建订单失败');
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.response?.data?.message || err.message || '购买失败，请稍后重试');
    } finally {
      setIsLoading(false);
      setSelectedProduct(null);
    }
  };

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          选择适合您的会员方案
        </h2>
        <p className="text-lg text-gray-600">
          解锁更多功能，提升工作效率
        </p>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {VIP_PRODUCTS.map((product) => {
          const isCurrentTier = vipStatus?.tier === product.tier;
          const canUpgrade = !isVIP() || !hasVIPTier(product.tier);
          
          return (
            <div
              key={product.id}
              className={`relative rounded-2xl border-2 p-8 ${
                product.popular
                  ? 'border-purple-500 shadow-xl scale-105'
                  : 'border-gray-200'
              } ${isCurrentTier ? 'bg-gray-50' : 'bg-white'}`}
            >
              {product.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1 bg-purple-500 text-white text-sm font-medium rounded-full">
                    <Crown className="w-4 h-4" />
                    推荐
                  </span>
                </div>
              )}

              {isCurrentTier && (
                <div className="absolute -top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
                    <Check className="w-4 h-4" />
                    当前方案
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h3>
                <div className="flex items-end justify-center gap-1">
                  {product.original_price && (
                    <span className="text-lg text-gray-400 line-through">
                      ¥{product.original_price}
                    </span>
                  )}
                  <span className="text-4xl font-bold text-gray-900">
                    ¥{product.price}
                  </span>
                  <span className="text-gray-600 mb-1">/月</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(product)}
                disabled={isLoading || isCurrentTier}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  isCurrentTier
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : product.popular
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } ${
                  isLoading && selectedProduct === product.id
                    ? 'opacity-50 cursor-wait'
                    : ''
                }`}
              >
                {isLoading && selectedProduct === product.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    处理中...
                  </span>
                ) : isCurrentTier ? (
                  '当前方案'
                ) : canUpgrade ? (
                  '立即购买'
                ) : (
                  '已拥有更高等级'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {!currentUser && (
        <div className="text-center mt-8">
          <p className="text-gray-600">
            还没有账号？
            <a href="/auth/signup" className="text-purple-600 hover:text-purple-700 font-medium ml-1">
              立即注册
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
