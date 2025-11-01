import axios from 'axios';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  districtCode: string | null;
  districtName: string | null;
  state: string | null;
  confidence: number;
}

// Haryana districts with API district codes and approximate boundaries (centroids)
// District codes match the data.gov.in MGNREGA API
const HARYANA_DISTRICTS = [
  { code: '1201', nameEn: 'Ambala', nameHi: 'अंबाला', lat: 30.3782, lon: 76.7767 },
  { code: '1213', nameEn: 'Bhiwani', nameHi: 'भिवानी', lat: 28.7930, lon: 76.1395 },
  { code: '1222', nameEn: 'Charkhi Dadri', nameHi: 'चरखी दादरी', lat: 28.5917, lon: 76.2709 },
  { code: '1209', nameEn: 'Faridabad', nameHi: 'फरीदाबाद', lat: 28.4089, lon: 77.3178 },
  { code: '1216', nameEn: 'Fatehabad', nameHi: 'फतेहाबाद', lat: 29.5151, lon: 75.4550 },
  { code: '1210', nameEn: 'Gurugram', nameHi: 'गुरुग्राम', lat: 28.4595, lon: 77.0266 },
  { code: '1215', nameEn: 'Hisar', nameHi: 'हिसार', lat: 29.1492, lon: 75.7217 },
  { code: '1214', nameEn: 'Jhajjar', nameHi: 'झज्जर', lat: 28.6063, lon: 76.6565 },
  { code: '1207', nameEn: 'Jind', nameHi: 'जींद', lat: 29.3157, lon: 76.3160 },
  { code: '1204', nameEn: 'Kaithal', nameHi: 'कैथल', lat: 29.8012, lon: 76.3997 },
  { code: '1205', nameEn: 'Karnal', nameHi: 'करनाल', lat: 29.6857, lon: 76.9905 },
  { code: '1203', nameEn: 'Kurukshetra', nameHi: 'कुरुक्षेत्र', lat: 29.9695, lon: 76.8783 },
  { code: '1212', nameEn: 'Mahendragarh', nameHi: 'महेंद्रगढ़', lat: 28.2830, lon: 76.1500 },
  { code: '1221', nameEn: 'Nuh', nameHi: 'नूंह', lat: 28.1024, lon: 77.0030 },
  { code: '1220', nameEn: 'Palwal', nameHi: 'पलवल', lat: 28.1444, lon: 77.3260 },
  { code: '1219', nameEn: 'Panchkula', nameHi: 'पंचकुला', lat: 30.6942, lon: 76.8534 },
  { code: '1206', nameEn: 'Panipat', nameHi: 'पानीपत', lat: 29.3909, lon: 76.9635 },
  { code: '1211', nameEn: 'Rewari', nameHi: 'रेवाड़ी', lat: 28.1989, lon: 76.6189 },
  { code: '1208', nameEn: 'Rohtak', nameHi: 'रोहतक', lat: 28.8955, lon: 76.6066 },
  { code: '1217', nameEn: 'Sirsa', nameHi: 'सिरसा', lat: 29.5353, lon: 75.0288 },
  { code: '1218', nameEn: 'Sonipat', nameHi: 'सोनीपत', lat: 28.9931, lon: 77.0151 },
  { code: '1202', nameEn: 'Yamunanagar', nameHi: 'यमुनानगर', lat: 30.1290, lon: 77.2674 },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find nearest Haryana district based on coordinates
 */
export function findNearestDistrict(coordinates: Coordinates): LocationResult {
  let nearestDistrict = HARYANA_DISTRICTS[0];
  let minDistance = Infinity;

  for (const district of HARYANA_DISTRICTS) {
    const distance = calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      district.lat,
      district.lon
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestDistrict = district;
    }
  }

  // Calculate confidence based on distance (closer = higher confidence)
  // Confidence drops to 0 at 100km distance
  const confidence = Math.max(0, Math.min(100, 100 - minDistance));

  return {
    districtCode: nearestDistrict.code,
    districtName: nearestDistrict.nameEn,
    state: 'Haryana',
    confidence: Math.round(confidence),
  };
}

/**
 * Reverse geocode using Nominatim (OpenStreetMap)
 */
export async function reverseGeocode(coordinates: Coordinates): Promise<LocationResult> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat: coordinates.latitude,
        lon: coordinates.longitude,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'MGNREGA-Dashboard/1.0',
      },
      timeout: 5000,
    });

    const data = response.data;
    const address = data.address || {};

    // Check if location is in Haryana
    const state = address.state || '';
    if (!state.toLowerCase().includes('haryana')) {
      return {
        districtCode: null,
        districtName: null,
        state: state || null,
        confidence: 0,
      };
    }

    // Extract district name
    const districtName = address.county || address.state_district || '';

    // Match with our Haryana districts
    const matchedDistrict = HARYANA_DISTRICTS.find(
      d => d.nameEn.toLowerCase() === districtName.toLowerCase()
    );

    if (matchedDistrict) {
      return {
        districtCode: matchedDistrict.code,
        districtName: matchedDistrict.nameEn,
        state: 'Haryana',
        confidence: 90,
      };
    }

    // Fallback to nearest district
    return findNearestDistrict(coordinates);
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    // Fallback to nearest district calculation
    return findNearestDistrict(coordinates);
  }
}

/**
 * Get all Haryana districts
 */
export function getAllDistricts() {
  return HARYANA_DISTRICTS;
}

/**
 * Get district by code
 */
export function getDistrictByCode(code: string) {
  return HARYANA_DISTRICTS.find(d => d.code === code);
}

/**
 * Validate if coordinates are within Haryana boundaries (approximate)
 */
export function isInHaryana(coordinates: Coordinates): boolean {
  const { latitude, longitude } = coordinates;

  // Approximate bounding box for Haryana
  const bounds = {
    north: 30.93,
    south: 27.66,
    east: 77.57,
    west: 74.45,
  };

  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

