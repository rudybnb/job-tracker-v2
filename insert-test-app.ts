import { drizzle } from "drizzle-orm/mysql2";
import { contractorApplications } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function insertTestApplication() {
  const result = await db.insert(contractorApplications).values({
    firstName: "Rudy",
    lastName: "Diedericks",
    email: "rudybnbd@gmail.com",
    phone: "07534251548",
    telegramId: "@rudydiedericks",
    fullAddress: "Belvedere, DA17 5DB",
    city: "Belvedere",
    postcode: "DA17 5DB",
    hasRightToWork: true,
    passportNumber: "123456789",
    passportPhotoUrl: "https://example.com/passport.jpg",
    hasPublicLiability: true,
    cisRegistrationStatus: "registered",
    cisNumber: "fgfghg6788",
    utrNumber: "56798988888",
    hasValidCscsCard: true,
    bankName: "barclys",
    accountHolderName: "yuio",
    sortCode: "12-34-55",
    accountNumber: "123456",
    emergencyContactName: "Emergency Contact",
    emergencyContactPhone: "07123456789",
    emergencyContactRelationship: "Spouse",
    primaryTrade: "Plumber",
    yearsOfExperience: "6-10 years",
    hasOwnTools: false,
    status: "pending",
  });
  
  console.log("Test application created:", result);
}

insertTestApplication().catch(console.error);
