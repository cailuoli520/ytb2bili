import VIPPricing from '@/components/vip/VIPPricing';

export default function VIPPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <VIPPricing />
      </div>
    </div>
  );
}
