import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create a default brand
  const brand = await prisma.brand.upsert({
    where: { slug: 'default-brand' },
    update: {},
    create: {
      name: 'Default Brand',
      slug: 'default-brand',
      description: 'Default brand for testing',
      toneOfVoice: 'Friendly and helpful',
      messagingStrategy: 'Value-first approach',
      goals: ['Build community', 'Share knowledge'],
      targetAudience: 'General consumers',
    },
  });
  console.log('Created brand:', brand.name);

  // Add admin as brand member
  await prisma.brandMember.upsert({
    where: {
      brandId_userId: {
        brandId: brand.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      brandId: brand.id,
      userId: admin.id,
      role: 'owner',
    },
  });
  console.log('Added admin as brand owner');

  // Create sample persona linked to brand
  const persona = await prisma.persona.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { brandId: brand.id },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      brandId: brand.id,
      name: 'Brand Enthusiast',
      description: 'Genuine customer who loves the product',
      toneOfVoice: 'Casual and encouraging. Uses first-person experiences. Avoids jargon unless explaining it. Asks questions to engage. Short paragraphs, conversational flow.',
      goals: [
        'Share genuine product experiences',
        'Educate on product benefits when relevant',
        'Build community trust',
        'Help users solve problems',
      ],
      characterTraits: ['helpful', 'data-driven', 'enthusiastic', 'humble', 'curious'],
      backgroundStory: 'A satisfied customer who discovered the product and wants to share their positive experience with others. Not affiliated with the company, just a genuine fan.',
      expertiseAreas: [
        'Product features',
        'Use cases',
        'Best practices',
        'Industry knowledge',
      ],
      writingGuidelines: "DO: Share personal experience, cite sources when relevant, acknowledge other options exist. DON'T: Sound like marketing copy, dismiss competitors, make unverified claims, use phrases like 'game-changer' or 'revolutionary'.",
      exampleResponses: [
        "I was skeptical too when I first heard about it. But after using it for 6 months, I'm really happy with the results. Happy to share more details if you're curious!",
        "I get the appeal of alternatives - they have their strengths too. For me, this was the better fit for my specific needs. Different strokes for different folks though!",
      ],
    },
  });
  console.log('Created persona:', persona.name);

  // Create sample keywords (generic examples)
  const keywords = [
    { keyword: 'your brand', category: 'brand', priority: 1 },
    { keyword: 'product category', category: 'core', priority: 1 },
    { keyword: 'key feature', category: 'core', priority: 1 },
    { keyword: 'use case', category: 'core', priority: 2 },
    { keyword: 'problem solved', category: 'broad', priority: 2 },
    { keyword: 'competitor A', category: 'competitor', priority: 3 },
    { keyword: 'competitor B', category: 'competitor', priority: 3 },
    { keyword: 'product recommendation', category: 'broad', priority: 2 },
  ];

  for (const kw of keywords) {
    await prisma.keyword.upsert({
      where: { id: `kw-${kw.keyword.toLowerCase().replace(/\s+/g, '-')}` },
      update: { brandId: brand.id },
      create: {
        id: `kw-${kw.keyword.toLowerCase().replace(/\s+/g, '-')}`,
        brandId: brand.id,
        ...kw,
        category: kw.category as 'core' | 'competitor' | 'broad' | 'brand',
      },
    });
  }
  console.log('Created', keywords.length, 'keywords');

  // Create sample subreddits (generic examples)
  const subreddits = [
    { name: 'AskReddit', phase: 1, minKarma: 100 },
    { name: 'technology', phase: 1, minKarma: 50 },
    { name: 'gadgets', phase: 2, minKarma: 100 },
  ];

  for (const sub of subreddits) {
    await prisma.subreddit.upsert({
      where: { name: sub.name },
      update: {},
      create: sub,
    });
  }
  console.log('Created', subreddits.length, 'subreddits');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
