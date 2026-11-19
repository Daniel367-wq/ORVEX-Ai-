export type EnvironmentId = 'CLIENT' | 'MASTER' | 'DEVELOPER';

export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  photoUrl: string | null;
  globalRole: 'OWNER' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface OrganizationMembership {
  membershipId: number;
  orgRole: 'ORG_ADMIN' | 'MEMBER';
  organizationId: number;
  organizationUuid: string;
  organizationName: string;
  organizationSlug: string;
  organizationSector: string | null;
  organizationStatus: string;
  organizationPlan: string;
}

export interface AuthSessionData {
  user: UserProfile;
  ownerInitialized: boolean;
  memberships: OrganizationMembership[];
  environments: {
    client: boolean;
    master: boolean;
    developer: boolean;
  };
}

export interface TenantContextData {
  organization: {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    sector: string | null;
    status: string;
    plan: string;
    description: string | null;
    createdAt: string;
  };
  members: Array<{
    id: number;
    name: string | null;
    email: string;
    orgRole: string;
    status: string;
    joinedAt: string;
  }>;
  recentLogs: Array<{
    id: number;
    action: string;
    environment: string;
    details: string | null;
    createdAt: string;
  }>;
}

export interface MasterOverviewData {
  stats: {
    totalOrganizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    totalUsers: number;
    suspendedUsers?: number;
  };
  weeklyNewUsers?: Array<{ label: string; count: number }>;
  organizations: Array<{
    id: number;
    uuid: string;
    name: string;
    slug: string;
    sector: string | null;
    status: string;
    plan: string;
    memberCount: number;
    createdAt: string;
  }>;
  users: Array<{
    id: number;
    email: string;
    name: string | null;
    globalRole: 'OWNER' | 'ADMIN' | 'USER';
    status: string;
    createdAt: string;
    lastLoginAt: string;
  }>;
}

export interface ServiceProbeResult {
  status: 'OPERACIONAL' | 'INDISPONIVEL';
  latencyMs: number;
  message: string;
}

export interface DeveloperHealthData {
  checkedAt: string;
  services: {
    backend: ServiceProbeResult;
    database: ServiceProbeResult;
    auth: ServiceProbeResult;
  };
  errorsLast24h: number;
  unresolvedErrors: number;
}

export interface DeveloperOverviewData {
  runtime: {
    nodeVersion: string;
    environment: string;
    phase: string;
  };
  securityPolicies: Array<{
    id: string;
    name: string;
    enforced: boolean;
    description: string;
  }>;
  integrations: Array<{
    name: string;
    status: string;
    phase: string;
  }>;
  auditLogs: Array<{
    id: number;
    action: string;
    environment: string;
    details: string | null;
    organizationId: number | null;
    createdAt: string;
    actorEmail: string | null;
  }>;
}
