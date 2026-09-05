import { Router, Response } from 'express';
import { prisma, isDbConnected, memoryDb } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

export const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Application rate limit exceeded. Please wait before applying to more events.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/applications/apply - Worker applies for event
router.post('/apply', authenticate, requireRole(['WORKER']), applicationLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, groupSize = 1, additionalWorkers = [] } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }

    let application: any;

    if (isDbConnected) {
      const workerProfile = await prisma.workerProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!workerProfile || !workerProfile.profilePhotoKey || !workerProfile.idProofKey) {
        return res.status(400).json({
          error: 'Please complete your worker profile — including your profile photo and ID proof upload — before applying for gigs.',
        });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== 'OPEN') {
        return res.status(400).json({ error: 'Event not available for applications.' });
      }

      // 1. Check duplicate application for this event
      const existingApp = await prisma.application.findUnique({
        where: { eventId_workerId: { eventId, workerId: req.user!.id } },
      });
      if (existingApp) {
        return res.status(400).json({ error: 'You have already applied for this catering event.' });
      }

      // 2. Schedule Conflict Rule: Check if worker has an APPROVED application on the same date/time
      const confirmedApps = await prisma.application.findMany({
        where: {
          workerId: req.user!.id,
          status: 'APPROVED',
        },
        include: { event: true },
      });

      const hasConflict = confirmedApps.some(app => {
        if (!app.event) return false;
        const appDateStr = new Date(app.event.date).toISOString().split('T')[0];
        const targetDateStr = new Date(event.date).toISOString().split('T')[0];
        if (appDateStr === targetDateStr) {
          // Same date conflict check
          return true;
        }
        return false;
      });

      if (hasConflict) {
        return res.status(400).json({
          error: 'Schedule Conflict: You are already CONFIRMED (Approved) for another gig on this date. You cannot take overlapping confirmed gigs.',
        });
      }

      const parsedGroupSize = Math.max(1, parseInt(groupSize, 10) || 1);
      const jsonAdditionalWorkers = Array.isArray(additionalWorkers) ? JSON.stringify(additionalWorkers) : null;

      application = await prisma.application.create({
        data: {
          eventId,
          workerId: req.user!.id,
          status: 'APPLIED',
          groupSize: parsedGroupSize,
          additionalWorkers: jsonAdditionalWorkers,
        },
        include: { event: true },
      });
    } else {
      // Memory DB Mode
      const workerProfile = memoryDb.workerProfiles.find(p => p.userId === req.user!.id);
      if (!workerProfile || !workerProfile.profilePhotoKey || !workerProfile.idProofKey) {
        return res.status(400).json({
          error: 'Please complete your worker profile — including your profile photo and ID proof upload — before applying for gigs.',
        });
      }

      const event = memoryDb.events.find(e => e.id === eventId);
      if (!event || event.status !== 'OPEN') {
        return res.status(400).json({ error: 'Event not available for applications.' });
      }

      const existing = memoryDb.applications.find(a => a.eventId === eventId && a.workerId === req.user!.id);
      if (existing) {
        return res.status(400).json({ error: 'You have already applied for this catering event.' });
      }

      // Schedule Conflict Check in Memory Mode
      const confirmedApps = memoryDb.applications.filter(a => a.workerId === req.user!.id && a.status === 'APPROVED');
      const hasConflict = confirmedApps.some(app => {
        if (!app.event) return false;
        const appDateStr = new Date(app.event.date).toISOString().split('T')[0];
        const targetDateStr = new Date(event.date).toISOString().split('T')[0];
        return appDateStr === targetDateStr;
      });

      if (hasConflict) {
        return res.status(400).json({
          error: 'Schedule Conflict: You are already CONFIRMED (Approved) for another gig on this date. You cannot take overlapping confirmed gigs.',
        });
      }

      const parsedGroupSize = Math.max(1, parseInt(groupSize, 10) || 1);

      const eventSummary = {
        id: event.id,
        title: event.title,
        category: event.category,
        description: event.description,
        location: event.location,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        workersNeeded: event.workersNeeded,
        payPerWorker: event.payPerWorker,
        status: event.status,
      };

      application = {
        id: `app_${Date.now()}`,
        eventId,
        workerId: req.user!.id,
        status: 'APPLIED',
        groupSize: parsedGroupSize,
        additionalWorkers: Array.isArray(additionalWorkers) ? additionalWorkers : [],
        rating: null,
        attendanceConfirmed: false,
        checkInPhoto: null,
        checkInLat: null,
        checkInLng: null,
        checkInTime: null,
        checkOutPhoto: null,
        checkOutLat: null,
        checkOutLng: null,
        checkOutTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        event: eventSummary,
        worker: {
          id: req.user!.id,
          phone: req.user!.phone,
          workerProfile,
        },
      };

      memoryDb.applications.push(application);
      if (!event.applications) event.applications = [];
      
      // Store clean application without circular event reference in event.applications
      const appForEvent = {
        ...application,
        event: undefined,
      };
      event.applications.push(appForEvent);
      if (event._count) event._count.applications = event.applications.length;
    }

    return res.status(201).json({ message: 'Application submitted successfully!', application });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit application.' });
  }
});

