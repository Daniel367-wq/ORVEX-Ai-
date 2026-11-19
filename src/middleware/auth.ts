import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  checkTenantMembership,
  getOrCreateUser,
  writeAuditLog,
} from '../db/repository.ts';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
  globalRole: string;
  status: string;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: DbUser;
  tenantId?: number;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Não autenticado: token de acesso em falta.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const dbUser = await getOrCreateUser({
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || null,
      photoUrl: decodedToken.picture || null,
    });

    if (dbUser.status !== 'ACTIVE') {
      return res
        .status(403)
        .json({ error: 'Conta suspensa. Contacte a administração da ORVEX AI.' });
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res
      .status(401)
      .json({ error: 'Não autenticado: token inválido ou expirado.' });
  }
};

export const requireGlobalRole = (allowedRoles: Array<'OWNER' | 'ADMIN'>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const dbUser = req.dbUser;
    if (!dbUser) {
      return res.status(401).json({ error: 'Sessão inválida.' });
    }

    if (!allowedRoles.includes(dbUser.globalRole as 'OWNER' | 'ADMIN')) {
      await writeAuditLog({
        actorUserId: dbUser.id,
        action: 'ACCESS_DENIED_GLOBAL_ROLE',
        environment: 'AUTH',
        details: `Tentativa de acesso a ${req.originalUrl} com papel ${dbUser.globalRole}.`,
      });
      return res.status(403).json({
        error: 'Acesso negado: permissões insuficientes para este ambiente.',
      });
    }

    next();
  };
};

export const requireTenantAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const dbUser = req.dbUser;
  if (!dbUser) {
    return res.status(401).json({ error: 'Sessão inválida.' });
  }

  const rawOrgId = req.params.orgId || (req.headers['x-organization-id'] as string);
  const orgId = Number(rawOrgId);

  if (!rawOrgId || Number.isNaN(orgId) || orgId <= 0) {
    return res.status(400).json({ error: 'Identificador de organização inválido.' });
  }

  try {
    const membership = await checkTenantMembership(orgId, dbUser.id);
    if (!membership) {
      await writeAuditLog({
        actorUserId: dbUser.id,
        organizationId: orgId,
        action: 'TENANT_ISOLATION_BLOCKED',
        environment: 'CLIENT',
        details: `Acesso bloqueado à organização #${orgId} para o utilizador ${dbUser.email}.`,
      });
      return res.status(403).json({
        error: 'Isolamento multi-tenant: sem autorização para aceder a esta organização.',
      });
    }

    req.tenantId = orgId;
    next();
  } catch (error) {
    console.error('Error in requireTenantAccess:', error);
    return res
      .status(500)
      .json({ error: 'Erro ao validar isolamento da organização.' });
  }
};
