import { Express } from 'express';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db/index.ts';
import {
  aiAgents,
  aiUsageLogs,
  auditLogs,
  backupSnapshots,
  integrations,
  notifications,
  organizationInvites,
  organizationMembers,
  organizations,
  platformReleases,
  productsServices,
  prospectingCampaigns,
  subscriptionPlans,
  supportTickets,
  systemConfig,
  users,
} from '../db/schema.ts';
import { writeAuditLog } from '../db/repository.ts';
import {
  AuthRequest,
  requireAuth,
  requireGlobalRole,
  requireTenantAccess,
} from '../middleware/auth.ts';

export function registerOperationRoutes(app: Express) {
  // ==========================================
  // USER PROFILE
  // ==========================================
  app.patch('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name } = req.body || {};
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res
          .status(400)
          .json({ error: 'O nome deve ter pelo menos 2 caracteres.' });
      }
      const [updated] = await db
        .update(users)
        .set({ name: name.trim() })
        .where(eq(users.id, req.dbUser!.id))
        .returning();

      await writeAuditLog({
        actorUserId: req.dbUser!.id,
        action: 'PROFILE_UPDATED',
        environment: 'CLIENT',
        details: `Nome atualizado para "${name.trim()}".`,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao atualizar perfil.' });
    }
  });

  // ==========================================
  // CLIENT: DASHBOARD METRICS & ORG UPDATE
  // ==========================================
  app.get(
    '/api/client/organizations/:orgId/metrics',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [invites, products, agents, unreadNotifs, usage] =
          await Promise.all([
            db
              .select()
              .from(organizationInvites)
              .where(
                and(
                  eq(organizationInvites.organizationId, orgId),
                  eq(organizationInvites.status, 'PENDING')
                )
              ),
            db
              .select()
              .from(productsServices)
              .where(eq(productsServices.organizationId, orgId)),
            db
              .select()
              .from(aiAgents)
              .where(eq(aiAgents.organizationId, orgId)),
            db
              .select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.organizationId, orgId),
                  eq(notifications.isRead, false)
                )
              ),
            db
              .select({
                total: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)`,
              })
              .from(aiUsageLogs)
              .where(
                and(
                  eq(aiUsageLogs.organizationId, orgId),
                  gte(aiUsageLogs.createdAt, startOfMonth)
                )
              ),
          ]);

        res.json({
          pendingInvitesCount: invites.length,
          productsCount: products.length,
          agentsCount: agents.length,
          unreadNotificationsCount: unreadNotifs.length,
          monthlyAiTokens: Number(usage[0]?.total || 0),
        });
      } catch (error: any) {
        res.status(500).json({ error: 'Erro ao carregar métricas da organização.' });
      }
    }
  );

  app.patch(
    '/api/client/organizations/:orgId',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const { name, sector, description } = req.body || {};
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
          return res.status(400).json({ error: 'Nome da organização inválido.' });
        }

        const [updated] = await db
          .update(organizations)
          .set({
            name: name.trim(),
            sector: typeof sector === 'string' ? sector.trim() : undefined,
            description:
              typeof description === 'string' ? description.trim() : undefined,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, orgId))
          .returning();

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: 'ORGANIZATION_UPDATED',
          environment: 'CLIENT',
          details: `Dados da organização "${updated.name}" atualizados.`,
        });

        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: 'Erro ao atualizar organização.' });
      }
    }
  );

  // ==========================================
  // CLIENT: INVITES & MEMBERS MANAGEMENT
  // ==========================================
  app.get(
    '/api/client/organizations/:orgId/invites',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const rows = await db
          .select()
          .from(organizationInvites)
          .where(eq(organizationInvites.organizationId, req.tenantId!))
          .orderBy(desc(organizationInvites.createdAt));
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar convites.' });
      }
    }
  );

  app.post(
    '/api/client/organizations/:orgId/invites',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const { email, orgRole } = req.body || {};
        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return res.status(400).json({ error: 'Email inválido.' });
        }
        const role = orgRole === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'MEMBER';

        const [invite] = await db
          .insert(organizationInvites)
          .values({
            organizationId: orgId,
            email: email.trim().toLowerCase(),
            orgRole: role,
            status: 'PENDING',
            invitedByUserId: req.dbUser!.id,
          })
          .returning();

        await db.insert(notifications).values({
          organizationId: orgId,
          title: 'Convite enviado',
          message: `Convite enviado para ${invite.email} com função ${role}.`,
          category: 'INFO',
        });

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: 'MEMBER_INVITED',
          environment: 'CLIENT',
          details: `Convite criado para ${invite.email} (${role}).`,
        });

        res.status(201).json(invite);
      } catch {
        res.status(500).json({ error: 'Erro ao criar convite.' });
      }
    }
  );

  app.patch(
    '/api/client/organizations/:orgId/invites/:inviteId',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const inviteId = Number(req.params.inviteId);
        const { status } = req.body || {};
        if (!['CANCELLED', 'ACCEPTED'].includes(status)) {
          return res.status(400).json({ error: 'Estado de convite inválido.' });
        }

        const [updated] = await db
          .update(organizationInvites)
          .set({ status })
          .where(
            and(
              eq(organizationInvites.id, inviteId),
              eq(organizationInvites.organizationId, orgId)
            )
          )
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Convite não encontrado.' });
        }

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: `INVITE_${status}`,
          environment: 'CLIENT',
          details: `Convite para ${updated.email} alterado para ${status}.`,
        });

        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar convite.' });
      }
    }
  );

  app.patch(
    '/api/client/organizations/:orgId/members/:memberUserId',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const memberUserId = Number(req.params.memberUserId);
        const { orgRole } = req.body || {};
        if (!['ORG_ADMIN', 'MEMBER'].includes(orgRole)) {
          return res.status(400).json({ error: 'Função inválida.' });
        }

        const [updated] = await db
          .update(organizationMembers)
          .set({ orgRole })
          .where(
            and(
              eq(organizationMembers.organizationId, orgId),
              eq(organizationMembers.userId, memberUserId)
            )
          )
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Membro não encontrado.' });
        }

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: 'MEMBER_ROLE_UPDATED',
          environment: 'CLIENT',
          details: `Membro #${memberUserId} alterado para ${orgRole}.`,
        });

        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar função do membro.' });
      }
    }
  );

  app.delete(
    '/api/client/organizations/:orgId/members/:memberUserId',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const memberUserId = Number(req.params.memberUserId);
        if (memberUserId === req.dbUser!.id) {
          return res
            .status(400)
            .json({ error: 'Não pode remover a sua própria conta da organização.' });
        }

        await db
          .delete(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, orgId),
              eq(organizationMembers.userId, memberUserId)
            )
          );

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: 'MEMBER_REMOVED',
          environment: 'CLIENT',
          details: `Membro #${memberUserId} removido da organização.`,
        });

        res.json({ success: true });
      } catch {
        res.status(500).json({ error: 'Erro ao remover membro.' });
      }
    }
  );

  // ==========================================
  // CLIENT: NOTIFICATIONS (ALERTAS)
  // ==========================================
  app.get(
    '/api/client/organizations/:orgId/notifications',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const rows = await db
          .select()
          .from(notifications)
          .where(eq(notifications.organizationId, req.tenantId!))
          .orderBy(desc(notifications.createdAt))
          .limit(50);
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar alertas.' });
      }
    }
  );

  app.patch(
    '/api/client/organizations/:orgId/notifications/:notifId/read',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const [updated] = await db
          .update(notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(notifications.id, Number(req.params.notifId)),
              eq(notifications.organizationId, req.tenantId!)
            )
          )
          .returning();
        res.json(updated || { success: true });
      } catch {
        res.status(500).json({ error: 'Erro ao marcar alerta como lido.' });
      }
    }
  );

  app.post(
    '/api/client/organizations/:orgId/notifications/read-all',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.organizationId, req.tenantId!));
        res.json({ success: true });
      } catch {
        res
          .status(500)
          .json({ error: 'Erro ao marcar todos os alertas como lidos.' });
      }
    }
  );

  // ==========================================
  // CLIENT: PRODUCTS & SERVICES
  // ==========================================
  app.get(
    '/api/client/organizations/:orgId/products',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const rows = await db
          .select()
          .from(productsServices)
          .where(eq(productsServices.organizationId, req.tenantId!))
          .orderBy(desc(productsServices.createdAt));
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar produtos e serviços.' });
      }
    }
  );

  app.post(
    '/api/client/organizations/:orgId/products',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const { name, type, category, priceEur, description } = req.body || {};
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
          return res.status(400).json({ error: 'Nome obrigatório.' });
        }
        const priceCents = Math.max(0, Math.round(Number(priceEur || 0) * 100));

        const [created] = await db
          .insert(productsServices)
          .values({
            organizationId: orgId,
            name: name.trim(),
            type: type === 'PRODUTO' ? 'PRODUTO' : 'SERVICO',
            category: typeof category === 'string' && category.trim() ? category.trim() : 'Geral',
            priceCents,
            description: typeof description === 'string' ? description.trim() : null,
            active: true,
          })
          .returning();

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: 'PRODUCT_CREATED',
          environment: 'CLIENT',
          details: `${created.type} "${created.name}" registado.`,
        });

        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao registar produto/serviço.' });
      }
    }
  );

  app.patch(
    '/api/client/organizations/:orgId/products/:productId',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const productId = Number(req.params.productId);
        const { name, type, category, priceEur, description, active } =
          req.body || {};

        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
        if (type === 'PRODUTO' || type === 'SERVICO') updateData.type = type;
        if (typeof category === 'string') updateData.category = category.trim();
        if (priceEur !== undefined)
          updateData.priceCents = Math.max(0, Math.round(Number(priceEur) * 100));
        if (typeof description === 'string')
          updateData.description = description.trim();
        if (typeof active === 'boolean') updateData.active = active;

        const [updated] = await db
          .update(productsServices)
          .set(updateData)
          .where(
            and(
              eq(productsServices.id, productId),
              eq(productsServices.organizationId, orgId)
            )
          )
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Registo não encontrado.' });
        }
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar produto/serviço.' });
      }
    }
  );

  app.delete(
    '/api/client/organizations/:orgId/products/:productId',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const productId = Number(req.params.productId);
        await db
          .delete(productsServices)
          .where(
            and(
              eq(productsServices.id, productId),
              eq(productsServices.organizationId, orgId)
            )
          );
        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: 'PRODUCT_DELETED',
          environment: 'CLIENT',
          details: `Produto/serviço #${productId} eliminado.`,
        });
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: 'Erro ao eliminar produto/serviço.' });
      }
    }
  );

  // ==========================================
  // CLIENT: AI AGENTS (REAL GEMINI EXECUTION)
  // ==========================================
  app.get(
    '/api/client/organizations/:orgId/ai-agents',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const rows = await db
          .select()
          .from(aiAgents)
          .where(eq(aiAgents.organizationId, req.tenantId!))
          .orderBy(desc(aiAgents.createdAt));
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar agentes de IA.' });
      }
    }
  );

  app.post(
    '/api/client/organizations/:orgId/ai-agents',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const { name, model, instructions } = req.body || {};
        if (!name || !instructions) {
          return res
            .status(400)
            .json({ error: 'Nome e instruções do agente são obrigatórios.' });
        }

        const [created] = await db
          .insert(aiAgents)
          .values({
            organizationId: orgId,
            name: String(name).trim(),
            model:
              typeof model === 'string' && model.trim()
                ? model.trim()
                : 'gemini-2.5-flash',
            instructions: String(instructions).trim(),
            active: true,
          })
          .returning();

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: 'AI_AGENT_CREATED',
          environment: 'CLIENT',
          details: `Agente de IA "${created.name}" criado.`,
        });

        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao criar agente de IA.' });
      }
    }
  );

  app.patch(
    '/api/client/organizations/:orgId/ai-agents/:agentId',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const agentId = Number(req.params.agentId);
        const { name, model, instructions, active } = req.body || {};
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
        if (typeof model === 'string' && model.trim())
          updateData.model = model.trim();
        if (typeof instructions === 'string' && instructions.trim())
          updateData.instructions = instructions.trim();
        if (typeof active === 'boolean') updateData.active = active;

        const [updated] = await db
          .update(aiAgents)
          .set(updateData)
          .where(
            and(eq(aiAgents.id, agentId), eq(aiAgents.organizationId, orgId))
          )
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Agente não encontrado.' });
        }
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar agente.' });
      }
    }
  );

  app.delete(
    '/api/client/organizations/:orgId/ai-agents/:agentId',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        await db
          .delete(aiAgents)
          .where(
            and(
              eq(aiAgents.id, Number(req.params.agentId)),
              eq(aiAgents.organizationId, req.tenantId!)
            )
          );
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: 'Erro ao eliminar agente.' });
      }
    }
  );

  app.post(
    '/api/client/organizations/:orgId/ai-agents/:agentId/test',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const orgId = req.tenantId!;
        const agentId = Number(req.params.agentId);
        const { prompt } = req.body || {};
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
          return res.status(400).json({ error: 'Escreva uma mensagem para testar.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
          return res.status(503).json({
            error:
              'Serviço de IA não configurado: defina GEMINI_API_KEY nas variáveis de ambiente do servidor.',
          });
        }

        const [agent] = await db
          .select()
          .from(aiAgents)
          .where(
            and(eq(aiAgents.id, agentId), eq(aiAgents.organizationId, orgId))
          )
          .limit(1);

        if (!agent) {
          return res.status(404).json({ error: 'Agente não encontrado.' });
        }
        if (!agent.active) {
          return res
            .status(400)
            .json({ error: 'Este agente está desativado. Ative-o para testar.' });
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: agent.model || 'gemini-2.5-flash',
          contents: prompt.trim(),
          config: {
            systemInstruction: agent.instructions,
          },
        });

        const text = response.text || 'Sem resposta devolvida pelo modelo.';
        const promptTokens = response.usageMetadata?.promptTokenCount || 0;
        const responseTokens =
          response.usageMetadata?.candidatesTokenCount || 0;
        const totalTokens =
          response.usageMetadata?.totalTokenCount ||
          promptTokens + responseTokens;

        await db.insert(aiUsageLogs).values({
          organizationId: orgId,
          agentId: agent.id,
          userId: req.dbUser!.id,
          model: agent.model,
          promptTokens,
          responseTokens,
          totalTokens,
        });

        res.json({
          reply: text,
          usage: { promptTokens, responseTokens, totalTokens },
        });
      } catch (error: any) {
        console.error('AI test error:', error);
        res.status(500).json({
          error:
            error?.message ||
            'Não foi possível executar o agente de IA. Verifique a configuração da API.',
        });
      }
    }
  );

  // CLIENT: OPEN SUPPORT TICKET
  app.post(
    '/api/client/organizations/:orgId/support',
    requireAuth,
    requireTenantAccess,
    async (req: AuthRequest, res) => {
      try {
        const { subject, message } = req.body || {};
        if (!subject || !message) {
          return res
            .status(400)
            .json({ error: 'Assunto e mensagem são obrigatórios.' });
        }
        const [ticket] = await db
          .insert(supportTickets)
          .values({
            organizationId: req.tenantId!,
            createdByUserId: req.dbUser!.id,
            subject: String(subject).trim(),
            message: String(message).trim(),
            status: 'OPEN',
          })
          .returning();
        res.status(201).json(ticket);
      } catch {
        res.status(500).json({ error: 'Erro ao submeter pedido de suporte.' });
      }
    }
  );

  // ==========================================
  // MASTER: USER STATUS, ORG UPDATE, SUPPORT, PLANS
  // ==========================================
  app.patch(
    '/api/master/users/:userId/status',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const targetId = Number(req.params.userId);
        const { status } = req.body || {};
        if (!['ACTIVE', 'SUSPENDED', 'BLOCKED'].includes(status)) {
          return res.status(400).json({ error: 'Estado inválido.' });
        }
        if (targetId === req.dbUser!.id && status !== 'ACTIVE') {
          return res
            .status(400)
            .json({ error: 'Não pode suspender a sua própria conta.' });
        }

        const [updated] = await db
          .update(users)
          .set({ status })
          .where(eq(users.id, targetId))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          action: 'USER_STATUS_UPDATED',
          environment: 'MASTER',
          details: `Utilizador ${updated.email} alterado para ${status}.`,
        });

        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao alterar estado do utilizador.' });
      }
    }
  );

  app.patch(
    '/api/master/organizations/:orgId',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const orgId = Number(req.params.orgId);
        const { name, sector, plan, status } = req.body || {};
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
        if (typeof sector === 'string') updateData.sector = sector.trim();
        if (typeof plan === 'string') updateData.plan = plan;
        if (['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status))
          updateData.status = status;

        const [updated] = await db
          .update(organizations)
          .set(updateData)
          .where(eq(organizations.id, orgId))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Organização não encontrada.' });
        }

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          organizationId: orgId,
          action: 'ORGANIZATION_ADMIN_UPDATED',
          environment: 'MASTER',
          details: `Organização "${updated.name}" atualizada (estado: ${updated.status}, plano: ${updated.plan}).`,
        });

        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar organização.' });
      }
    }
  );

  app.get(
    '/api/master/support',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req, res) => {
      try {
        const rows = await db
          .select({
            id: supportTickets.id,
            subject: supportTickets.subject,
            message: supportTickets.message,
            reply: supportTickets.reply,
            status: supportTickets.status,
            createdAt: supportTickets.createdAt,
            organizationName: organizations.name,
            userEmail: users.email,
          })
          .from(supportTickets)
          .leftJoin(
            organizations,
            eq(supportTickets.organizationId, organizations.id)
          )
          .leftJoin(users, eq(supportTickets.createdByUserId, users.id))
          .orderBy(desc(supportTickets.createdAt));
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar pedidos de suporte.' });
      }
    }
  );

  app.patch(
    '/api/master/support/:ticketId',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const ticketId = Number(req.params.ticketId);
        const { reply, status } = req.body || {};
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (typeof reply === 'string') updateData.reply = reply.trim();
        if (['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status))
          updateData.status = status;

        const [updated] = await db
          .update(supportTickets)
          .set(updateData)
          .where(eq(supportTickets.id, ticketId))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Pedido não encontrado.' });
        }
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar pedido de suporte.' });
      }
    }
  );

  app.get(
    '/api/master/plans',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req, res) => {
      try {
        const rows = await db
          .select()
          .from(subscriptionPlans)
          .orderBy(subscriptionPlans.priceCents);
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar planos.' });
      }
    }
  );

  app.post(
    '/api/master/plans',
    requireAuth,
    requireGlobalRole(['OWNER']),
    async (req: AuthRequest, res) => {
      try {
        const { code, name, priceEur, maxMembers, maxAiTokens, features } =
          req.body || {};
        if (!code || !name) {
          return res.status(400).json({ error: 'Código e nome obrigatórios.' });
        }
        const [created] = await db
          .insert(subscriptionPlans)
          .values({
            code: String(code).trim().toUpperCase(),
            name: String(name).trim(),
            priceCents: Math.max(0, Math.round(Number(priceEur || 0) * 100)),
            maxMembers: Number(maxMembers || 5),
            maxAiTokens: Number(maxAiTokens || 50000),
            features: String(features || '').trim(),
            active: true,
          })
          .returning();
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao criar plano.' });
      }
    }
  );

  app.patch(
    '/api/master/plans/:planId',
    requireAuth,
    requireGlobalRole(['OWNER']),
    async (req: AuthRequest, res) => {
      try {
        const { active, maxMembers, maxAiTokens, priceEur } = req.body || {};
        const updateData: Record<string, any> = {};
        if (typeof active === 'boolean') updateData.active = active;
        if (maxMembers !== undefined) updateData.maxMembers = Number(maxMembers);
        if (maxAiTokens !== undefined)
          updateData.maxAiTokens = Number(maxAiTokens);
        if (priceEur !== undefined)
          updateData.priceCents = Math.max(0, Math.round(Number(priceEur) * 100));

        const [updated] = await db
          .update(subscriptionPlans)
          .set(updateData)
          .where(eq(subscriptionPlans.id, Number(req.params.planId)))
          .returning();
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar plano.' });
      }
    }
  );

  // ==========================================
  // DEVELOPER CONSOLE: INTEGRATIONS, PROSPECTING, RELEASES, BACKUPS, COSTS, CONFIG
  // ==========================================
  app.get(
    '/api/developer/integrations',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req, res) => {
      try {
        const rows = await db.select().from(integrations);
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar integrações.' });
      }
    }
  );

  app.post(
    '/api/developer/integrations',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const { code, name, category, description, endpointUrl } =
          req.body || {};
        if (!code || !name) {
          return res.status(400).json({ error: 'Código e nome obrigatórios.' });
        }
        const [created] = await db
          .insert(integrations)
          .values({
            code: String(code).trim().toUpperCase(),
            name: String(name).trim(),
            category: String(category || 'API').trim(),
            description: String(description || '').trim(),
            endpointUrl: endpointUrl ? String(endpointUrl).trim() : null,
            active: false,
          })
          .onConflictDoUpdate({
            target: integrations.code,
            set: {
              name: String(name).trim(),
              description: String(description || '').trim(),
              endpointUrl: endpointUrl ? String(endpointUrl).trim() : null,
              updatedAt: new Date(),
            },
          })
          .returning();
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao guardar integração.' });
      }
    }
  );

  app.patch(
    '/api/developer/integrations/:id',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const { active, endpointUrl } = req.body || {};
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (typeof active === 'boolean') updateData.active = active;
        if (typeof endpointUrl === 'string')
          updateData.endpointUrl = endpointUrl.trim();

        const [updated] = await db
          .update(integrations)
          .set(updateData)
          .where(eq(integrations.id, Number(req.params.id)))
          .returning();
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar integração.' });
      }
    }
  );

  app.post(
    '/api/developer/integrations/:id/test',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const [item] = await db
          .select()
          .from(integrations)
          .where(eq(integrations.id, Number(req.params.id)))
          .limit(1);
        if (!item) {
          return res.status(404).json({ error: 'Integração não encontrada.' });
        }

        let statusText = 'NÃO CONFIGURADA (credencial externa em falta)';
        if (item.code === 'GEMINI_AI') {
          statusText =
            process.env.GEMINI_API_KEY &&
            process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
              ? 'OPERACIONAL (GEMINI_API_KEY detetada no servidor)'
              : 'PENDENTE (GEMINI_API_KEY não configurada)';
        } else if (item.endpointUrl) {
          statusText = 'ENDPOINT REGISTADO (requer credenciais externas)';
        }

        const [updated] = await db
          .update(integrations)
          .set({
            lastTestStatus: statusText,
            lastTestedAt: new Date(),
          })
          .where(eq(integrations.id, item.id))
          .returning();

        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao testar integração.' });
      }
    }
  );

  app.get(
    '/api/developer/prospecting',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req, res) => {
      try {
        const rows = await db
          .select()
          .from(prospectingCampaigns)
          .orderBy(desc(prospectingCampaigns.createdAt));
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar campanhas.' });
      }
    }
  );

  app.post(
    '/api/developer/prospecting',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        const { name, targetSector, targetRegion, notes } = req.body || {};
        if (!name || !targetSector || !targetRegion) {
          return res.status(400).json({
            error: 'Nome, setor e região alvo são obrigatórios.',
          });
        }
        const [created] = await db
          .insert(prospectingCampaigns)
          .values({
            name: String(name).trim(),
            targetSector: String(targetSector).trim(),
            targetRegion: String(targetRegion).trim(),
            notes: notes ? String(notes).trim() : null,
            status: 'DRAFT',
          })
          .returning();
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao criar campanha.' });
      }
    }
  );

  app.delete(
    '/api/developer/prospecting/:id',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (req: AuthRequest, res) => {
      try {
        await db
          .delete(prospectingCampaigns)
          .where(eq(prospectingCampaigns.id, Number(req.params.id)));
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: 'Erro ao eliminar campanha.' });
      }
    }
  );

  app.get(
    '/api/developer/releases',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req, res) => {
      try {
        const rows = await db
          .select()
          .from(platformReleases)
          .orderBy(desc(platformReleases.createdAt));
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar versões.' });
      }
    }
  );

  app.post(
    '/api/developer/releases',
    requireAuth,
    requireGlobalRole(['OWNER']),
    async (req: AuthRequest, res) => {
      try {
        const { version, title, notes } = req.body || {};
        if (!version || !title || !notes) {
          return res
            .status(400)
            .json({ error: 'Versão, título e notas são obrigatórios.' });
        }
        const [created] = await db
          .insert(platformReleases)
          .values({
            version: String(version).trim(),
            title: String(title).trim(),
            notes: String(notes).trim(),
            publishedByUserId: req.dbUser!.id,
          })
          .returning();
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao registar versão.' });
      }
    }
  );

  app.get(
    '/api/developer/backups',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req, res) => {
      try {
        const rows = await db
          .select()
          .from(backupSnapshots)
          .orderBy(desc(backupSnapshots.createdAt))
          .limit(20);
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar backups.' });
      }
    }
  );

  app.post(
    '/api/developer/backups',
    requireAuth,
    requireGlobalRole(['OWNER']),
    async (req: AuthRequest, res) => {
      try {
        const [orgCount, userCount, logCount] = await Promise.all([
          db.select({ c: sql<number>`count(*)` }).from(organizations),
          db.select({ c: sql<number>`count(*)` }).from(users),
          db.select({ c: sql<number>`count(*)` }).from(auditLogs),
        ]);

        const summary = `Snapshot lógico verificado: ${orgCount[0]?.c || 0} org(s), ${userCount[0]?.c || 0} utilizador(es), ${logCount[0]?.c || 0} registo(s) de auditoria.`;

        const [created] = await db
          .insert(backupSnapshots)
          .values({
            triggeredByUserId: req.dbUser!.id,
            status: 'COMPLETED',
            summary,
          })
          .returning();

        await writeAuditLog({
          actorUserId: req.dbUser!.id,
          action: 'BACKUP_SNAPSHOT_CREATED',
          environment: 'DEVELOPER',
          details: summary,
        });

        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao executar backup.' });
      }
    }
  );

  app.get(
    '/api/developer/costs',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req, res) => {
      try {
        const logs = await db
          .select()
          .from(aiUsageLogs)
          .orderBy(desc(aiUsageLogs.createdAt))
          .limit(50);
        const totalTokens = logs.reduce((acc, l) => acc + l.totalTokens, 0);
        res.json({
          totalRequests: logs.length,
          totalTokens,
          billingProviderConnected: false,
          recentUsage: logs,
        });
      } catch {
        res.status(500).json({ error: 'Erro ao carregar consumo técnico.' });
      }
    }
  );

  app.get(
    '/api/developer/config',
    requireAuth,
    requireGlobalRole(['OWNER', 'ADMIN']),
    async (_req, res) => {
      try {
        const rows = await db.select().from(systemConfig);
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Erro ao carregar configurações.' });
      }
    }
  );

  app.patch(
    '/api/developer/config',
    requireAuth,
    requireGlobalRole(['OWNER']),
    async (req: AuthRequest, res) => {
      try {
        const { key, value } = req.body || {};
        if (!key || typeof value !== 'string') {
          return res.status(400).json({ error: 'Chave e valor obrigatórios.' });
        }
        if (key === 'owner_initialized') {
          return res
            .status(403)
            .json({ error: 'Esta chave de segurança não pode ser alterada.' });
        }

        const [updated] = await db
          .insert(systemConfig)
          .values({ key: String(key), value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: systemConfig.key,
            set: { value, updatedAt: new Date() },
          })
          .returning();

        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao guardar configuração.' });
      }
    }
  );
}
