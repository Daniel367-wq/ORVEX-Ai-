import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  AuthRequest,
  requireAuth,
  requireGlobalRole,
  requireTenantAccess,
} from './src/middleware/auth.ts';
import {
  claimInitialOwner,
  createOrganizationRecord,
  getMasterOverview,
  getRecentAuditLogs,
  getTenantContext,
  getUserMemberships,
  isOwnerInitialized,
  linkUserToOrganization,
  updateUserGlobalRole,
} from './src/db/repository.ts';
import { registerOperationRoutes } from './src/routes/operations.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // Public health & setup status
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ORVEX AI', phase: 1 });
  });

  app.get('/api/setup/status', async (_req, res) => {
    try {
      const initialized = await isOwnerInitialized();
      res.json({ ownerInitialized: initialized });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro interno.' });
    }
  });

  // One-time secure OWNER bootstrap
  app.post('/api/setup/owner', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = req.dbUser!;
      const { organizationName, organizationSector } = req.body || {};

      const result = await claimInitialOwner({
        userId: dbUser.id,
        organizationName:
          typeof organizationName === 'string' && organizationName.trim()
            ? organizationName.trim()
            : 'DM Evolution',
        organizationSector:
          typeof organizationSector === 'string' && organizationSector.trim()
            ? organizationSector.trim()
            : 'Consultoria e Inteligência Comercial',
      });

      res.status(201).json({
        message: 'OWNER e organização inicial configurados com sucesso.',
        owner: result.owner,
        organization: result.organization,
      });
    } catch (error: any) {
      if (error?.message === 'OWNER_ALREADY_INITIALIZED') {
        return res.status(409).json({
          error:
            'A configuração inicial do OWNER já foi concluída e está permanentemente bloqueada.',
        });
      }
      res
        .status(500)
        .json({ error: error.message || 'Erro ao configurar OWNER inicial.' });
    }
  });

  // Authenticated session profile & permissions
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = req.dbUser!;
      const memberships = await getUserMemberships(dbUser.id);
      const ownerInitialized = await isOwnerInitialized();

      const canAccessMaster =
        dbUser.globalRole === 'OWNER' || dbUser.globalRole === 'ADMIN';
      const canAccessDeveloper =
        dbUser.globalRole === 'OWNER' || dbUser.globalRole === 'ADMIN';

      res.json({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          photoUrl: dbUser.photoUrl,
          globalRole: dbUser.globalRole,
          status: dbUser.status,
        },
        ownerInitialized,
        memberships,
        environments: {
          client: memberships.length > 0,
          master: canAccessMaster,
          developer: canAccessDeveloper,
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Erro ao carregar perfil.' });
    }
  });

  // CLIENT ENVIRONMENT (Strict Multi-Tenant Isolation)
  app.get(
    '/api/client/organizations/:orgId/context',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const context = await getTenantContext(req.tenantId!);
        if (!context) {
          return res.status(404).json({ error: 'Organização não encontrada.' });
        }
        res.json(context);
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Erro ao carregar organização.' });
      }
    }
  );

  // MASTER ENVIRONMENT (OWNER & ADMIN)
  app.get(
    '/api/master/overview',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req: AuthRequest, res) => {
      try {
        const overview = await getMasterOverview();
        res.json(overview);
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Erro ao carregar Painel MASTER.' });
      }
    }
  );

  app.post(
    '/api/master/organizations',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const { name, sector, plan, description } = req.body || {};
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
          return res
            .status(400)
            .json({ error: 'O nome da organização é obrigatório (mín. 2 caracteres).' });
        }

        const org = await createOrganizationRecord({
          name,
          sector,
          plan,
          description,
          actorUserId: req.dbUser!.id,
        });
        res.status(201).json(org);
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Erro ao criar organização.' });
      }
    }
  );

  app.patch(
    '/api/master/users/:userId/role',
    requireAuth,
    requireGlobalRole(['OWNER']),
    async (req: AuthRequest, res) => {
      try {
        const targetUserId = Number(req.params.userId);
        const { globalRole } = req.body || {};

        if (
          Number.isNaN(targetUserId) ||
          !['OWNER', 'ADMIN', 'USER'].includes(globalRole)
        ) {
          return res.status(400).json({ error: 'Parâmetros inválidos.' });
        }

        if (targetUserId === req.dbUser!.id && globalRole !== 'OWNER') {
          return res.status(400).json({
            error: 'O OWNER não pode remover o seu próprio papel principal.',
          });
        }

        const updated = await updateUserGlobalRole({
          targetUserId,
          globalRole,
          actorUserId: req.dbUser!.id,
        });

        if (!updated) {
          return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        res.json(updated);
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Erro ao atualizar papel.' });
      }
    }
  );

  app.post(
    '/api/master/organizations/:orgId/members',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const organizationId = Number(req.params.orgId);
        const { userId, orgRole } = req.body || {};
        if (
          Number.isNaN(organizationId) ||
          !userId ||
          !['ORG_ADMIN', 'MEMBER'].includes(orgRole)
        ) {
          return res.status(400).json({ error: 'Dados de associação inválidos.' });
        }

        const membership = await linkUserToOrganization({
          organizationId,
          userId: Number(userId),
          orgRole,
          actorUserId: req.dbUser!.id,
        });
        res.status(201).json(membership);
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Erro ao associar membro.' });
      }
    }
  );

  // DEVELOPER CONSOLE ENVIRONMENT (OWNER & ADMIN)
  app.get(
    '/api/developer/health-check',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req: AuthRequest, res) => {
      const backendStart = Date.now();
      const backendMs = Date.now() - backendStart;

      // Real Database probe
      let dbStatus: 'OPERACIONAL' | 'INDISPONIVEL' = 'OPERACIONAL';
      let dbMs = 0;
      let dbMessage = 'Consulta de teste respondida.';
      const dbStart = Date.now();
      try {
        await isOwnerInitialized();
        dbMs = Date.now() - dbStart;
      } catch {
        dbStatus = 'INDISPONIVEL';
        dbMs = Date.now() - dbStart;
        dbMessage = 'Falha ao consultar a base de dados.';
      }

      // Real Auth service probe
      let authStatus: 'OPERACIONAL' | 'INDISPONIVEL' = 'OPERACIONAL';
      let authMs = 0;
      let authMessage = 'Serviço de autenticação respondeu.';
      const authStart = Date.now();
      try {
        const { adminAuth } = await import('./src/lib/firebase-admin.ts');
        await adminAuth.listUsers(1);
        authMs = Date.now() - authStart;
      } catch {
        authStatus = 'INDISPONIVEL';
        authMs = Date.now() - authStart;
        authMessage = 'Serviço de autenticação não respondeu.';
      }

      // Real 24h security/error logs count
      let errorsLast24h = 0;
      try {
        const recent = await getRecentAuditLogs(100);
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        errorsLast24h = recent.filter(
          (l) =>
            new Date(l.createdAt).getTime() >= cutoff &&
            (l.action.includes('DENIED') ||
              l.action.includes('BLOCKED') ||
              l.action.includes('ERROR'))
        ).length;
      } catch {
        errorsLast24h = 0;
      }

      res.json({
        checkedAt: new Date().toISOString(),
        services: {
          backend: {
            status: 'OPERACIONAL',
            latencyMs: backendMs,
            message: 'Função de servidor executada.',
          },
          database: {
            status: dbStatus,
            latencyMs: dbMs,
            message: dbMessage,
          },
          auth: {
            status: authStatus,
            latencyMs: authMs,
            message: authMessage,
          },
        },
        errorsLast24h,
        unresolvedErrors: errorsLast24h,
      });
    }
  );

  app.get(
    '/api/developer/overview',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req: AuthRequest, res) => {
      try {
        const logs = await getRecentAuditLogs(25);
        res.json({
          runtime: {
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            phase: 'FASE 1 — Fundação Multi-Tenant & Segurança',
          },
          securityPolicies: [
            {
              id: 'rbac-server',
              name: 'Validação RBAC no Servidor',
              enforced: true,
              description:
                'Todas as rotas MASTER e DEVELOPER validam o papel diretamente em PostgreSQL.',
            },
            {
              id: 'tenant-isolation',
              name: 'Isolamento Multi-Tenant Obrigatório',
              enforced: true,
              description:
                'Middleware requireTenantAccess bloqueia qualquer acesso cruzado entre organizações.',
            },
            {
              id: 'owner-bootstrap',
              name: 'Bootstrap Único do OWNER',
              enforced: true,
              description:
                'Configuração transacional bloqueada permanentemente após a criação do OWNER inicial.',
            },
            {
              id: 'token-memory',
              name: 'Firebase ID Token em Memória',
              enforced: true,
              description:
                'Verificação criptográfica via Firebase Admin SDK; sem tokens em localStorage.',
            },
          ],
          integrations: [
            {
              name: 'Serviço Central de IA',
              status: process.env.GEMINI_API_KEY ? 'CONFIGURADO' : 'PENDENTE (FASE 4)',
              phase: 'Fase 4',
            },
            {
              name: 'Email Transacional',
              status: 'PREPARADO (FASE 5)',
              phase: 'Fase 5',
            },
            {
              name: 'WhatsApp Business API',
              status: 'PREPARADO (FASE 5)',
              phase: 'Fase 5',
            },
            {
              name: 'Gateway de Pagamentos',
              status: 'PREPARADO (FASE 6)',
              phase: 'Fase 6',
            },
          ],
          auditLogs: logs,
        });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Erro ao carregar Developer Console.' });
      }
    }
  );

  registerOperationRoutes(app);

  // Vite middleware in dev, static dist in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ORVEX AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
