import { getDb } from './server/db.ts';
import { jobs } from './drizzle/schema.ts';
import { like } from 'drizzle-orm';

const database = await getDb();

const freddyJobs = await database.select().from(jobs).where(like(jobs.title, '%Freddy%'));

console.log('Found', freddyJobs.length, 'jobs');
freddyJobs.forEach(job => {
  console.log('\nJob ID:', job.id);
  console.log('Title:', job.title);
  console.log('Postcode:', job.postcode);
  console.log('GPS:', job.latitude, job.longitude);
});

process.exit(0);
