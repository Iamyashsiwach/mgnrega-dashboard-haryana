import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Get some stats
    const [districtCount, performanceCount, lastSync] = await Promise.all([
      prisma.district.count(),
      prisma.monthlyPerformance.count(),
      prisma.aPISyncLog.findFirst({
        orderBy: { syncDate: 'desc' },
      }),
    ]);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      stats: {
        districts: districtCount,
        performanceRecords: performanceCount,
        lastSync: lastSync?.syncDate || null,
        lastSyncStatus: lastSync?.status || null,
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      },
      { status: 503 }
    );
  }
}

