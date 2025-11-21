import { geocodePostcode } from './server/geocoding.ts';
import { getDb } from './server/db.ts';
import { jobs } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const database = await getDb();

// Get Freddy Jacson job
const freddyJob = await database.select().from(jobs).where(eq(jobs.id, 390002)).limit(1);

if (freddyJob.length === 0) {
  console.log('Freddy Jacson job not found');
  process.exit(1);
}

console.log('Job:', freddyJob[0].title);
console.log('Postcode:', freddyJob[0].postcode);
console.log('Current GPS:', freddyJob[0].latitude, freddyJob[0].longitude);

// Geocode the postcode
const result = await geocodePostcode(freddyJob[0].postcode);

if (result.success) {
  console.log('\nGeocoding successful!');
  console.log('New GPS coordinates:', result.latitude, result.longitude);
  
  // Update the job
  await database.update(jobs)
    .set({
      latitude: result.latitude,
      longitude: result.longitude
    })
    .where(eq(jobs.id, 390002));
  
  console.log('\nJob GPS coordinates updated successfully!');
} else {
  console.log('\nGeocoding failed:', result.error);
}

process.exit(0);
