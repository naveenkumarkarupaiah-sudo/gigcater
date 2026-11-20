/**
 * Authorization helpers shared by the event and application routes.
 *
 * The pure predicate functions are exported separately from the throwing
 * wrappers so they can be unit-tested without a database or an Express server.
 */

export type ApplicationOwnershipShape =
  | {
      workerId?: string | null;
      event?: { agentId?: string | null } | null;
    }
  | null
  | undefined;

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Seeded demo agent used by the in-memory fallback database. */
export const DEMO_AGENT_ID = 'agent-demo-id';

/**
 * The demo-agent ownership bypass only exists so the seeded in-memory data is
 * usable during local development. It is disabled in production, where the API
 * already fails closed whenever the database is unavailable.
 */
export function isDemoAgentBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function isDemoAgent(agentId: string | null | undefined): boolean {
  return isDemoAgentBypassEnabled() && agentId === DEMO_AGENT_ID;
}

/** True when `userId` is the agent that owns the event (or the dev demo agent). */
export function isAgentEventOwner(
  userId: string | null | undefined,
  agentId: string | null | undefined
): boolean {
  if (!userId || !agentId) return false;
  return agentId === userId || isDemoAgent(agentId);
}

export function canAgentModifyApplication(
  userId: string | null | undefined,
  application: ApplicationOwnershipShape
): boolean {
  return isAgentEventOwner(userId, application?.event?.agentId);
}

export function canWorkerModifyApplication(
  userId: string | null | undefined,
  application: ApplicationOwnershipShape
): boolean {
  return !!userId && application?.workerId === userId;
}

/**
 * Status transitions an AGENT may perform. `PAID` stays worker-driven (the
 * worker confirms receipt), and `APPLIED` is the creation state.
 */
const AGENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  APPLIED: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED', 'REJECTED'],
  REJECTED: [],
  COMPLETED: [],
  PAID: [],
};

export function isAllowedAgentStatusTransition(from: string, to: string): boolean {
  if (!from || !to) return false;
  // Idempotent re-save (e.g. the agent re-submits a rating on COMPLETED).
  if (from === to) return true;
  return (AGENT_STATUS_TRANSITIONS[from] || []).includes(to);
}

export function ensureAgentOwnsApplication(
  userId: string,
  application: ApplicationOwnershipShape
): void {
  if (!application?.event?.agentId) {
    // Defensive: the caller must load the related event before authorizing.
    throw new HttpError(500, 'Application data incomplete');
  }
  if (!canAgentModifyApplication(userId, application)) {
    throw new HttpError(403, 'Forbidden: You can only update applications for your own events.');
  }
}

export function ensureWorkerOwnsApplication(
  userId: string,
  application: ApplicationOwnershipShape
): void {
  if (!canWorkerModifyApplication(userId, application)) {
    throw new HttpError(403, 'Forbidden: You can only modify your own applications.');
  }
}
