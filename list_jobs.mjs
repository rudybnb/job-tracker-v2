import { getDb } from './server/db.ts';
import { jobs } from './drizzle/schema.ts';

const database = await getDb();
const allJobs = await database.select().from(jobs);

console.log('Total jobs:', allJobs.length);
allJobs.forEach(job => {
  console.log('\n---');
  console.log('ID:', job.id);
  console.log('Title:', job.title);
  console.log('Postcode:', job.postcode);
  console.log('GPS:', job.latitude, job.longitude);
});

process.exit(0);
