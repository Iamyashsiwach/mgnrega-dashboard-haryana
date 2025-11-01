import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePerformanceMetrics, calculateTrend } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12');

    // Find district
    const district = await prisma.district.findUnique({
      where: { code },
    });

    if (!district) {
      return NextResponse.json(
        {
          success: false,
          error: 'District not found',
        },
        { status: 404 }
      );
    }

    // Get performance data for the requested period
    const currentDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const performanceData = await prisma.monthlyPerformance.findMany({
      where: {
        districtId: district.id,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: months,
    });

    // Calculate metrics if we have data
    let metrics = null;
    let trends = null;

    if (performanceData.length > 0) {
      const latestData = performanceData[0];
      const previousData = performanceData[1];

      metrics = calculatePerformanceMetrics(latestData, previousData);

      // Calculate trends for key metrics
      trends = {
        personsWorked: calculateTrend(performanceData, 'personsWorked'),
        expenditure: calculateTrend(performanceData, 'expenditure'),
        worksCompleted: calculateTrend(performanceData, 'worksCompleted'),
        budgetUtilization: calculateTrend(performanceData, 'budgetUtilization'),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        district: {
          code: district.code,
          nameEn: district.nameEn,
          nameHi: district.nameHi,
          state: district.state,
          latitude: district.latitude,
          longitude: district.longitude,
        },
        performance: performanceData,
        metrics,
        trends,
      },
    });
  } catch (error) {
    console.error('Error fetching district data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch district data',
      },
      { status: 500 }
    );
  }
}

