'use client';

import { useFirebaseUserStore } from '@/store/firebaseUserStore';
import { Crown, Shield, Zap } from 'lucide-react';

export default function VIPBadge() {
  const { vipStatus, isVIP } = useFirebaseUserStore();

  if (!isVIP()) {
    return null;
  }

  const tierConfig = {
    basic: {
      icon: Shield,
      label: '基础会员',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    premium: {
      icon: Crown,
      label: '高级会员',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    enterprise: {
      icon: Zap,
      label: '企业会员',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
  };

  const tier = vipStatus?.tier || 'basic';
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.basic;
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor}`}
    >
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}