// GET /api/applications/my-applications - Worker tracks their applications
router.get('/my-applications', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    if (isDbConnected) {
      const applications = await prisma.application.findMany({
        where: { workerId: req.user!.id },
        include: {
          event: { include: { agent: { select: { id: true, phone: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ applications });
    } else {
      const apps = memoryDb.applications.filter(a => a.workerId === req.user!.id);
      return res.json({ applications: apps });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch applications.' });
  }
});

// PATCH /api/applications/:id/status - Agent approves, rejects, or rates worker attendance (1-5 Stars)
router.patch('/:id/status', authenticate, requireRole(['AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    const { status, rating, attendanceConfirmed } = req.body;
    const { id } = req.params;

    if (!['APPROVED', 'REJECTED', 'COMPLETED', 'APPLIED', 'PAID'].includes(status)) {
      return res.status(400).json({ error: 'Invalid application status.' });
    }

    let updatedApp: any;

    if (isDbConnected) {
      const application = await prisma.application.findUnique({
        where: { id },
        include: { event: true },
      });

      if (!application) return res.status(404).json({ error: 'Application not found.' });

      updatedApp = await prisma.application.update({
        where: { id },
        data: { status },
        include: { worker: { include: { workerProfile: true } }, event: true },
      });
    } else {
      const appItem = memoryDb.applications.find(a => a.id === id);
      if (!appItem) return res.status(404).json({ error: 'Application not found.' });
      
      appItem.status = status;

      // ✅ CRITICAL FIX: Sync status to event's applications array so UI updates correctly
      const syncEvtItem = memoryDb.events.find(e => e.id === appItem.eventId);
      if (syncEvtItem && syncEvtItem.applications) {
        const syncEvtApp = syncEvtItem.applications.find((a: any) => a.id === id);
        if (syncEvtApp) {
          syncEvtApp.status = status;
          if (rating && typeof rating === 'number') {
            syncEvtApp.rating = Math.min(5, Math.max(1, rating));
          }
        }
      }

      if (rating && typeof rating === 'number') {
        appItem.rating = Math.min(5, Math.max(1, rating));
        appItem.attendanceConfirmed = true;

        // Update worker profile average rating in memory
        if (appItem.worker?.workerProfile) {
          const prof = appItem.worker.workerProfile;
          const currentRatings = prof.totalRatings || 1;
          const currentAvg = prof.rating || 4.5;
          const newAvg = Number(((currentAvg * currentRatings + rating) / (currentRatings + 1)).toFixed(1));
          prof.rating = newAvg;
          prof.totalRatings = currentRatings + 1;
        }
      }
      updatedApp = appItem;
    }

    return res.json({ message: `Worker application status updated to ${status}`, application: updatedApp });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
});

// POST /api/applications/:id/check-in - Worker checks in at workplace
router.post('/:id/check-in', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { checkInPhoto, latitude, longitude } = req.body;

    if (!checkInPhoto || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'checkInPhoto, latitude, and longitude are required.' });
    }

    let updatedApp: any;
    const checkInTime = new Date();

    if (isDbConnected) {
      const application = await prisma.application.findUnique({
        where: { id },
        include: { event: true }
      });
      if (!application) return res.status(404).json({ error: 'Application not found.' });
      if (application.workerId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You can only check-in for your own applications.' });
      }
      if (application.status !== 'APPROVED') {
        return res.status(400).json({ error: 'You can only check-in for APPROVED applications.' });
      }

      updatedApp = await prisma.application.update({
        where: { id },
        data: {
          checkInPhoto,
          checkInLat: parseFloat(latitude),
          checkInLng: parseFloat(longitude),
          checkInTime
        },
        include: { event: true }
      });
    } else {
      const appItem = memoryDb.applications.find(a => a.id === id);
      if (!appItem) return res.status(404).json({ error: 'Application not found.' });
      if (appItem.workerId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You can only check-in for your own applications.' });
      }
      if (appItem.status !== 'APPROVED') {
        return res.status(400).json({ error: 'You can only check-in for APPROVED applications.' });
      }

      appItem.checkInPhoto = checkInPhoto;
      appItem.checkInLat = parseFloat(latitude);
      appItem.checkInLng = parseFloat(longitude);
      appItem.checkInTime = checkInTime;

      // Sync with event's applications list
      const eventItem = memoryDb.events.find(e => e.id === appItem.eventId);
      if (eventItem && eventItem.applications) {
        const evtApp = eventItem.applications.find((a: any) => a.id === id);
        if (evtApp) {
          evtApp.checkInPhoto = checkInPhoto;
          evtApp.checkInLat = parseFloat(latitude);
          evtApp.checkInLng = parseFloat(longitude);
          evtApp.checkInTime = checkInTime;
        }
      }
      updatedApp = appItem;
    }

    return res.json({ message: 'Checked-in successfully!', application: updatedApp });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to check-in.' });
  }
});

// POST /api/applications/:id/check-out - Worker checks out from workplace
router.post('/:id/check-out', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { checkOutPhoto, latitude, longitude } = req.body;

    if (!checkOutPhoto || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'checkOutPhoto, latitude, and longitude are required.' });
    }

    let updatedApp: any;
    const checkOutTime = new Date();
    const paymentDueDays = parseInt(process.env.PAYMENT_DUE_DAYS || '3', 10);
    const paymentDueAt = new Date(checkOutTime.getTime() + paymentDueDays * 24 * 60 * 60 * 1000);

    if (isDbConnected) {
      const application = await prisma.application.findUnique({
        where: { id },
        include: { event: true }
      });
      if (!application) return res.status(404).json({ error: 'Application not found.' });
      if (application.workerId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You can only check-out for your own applications.' });
      }
      if (application.status !== 'APPROVED') {
        return res.status(400).json({ error: 'You can only check-out for APPROVED applications.' });
      }
      if (!application.checkInTime) {
        return res.status(400).json({ error: 'You must check-in first before checking out.' });
      }

      updatedApp = await prisma.application.update({
        where: { id },
        data: {
          checkOutPhoto,
          checkOutLat: parseFloat(latitude),
          checkOutLng: parseFloat(longitude),
          checkOutTime,
          // Uploading the Out-Time photo starts the payment clock.
          paymentStatus: 'PENDING',
          paymentDueAt,
        },
        include: { event: true }
      });
    } else {
      const appItem = memoryDb.applications.find(a => a.id === id);
      if (!appItem) return res.status(404).json({ error: 'Application not found.' });
      if (appItem.workerId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You can only check-out for your own applications.' });
      }
      if (appItem.status !== 'APPROVED') {
        return res.status(400).json({ error: 'You can only check-out for APPROVED applications.' });
      }
      if (!appItem.checkInTime) {
        return res.status(400).json({ error: 'You must check-in first before checking out.' });
      }

      appItem.checkOutPhoto = checkOutPhoto;
      appItem.checkOutLat = parseFloat(latitude);
      appItem.checkOutLng = parseFloat(longitude);
      appItem.checkOutTime = checkOutTime;
      appItem.paymentStatus = 'PENDING';
      appItem.paymentDueAt = paymentDueAt;

      // Sync with event's applications list
      const eventItem = memoryDb.events.find(e => e.id === appItem.eventId);
      if (eventItem && eventItem.applications) {
        const evtApp = eventItem.applications.find((a: any) => a.id === id);
        if (evtApp) {
          evtApp.checkOutPhoto = checkOutPhoto;
          evtApp.checkOutLat = parseFloat(latitude);
          evtApp.checkOutLng = parseFloat(longitude);
          evtApp.checkOutTime = checkOutTime;
          evtApp.paymentStatus = 'PENDING';
          evtApp.paymentDueAt = paymentDueAt;
        }
      }
      updatedApp = appItem;
    }

    return res.json({ message: 'Checked-out successfully! Payment is now pending.', application: updatedApp });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to check-out.' });
  }
});

