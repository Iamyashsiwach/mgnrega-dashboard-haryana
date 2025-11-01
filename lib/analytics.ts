import { MonthlyPerformance } from '@prisma/client';

export interface PerformanceMetrics {
  employmentRate: number;
  utilizationScore: number;
  efficiencyScore: number;
  trendDirection: 'up' | 'down' | 'stable';
  performanceRating: 'good' | 'average' | 'needs_improvement';
}

export interface ComparativeMetrics {
  districtValue: number;
  stateAverage: number;
  percentageDifference: number;
  isAboveAverage: boolean;
  ranking: number;
  totalDistricts: number;
}

/**
 * Calculate performance metrics for a district
 */
export function calculatePerformanceMetrics(
  currentData: MonthlyPerformance,
  previousData?: MonthlyPerformance
): PerformanceMetrics {
  // Employment rate: persons worked / job cards issued
  const employmentRate = currentData.jobCardsIssued
    ? ((currentData.personsWorked || 0) / currentData.jobCardsIssued) * 100
    : 0;

  // Utilization score based on budget utilization
  const utilizationScore = currentData.budgetUtilization || 0;

  // Efficiency score: composite of multiple factors
  const efficiencyScore = calculateEfficiencyScore(currentData);

  // Trend direction
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (previousData) {
    const prevEfficiency = calculateEfficiencyScore(previousData);
    if (efficiencyScore > prevEfficiency + 5) {
      trendDirection = 'up';
    } else if (efficiencyScore < prevEfficiency - 5) {
      trendDirection = 'down';
    }
  }

  // Performance rating
  let performanceRating: 'good' | 'average' | 'needs_improvement' = 'average';
  if (efficiencyScore >= 75 && utilizationScore >= 80) {
    performanceRating = 'good';
  } else if (efficiencyScore < 50 || utilizationScore < 60) {
    performanceRating = 'needs_improvement';
  }

  return {
    employmentRate,
    utilizationScore,
    efficiencyScore,
    trendDirection,
    performanceRating,
  };
}

/**
 * Calculate efficiency score (0-100)
 */
function calculateEfficiencyScore(data: MonthlyPerformance): number {
  const weights = {
    budgetUtilization: 0.3,
    employmentRate: 0.25,
    personDaysPerWorker: 0.25,
    completionRate: 0.2,
  };

  // Budget utilization (0-100)
  const budgetScore = data.budgetUtilization || 0;

  // Employment rate (0-100)
  const employmentScore = data.jobCardsIssued
    ? Math.min(((data.personsWorked || 0) / data.jobCardsIssued) * 100, 100)
    : 0;

  // Person days per worker (normalized, assume ideal is 100 days/year = 8.33/month)
  const personDaysPerWorker = data.personsWorked
    ? (data.personDaysGenerated || 0) / data.personsWorked
    : 0;
  const personDaysScore = Math.min((personDaysPerWorker / 8.33) * 100, 100);

  // Completion rate
  const totalWorks = (data.worksCompleted || 0) + (data.worksOngoing || 0);
  const completionScore = totalWorks > 0
    ? ((data.worksCompleted || 0) / totalWorks) * 100
    : 0;

  // Weighted average
  const efficiencyScore =
    budgetScore * weights.budgetUtilization +
    employmentScore * weights.employmentRate +
    personDaysScore * weights.personDaysPerWorker +
    completionScore * weights.completionRate;

  return Math.round(efficiencyScore);
}

/**
 * Calculate comparative metrics against state average
 */
export function calculateComparativeMetrics(
  districtData: MonthlyPerformance[],
  metricKey: keyof MonthlyPerformance,
  allDistrictsData: MonthlyPerformance[]
): ComparativeMetrics {
  // Get district value (average if multiple months)
  const districtValue = calculateAverage(districtData, metricKey);

  // Calculate state average
  const stateAverage = calculateAverage(allDistrictsData, metricKey);

  // Percentage difference
  const percentageDifference = stateAverage !== 0
    ? ((districtValue - stateAverage) / stateAverage) * 100
    : 0;

  // Is above average
  const isAboveAverage = districtValue >= stateAverage;

  // Calculate ranking (group by district, then rank)
  const districtAverages = new Map<string, number>();
  const districtGroups = groupBy(allDistrictsData, 'districtId');

  for (const [districtId, data] of districtGroups.entries()) {
    districtAverages.set(districtId, calculateAverage(data, metricKey));
  }

  const sortedDistricts = Array.from(districtAverages.entries())
    .sort((a, b) => b[1] - a[1]);

  const districtId = districtData[0]?.districtId;
  const ranking = sortedDistricts.findIndex(([id]) => id === districtId) + 1;

  return {
    districtValue,
    stateAverage,
    percentageDifference: Math.round(percentageDifference * 10) / 10,
    isAboveAverage,
    ranking,
    totalDistricts: districtAverages.size,
  };
}

/**
 * Calculate trend over time
 */
export function calculateTrend(data: MonthlyPerformance[], metricKey: keyof MonthlyPerformance) {
  if (data.length < 2) {
    return { trend: 'stable', changePercent: 0 };
  }

  // Sort by date (year, month)
  const sortedData = [...data].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  const values = sortedData.map(d => Number(d[metricKey]) || 0);
  const firstValue = values[0];
  const lastValue = values[values.length - 1];

  const changePercent = firstValue !== 0
    ? ((lastValue - firstValue) / firstValue) * 100
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (changePercent > 5) trend = 'up';
  else if (changePercent < -5) trend = 'down';

  return {
    trend,
    changePercent: Math.round(changePercent * 10) / 10,
    values,
  };
}

/**
 * Helper: Calculate average of a metric
 */
function calculateAverage(data: MonthlyPerformance[], metricKey: keyof MonthlyPerformance): number {
  if (data.length === 0) return 0;

  const sum = data.reduce((acc, item) => {
    const value = item[metricKey];
    return acc + (typeof value === 'number' ? value : 0);
  }, 0);

  return sum / data.length;
}

/**
 * Helper: Group array by key
 */
function groupBy<T>(array: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of array) {
    const keyValue = String(item[key]);
    if (!map.has(keyValue)) {
      map.set(keyValue, []);
    }
    map.get(keyValue)!.push(item);
  }

  return map;
}

/**
 * Format numbers for display (Indian numbering system)
 */
export function formatIndianNumber(num: number): string {
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) {
    return `${(num / 100000).toFixed(2)} L`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)} K`;
  }
  return num.toString();
}

/**
 * Get month name in English and Hindi
 */
export function getMonthName(month: number, language: 'en' | 'hi' = 'en'): string {
  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthsHi = [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
  ];

  if (month < 1 || month > 12) return '';
  return language === 'hi' ? monthsHi[month - 1] : monthsEn[month - 1];
}

