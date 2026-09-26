// Usage: npm run admin:create -- --email you@example.com --name "Your Name"
// Prompts for a password (not echoed). Promotes an existing user or creates one.
import { hash } from "@node-rs/argon2";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { prisma } from "./db";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void });
    const original = write._writeToOutput;
    write._writeToOutput = (s: string) => (s.includes(question) ? original.call(rl, s) : undefined);
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
  const email = values.email?.trim().toLowerCase();
  if (!email) throw new Error("Pass --email");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    console.log(`${email} is now an admin.`);
    return;
  }
  const password = process.env.ADMIN_PASSWORD ?? (await promptHidden("Password (min 12 chars): "));
  if (password.length < 12) throw new Error("Password must be at least 12 characters");
  const passwordHash = await hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 });
  await prisma.user.upsert({
    where: { email },
    create: { email, name: values.name || "Queensy Admin", passwordHash, role: "ADMIN", emailVerifiedAt: new Date() },
    update: { passwordHash, role: "ADMIN" },
  });
  await prisma.auditLog.create({ data: { action: "user.role_change", entityType: "user", entityId: email, metadata: { via: "cli", role: "ADMIN" } } });
  console.log(`Admin account ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
