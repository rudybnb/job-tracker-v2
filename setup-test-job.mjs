/**
 * Setup Test Job - Timi Fofuyen Extension
 * 
 * This script creates a test job with:
 * - HBXL phases (10 phases)
 * - Rooms (4 bedrooms, kitchen, dining, living, ensuite)
 * - Main contractor (hourly rate)
 * - Subcontractor (per-room pricing)
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log('🚀 Setting up Timi Fofuyen Extension job...\n');

// Step 1: Create the job
console.log('📋 Creating job...');
const [jobResult] = await connection.execute(
  `INSERT INTO jobs (title, address, postCode, projectType, status, totalLabourCost, totalMaterialCost, rooms, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    'Timi Fofuyen',
    'Orpington',
    'BR6 9HQ',
    'Extension',
    'pending',
    1191000, // £11910.00 in pence
    1372523, // £13725.23 in pence
    JSON.stringify([
      { name: 'Kitchen', type: 'kitchen', floor: 'ground_floor', status: 'not_started' },
      { name: 'Dining Room', type: 'dining_room', floor: 'ground_floor', status: 'not_started' },
      { name: 'Living Room', type: 'living_room', floor: 'ground_floor', status: 'not_started' },
      { name: 'Bedroom 1', type: 'bedroom', floor: 'first_floor', status: 'not_started' },
      { name: 'Bedroom 2', type: 'bedroom', floor: 'first_floor', status: 'not_started' },
      { name: 'Bedroom 3', type: 'bedroom', floor: 'first_floor', status: 'not_started' },
      { name: 'Bedroom 4', type: 'bedroom', floor: 'first_floor', status: 'not_started' },
      { name: 'Ensuite', type: 'bathroom', floor: 'first_floor', status: 'not_started' },
    ])
  ]
);

const jobId = jobResult.insertId;
console.log(`✅ Job created with ID: ${jobId}\n`);

// Step 2: Create HBXL phases
console.log('🔨 Creating HBXL phases...');
const phases = [
  'Masonry Shell',
  'Joinery 1st Fix',
  'Electrical 2nd Fix',
  'External Decoration',
  'Internal Fitting Out',
  'Internal Preparation',
  'Joinery 2nd Fix',
  'Plastering',
  'Plumbing 1st Fix',
  'Plumbing 2nd Fix',
];

for (let i = 0; i < phases.length; i++) {
  await connection.execute(
    `INSERT INTO buildPhases (jobId, phaseName, status, \`order\`, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [jobId, phases[i], 'not_started', i]
  );
  console.log(`  ✓ ${phases[i]}`);
}
console.log(`✅ ${phases.length} phases created\n`);

// Step 3: Get contractors
console.log('👷 Finding contractors...');
const [contractors] = await connection.execute(
  `SELECT id, firstName, lastName, type FROM contractors WHERE telegramChatId IS NOT NULL ORDER BY id LIMIT 2`
);

if (contractors.length < 2) {
  console.error('❌ Need at least 2 contractors with Telegram chat IDs');
  await connection.end();
  process.exit(1);
}

const mainContractor = contractors[0];
const subContractor = contractors[1];

console.log(`  Main Contractor: ${mainContractor.firstName} ${mainContractor.lastName} (ID: ${mainContractor.id})`);
console.log(`  Subcontractor: ${subContractor.firstName} ${subContractor.lastName} (ID: ${subContractor.id})\n`);

// Step 4: Assign main contractor (hourly rate)
console.log('💼 Assigning main contractor...');
await connection.execute(
  `INSERT INTO jobAssignments (jobId, contractorId, status, pricingModel, hourlyRate, selectedPhases, assignedRooms, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    jobId,
    mainContractor.id,
    'assigned',
    'hourly',
    2500, // £25/hour in pence
    JSON.stringify(phases), // All phases
    JSON.stringify(['Kitchen', 'Dining Room', 'Living Room']), // Ground floor rooms
  ]
);
console.log(`✅ ${mainContractor.firstName} assigned - £25/hour for ground floor\n`);

// Step 5: Assign subcontractor (per-room pricing)
console.log('💼 Assigning subcontractor...');
await connection.execute(
  `INSERT INTO jobAssignments (jobId, contractorId, status, pricingModel, pricePerRoom, selectedPhases, assignedRooms, completedRooms, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    jobId,
    subContractor.id,
    'assigned',
    'per_room',
    100000, // £1000/room in pence
    JSON.stringify(['Internal Fitting Out', 'Plastering', 'Joinery 2nd Fix']), // Interior work phases
    JSON.stringify(['Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Ensuite']), // First floor rooms
    JSON.stringify([]), // No rooms completed yet
  ]
);
console.log(`✅ ${subContractor.firstName} assigned - £1000/room for 5 rooms (£5000 total)\n`);

// Summary
console.log('📊 Job Setup Summary:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Job: Timi Fofuyen Extension`);
console.log(`Location: Orpington, BR6 9HQ`);
console.log(`Total Budget: £${(1191000 + 1372523) / 100}.${((1191000 + 1372523) % 100).toString().padStart(2, '0')}`);
console.log(`  Labour: £${1191000 / 100}`);
console.log(`  Material: £${1372523 / 100}.${(1372523 % 100).toString().padStart(2, '0')}`);
console.log('');
console.log(`Phases: ${phases.length}`);
console.log(`Rooms: 8 (3 ground floor, 5 first floor)`);
console.log('');
console.log(`Main Contractor: ${mainContractor.firstName} ${mainContractor.lastName}`);
console.log(`  Rate: £25/hour`);
console.log(`  Rooms: Kitchen, Dining Room, Living Room`);
console.log('');
console.log(`Subcontractor: ${subContractor.firstName} ${subContractor.lastName}`);
console.log(`  Rate: £1000/room`);
console.log(`  Rooms: Bedroom 1, 2, 3, 4, Ensuite (5 rooms = £5000)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ Test job setup complete!');
console.log('\n🎯 Next steps:');
console.log('1. Activate the job in the admin dashboard');
console.log('2. Test Telegram bot with room completion messages');
console.log('3. Check payment calculations\n');

await connection.end();
