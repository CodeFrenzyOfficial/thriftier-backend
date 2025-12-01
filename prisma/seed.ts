import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create Admin User
  const adminPassword = await hashPassword("AdminPass123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@thrifter.com" },
    update: {},
    create: {
      email: "admin@thrifter.com",
      password: adminPassword,
      name: "Admin User",
      phoneNumber: "1234567890",
      location: "Admin Location",
      role: Role.ADMIN,
      isActive: true,
      isVerified: true,
    },
  });
  console.log("✅ Created admin user:", admin.email);

  // Create Driver Users
  const driverPassword = await hashPassword("DriverPass123!");
  const driver1 = await prisma.user.upsert({
    where: { email: "driver1@thrifter.com" },
    update: {},
    create: {
      email: "driver1@thrifter.com",
      password: driverPassword,
      name: "John Driver",
      phoneNumber: "03021010101",
      location: "Driver Location",
      role: Role.DRIVER,
      isActive: true,
      isVerified: true,
    },
  });
  console.log("✅ Created driver user:", driver1.email);

  const driver2 = await prisma.user.upsert({
    where: { email: "driver2@thrifter.com" },
    update: {},
    create: {
      email: "driver2@thrifter.com",
      password: driverPassword,
      name: "Sarah Driver",
      phoneNumber: "03021099102",
      location: "Driver Location",
      role: Role.DRIVER,
      isActive: true,
      isVerified: true,
    },
  });
  console.log("✅ Created driver user:", driver2.email);

  // Create Regular Users
  const userPassword = await hashPassword("UserPass123!");
  const user1 = await prisma.user.upsert({
    where: { email: "user1@thrifter.com" },
    update: {},
    create: {
      email: "user1@thrifter.com",
      password: userPassword,
      name: "Alice User",
      phoneNumber: "03021199103",
      location: "User Location",
      role: Role.USER,
      isActive: true,
      isVerified: true,
    },
  });
  console.log("✅ Created regular user:", user1.email);

  const user2 = await prisma.user.upsert({
    where: { email: "user2@thrifter.com" },
    update: {},
    create: {
      email: "user2@thrifter.com",
      password: userPassword,
      name: "Bob User",
      phoneNumber: "03025599104",
      location: "User Location",
      role: Role.USER,
      isActive: true,
      isVerified: true,
    },
  });
  console.log("✅ Created regular user:", user2.email);

  const user3 = await prisma.user.upsert({
    where: { email: "user3@thrifter.com" },
    update: {},
    create: {
      email: "user3@thrifter.com",
      password: userPassword,
      name: "Charlie User",
      phoneNumber: "03020010505",
      location: "User Location",
      role: Role.USER,
      isActive: true,
      isVerified: false, // Not verified for testing
    },
  });
  console.log("✅ Created regular user:", user3.email);

  console.log("\n📊 Seeding Summary:");
  console.log("=".repeat(50));
  console.log("Admin Users: 1");
  console.log("Driver Users: 2");
  console.log("Regular Users: 3");
  console.log("=".repeat(50));
  console.log("\n🔐 Test Credentials:");
  console.log("Admin:");
  console.log("  Email: admin@thrifter.com");
  console.log("  Password: AdminPass123!");
  console.log("\nDriver:");
  console.log("  Email: driver1@thrifter.com");
  console.log("  Password: DriverPass123!");
  console.log("\nUser:");
  console.log("  Email: user1@thrifter.com");
  console.log("  Password: UserPass123!");
  console.log("\n✨ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
