import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function resolveConnectionString() {
  if (process.env.DIRECT_DATABASE_URL) {
    return process.env.DIRECT_DATABASE_URL;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  throw new Error("Set DIRECT_DATABASE_URL or DATABASE_URL before running production bootstrap.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: resolveConnectionString(),
  }),
});

async function main() {
  await prisma.course.upsert({
    where: {
      id: "course_industrial_chemistry",
    },
    update: {
      title: "Industrial Chemistry",
      code: "ICH 204",
      description:
        "Core Industrial Chemistry workspace with kinetics, thermodynamics, electrochemistry, practicals, and revision support.",
      semester: "Year 2 Semester 2",
      level: "Undergraduate",
      colorKey: "chemate-cyan",
    },
    create: {
      id: "course_industrial_chemistry",
      title: "Industrial Chemistry",
      code: "ICH 204",
      description:
        "Core Industrial Chemistry workspace with kinetics, thermodynamics, electrochemistry, practicals, and revision support.",
      semester: "Year 2 Semester 2",
      level: "Undergraduate",
      colorKey: "chemate-cyan",
    },
  });

  console.log("Production bootstrap complete.");
  console.log("Primary Chemate course is ready.");
  console.log("Next step: deploy the app and create your first real user account.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
