import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    update: {},
    create: {
      id: "demo-company",
      name: "Acme HR",
      email: "hr@acme.com",
      phone: "+91 9876543210",
      address: "Bengaluru, India",
      timezone: "Asia/Kolkata",
      currency: "INR",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@acme.com" },
    update: {},
    create: {
      email: "admin@acme.com",
      passwordHash: "demo-password-hash",
      firstName: "System",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      companyId: company.id,
      isVerified: true,
    },
  });

  await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: { name: "SUPER_ADMIN", description: "Full access" },
  });

  await prisma.permission.upsert({
    where: { name: "employee:read" },
    update: {},
    create: { name: "employee:read", description: "Read employees" },
  });

  console.log(`Seeded company and user: ${company.name} / ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
