import { Router, Response } from 'express';
import { prisma, isDbConnected, memoryDb } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/events
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { location, search } = req.query;

    if (isDbConnected) {
      const whereClause: any = { status: 'OPEN' };
      if (location && typeof location === 'string' && location.trim() !== '') {
        whereClause.location = { contains: location.trim(), mode: 'insensitive' };
      }
      if (search && typeof search === 'string' && search.trim() !== '') {
        whereClause.OR = [
          { title: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
          { location: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }
      const events = await prisma.event.findMany({
        where: whereClause,
        include: {
          agent: { select: { id: true, phone: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ events });
    } else {
      let filtered = memoryDb.events.filter(e => e.status === 'OPEN');
      if (location && typeof location === 'string' && location.trim() !== '') {
        filtered = filtered.filter(e => e.location.toLowerCase().includes((location as string).toLowerCase().trim()));
      }
      if (search && typeof search === 'string' && search.trim() !== '') {
        const q = (search as string).toLowerCase().trim();
        filtered = filtered.filter(e => e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)));
      }
      return res.json({ events: filtered });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

// GET /api/events/my-events
router.get('/my-events', authenticate, requireRole(['AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    if (isDbConnected) {
      const events = await prisma.event.findMany({
        where: { agentId: req.user!.id },
        include: {
          applications: {
            include: {
              worker: { include: { workerProfile: true } },
            },
          },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ events });
    } else {
      const events = memoryDb.events.filter(e => e.agentId === req.user!.id || e.agentId === 'agent-demo-id');
      return res.json({ events });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch your events.' });
  }
});

// GET /api/events/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let event: any;
    if (isDbConnected) {
      event = await prisma.event.findUnique({
        where: { id: req.params.id },
        include: {
          agent: { select: { id: true, phone: true } },
          applications: {
            include: {
              worker: { select: { id: true, phone: true, workerProfile: true } },
            },
          },
        },
      });
    } else {
      event = memoryDb.events.find(e => e.id === req.params.id);
    }

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    return res.json({ event });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch event details.' });
  }
});

// POST /api/events
router.post('/', authenticate, requireRole(['AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    const { title, category, description, location, date, startTime, endTime, workersNeeded, payPerWorker } = req.body;

    if (!title || !location || !date || !startTime || !endTime || !workersNeeded || !payPerWorker) {
      return res.status(400).json({ error: 'All event details are required.' });
    }

    // Ensure Agent Profile exists (auto-create if missing so event creation never fails)
    let agentProfile: any;
    if (isDbConnected) {
      agentProfile = await prisma.agentProfile.findUnique({
        where: { userId: req.user!.id },
      });
      if (!agentProfile) {
        agentProfile = await prisma.agentProfile.create({
          data: {
            userId: req.user!.id,
            name: `Agent (${req.user!.phone.slice(-4)})`,
            phone: req.user!.phone,
            whatsappNumber: req.user!.phone,
            verificationStatus: 'VERIFIED',
          },
        });
      }
    } else {
      agentProfile = memoryDb.agentProfiles.find(p => p.userId === req.user!.id);
      if (!agentProfile) {
        agentProfile = {
          id: `ag_prof_${Date.now()}`,
          userId: req.user!.id,
          name: `Agent (${req.user!.phone.slice(-4)})`,
          phone: req.user!.phone,
          whatsappNumber: req.user!.phone,
          verificationStatus: 'VERIFIED',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryDb.agentProfiles.push(agentProfile);
      }
    }

    const categoryName = category && typeof category === 'string' && category.trim() !== '' ? category.trim() : 'Banquet Serving';

    let event: any;
    if (isDbConnected) {
      event = await prisma.event.create({
        data: {
          agentId: req.user!.id,
          title: title.trim(),
          category: categoryName,
          description: description ? description.trim() : '',
          location: location.trim(),
          date: new Date(date),
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          workersNeeded: parseInt(workersNeeded, 10),
          payPerWorker: parseFloat(payPerWorker),
          status: 'OPEN',
        },
      });
    } else {
      event = {
        id: `evt_${Date.now()}`,
        agentId: req.user!.id,
        title: title.trim(),
        category: categoryName,
        description: description ? description.trim() : '',
        location: location.trim(),
        date: new Date(date),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        workersNeeded: parseInt(workersNeeded, 10),
        payPerWorker: parseFloat(payPerWorker),
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        agent: { id: req.user!.id, phone: req.user!.phone },
        applications: [],
        _count: { applications: 0 },
      };
      memoryDb.events.unshift(event);
    }

    return res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create event.' });
  }
});

// DELETE /api/events/:id - Agent deletes their posted event
router.delete('/:id', authenticate, requireRole(['AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isDbConnected) {
      const existingEvent = await prisma.event.findUnique({ where: { id } });
      if (!existingEvent) return res.status(404).json({ error: 'Event not found.' });

      if (existingEvent.agentId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own posted events.' });
      }

      await prisma.event.delete({ where: { id } });
    } else {
      const index = memoryDb.events.findIndex(e => e.id === id);
      if (index === -1) return res.status(404).json({ error: 'Event not found.' });

      const evt = memoryDb.events[index];
      if (evt.agentId !== req.user!.id && evt.agentId !== 'agent-demo-id') {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own posted events.' });
      }

      memoryDb.events.splice(index, 1);
      memoryDb.applications = memoryDb.applications.filter(a => a.eventId !== id);
    }

    return res.json({ message: 'Event deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete event.' });
  }
});

// PATCH /api/events/:id/status
router.patch('/:id/status', authenticate, requireRole(['AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!['OPEN', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid event status.' });
    }

    let updatedEvent: any;
    if (isDbConnected) {
      const existingEvent = await prisma.event.findUnique({ where: { id } });
      if (!existingEvent) return res.status(404).json({ error: 'Event not found.' });
      if (existingEvent.agentId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You do not own this event.' });
      }
      updatedEvent = await prisma.event.update({ where: { id }, data: { status } });
    } else {
      const event = memoryDb.events.find(e => e.id === id);
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      event.status = status;
      updatedEvent = event;
    }

    return res.json({ message: `Event status updated to ${status}`, event: updatedEvent });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update event status.' });
  }
});

export default router;
