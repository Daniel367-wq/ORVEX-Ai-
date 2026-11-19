import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ==========================================
// CORE MULTI-TENANT & AUTH TABLES (PHASE 1)
// ==========================================

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sector: text('sector').default('Tecnologia e Serviços'),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | SUSPENDED | PENDING
  plan: text('plan').notNull().default('FREE'), // FREE | STARTER | PROFESSIONAL | ENTERPRISE
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  photoUrl: text('photo_url'),
  globalRole: text('global_role').notNull().default('USER'), // OWNER | ADMIN | USER
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | SUSPENDED | BLOCKED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
});

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    orgRole: text('org_role').notNull().default('MEMBER'), // ORG_ADMIN | MEMBER
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('org_member_unique_idx').on(table.organizationId, table.userId),
  ]
);

export const systemConfig = pgTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  organizationId: integer('organization_id').references(
    () => organizations.id,
    { onDelete: 'set null' }
  ),
  action: text('action').notNull(),
  environment: text('environment').notNull(), // CLIENT | MASTER | DEVELOPER | AUTH
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// CLIENT OPERATIONS & MULTI-TENANT TABLES
// ==========================================

export const organizationInvites = pgTable('organization_invites', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull(),
  orgRole: text('org_role').notNull().default('MEMBER'), // ORG_ADMIN | MEMBER
  status: text('status').notNull().default('PENDING'), // PENDING | ACCEPTED | CANCELLED
  invitedByUserId: integer('invited_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull().default('INFO'), // INFO | WARNING | SECURITY
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productsServices = pgTable('products_services', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('SERVICO'), // PRODUTO | SERVICO
  category: text('category').default('Geral'),
  priceCents: integer('price_cents').notNull().default(0),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiAgents = pgTable('ai_agents', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  model: text('model').notNull().default('gemini-2.5-flash'),
  instructions: text('instructions').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  agentId: integer('agent_id').references(() => aiAgents.id, {
    onDelete: 'set null',
  }),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  responseTokens: integer('response_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// MASTER & DEVELOPER PLATFORM TABLES
// ==========================================

export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(
    () => organizations.id,
    { onDelete: 'set null' }
  ),
  createdByUserId: integer('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  reply: text('reply'),
  status: text('status').notNull().default('OPEN'), // OPEN | IN_PROGRESS | CLOSED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // FREE | STARTER | PROFESSIONAL | ENTERPRISE
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  maxMembers: integer('max_members').notNull().default(5),
  maxAiTokens: integer('max_ai_tokens').notNull().default(50000),
  features: text('features').notNull().default(''),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const integrations = pgTable('integrations', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  endpointUrl: text('endpoint_url'),
  active: boolean('active').notNull().default(false),
  lastTestStatus: text('last_test_status'),
  lastTestedAt: timestamp('last_tested_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const prospectingCampaigns = pgTable('prospecting_campaigns', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(
    () => organizations.id,
    { onDelete: 'cascade' }
  ),
  name: text('name').notNull(),
  targetSector: text('target_sector').notNull(),
  targetRegion: text('target_region').notNull(),
  status: text('status').notNull().default('DRAFT'), // DRAFT | ACTIVE | PAUSED
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const platformReleases = pgTable('platform_releases', {
  id: serial('id').primaryKey(),
  version: text('version').notNull().unique(),
  title: text('title').notNull(),
  notes: text('notes').notNull(),
  publishedByUserId: integer('published_by_user_id').references(
    () => users.id,
    { onDelete: 'set null' }
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const backupSnapshots = pgTable('backup_snapshots', {
  id: serial('id').primaryKey(),
  triggeredByUserId: integer('triggered_by_user_id').references(
    () => users.id,
    { onDelete: 'set null' }
  ),
  status: text('status').notNull().default('COMPLETED'),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// RELATIONS
// ==========================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  auditLogs: many(auditLogs),
  invites: many(organizationInvites),
  notifications: many(notifications),
  products: many(productsServices),
  aiAgents: many(aiAgents),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  auditLogs: many(auditLogs),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));
