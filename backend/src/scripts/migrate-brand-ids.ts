import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateBrandIds() {
  console.log('Checking for engagement items without brandId...');

  // Count items without brandId
  const countWithoutBrand = await prisma.engagementItem.count({
    where: { brandId: null }
  });

  if (countWithoutBrand === 0) {
    console.log('All engagement items already have brandId assigned.');
    return;
  }

  console.log(`Found ${countWithoutBrand} engagement items without brandId.`);

  // Find Default Brand
  let brand = await prisma.brand.findFirst({
    where: { name: 'Default Brand' }
  });

  // If no Default Brand, use the first brand
  if (!brand) {
    brand = await prisma.brand.findFirst({
      orderBy: { createdAt: 'asc' }
    });
  }

  if (!brand) {
    console.log('No brands found in database. Cannot assign brandId.');
    return;
  }

  console.log(`Assigning items to brand: ${brand.name} (${brand.id})`);

  // Update all engagement items without brandId
  const result = await prisma.engagementItem.updateMany({
    where: { brandId: null },
    data: { brandId: brand.id }
  });

  console.log(`Successfully assigned brandId to ${result.count} engagement items.`);
}

migrateBrandIds()
  .then(() => {
    console.log('Migration complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
