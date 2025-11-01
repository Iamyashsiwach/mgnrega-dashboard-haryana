'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface District {
  code: string;
  nameEn: string;
  nameHi: string;
  latitude: number | null;
  longitude: number | null;
}

interface DistrictMapProps {
  districts: District[];
  onDistrictSelect: (code: string) => void;
  language: 'en' | 'hi';
}

export default function DistrictMap({
  districts,
  onDistrictSelect,
  language,
}: DistrictMapProps) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const handleDistrictClick = (code: string) => {
    setSelectedDistrict(code);
    onDistrictSelect(code);
  };

  // Group districts by first letter for better organization
  const groupedDistricts = districts.reduce((acc, district) => {
    const firstLetter = district.nameEn[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(district);
    return acc;
  }, {} as Record<string, District[]>);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {districts.map((district) => (
          <button
            key={district.code}
            onClick={() => handleDistrictClick(district.code)}
            className={`p-4 md:p-6 rounded-xl border-2 transition-all min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center gap-2 ${
              selectedDistrict === district.code
                ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105'
                : 'bg-white border-gray-300 hover:border-green-500 hover:shadow-md'
            }`}
          >
            <MapPin
              size={24}
              className={selectedDistrict === district.code ? 'text-white' : 'text-green-600'}
            />
            <span className="font-semibold text-center text-sm md:text-base">
              {language === 'hi' ? district.nameHi : district.nameEn}
            </span>
          </button>
        ))}
      </div>

      {districts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MapPin size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">
            {language === 'hi' ? 'कोई जिला उपलब्ध नहीं है' : 'No districts available'}
          </p>
        </div>
      )}
    </div>
  );
}

