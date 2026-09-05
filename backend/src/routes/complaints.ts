import { Router, Response } from 'express';
import { prisma, isDbConnected, memoryDb } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/complaints - Worker raises a late-payment complaint against an agent.
// The agent's contact details are NOT revealed immediately — an Admin investigates first
// (sees the event/worker/agent, payment details, and work photos) and only once they mark the
// complaint genuine does the worker learn the agent's contact details (see GET /my-complaints).
router.post('/', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, reason } = req.body;

    if (!applicationId || !reason) {
      return res.status(400).json({ error: 'applicationId and reason are required.' });
    }

    if (isDbConnected) {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { event: true },
      });

      if (!application) return res.status(404).json({ error: 'Application not found.' });
      if (application.workerId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: This is not your application.' });
      }

      const lateCheck = checkPaymentOverdue(application.paymentStatus, application.paymentDueAt);
      if (lateCheck.error) return res.status(400).json({ error: lateCheck.error });

      const existing = await (prisma as any).complaint.findFirst({
        where: { applicationId, workerId: req.user!.id }
      });
      if (existing) {
        return res.status(400).json({ error: 'You have already filed a complaint for this application.' });
      }

      const complaint = await (prisma as any).complaint.create({
        data: {
          applicationId,
          workerId: req.user!.id,
          agentId: application.event.agentId,
          reason,
          status: 'PENDING'
        }
      });

      return res.status(201).json({
        message: 'Complaint submitted. Our team will investigate the payment issue and get back to you.',
        complaint,
      });
    } else {
      const application = memoryDb.applications.find((a: any) => a.id === applicationId);
      if (!application) return res.status(404).json({ error: 'Application not found.' });
      if (application.workerId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: This is not your application.' });
      }

      const lateCheck = checkPaymentOverdue(application.paymentStatus, application.paymentDueAt);
      if (lateCheck.error) return res.status(400).json({ error: lateCheck.error });

      if (!memoryDb.complaints) memoryDb.complaints = [];
      const existing = memoryDb.complaints.find((c: any) => c.applicationId === applicationId && c.workerId === req.user!.id);
      if (existing) {
        return res.status(400).json({ error: 'You have already filed a complaint for this application.' });
      }

      const event = memoryDb.events.find((e: any) => e.id === application.eventId);

      const complaint = {
        id: `cmp_${Date.now()}`,
        applicationId,
        workerId: req.user!.id,
        agentId: event?.agentId || '',
        reason,
        status: 'PENDING',
        adminNotes: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryDb.complaints.push(complaint);

      return res.status(201).json({
        message: 'Complaint submitted. Our team will investigate the payment issue and get back to you.',
        complaint,
      });
    }
  } catch (error: any) {
    console.error('Error filing complaint:', error);
    return res.status(500).json({ error: error.message || 'Failed to file complaint.' });
  }
});

// Shared late-payment gate used by the complaint route above.
function checkPaymentOverdue(paymentStatus: string | null | undefined, paymentDueAt: Date | string | null | undefined): { error?: string } {
  if (!paymentStatus) {
    return { error: 'You can only raise a payment complaint after you have checked out of the event.' };
  }
  if (paymentStatus === 'PAID') {
    return { error: 'Payment has already been marked as paid for this application.' };
  }
  if (!paymentDueAt || new Date(paymentDueAt) > new Date()) {
    const dueLabel = paymentDueAt ? new Date(paymentDueAt).toLocaleString() : 'the allowed time';
    return { error: `Payment is not overdue yet. The agent has until ${dueLabel} to pay before you can raise a complaint.` };
  }
  return {};
}

// GET /api/complaints/my-complaints - Worker views their complaints.
// Agent contact details are only included once an Admin has marked the complaint genuine.
router.get('/my-complaints', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    if (isDbConnected) {
      const complaints = await (prisma as any).complaint.findMany({
        where: { workerId: req.user!.id },
        include: {
          application: {
            include: {
              event: {
                include: {
                  agent: { include: { agentProfile: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const shaped = complaints.map((c: any) => {
        const agentProfile = c.application?.event?.agent?.agentProfile;
        return {
          ...c,
          agentContactDetails: c.status === 'RESOLVED_GENUINE' ? {
            name: agentProfile?.name || 'Agent',
            phone: agentProfile?.phone || c.application?.event?.agent?.phone || 'N/A',
            whatsappNumber: agentProfile?.whatsappNumber || 'N/A',
            eventTitle: c.application?.event?.title,
            payPerWorker: c.application?.event?.payPerWorker,
          } : null,
        };
      });
      return res.json({ complaints: shaped });
    } else {
      if (!memoryDb.complaints) memoryDb.complaints = [];
      const complaints = memoryDb.complaints
        .filter((c: any) => c.workerId === req.user!.id)
        .map((c: any) => {
          const event = memoryDb.events.find((e: any) => e.id === memoryDb.applications.find((a: any) => a.id === c.applicationId)?.eventId);
          const agentProfile = memoryDb.agentProfiles?.find((p: any) => p.userId === event?.agentId);
          return {
            ...c,
            agentContactDetails: c.status === 'RESOLVED_GENUINE' ? {
              name: agentProfile?.name || 'Agent',
              phone: agentProfile?.phone || 'N/A',
              whatsappNumber: agentProfile?.whatsappNumber || 'N/A',
              eventTitle: event?.title || 'Catering Event',
              payPerWorker: event?.payPerWorker || 0,
            } : null,
          };
        });
      return res.json({ complaints });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch complaints.' });
  }
});

export default router;
