import { prisma } from '../src/db';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'demo@deployx.com';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log('✅ Demo user already exists:', email);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('demo1234', salt);

  await prisma.user.create({
    data: {
      name: 'Demo User',
      email,
      password: hashedPassword,
    }
  });

  console.log('✅ Demo user created successfully!');
  console.log('   Email:    demo@deployx.com');
  console.log('   Password: demo1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
