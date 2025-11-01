import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateComparativeMetrics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

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

    // Get current month/year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get latest 6 months of data for this district
    const districtData = await prisma.monthlyPerformance.findMany({
      where: {
        districtId: district.id,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6,
    });

    // Get latest data for all Haryana districts
    const allDistrictsData = await prisma.monthlyPerformance.findMany({
      where: {
        district: {
          state: 'Haryana',
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Calculate comparative metrics for key indicators
    const comparisons = {
      personsWorked: calculateComparativeMetrics(
        districtData,
        'personsWorked',
        allDistrictsData
      ),
      expenditure: calculateComparativeMetrics(
        districtData,
        'expenditure',
        allDistrictsData
      ),
      worksCompleted: calculateComparativeMetrics(
        districtData,
        'worksCompleted',
        allDistrictsData
      ),
      budgetUtilization: calculateComparativeMetrics(
        districtData,
        'budgetUtilization',
        allDistrictsData
      ),
      personDaysGenerated: calculateComparativeMetrics(
        districtData,
        'personDaysGenerated',
        allDistrictsData
      ),
    };

    // Get all districts with their latest performance for ranking
    const allDistricts = await prisma.district.findMany({
      where: { state: 'Haryana' },
      include: {
        monthlyPerformance: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 1,
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const districtsWithPerformance = allDistricts
      .filter((d: any) => d.monthlyPerformance.length > 0)
      .map((d: any) => ({
        code: d.code,
        nameEn: d.nameEn,
        nameHi: d.nameHi,
        personsWorked: d.monthlyPerformance[0].personsWorked || 0,
        expenditure: d.monthlyPerformance[0].expenditure || 0,
        budgetUtilization: d.monthlyPerformance[0].budgetUtilization || 0,
      }))
      .sort((a: any, b: any) => b.personsWorked - a.personsWorked);

    return NextResponse.json({
      success: true,
      data: {
        district: {
          code: district.code,
          nameEn: district.nameEn,
          nameHi: district.nameHi,
        },
        comparisons,
        rankings: districtsWithPerformance,
        totalDistricts: allDistricts.length,
      },
    });
  } catch (error) {
    console.error('Error fetching comparison data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comparison data',
      },
      { status: 500 }
    );
  }
}

