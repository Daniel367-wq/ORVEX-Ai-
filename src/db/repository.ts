import crypto from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  organizationMembers,
  organizations,
  systemConfig,
  users,
} from './schema.ts';

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'org'
  );
}

export async function writeAuditLog(params: {
  actorUserId?: number | null;
  organizationId?: number | null;
  action: string;
  environment: 'CLIENT' | 'MASTER' | 'DEVELOPER' | 'AUTH';
  details?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId ?? null,
      action: params.action,
      environment: params.environment,
      details: params.details ?? null,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  name?: string | null;
  photoUrl?: string | null;
}) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        name: params.name ?? null,
        photoUrl: params.photoUrl ?? null,
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: params.email,
          name: params.name ?? null,
          photoUrl: params.photoUrl ?? null,
          lastLoginAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Erro ao sincronizar utilizador.', { cause: error });
  }
}

export async function isOwnerInitialized(): Promise<boolean> {
  try {
    const rows = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'owner_initialized'))
      .limit(1);
    return rows.length > 0 && rows[0].value === 'true';
  } catch (error) {
    console.error('Database error in isOwnerInitialized:', error);
    throw new Error('Erro ao verificar estado de inicialização.', {
      cause: error,
    });
  }
}

export async function claimInitialOwner(params: {
  userId: number;
  organizationName: string;
  organizationSector: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'owner_initialized'))
        .limit(1);

      if (existing.length > 0 && existing[0].value === 'true') {
        throw new Error('OWNER_ALREADY_INITIALIZED');
      }

      const [updatedOwner] = await tx
        .update(users)
        .set({ globalRole: 'OWNER' })
        .where(eq(users.id, params.userId))
        .returning();

      const orgName = params.organizationName.trim() || 'DM Evolution';
      const baseSlug = slugify(orgName);

      const [createdOrg] = await tx
        .insert(organizations)
        .values({
          uuid: crypto.randomUUID(),
          name: orgName,
          slug: baseSlug,
          sector: params.organizationSector.trim() || 'Consultoria e Tecnologia',
          status: 'ACTIVE',
          plan: 'ENTERPRISE',
          description:
            'Organização inaugural da plataforma ORVEX AI.',
        })
        .returning();

      await tx.insert(organizationMembers).values({
        organizationId: createdOrg.id,
        userId: params.userId,
        orgRole: 'ORG_ADMIN',
      });

      await tx
        .insert(systemConfig)
        .values({
          key: 'owner_initialized',
          value: 'true',
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: systemConfig.key,
          set: { value: 'true', updatedAt: new Date() },
        });

      await tx.insert(auditLogs).values({
        actorUserId: params.userId,
        organizationId: createdOrg.id,
        action: 'OWNER_BOOTSTRAP_COMPLETED',
        environment: 'AUTH',
        details: `OWNER inicial configurado com organização ${createdOrg.name}.`,
      });

      return { owner: updatedOwner, organization: createdOrg };
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === 'OWNER_ALREADY_INITIALIZED'
    ) {
      throw error;
    }
    console.error('Database error in claimInitialOwner:', error);
    throw new Error('Não foi possível concluir a configuração inicial do OWNER.', {
      cause: error,
    });
  }
}

export async function getUserMemberships(userId: number) {
  try {
    const rows = await db
      .select({
        membershipId: organizationMembers.id,
        orgRole: organizationMembers.orgRole,
        organizationId: organizations.id,
        organizationUuid: organizations.uuid,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        organizationSector: organizations.sector,
        organizationStatus: organizations.status,
        organizationPlan: organizations.plan,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id)
      )
      .where(eq(organizationMembers.userId, userId));

    return rows;
  } catch (error) {
    console.error('Database error in getUserMemberships:', error);
    throw new Error('Erro ao carregar organizações do utilizador.', {
      cause: error,
    });
  }
}

export async function checkTenantMembership(
  organizationId: number,
  userId: number
) {
  try {
    const rows = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database error in checkTenantMembership:', error);
    throw new Error('Erro ao validar permissões da organização.', {
      cause: error,
    });
  }
}

export async function getTenantContext(organizationId: number) {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) return null;

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        orgRole: organizationMembers.orgRole,
        status: users.status,
        joinedAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));

    const recentLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        environment: auditLogs.environment,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    return { organization: org, members, recentLogs };
  } catch (error) {
    console.error('Database error in getTenantContext:', error);
    throw new Error('Erro ao carregar contexto da organização.', {
      cause: error,
    });
  }
}

