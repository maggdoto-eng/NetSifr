import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { prisma } from '../src/lib/prisma';
import { slugify } from '../src/lib/slug';

// Baseline/reference data only — safe to run against production. Test-only
// fixtures (demo participants, seeded programs) live in tests/, not here.

const ORG_SLUG = 'netsifr';
const ORG_NAME = 'NetSifr';
const ORG_TIMEZONE = 'Asia/Karachi';

const PERSONAS = [
  { key: 'policy-navigator', name: 'Policy Navigator', glyph: '◈', colorToken: '#86E5BC' },
  { key: 'ground-organizer', name: 'Ground Organizer', glyph: '◉', colorToken: '#FF6A45' },
  { key: 'narrative-builder', name: 'Narrative Builder', glyph: '❋', colorToken: '#123B2E' },
];

const TOPICS = [
  'Gender equity',
  'Climate finance',
  'Youth advocacy',
  'Disaster response',
  'Water & heat',
  'Local government',
  'Care work',
  'Storytelling',
];

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: { name: ORG_NAME, slug: ORG_SLUG, timezone: ORG_TIMEZONE },
  });
  console.log(`Organization ready: ${org.name} (${org.id})`);

  for (const persona of PERSONAS) {
    await prisma.persona.upsert({
      where: { key: persona.key },
      update: { name: persona.name, glyph: persona.glyph, colorToken: persona.colorToken },
      create: persona,
    });
  }
  console.log(`Personas ready: ${PERSONAS.length}`);

  for (const label of TOPICS) {
    const slug = slugify(label);
    await prisma.topic.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug } },
      update: { label },
      create: { organizationId: org.id, slug, label },
    });
  }
  console.log(`Topics ready: ${TOPICS.length}`);

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@netsifr.org';
  const existingCredential = await prisma.credential.findUnique({
    where: { type_identifier: { type: 'EMAIL_PASSWORD', identifier: bootstrapEmail } },
  });

  if (existingCredential) {
    console.log(`First-admin bootstrap skipped — ${bootstrapEmail} already has a credential.`);
  } else {
    const password = randomBytes(18).toString('base64url');
    const secretHash = await hash(password);

    const admin = await prisma.user.create({
      data: {
        name: 'NetSifr Admin',
        status: 'ACTIVE',
        onboardedAt: new Date(),
        credentials: {
          create: {
            type: 'EMAIL_PASSWORD',
            identifier: bootstrapEmail,
            secretHash,
            verifiedAt: new Date(),
          },
        },
        organizationMemberships: {
          create: { organizationId: org.id, role: 'OWNER', status: 'ACTIVE' },
        },
      },
    });

    console.log('');
    console.log('=== First-admin bootstrap credentials (shown once — save them now) ===');
    console.log(`  User id:  ${admin.id}`);
    console.log(`  Email:    ${bootstrapEmail}`);
    console.log(`  Password: ${password}`);
    console.log('========================================================================');
    console.log('');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
