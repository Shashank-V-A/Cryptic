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

  findByIdForAuth(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  updatePassword(id, passwordHash) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  },

  setPasswordResetToken(id, passwordResetTokenHash, passwordResetExpiresAt) {
    return prisma.user.update({
      where: { id },
      data: { passwordResetTokenHash, passwordResetExpiresAt },
    });
  },

  clearPasswordResetToken(id) {
    return prisma.user.update({
      where: { id },
      data: { passwordResetTokenHash: null, passwordResetExpiresAt: null },
    });
  },

  findByPasswordResetTokenHash(hash) {
    return prisma.user.findFirst({
      where: {
        passwordResetTokenHash: hash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });
  },

  updateTotp(id, { totpSecretEncrypted, totpEnabled }) {
    return prisma.user.update({
      where: { id },
      data: {
        ...(totpSecretEncrypted !== undefined ? { totpSecretEncrypted } : {}),
        ...(totpEnabled !== undefined ? { totpEnabled } : {}),
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
