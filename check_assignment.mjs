import { getDb } from './server/db.ts';
import { buildAssignments, jobs } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const database = await getDb();

// John's contractor ID is 120001
const assignments = await database
  .select({
    assignment: buildAssignments,
    job: jobs
  })
  .from(buildAssignments)
  .leftJoin(jobs, eq(buildAssignments.jobId, jobs.id))
  .where(eq(buildAssignments.contractorId, 120001));

console.log('John has', assignments.length, 'assignments');
assignments.forEach(a => {
  console.log('\n---');
  console.log('Assignment ID:', a.assignment.id);
  console.log('Job ID:', a.assignment.jobId);
  console.log('Job Title:', a.job?.title);
  console.log('Job Postcode:', a.job?.postcode);
  console.log('Job GPS:', a.job?.latitude, a.job?.longitude);
});

process.exit(0);