// PATCH /api/applications/:id/payment-confirm - Worker confirms payment received → sets status to PAID
router.patch('/:id/payment-confirm', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isDbConnected) {
      const application = await prisma.application.findUnique({
        where: { id },
        include: { event: true }
      });
      if (!application) return res.status(404).json({ error: 'Application not found.' });
      if (application.workerId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: This is not your application.' });
      }
      if (application.status !== 'COMPLETED') {
        return res.status(400).json({ error: 'Payment can only be confirmed for COMPLETED applications.' });
      }

      const updatedApp = await prisma.application.update({
        where: { id },
        data: { status: 'PAID' as any, paymentStatus: 'PAID', paymentPaidAt: application.paymentPaidAt || new Date() },
        include: { event: true }
      });
      return res.json({ message: 'Payment confirmed! Order is now complete.', application: updatedApp });
    } else {
      const appItem = memoryDb.applications.find((a: any) => a.id === id);
      if (!appItem) return res.status(404).json({ error: 'Application not found.' });
      if (appItem.workerId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: This is not your application.' });
      }
      if (appItem.status !== 'COMPLETED') {
        return res.status(400).json({ error: 'Payment can only be confirmed for COMPLETED applications.' });
      }
      appItem.status = 'PAID';
      appItem.paymentStatus = 'PAID';
      appItem.paymentPaidAt = appItem.paymentPaidAt || new Date();

      // Sync to event's applications list
      const eventItem = memoryDb.events.find((e: any) => e.id === appItem.eventId);
      if (eventItem && eventItem.applications) {
        const evtApp = eventItem.applications.find((a: any) => a.id === id);
        if (evtApp) {
          evtApp.status = 'PAID';
          evtApp.paymentStatus = 'PAID';
          evtApp.paymentPaidAt = appItem.paymentPaidAt;
        }
      }

      return res.json({ message: 'Payment confirmed! Order is now complete.', application: appItem });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to confirm payment.' });
  }
});

