import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await connection.query("SELECT id, username, firstName, lastName FROM contractors WHERE username IS NOT NULL");
console.log("Contractors with usernames:");
console.log(JSON.stringify(result[0], null, 2));

await connection.end();