export async function getMasterOverview() {
  try {
    const allOrgs = await db
      .select()
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        globalRole: users.globalRole,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const allMemberships = await db.select().from(organizationMembers);

    const now = new Date();
    const weeklyBuckets: Array<{ label: string; count: number }> = [];
    for (let i = 12; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      const count = allUsers.filter((u) => {
        const created = new Date(u.createdAt);
        return created >= weekStart && created <= weekEnd;
      }).length;
      const label = `${String(weekEnd.getDate()).padStart(2, '0')}/${String(
        weekEnd.getMonth() + 1
      ).padStart(2, '0')}`;
      weeklyBuckets.push({ label, count });
    }

    return {
      stats: {
        totalOrganizations: allOrgs.length,
        activeOrganizations: allOrgs.filter((o) => o.status === 'ACTIVE').length,
        suspendedOrganizations: allOrgs.filter((o) => o.status === 'SUSPENDED')
          .length,
        totalUsers: allUsers.length,
        suspendedUsers: allUsers.filter((u) => u.status === 'SUSPENDED').length,
      },
      weeklyNewUsers: weeklyBuckets,
      organizations: allOrgs.map((org) => ({
        ...org,
        memberCount: allMemberships.filter((m) => m.organizationId === org.id)
          .length,
      })),
      users: allUsers,
    };
  } catch (error) {
    console.error('Database error in getMasterOverview:', error);
    throw new Error('Erro ao carregar dados do Painel MASTER.', {
      cause: error,
    });
  }
}

export async function createOrganizationRecord(params: {
  name: string;
  sector?: string;
  plan?: string;
  description?: string;
  actorUserId: number;
}) {
  try {
    const baseSlug = slugify(params.name);
    const uniqueSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;

    const [org] = await db
      .insert(organizations)
      .values({
        uuid: crypto.randomUUID(),
        name: params.name.trim(),
        slug: uniqueSlug,
        sector: params.sector?.trim() || 'Geral',
        plan: params.plan || 'FREE',
        status: 'ACTIVE',
        description: params.description?.trim() || null,
      })
      .returning();

    await writeAuditLog({
      actorUserId: params.actorUserId,
      organizationId: org.id,
      action: 'ORGANIZATION_CREATED',
      environment: 'MASTER',
      details: `Organização "${org.name}" criada com plano ${org.plan}.`,
    });

    return org;
  } catch (error) {
    console.error('Database error in createOrganizationRecord:', error);
    throw new Error('Erro ao criar organização.', { cause: error });
  }
}

export async function updateUserGlobalRole(params: {
  targetUserId: number;
  globalRole: 'OWNER' | 'ADMIN' | 'USER';
  actorUserId: number;
}) {
  try {
    const [updated] = await db
      .update(users)
      .set({ globalRole: params.globalRole })
      .where(eq(users.id, params.targetUserId))
      .returning();

    if (!updated) return null;

    await writeAuditLog({
      actorUserId: params.actorUserId,
      action: 'USER_ROLE_UPDATED',
      environment: 'MASTER',
      details: `Papel do utilizador ${updated.email} alterado para ${params.globalRole}.`,
    });

    return updated;
  } catch (error) {
    console.error('Database error in updateUserGlobalRole:', error);
    throw new Error('Erro ao atualizar papel do utilizador.', { cause: error });
  }
}

export async function linkUserToOrganization(params: {
  organizationId: number;
  userId: number;
  orgRole: 'ORG_ADMIN' | 'MEMBER';
  actorUserId: number;
}) {
  try {
    const [membership] = await db
      .insert(organizationMembers)
      .values({
        organizationId: params.organizationId,
        userId: params.userId,
        orgRole: params.orgRole,
      })
      .onConflictDoUpdate({
        target: [
          organizationMembers.organizationId,
          organizationMembers.userId,
        ],
        set: { orgRole: params.orgRole },
      })
      .returning();

    await writeAuditLog({
      actorUserId: params.actorUserId,
      organizationId: params.organizationId,
      action: 'ORGANIZATION_MEMBER_LINKED',
      environment: 'MASTER',
      details: `Utilizador #${params.userId} associado como ${params.orgRole}.`,
    });

    return membership;
  } catch (error) {
    console.error('Database error in linkUserToOrganization:', error);
    throw new Error('Erro ao associar utilizador à organização.', {
      cause: error,
    });
  }
}

export async function getRecentAuditLogs(limit = 30) {
  try {
    return await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        environment: auditLogs.environment,
        details: auditLogs.details,
        organizationId: auditLogs.organizationId,
        createdAt: auditLogs.createdAt,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Database error in getRecentAuditLogs:', error);
    throw new Error('Erro ao carregar registos de auditoria.', {
      cause: error,
    });
  }
}
