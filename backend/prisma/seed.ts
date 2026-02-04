import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@carolbike.com' },
    update: {},
    create: {
      email: 'admin@carolbike.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create sample persona
  const persona = await prisma.persona.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Fitness Enthusiast',
      description: 'Health-conscious professional who discovered CAROL Bike',
      toneOfVoice: 'Casual and encouraging. Uses first-person experiences. Avoids jargon unless explaining it. Asks questions to engage. Short paragraphs, conversational flow.',
      goals: [
        'Share genuine fitness experiences',
        'Educate on REHIT benefits when relevant',
        'Build community trust',
        'Help users solve time-constraint problems',
      ],
      characterTraits: ['helpful', 'data-driven', 'enthusiastic', 'humble', 'curious'],
      backgroundStory: '40-year-old software engineer who struggled to find time for exercise with a demanding job and two kids. Discovered CAROL Bike 18 months ago and it transformed their fitness routine. Not affiliated with the company, just a genuine fan who tracks their VO2max improvements religiously.',
      expertiseAreas: [
        'REHIT protocol',
        'VO2max tracking',
        'Time-efficient workouts',
        'Home gym setups',
        'Fitness for busy professionals',
      ],
      writingGuidelines: "DO: Share personal experience, cite studies when relevant, acknowledge other options exist. DON'T: Sound like marketing copy, dismiss competitors, make medical claims, use phrases like 'game-changer' or 'revolutionary'.",
      exampleResponses: [
        "I was skeptical too when I first heard about 9-minute workouts. But after tracking my VO2max for 6 months, I went from 38 to 44 ml/kg/min. The science behind REHIT is solid - it's based on research from the University of Bath. Happy to share more details if you're curious!",
        "Totally get the Peloton appeal - the community aspect is great. For me, the dealbreaker was time. With two kids and a demanding job, I needed something I could actually stick with. Different strokes for different folks though!",
      ],
    },
  });
  console.log('Created persona:', persona.name);

  // Create sample keywords
  const keywords = [
    { keyword: 'CAROL Bike', category: 'brand', priority: 1 },
    { keyword: 'REHIT', category: 'core', priority: 1 },
    { keyword: 'VO2max', category: 'core', priority: 1 },
    { keyword: '9 minute workout', category: 'core', priority: 2 },
    { keyword: 'short workout', category: 'broad', priority: 2 },
    { keyword: 'time efficient exercise', category: 'broad', priority: 2 },
    { keyword: 'Peloton', category: 'competitor', priority: 3 },
    { keyword: 'NordicTrack', category: 'competitor', priority: 3 },
    { keyword: 'exercise bike recommendation', category: 'broad', priority: 2 },
    { keyword: 'busy professional fitness', category: 'broad', priority: 2 },
  ];

  for (const kw of keywords) {
    await prisma.keyword.upsert({
      where: { id: `kw-${kw.keyword.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `kw-${kw.keyword.toLowerCase().replace(/\s+/g, '-')}`,
        ...kw,
        category: kw.category as 'core' | 'competitor' | 'broad' | 'brand',
      },
    });
  }
  console.log('Created', keywords.length, 'keywords');

  // Create sample subreddits
  const subreddits = [
    { name: 'fitness', phase: 1, minKarma: 100 },
    { name: 'homegym', phase: 1, minKarma: 50 },
    { name: 'cycling', phase: 2, minKarma: 100 },
    { name: 'biohackers', phase: 2, minKarma: 50 },
    { name: 'xxfitness', phase: 2, minKarma: 100 },
    { name: 'over40fitness', phase: 1, minKarma: 25 },
    { name: 'loseit', phase: 3, minKarma: 100 },
    { name: 'peloton', phase: 3, minKarma: 100 },
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
