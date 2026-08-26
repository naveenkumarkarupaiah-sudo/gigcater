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
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }

    let application: any;

    if (isDbConnected) {
      const workerProfile = await prisma.workerProfile.findUnique({
        where: { userId: req.user!.id },
      });
      if (!workerProfile) {
        return res.status(400).json({ error: 'Please complete your worker profile before applying.' });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== 'OPEN') {
        return res.status(400).json({ error: 'Event not available for applications.' });
      }

      application = await prisma.application.create({
        data: {
          eventId,
          workerId: req.user!.id,
          status: 'APPLIED',
        },
        include: { event: true },
      });
    } else {
      let workerProfile = memoryDb.workerProfiles.find(p => p.userId === req.user!.id);
      if (!workerProfile) {
        // Auto-initialize basic profile if worker applies directly
        workerProfile = {
          id: `prof_${Date.now()}`,
          userId: req.user!.id,
          name: `Worker (${req.user!.phone.slice(-4)})`,
          age: 23,
          contactPhone: req.user!.phone,
          profilePhotoKey: null,
          idProofKey: null,
          rating: 4.8,
          totalRatings: 5,
        };
        memoryDb.workerProfiles.push(workerProfile);
      }

      const event = memoryDb.events.find(e => e.id === eventId);
      if (!event || event.status !== 'OPEN') {
        return res.status(400).json({ error: 'Event not available for applications.' });
      }

      const existing = memoryDb.applications.find(a => a.eventId === eventId && a.workerId === req.user!.id);
      if (existing) {
        return res.status(400).json({ error: 'You have already applied for this event.' });
      }

      application = {
        id: `app_${Date.now()}`,
        eventId,
        workerId: req.user!.id,
        status: 'APPLIED',
        rating: null,
        attendanceConfirmed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        event,
        worker: {
          id: req.user!.id,
          phone: req.user!.phone,
          workerProfile,
        },
      };

      memoryDb.applications.push(application);
      if (!event.applications) event.applications = [];
      event.applications.push(application);
      event._count.applications = event.applications.length;
    }

    return res.status(201).json({ message: 'Application submitted successfully!', application });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit application.' });
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

    if (!['APPROVED', 'REJECTED', 'COMPLETED', 'APPLIED'].includes(status)) {
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

export default router;
