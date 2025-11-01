'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, IndianRupee, Briefcase, TrendingUp, Loader2, BarChart3, Award } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import PerformanceCard from '@/components/PerformanceCard';
import TrendChart from '@/components/TrendChart';
import { translations } from '@/lib/translations';
import { getMonthName } from '@/lib/analytics';

interface DistrictData {
  district: {
    code: string;
    nameEn: string;
    nameHi: string;
    state: string;
  };
  performance: Array<{
    month: number;
    year: number;
    personsWorked: number | null;
    jobCardsIssued: number | null;
    personDaysGenerated: number | null;
    avgWage: number | null;
    worksCompleted: number | null;
    worksOngoing: number | null;
    expenditure: number | null;
    budgetUtilization: number | null;
  }>;
  metrics: {
    employmentRate: number;
    utilizationScore: number;
    efficiencyScore: number;
    trendDirection: 'up' | 'down' | 'stable';
    performanceRating: 'good' | 'average' | 'needs_improvement';
  } | null;
  trends: any;
}

export default function DistrictPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [data, setData] = useState<DistrictData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    fetchDistrictData();
  }, [resolvedParams.code]);

  const fetchDistrictData = async () => {
    try {
      const response = await fetch(`/api/district/${resolvedParams.code}?months=12`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || t.common.error);
      }
    } catch (err) {
      console.error('Error fetching district data:', err);
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={64} className="animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{error || t.common.error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {t.common.back}
          </button>
        </div>
      </div>
    );
  }

  const latestPerformance = data.performance[0];
  const performanceRatingColors = {
    good: 'bg-green-100 text-green-700 border-green-300',
    average: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    needs_improvement: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold min-h-[48px] px-3"
            >
              <ArrowLeft size={20} />
              <span className="hidden md:inline">{t.common.back}</span>
            </button>
            <LanguageToggle onLanguageChange={setLanguage} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* District Header */}
        <div className="bg-white rounded-xl p-6 md:p-8 mb-6 border-2 border-gray-200 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            {language === 'hi' ? data.district.nameHi : data.district.nameEn}
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {latestPerformance && (
              <>
                {t.district.currentMonth} - {getMonthName(latestPerformance.month, language)} {latestPerformance.year}
              </>
            )}
          </p>

          {/* Performance Rating */}
          {data.metrics && (
            <div className="flex flex-wrap items-center gap-4">
              <div className={`inline-block px-4 py-2 rounded-lg border-2 font-semibold ${performanceRatingColors[data.metrics.performanceRating]}`}>
                <Award className="inline mr-2" size={20} />
                {t.performance[data.metrics.performanceRating]}
              </div>
              <div className="inline-block px-4 py-2 rounded-lg border-2 bg-blue-100 text-blue-700 border-blue-300 font-semibold">
                {t.metrics.efficiencyScore}: {data.metrics.efficiencyScore}/100
              </div>
            </div>
          )}
        </div>

        {/* Key Metrics Cards */}
        {latestPerformance && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t.district.keyMetrics}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <PerformanceCard
                title={t.metrics.personsWorked}
                value={latestPerformance.personsWorked}
                icon={Users}
                color="green"
                trend={data.trends?.personsWorked?.trend}
                trendValue={data.trends?.personsWorked?.changePercent}
                tooltip={t.tooltips.personsWorked}
              />
              <PerformanceCard
                title={t.metrics.expenditure}
                value={latestPerformance.expenditure}
                unit="₹"
                icon={IndianRupee}
                color="blue"
                trend={data.trends?.expenditure?.trend}
                trendValue={data.trends?.expenditure?.changePercent}
                tooltip={t.tooltips.personsWorked}
              />
              <PerformanceCard
                title={t.metrics.worksCompleted}
                value={latestPerformance.worksCompleted}
                icon={Briefcase}
                color="purple"
                trend={data.trends?.worksCompleted?.trend}
                trendValue={data.trends?.worksCompleted?.changePercent}
                tooltip={t.tooltips.worksCompleted}
              />
              <PerformanceCard
                title={t.metrics.budgetUtilization}
                value={latestPerformance.budgetUtilization}
                icon={TrendingUp}
                color="orange"
                isPercentage
                trend={data.trends?.budgetUtilization?.trend}
                trendValue={data.trends?.budgetUtilization?.changePercent}
                tooltip={t.tooltips.budgetUtilization}
              />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <PerformanceCard
                title={t.metrics.jobCardsIssued}
                value={latestPerformance.jobCardsIssued}
                icon={Users}
                color="blue"
                tooltip={t.tooltips.jobCardsIssued}
              />
              <PerformanceCard
                title={t.metrics.personDaysGenerated}
                value={latestPerformance.personDaysGenerated}
                icon={BarChart3}
                color="green"
                tooltip={t.tooltips.personDaysGenerated}
              />
              <PerformanceCard
                title={t.metrics.avgWage}
                value={latestPerformance.avgWage}
                unit="₹/day"
                icon={IndianRupee}
                color="purple"
                tooltip={t.tooltips.avgWage}
              />
            </div>
          </>
        )}

        {/* Historical Trends */}
        {data.performance.length > 1 && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t.district.historicalTrend}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <TrendChart
                data={data.performance.map(p => ({
                  month: p.month,
                  year: p.year,
                  value: p.personsWorked,
                }))}
                title={t.metrics.personsWorked}
                type="line"
                color="#16a34a"
                language={language}
              />
              <TrendChart
                data={data.performance.map(p => ({
                  month: p.month,
                  year: p.year,
                  value: p.expenditure,
                }))}
                title={t.metrics.expenditure}
                type="bar"
                color="#2563eb"
                language={language}
              />
              <TrendChart
                data={data.performance.map(p => ({
                  month: p.month,
                  year: p.year,
                  value: p.worksCompleted,
                }))}
                title={t.metrics.worksCompleted}
                type="bar"
                color="#9333ea"
                language={language}
              />
              <TrendChart
                data={data.performance.map(p => ({
                  month: p.month,
                  year: p.year,
                  value: p.budgetUtilization,
                }))}
                title={t.metrics.budgetUtilization}
                type="line"
                color="#f97316"
                language={language}
              />
            </div>
          </>
        )}

        {/* Compare Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push(`/district/${resolvedParams.code}/compare`)}
            className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl min-h-[64px]"
          >
            {t.district.compareWithState}
          </button>
        </div>
      </main>
    </div>
  );
}

