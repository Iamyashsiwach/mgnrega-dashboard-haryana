import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode, isInHaryana } from '@/lib/geolocation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        {
          success: false,
          error: 'Latitude and longitude are required',
        },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid coordinates',
        },
        { status: 400 }
      );
    }

    const coordinates = { latitude, longitude };

    // Check if location is in Haryana
    const inHaryana = isInHaryana(coordinates);

    if (!inHaryana) {
      return NextResponse.json({
        success: true,
        data: {
          inHaryana: false,
          message: 'Location is outside Haryana',
        },
      });
    }

    // Reverse geocode to find district
    const result = await reverseGeocode(coordinates);

    return NextResponse.json({
      success: true,
      data: {
        inHaryana: true,
        districtCode: result.districtCode,
        districtName: result.districtName,
        confidence: result.confidence,
      },
    });
  } catch (error) {
    console.error('Error processing location:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process location',
      },
      { status: 500 }
    );
  }
}

