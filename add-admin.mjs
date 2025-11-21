import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { contractors } from './drizzle/schema.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function addAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await db.insert(contractors).values({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@sculptprojects.com',
      phone: '+44 1234 567890',
      username: 'admin',
      passwordHash: passwordHash,
      type: 'contractor',
      primaryTrade: 'Admin',
      paymentType: 'day_rate',
      dailyRate: 0,
      cisVerified: 'registered',
      status: 'approved',
    });

    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('');
    console.log('You can now log in at /contractor-login');
    
    await pool.end();
  } catch (error) {
    console.error('Error creating admin user:', error);
    await pool.end();
    process.exit(1);
  }
}

addAdmin();
