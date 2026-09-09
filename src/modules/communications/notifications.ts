import 'server-only';
import { prisma } from '@/lib/prisma';
import type { NotificationType } from '@/generated/prisma/client';

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  return prisma.notification.create({ data: input });
}

export async function getNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}
