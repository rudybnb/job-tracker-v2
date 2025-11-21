import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [contractors] = await connection.query(
  "SELECT id, firstName, lastName, telegramChatId FROM contractors WHERE username = 'rudy' OR firstName LIKE '%Rudy%'"
);

console.log("Rudy's details:");
console.log(JSON.stringify(contractors, null, 2));

await connection.end();
