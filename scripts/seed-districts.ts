import { PrismaClient } from '@prisma/client';
import { getAllDistricts } from '../lib/geolocation';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Haryana districts...');

  const districts = getAllDistricts();

  for (const district of districts) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: {
        nameEn: district.nameEn,
        nameHi: district.nameHi,
        latitude: district.lat,
        longitude: district.lon,
      },
      create: {
        code: district.code,
        nameEn: district.nameEn,
        nameHi: district.nameHi,
        state: 'Haryana',
        latitude: district.lat,
        longitude: district.lon,
      },
    });

    console.log(`✓ Seeded district: ${district.nameEn} (${district.nameHi})`);
  }

  console.log(`\nSuccessfully seeded ${districts.length} districts!`);
}

main()
  .catch((e) => {
    console.error('Error seeding districts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

