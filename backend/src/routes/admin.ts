import { Router, Response } from 'express';
import { prisma, isDbConnected, memoryDb } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Shapes one complaint (+ its application/event/worker/agent/payment context) for the Admin
// review screen. ID proof documents are NEVER included by value here — only a boolean flag
// saying one exists. The admin UI fetches the actual document via the separate, authenticated
// GET /api/profile/id-proof/:role/:userId route, which is the only path that can serve it.
function shapeComplaintDb(c: any) {
  const application = c.application;
  const event = application?.event;
  const workerProfile = application?.worker?.workerProfile;
  const agentProfile = event?.agent?.agentProfile;

  return {
    id: c.id,
    reason: c.reason,
    status: c.status,
    adminNotes: c.adminNotes,
    resolvedAt: c.resolvedAt,
    createdAt: c.createdAt,
    worker: {
      id: c.workerId,
      phone: application?.worker?.phone,
      name: workerProfile?.name || 'Worker',
      profilePhotoKey: workerProfile?.profilePhotoKey || null,
      gpayNumber: workerProfile?.gpayNumber || null,
      hasIdProof: !!workerProfile?.idProofKey,
    },
    agent: {
      id: c.agentId,
      phone: agentProfile?.phone || event?.agent?.phone,
      name: agentProfile?.name || 'Agent',
      whatsappNumber: agentProfile?.whatsappNumber || null,
      hasIdProof: !!agentProfile?.originalProofDoc,
    },
    event: event ? {
      id: event.id,
      title: event.title,
      location: event.location,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      payPerWorker: event.payPerWorker,
    } : null,
    application: application ? {
      id: application.id,
      checkInPhoto: application.checkInPhoto,
      checkInTime: application.checkInTime,
      checkInLat: application.checkInLat,
      checkInLng: application.checkInLng,
      checkOutPhoto: application.checkOutPhoto,
      checkOutTime: application.checkOutTime,
      checkOutLat: application.checkOutLat,
      checkOutLng: application.checkOutLng,
      paymentStatus: application.paymentStatus,
      paymentDueAt: application.paymentDueAt,
      paymentPaidAt: application.paymentPaidAt,
      paymentReference: application.paymentReference,
      paymentProofKey: application.paymentProofKey,
    } : null,
  };
}

function shapeComplaintMemory(c: any) {
  const application = memoryDb.applications.find((a: any) => a.id === c.applicationId);
  const event = memoryDb.events.find((e: any) => e.id === application?.eventId);
  const workerUser = memoryDb.users.find((u: any) => u.id === c.workerId);
  const workerProfile = memoryDb.workerProfiles.find((p: any) => p.userId === c.workerId);
  const agentProfile = memoryDb.agentProfiles?.find((p: any) => p.userId === c.agentId || p.userId === event?.agentId);

  return {
    id: c.id,
    reason: c.reason,
    status: c.status,
    adminNotes: c.adminNotes || null,
    resolvedAt: c.resolvedAt || null,
    createdAt: c.createdAt,
    worker: {
      id: c.workerId,
      phone: workerUser?.phone || workerProfile?.contactPhone,
      name: workerProfile?.name || 'Worker',
      profilePhotoKey: workerProfile?.profilePhotoKey || null,
      gpayNumber: workerProfile?.gpayNumber || null,
      hasIdProof: !!workerProfile?.idProofKey,
    },
    agent: {
      id: c.agentId,
      phone: agentProfile?.phone,
      name: agentProfile?.name || 'Agent',
      whatsappNumber: agentProfile?.whatsappNumber || null,
      hasIdProof: !!agentProfile?.originalProofDoc,
    },
    event: event ? {
      id: event.id,
      title: event.title,
      location: event.location,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      payPerWorker: event.payPerWorker,
    } : null,
    application: application ? {
      id: application.id,
      checkInPhoto: application.checkInPhoto,
      checkInTime: application.checkInTime,
      checkInLat: application.checkInLat,
      checkInLng: application.checkInLng,
      checkOutPhoto: application.checkOutPhoto,
      checkOutTime: application.checkOutTime,
      checkOutLat: application.checkOutLat,
      checkOutLng: application.checkOutLng,
      paymentStatus: application.paymentStatus,
      paymentDueAt: application.paymentDueAt,
      paymentPaidAt: application.paymentPaidAt,
      paymentReference: application.paymentReference,
      paymentProofKey: application.paymentProofKey,
    } : null,
  };
}

// GET /api/admin/complaints - Admin lists all payment complaints for investigation
router.get('/complaints', authenticate, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    if (isDbConnected) {
      const complaints = await (prisma as any).complaint.findMany({
        include: {
          application: {
            include: {
              worker: { include: { workerProfile: true } },
              event: { include: { agent: { include: { agentProfile: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ complaints: complaints.map(shapeComplaintDb) });
    } else {
      const complaints = (memoryDb.complaints || []).map(shapeComplaintMemory);
      return res.json({ complaints });
    }
  } catch (error: any) {
    console.error('Error fetching admin complaints:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch complaints.' });
  }
});

// PATCH /api/admin/complaints/:id - Admin resolves a complaint as genuine or invalid
router.patch('/complaints/:id', authenticate, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['RESOLVED_GENUINE', 'RESOLVED_INVALID'].includes(status)) {
      return res.status(400).json({ error: 'status must be RESOLVED_GENUINE or RESOLVED_INVALID.' });
    }

    const resolvedAt = new Date();

    if (isDbConnected) {
      const existing = await (prisma as any).complaint.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Complaint not found.' });

      const updated = await (prisma as any).complaint.update({
        where: { id },
        data: { status, adminNotes: adminNotes || null, resolvedAt },
        include: {
          application: {
            include: {
              worker: { include: { workerProfile: true } },
              event: { include: { agent: { include: { agentProfile: true } } } },
            },
          },
        },
      });
      return res.json({ message: 'Complaint updated.', complaint: shapeComplaintDb(updated) });
    } else {
      const complaint = (memoryDb.complaints || []).find((c: any) => c.id === id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
      complaint.status = status;
      complaint.adminNotes = adminNotes || null;
      complaint.resolvedAt = resolvedAt;
      complaint.updatedAt = resolvedAt;
      return res.json({ message: 'Complaint updated.', complaint: shapeComplaintMemory(complaint) });
    }
  } catch (error: any) {
    console.error('Error updating complaint:', error);
    return res.status(500).json({ error: error.message || 'Failed to update complaint.' });
  }
});

export default router;
