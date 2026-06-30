import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

interface LogAuditInput {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

/**
 * Fire-and-record audit trail entry. Failures are logged but never thrown —
 * an audit write must not break the user-facing operation it documents.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", { action: input.action, error });
  }
}
