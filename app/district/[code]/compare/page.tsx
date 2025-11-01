'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2, Trophy } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import { translations } from '@/lib/translations';
import { formatIndianNumber } from '@/lib/analytics';

interface ComparisonData {
  district: {
    code: string;
    nameEn: string;
    nameHi: string;
  };
  comparisons: {
    [key: string]: {
      districtValue: number;
      stateAverage: number;
      percentageDifference: number;
      isAboveAverage: boolean;
      ranking: number;
      totalDistricts: number;
    };
  };
  rankings: Array<{
    code: string;
    nameEn: string;
    nameHi: string;
    personsWorked: number;
    expenditure: number;
    budgetUtilization: number;
  }>;
  totalDistricts: number;
}

export default function ComparePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    fetchComparisonData();
  }, [resolvedParams.code]);

  const fetchComparisonData = async () => {
    try {
      const response = await fetch(`/api/district/${resolvedParams.code}/compare`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || t.common.error);
      }
    } catch (err) {
      console.error('Error fetching comparison data:', err);
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
            onClick={() => router.back()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {t.common.back}
          </button>
        </div>
      </div>
    );
  }

  const ComparisonMetric = ({
    title,
    districtValue,
    stateAverage,
    percentageDifference,
    isAboveAverage,
  }: {
    title: string;
    districtValue: number;
    stateAverage: number;
    percentageDifference: number;
    isAboveAverage: boolean;
  }) => {
    const TrendIcon = isAboveAverage ? TrendingUp : percentageDifference < -5 ? TrendingDown : Minus;
    const trendColor = isAboveAverage ? 'text-green-600' : percentageDifference < -5 ? 'text-red-600' : 'text-gray-600';

    return (
      <div className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:shadow-lg transition-all">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{t.comparison.yourDistrict}</p>
            <p className="text-2xl font-bold text-gray-800">{formatIndianNumber(districtValue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t.comparison.stateAverage}</p>
            <p className="text-2xl font-bold text-gray-600">{formatIndianNumber(stateAverage)}</p>
          </div>
        </div>

        <div className={`flex items-center gap-2 ${trendColor} font-semibold`}>
          <TrendIcon size={20} />
          <span>
            {Math.abs(percentageDifference).toFixed(1)}% {isAboveAverage ? t.performance.aboveAverage : t.performance.belowAverage}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
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
        {/* Page Header */}
        <div className="bg-white rounded-xl p-6 md:p-8 mb-6 border-2 border-gray-200 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            {t.comparison.title}
          </h1>
          <p className="text-lg text-gray-600">
            {language === 'hi' ? data.district.nameHi : data.district.nameEn}
          </p>
        </div>

        {/* Ranking Badge */}
        {data.comparisons.personsWorked && (
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-6 mb-8 border-2 border-yellow-300 shadow-sm">
            <div className="flex items-center gap-4">
              <Trophy size={48} className="text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600 mb-1">{t.district.ranking}</p>
                <p className="text-3xl font-bold text-gray-800">
                  #{data.comparisons.personsWorked.ranking} <span className="text-lg font-normal text-gray-600">{t.district.outOf} {data.comparisons.personsWorked.totalDistricts} {t.district.districts}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Metrics */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {t.district.compareWithState}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {data.comparisons.personsWorked && (
            <ComparisonMetric
              title={t.metrics.personsWorked}
              {...data.comparisons.personsWorked}
            />
          )}
          {data.comparisons.expenditure && (
            <ComparisonMetric
              title={t.metrics.expenditure}
              {...data.comparisons.expenditure}
            />
          )}
          {data.comparisons.worksCompleted && (
            <ComparisonMetric
              title={t.metrics.worksCompleted}
              {...data.comparisons.worksCompleted}
            />
          )}
          {data.comparisons.budgetUtilization && (
            <ComparisonMetric
              title={t.metrics.budgetUtilization}
              {...data.comparisons.budgetUtilization}
            />
          )}
        </div>

        {/* District Rankings */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {t.comparison.rankings}
        </h2>
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {language === 'hi' ? 'रैंक' : 'Rank'}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {language === 'hi' ? 'जिला' : 'District'}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    {t.metrics.personsWorked}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    {t.metrics.expenditure}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    {t.metrics.budgetUtilization}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rankings.slice(0, 10).map((district, index) => (
                  <tr
                    key={district.code}
                    className={`border-b border-gray-200 hover:bg-gray-50 ${
                      district.code === data.district.code ? 'bg-green-50 font-semibold' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {index < 3 && <Trophy size={16} className="text-yellow-600" />}
                        <span>{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {language === 'hi' ? district.nameHi : district.nameEn}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatIndianNumber(district.personsWorked)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{formatIndianNumber(district.expenditure)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {district.budgetUtilization.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back to Dashboard Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push(`/district/${resolvedParams.code}`)}
            className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl min-h-[64px]"
          >
            {language === 'hi' ? 'डैशबोर्ड पर वापस जाएं' : 'Back to Dashboard'}
          </button>
        </div>
      </main>
    </div>
  );
}