// PATCH /api/applications/:id/mark-paid - Agent marks a worker's payment as Paid, with UTR/proof
router.patch('/:id/mark-paid', authenticate, requireRole(['AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentReference, paymentProofKey } = req.body;

    if (!paymentProofKey) {
      return res.status(400).json({ error: 'A payment proof screenshot is required to mark payment as paid.' });
    }

    const paymentPaidAt = new Date();

    if (isDbConnected) {
      const application = await prisma.application.findUnique({
        where: { id },
        include: { event: true },
      });
      if (!application) return res.status(404).json({ error: 'Application not found.' });
      if (application.event.agentId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You can only mark payment for your own events.' });
      }
      if (application.paymentStatus !== 'PENDING') {
        return res.status(400).json({ error: 'Payment can only be marked paid while it is Pending (the worker must check out first).' });
      }

      const updatedApp = await prisma.application.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          paymentPaidAt,
          paymentReference: paymentReference && String(paymentReference).trim() ? String(paymentReference).trim() : undefined,
          paymentProofKey,
        },
        include: { event: true, worker: { include: { workerProfile: true } } },
      });
      return res.json({ message: 'Payment marked as paid.', application: updatedApp });
    } else {
      const appItem = memoryDb.applications.find((a: any) => a.id === id);
      if (!appItem) return res.status(404).json({ error: 'Application not found.' });
      const eventItem = memoryDb.events.find((e: any) => e.id === appItem.eventId);
      if (!eventItem || (eventItem.agentId !== req.user!.id && eventItem.agentId !== 'agent-demo-id')) {
        return res.status(403).json({ error: 'Forbidden: You can only mark payment for your own events.' });
      }
      if (appItem.paymentStatus !== 'PENDING') {
        return res.status(400).json({ error: 'Payment can only be marked paid while it is Pending (the worker must check out first).' });
      }

      appItem.paymentStatus = 'PAID';
      appItem.paymentPaidAt = paymentPaidAt;
      appItem.paymentReference = paymentReference && String(paymentReference).trim() ? String(paymentReference).trim() : null;
      appItem.paymentProofKey = paymentProofKey;

      if (eventItem.applications) {
        const evtApp = eventItem.applications.find((a: any) => a.id === id);
        if (evtApp) {
          evtApp.paymentStatus = 'PAID';
          evtApp.paymentPaidAt = paymentPaidAt;
          evtApp.paymentReference = appItem.paymentReference;
          evtApp.paymentProofKey = paymentProofKey;
        }
      }

      return res.json({ message: 'Payment marked as paid.', application: appItem });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to mark payment as paid.' });
  }
});

