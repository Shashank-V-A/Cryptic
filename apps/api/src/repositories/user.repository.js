import { prisma } from '../lib/prisma.js';

export const userRepository = {
  findByEmail(email) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        demoMode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  create({ email, passwordHash, fullName, demoMode = false }) {
    return prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        demoMode,
        accounts: {
          create: { label: 'Primary', currency: 'INR' },
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        demoMode: true,
        createdAt: true,
      },
    });
  },
};
