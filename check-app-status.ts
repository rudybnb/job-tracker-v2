import { drizzle } from "drizzle-orm/mysql2";
import { contractorApplications } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function checkStatus() {
  const apps = await db.select({
    id: contractorApplications.id,
    name: contractorApplications.firstName,
    status: contractorApplications.status,
    cisRate: contractorApplications.cisRate,
    approvedAt: contractorApplications.approvedAt
  }).from(contractorApplications);
  
  console.log("Applications:", JSON.stringify(apps, null, 2));
}

checkStatus().catch(console.error);