// DELETE /api/applications/:id - Worker cancels their own pending application
router.delete('/:id', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isDbConnected) {
      const application = await prisma.application.findUnique({ where: { id } });
      if (!application) return res.status(404).json({ error: 'Application not found.' });
      if (application.workerId !== req.user!.id)
        return res.status(403).json({ error: 'Forbidden: You can only cancel your own applications.' });
      if (application.status !== 'APPLIED')
        return res.status(400).json({ error: 'You can only cancel applications that are still pending (APPLIED).' });
      await prisma.application.delete({ where: { id } });
    } else {
      const index = memoryDb.applications.findIndex(a => a.id === id);
      if (index === -1) return res.status(404).json({ error: 'Application not found.' });
      const appItem = memoryDb.applications[index];
      if (appItem.workerId !== req.user!.id)
        return res.status(403).json({ error: 'Forbidden: You can only cancel your own applications.' });
      if (appItem.status !== 'APPLIED')
        return res.status(400).json({ error: 'You can only cancel applications that are still pending.' });

      // Remove from main applications list
      memoryDb.applications.splice(index, 1);

      // Remove from event's applications array
      const eventItem = memoryDb.events.find(e => e.id === appItem.eventId);
      if (eventItem && eventItem.applications) {
        const evtAppIdx = eventItem.applications.findIndex((a: any) => a.id === id);
        if (evtAppIdx !== -1) {
          eventItem.applications.splice(evtAppIdx, 1);
          if (eventItem._count) eventItem._count.applications = eventItem.applications.length;
        }
      }
    }

    return res.json({ message: 'Application cancelled successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to cancel application.' });
  }
});

export default router;
