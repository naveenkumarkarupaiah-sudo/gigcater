"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/events
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { location, search } = req.query;
        if (prisma_1.isDbConnected) {
            const whereClause = { status: 'OPEN' };
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
            const events = await prisma_1.prisma.event.findMany({
                where: whereClause,
                include: {
                    agent: { select: { id: true, phone: true } },
                    _count: { select: { applications: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            return res.json({ events });
        }
        else {
            let filtered = prisma_1.memoryDb.events.filter(e => e.status === 'OPEN');
            if (location && typeof location === 'string' && location.trim() !== '') {
                filtered = filtered.filter(e => e.location.toLowerCase().includes(location.toLowerCase().trim()));
            }
            if (search && typeof search === 'string' && search.trim() !== '') {
                const q = search.toLowerCase().trim();
                filtered = filtered.filter(e => e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)));
            }
            return res.json({ events: filtered });
        }
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch events.' });
    }
});
// GET /api/events/my-events
router.get('/my-events', auth_1.authenticate, (0, auth_1.requireRole)(['AGENT']), async (req, res) => {
    try {
        if (prisma_1.isDbConnected) {
            const events = await prisma_1.prisma.event.findMany({
                where: { agentId: req.user.id },
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
        }
        else {
            const events = prisma_1.memoryDb.events.filter(e => e.agentId === req.user.id || e.agentId === 'agent-demo-id');
            return res.json({ events });
        }
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch your events.' });
    }
});
// GET /api/events/:id
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        let event;
        if (prisma_1.isDbConnected) {
            event = await prisma_1.prisma.event.findUnique({
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
        }
        else {
            event = prisma_1.memoryDb.events.find(e => e.id === req.params.id);
        }
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        return res.json({ event });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch event details.' });
    }
});
// POST /api/events
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['AGENT']), async (req, res) => {
    try {
        const { title, description, location, date, startTime, endTime, workersNeeded, payPerWorker } = req.body;
        if (!title || !location || !date || !startTime || !endTime || !workersNeeded || !payPerWorker) {
            return res.status(400).json({ error: 'All event details are required.' });
        }
        let event;
        if (prisma_1.isDbConnected) {
            event = await prisma_1.prisma.event.create({
                data: {
                    agentId: req.user.id,
                    title: title.trim(),
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
        }
        else {
            event = {
                id: `evt_${Date.now()}`,
                agentId: req.user.id,
                title: title.trim(),
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
                agent: { id: req.user.id, phone: req.user.phone },
                applications: [],
                _count: { applications: 0 },
            };
            prisma_1.memoryDb.events.unshift(event);
        }
        return res.status(201).json({ message: 'Event created successfully', event });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to create event.' });
    }
});
// PATCH /api/events/:id/status
router.patch('/:id/status', auth_1.authenticate, (0, auth_1.requireRole)(['AGENT']), async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        if (!['OPEN', 'COMPLETED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid event status.' });
        }
        let updatedEvent;
        if (prisma_1.isDbConnected) {
            const existingEvent = await prisma_1.prisma.event.findUnique({ where: { id } });
            if (!existingEvent)
                return res.status(404).json({ error: 'Event not found.' });
            if (existingEvent.agentId !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden: You do not own this event.' });
            }
            updatedEvent = await prisma_1.prisma.event.update({ where: { id }, data: { status } });
        }
        else {
            const event = prisma_1.memoryDb.events.find(e => e.id === id);
            if (!event)
                return res.status(404).json({ error: 'Event not found.' });
            event.status = status;
            updatedEvent = event;
        }
        return res.json({ message: `Event status updated to ${status}`, event: updatedEvent });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to update event status.' });
    }
});
exports.default = router;
