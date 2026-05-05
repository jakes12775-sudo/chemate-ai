import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const dbName = "ezzclean-pos-local";
const envPath = path.join(projectRoot, ".env");
const envExamplePath = path.join(projectRoot, ".env.example");

function runPrisma(args) {
  return execFileSync("cmd.exe", ["/c", "npx", "prisma", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function ensureEnvFile() {
  if (!existsSync(envPath)) {
    const baseline = existsSync(envExamplePath)
      ? readFileSync(envExamplePath, "utf8")
      : "";
    writeFileSync(envPath, baseline, "utf8");
  }
}

function extractUrls(rawOutput) {
  const hyperlinks = [...rawOutput.matchAll(/\]8;;([^\u0007]+)\u0007/g)].map(
    (match) => match[1],
  );
  const prismaUrl = hyperlinks.find((url) => url.startsWith("prisma+postgres://"));
  const tcpUrl = hyperlinks.find((url) => url.startsWith("postgres://"));

  if (prismaUrl && tcpUrl) {
    return {
      prismaUrl,
      tcpUrl,
    };
  }

  const plainText = rawOutput.replace(/\u001b\[[0-9;]*m/g, "");
  const fallbackPrismaUrl = plainText.match(/DATABASE_URL:\s*(prisma\+postgres:\/\/\S+)/)?.[1];
  const fallbackTcpUrl = plainText.match(/TCP:\s*(postgres:\/\/\S+)/)?.[1];

  return {
    prismaUrl: fallbackPrismaUrl,
    tcpUrl: fallbackTcpUrl,
  };
}

function updateEnvValue(contents, key, value) {
  if (contents.includes(`${key}=`)) {
    return contents.replace(new RegExp(`^${key}=.*$`, "m"), `${key}="${value}"`);
  }

  return `${contents.trim()}\n${key}="${value}"\n`;
}

function updateEnvDatabaseUrls(prismaUrl, tcpUrl) {
  const current = readFileSync(envPath, "utf8");
  const withPrismaUrl = updateEnvValue(current, "DATABASE_URL", prismaUrl);
  const withDirectUrl = updateEnvValue(
    withPrismaUrl,
    "DIRECT_DATABASE_URL",
    tcpUrl,
  );
  writeFileSync(envPath, withDirectUrl, "utf8");
}

try {
  runPrisma(["dev", "--detach", "--name", dbName]);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (!message.includes("already")) {
    throw error;
  }
}

const listOutput = runPrisma(["dev", "ls"]);
const urls = extractUrls(listOutput);

if (!urls.prismaUrl || !urls.tcpUrl) {
  throw new Error(
    "Unable to determine the local Prisma Postgres connection URLs from `prisma dev ls`.",
  );
}

ensureEnvFile();
updateEnvDatabaseUrls(urls.prismaUrl, urls.tcpUrl);

process.stdout.write(
  [
    "Local Prisma Postgres is running.",
    `Instance: ${dbName}`,
    `DATABASE_URL has been written to ${envPath}`,
    "Next step: run `npm run db:setup`",
  ].join("\n"),
);
