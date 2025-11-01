'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, Info } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import DistrictMap from '@/components/DistrictMap';
import { translations } from '@/lib/translations';

interface District {
  code: string;
  nameEn: string;
  nameHi: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

export default function Home() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    try {
      const response = await fetch('/api/districts');
      const data = await response.json();

      if (data.success) {
        setDistricts(data.data);
      } else {
        setError(t.common.error);
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  const handleDistrictSelect = (code: string) => {
    router.push(`/district/${code}`);
  };

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      alert(language === 'hi' 
        ? 'आपका ब्राउज़र स्थान का पता लगाने का समर्थन नहीं करता है' 
        : 'Your browser does not support geolocation');
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch('/api/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await response.json();

          if (data.success && data.data.inHaryana && data.data.districtCode) {
            router.push(`/district/${data.data.districtCode}`);
          } else {
            alert(language === 'hi'
              ? 'आप हरियाणा के बाहर हैं। कृपया अपना जिला मैन्युअल रूप से चुनें।'
              : 'You are outside Haryana. Please select your district manually.');
          }
        } catch (err) {
          console.error('Location detection error:', err);
          alert(language === 'hi'
            ? 'स्थान का पता लगाने में विफल'
            : 'Failed to detect location');
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert(language === 'hi'
          ? 'स्थान की अनुमति अस्वीकृत। कृपया अपना जिला मैन्युअल रूप से चुनें।'
          : 'Location permission denied. Please select your district manually.');
        setDetectingLocation(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-green-700">
              {t.home.title}
          </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {t.common.tagline}
            </p>
          </div>
          <LanguageToggle onLanguageChange={setLanguage} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {t.home.subtitle}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            {t.home.selectPrompt}
          </p>
        </div>

        {/* Auto-detect Location Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleAutoDetect}
            disabled={detectingLocation}
            className="flex items-center gap-3 px-6 md:px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[64px]"
          >
            {detectingLocation ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>{language === 'hi' ? 'पता लगाया जा रहा है...' : 'Detecting...'}</span>
              </>
            ) : (
              <>
                <MapPin size={24} />
                <span>{t.common.autoDetect}</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center mb-8">
          <p className="text-gray-500">
            {language === 'hi' ? 'या नीचे से अपना जिला चुनें' : 'Or select your district below'}
          </p>
        </div>

        {/* Districts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-green-600" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-600">
            <p className="text-xl">{error}</p>
          </div>
        ) : (
          <DistrictMap
            districts={districts}
            onDistrictSelect={handleDistrictSelect}
            language={language}
          />
        )}

        {/* About MGNREGA Section */}
        <div className="mt-16 bg-white rounded-xl p-6 md:p-8 border-2 border-gray-200 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <Info className="text-green-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                {t.home.aboutMgnrega}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.aboutText}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            {language === 'hi'
              ? '© 2025 मनरेगा डैशबोर्ड हरियाणा। सभी अधिकार सुरक्षित।'
              : '© 2025 MGNREGA Dashboard Haryana. All rights reserved.'}
          </p>
          <p className="text-xs mt-2 text-gray-400">
            {language === 'hi'
              ? 'डेटा स्रोत: data.gov.in'
              : 'Data Source: data.gov.in'}
          </p>
        </div>
      </footer>
    </div>
  );
}
