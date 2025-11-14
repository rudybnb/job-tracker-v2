import { drizzle } from "drizzle-orm/mysql2";
import { contractors } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

const sampleContractors = [
  {
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phone: "07700 900123",
    type: "contractor",
    primaryTrade: "General Builder",
    dailyRate: 25000, // £250.00 in cents
    status: "approved",
  },
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@example.com",
    phone: "07700 900124",
    type: "contractor",
    primaryTrade: "Electrician",
    dailyRate: 30000, // £300.00 in cents
    status: "approved",
  },
  {
    firstName: "Mike",
    lastName: "Williams",
    email: "mike.williams@example.com",
    phone: "07700 900125",
    type: "subcontractor",
    primaryTrade: "Plumber",
    dailyRate: null, // Subcontractors use milestone pricing
    status: "approved",
  },
  {
    firstName: "Emma",
    lastName: "Brown",
    email: "emma.brown@example.com",
    phone: "07700 900126",
    type: "contractor",
    primaryTrade: "Carpenter",
    dailyRate: 28000, // £280.00 in cents
    status: "approved",
  },
  {
    firstName: "David",
    lastName: "Taylor",
    email: "david.taylor@example.com",
    phone: "07700 900127",
    type: "subcontractor",
    primaryTrade: "Roofer",
    dailyRate: null,
    status: "approved",
  },
];

async function seedContractors() {
  try {
    console.log("Seeding contractors...");
    
    for (const contractor of sampleContractors) {
      await db.insert(contractors).values(contractor);
      console.log(`✓ Added ${contractor.firstName} ${contractor.lastName} (${contractor.type})`);
    }
    
    console.log("\n✅ Successfully seeded", sampleContractors.length, "contractors!");
  } catch (error) {
    console.error("❌ Error seeding contractors:", error);
    process.exit(1);
  }
  process.exit(0);
}

seedContractors();
