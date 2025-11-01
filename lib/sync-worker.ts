import cron from 'node-cron';
import { prisma } from './prisma';
import { fetchHaryanaDistrictData, generateMockDistrictData } from './data-gov-api';
import { getAllDistricts } from './geolocation';

const SYNC_ENABLED = process.env.SYNC_ENABLED === 'true';
const SYNC_SCHEDULE = process.env.SYNC_CRON_SCHEDULE || '0 2 * * *'; // 2 AM daily by default

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  errors: string[];
  duration: number;
}

/**
 * Convert month name to month number
 */
function getMonthNumber(monthName: string): number {
  const months: Record<string, number> = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  return months[monthName] || 1;
}

/**
 * Parse financial year string to get the starting year
 */
function parseFinancialYear(finYear: string): number {
  // "2025-2026" -> 2025
  const match = finYear.match(/^(\d{4})-/);
  return match ? parseInt(match[1]) : new Date().getFullYear();
}

/**
 * Sync MGNREGA data from API to database
 */
export async function syncMGNREGAData(useMockData: boolean = false): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let recordsSynced = 0;

  console.log('[Sync] Starting MGNREGA data sync...');

  try {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    let apiData: any[] = [];

    if (useMockData) {
      // Use mock data for development/testing
      console.log('[Sync] Using mock data...');
      const districts = getAllDistricts();
      apiData = districts.map(d => generateMockDistrictData(d.code, d.nameEn));
    } else {
      // Fetch real data from API
      console.log('[Sync] Fetching data from data.gov.in API...');
      apiData = await fetchHaryanaDistrictData(year, month);
      console.log('[Sync] API Response sample:', JSON.stringify(apiData.slice(0, 2), null, 2));
    }

    console.log(`[Sync] Fetched ${apiData.length} records from API`);

    // Process each record
    for (const record of apiData) {
      try {
        // Find or create district
        let district = await prisma.district.findUnique({
          where: { code: record.district_code },
        });

        if (!district) {
          // Create district if not exists
          const districtInfo = getAllDistricts().find(d => d.code === record.district_code);
          if (!districtInfo) {
            errors.push(`Unknown district code: ${record.district_code}`);
            continue;
          }

          district = await prisma.district.create({
            data: {
              code: record.district_code,
              nameEn: districtInfo.nameEn,
              nameHi: districtInfo.nameHi,
              state: 'Haryana',
              latitude: districtInfo.lat,
              longitude: districtInfo.lon,
            },
          });
        }

        // Convert month name to number and parse financial year
        const recordMonth = typeof record.month === 'string' 
          ? getMonthNumber(record.month) 
          : (record.month || month);
        const recordYear = typeof record.year === 'string' 
          ? parseFinancialYear(record.year) 
          : (record.year || year);

        // Upsert monthly performance data
        await prisma.monthlyPerformance.upsert({
          where: {
            districtId_month_year: {
              districtId: district.id,
              month: recordMonth,
              year: recordYear,
            },
          },
          update: {
            jobCardsIssued: record.job_cards_issued || null,
            personsWorked: record.persons_worked || null,
            personDaysGenerated: record.person_days_generated || null,
            avgWage: record.avg_wage || null,
            worksCompleted: record.works_completed || null,
            worksOngoing: record.works_ongoing || null,
            expenditure: record.expenditure || null,
            budgetUtilization: record.budget_utilization || null,
            lastUpdated: new Date(),
          },
          create: {
            districtId: district.id,
            month: recordMonth,
            year: recordYear,
            jobCardsIssued: record.job_cards_issued || null,
            personsWorked: record.persons_worked || null,
            personDaysGenerated: record.person_days_generated || null,
            avgWage: record.avg_wage || null,
            worksCompleted: record.works_completed || null,
            worksOngoing: record.works_ongoing || null,
            expenditure: record.expenditure || null,
            budgetUtilization: record.budget_utilization || null,
          },
        });

        recordsSynced++;
      } catch (error) {
        const errorMsg = `Error processing record for ${record.district_code}: ${error}`;
        console.error(`[Sync] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Log sync result
    await prisma.aPISyncLog.create({
      data: {
        status: errors.length === 0 ? 'success' : errors.length < apiData.length ? 'partial' : 'failed',
        recordsSynced,
        errors: errors.length > 0 ? errors.join('\n') : null,
        duration,
      },
    });

    console.log(`[Sync] Completed. Synced ${recordsSynced} records in ${duration}s`);

    return {
      success: errors.length === 0,
      recordsSynced,
      errors,
      duration,
    };
  } catch (error) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const errorMsg = `Fatal sync error: ${error}`;
    console.error(`[Sync] ${errorMsg}`);

    await prisma.aPISyncLog.create({
      data: {
        status: 'failed',
        recordsSynced,
        errors: errorMsg,
        duration,
      },
    });

    return {
      success: false,
      recordsSynced: 0,
      errors: [errorMsg],
      duration,
    };
  }
}

/**
 * Sync historical data for the past N months
 */
export async function syncHistoricalData(monthsBack: number = 12, useMockData: boolean = false): Promise<void> {
  console.log(`[Sync] Starting historical data sync for ${monthsBack} months...`);

  const currentDate = new Date();

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);

    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    console.log(`[Sync] Syncing data for ${month}/${year}...`);

    try {
      let apiData: any[] = [];

      if (useMockData) {
        const districts = getAllDistricts();
        apiData = districts.map(d => ({
          ...generateMockDistrictData(d.code, d.nameEn),
          month,
          year,
        }));
      } else {
        apiData = await fetchHaryanaDistrictData(year, month);
      }

      for (const record of apiData) {
        const district = await prisma.district.findUnique({
          where: { code: record.district_code },
        });

        if (!district) continue;

        // Convert month name to number and parse financial year
        const recordMonth = typeof record.month === 'string' 
          ? getMonthNumber(record.month) 
          : (record.month || month);
        const recordYear = typeof record.year === 'string' 
          ? parseFinancialYear(record.year) 
          : (record.year || year);

        await prisma.monthlyPerformance.upsert({
          where: {
            districtId_month_year: {
              districtId: district.id,
              month: recordMonth,
              year: recordYear,
            },
          },
          update: {
            jobCardsIssued: record.job_cards_issued || null,
            personsWorked: record.persons_worked || null,
            personDaysGenerated: record.person_days_generated || null,
            avgWage: record.avg_wage || null,
            worksCompleted: record.works_completed || null,
            worksOngoing: record.works_ongoing || null,
            expenditure: record.expenditure || null,
            budgetUtilization: record.budget_utilization || null,
            lastUpdated: new Date(),
          },
          create: {
            districtId: district.id,
            month: recordMonth,
            year: recordYear,
            jobCardsIssued: record.job_cards_issued || null,
            personsWorked: record.persons_worked || null,
            personDaysGenerated: record.person_days_generated || null,
            avgWage: record.avg_wage || null,
            worksCompleted: record.works_completed || null,
            worksOngoing: record.works_ongoing || null,
            expenditure: record.expenditure || null,
            budgetUtilization: record.budget_utilization || null,
          },
        });
      }

      console.log(`[Sync] Synced ${apiData.length} records for ${month}/${year}`);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Sync] Error syncing ${month}/${year}:`, error);
    }
  }

  console.log('[Sync] Historical data sync completed');
}

/**
 * Start scheduled sync worker
 */
export function startSyncWorker(): void {
  if (!SYNC_ENABLED) {
    console.log('[Sync Worker] Sync worker is disabled');
    return;
  }

  console.log(`[Sync Worker] Starting with schedule: ${SYNC_SCHEDULE}`);

  cron.schedule(SYNC_SCHEDULE, async () => {
    console.log('[Sync Worker] Running scheduled sync...');
    await syncMGNREGAData();
  });

  console.log('[Sync Worker] Sync worker started successfully');
}

/**
 * Get recent sync logs
 */
export async function getSyncLogs(limit: number = 10) {
  return await prisma.aPISyncLog.findMany({
    take: limit,
    orderBy: { syncDate: 'desc' },
  });
}

