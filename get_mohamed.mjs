import { getDb } from './server/db.ts';
import { contractors } from './drizzle/schema.ts';
import { like, or } from 'drizzle-orm';

const database = await getDb();

const mohamed = await database.select().from(contractors).where(
  or(
    like(contractors.firstName, '%Mohamed%'),
    like(contractors.lastName, '%Mohamed%')
  )
);

if (mohamed.length > 0) {
  console.log('Mohamed found:');
  console.log('ID:', mohamed[0].id);
  console.log('Name:', mohamed[0].firstName, mohamed[0].lastName);
  console.log('Username:', mohamed[0].username);
  console.log('Email:', mohamed[0].email);
  console.log('Phone:', mohamed[0].phone);
  console.log('\nLogin credentials:');
  console.log('Username:', mohamed[0].username);
  console.log('Password: (stored as hash, default is usually username + "123")');
} else {
  console.log('Mohamed not found');
}

process.exit(0);
