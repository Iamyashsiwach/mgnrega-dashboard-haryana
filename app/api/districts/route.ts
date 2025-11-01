import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get all districts with their latest performance data
    const districts = await prisma.district.findMany({
      include: {
        monthlyPerformance: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 1,
        },
      },
      orderBy: {
        nameEn: 'asc',
      },
    });

    // Format response
    const formattedDistricts = districts.map(district => ({
      code: district.code,
      nameEn: district.nameEn,
      nameHi: district.nameHi,
      state: district.state,
      latitude: district.latitude,
      longitude: district.longitude,
      latestData: district.monthlyPerformance[0] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedDistricts,
      count: formattedDistricts.length,
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch districts',
      },
      { status: 500 }
    );
  }
}

