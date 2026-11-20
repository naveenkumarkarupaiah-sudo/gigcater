import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_AGENT_ID,
  HttpError,
  canAgentModifyApplication,
  canWorkerModifyApplication,
  ensureAgentOwnsApplication,
  ensureWorkerOwnsApplication,
  isAgentEventOwner,
  isAllowedAgentStatusTransition,
} from './authorization';

const application = (workerId: string, agentId: string) => ({
  workerId,
  event: { agentId },
});

test('agent may only modify applications on its own events', () => {
  const app = application('worker-1', 'agent-1');

  assert.equal(canAgentModifyApplication('agent-1', app), true);
  assert.equal(canAgentModifyApplication('agent-2', app), false);
  assert.equal(canAgentModifyApplication(undefined, app), false);
  assert.equal(canAgentModifyApplication('agent-1', null), false);
});

test('ensureAgentOwnsApplication throws 403 for a foreign agent and passes for the owner', () => {
  const app = application('worker-1', 'agent-1');

  assert.doesNotThrow(() => ensureAgentOwnsApplication('agent-1', app));

  assert.throws(
    () => ensureAgentOwnsApplication('agent-2', app),
    (err: unknown) => err instanceof HttpError && err.status === 403
  );
});

test('ensureAgentOwnsApplication fails closed when the event relation is missing', () => {
  assert.throws(
    () => ensureAgentOwnsApplication('agent-1', { workerId: 'worker-1' } as any),
    (err: unknown) => err instanceof HttpError && err.status === 500
  );
});

test('worker may only modify its own applications', () => {
  const app = application('worker-1', 'agent-1');

  assert.equal(canWorkerModifyApplication('worker-1', app), true);
  assert.equal(canWorkerModifyApplication('worker-2', app), false);
  assert.equal(canWorkerModifyApplication('agent-1', app), false);

  assert.doesNotThrow(() => ensureWorkerOwnsApplication('worker-1', app));
  assert.throws(
    () => ensureWorkerOwnsApplication('worker-2', app),
    (err: unknown) => err instanceof HttpError && err.status === 403
  );
});

test('the demo agent bypass works in development but never in production', () => {
  const original = process.env.NODE_ENV;

  try {
    delete process.env.NODE_ENV;
    assert.equal(isAgentEventOwner('any-agent', DEMO_AGENT_ID), true);

    process.env.NODE_ENV = 'development';
    assert.equal(isAgentEventOwner('any-agent', DEMO_AGENT_ID), true);

    process.env.NODE_ENV = 'production';
    assert.equal(isAgentEventOwner('any-agent', DEMO_AGENT_ID), false);
    assert.equal(canAgentModifyApplication('any-agent', application('worker-1', DEMO_AGENT_ID)), false);
    // A real owner is still authorized in production.
    assert.equal(isAgentEventOwner('agent-1', 'agent-1'), true);
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  }
});

test('agent status transitions follow the approval workflow', () => {
  assert.equal(isAllowedAgentStatusTransition('APPLIED', 'APPROVED'), true);
  assert.equal(isAllowedAgentStatusTransition('APPLIED', 'REJECTED'), true);
  assert.equal(isAllowedAgentStatusTransition('APPROVED', 'COMPLETED'), true);
  assert.equal(isAllowedAgentStatusTransition('APPROVED', 'REJECTED'), true);

  // Idempotent re-save (e.g. re-submitting a rating) is tolerated.
  assert.equal(isAllowedAgentStatusTransition('COMPLETED', 'COMPLETED'), true);

  // Agents cannot mark payments as PAID (the worker confirms receipt) and
  // cannot move an application back to APPLIED.
  assert.equal(isAllowedAgentStatusTransition('COMPLETED', 'PAID'), false);
  assert.equal(isAllowedAgentStatusTransition('APPLIED', 'PAID'), false);
  assert.equal(isAllowedAgentStatusTransition('APPROVED', 'APPLIED'), false);
  assert.equal(isAllowedAgentStatusTransition('REJECTED', 'APPROVED'), false);
  assert.equal(isAllowedAgentStatusTransition('PAID', 'COMPLETED'), false);
});
