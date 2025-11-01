import { NextRequest, NextResponse } from 'next/server';
import { syncMGNREGAData, syncHistoricalData } from '@/lib/sync-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for sync operations

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'current', useMockData = false, monthsBack = 12 } = body;

    console.log(`[API] Starting ${type} sync (mockData: ${useMockData})...`);

    if (type === 'historical') {
      await syncHistoricalData(monthsBack, useMockData);
      return NextResponse.json({
        success: true,
        message: `Historical data sync completed for ${monthsBack} months`,
      });
    } else {
      const result = await syncMGNREGAData(useMockData);
      return NextResponse.json({
        success: result.success,
        recordsSynced: result.recordsSynced,
        errors: result.errors,
        duration: result.duration,
      });
    }
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger sync',
    endpoints: {
      current: 'POST /api/sync { "type": "current", "useMockData": false }',
      historical: 'POST /api/sync { "type": "historical", "monthsBack": 12, "useMockData": false }',
    },
  });
}

