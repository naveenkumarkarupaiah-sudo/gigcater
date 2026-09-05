"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/complaints - Worker raises a late-payment complaint against an agent.
// The agent's contact details are NOT revealed immediately — an Admin investigates first
// (sees the event/worker/agent, payment details, and work photos) and only once they mark the
// complaint genuine does the worker learn the agent's contact details (see GET /my-complaints).
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['WORKER']), async (req, res) => {
    try {
        const { applicationId, reason } = req.body;
        if (!applicationId || !reason) {
            return res.status(400).json({ error: 'applicationId and reason are required.' });
        }
        if (prisma_1.isDbConnected) {
            const application = await prisma_1.prisma.application.findUnique({
                where: { id: applicationId },
                include: { event: true },
            });
            if (!application)
                return res.status(404).json({ error: 'Application not found.' });
            if (application.workerId !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden: This is not your application.' });
            }
            const lateCheck = checkPaymentOverdue(application.paymentStatus, application.paymentDueAt);
            if (lateCheck.error)
                return res.status(400).json({ error: lateCheck.error });
            const existing = await prisma_1.prisma.complaint.findFirst({
                where: { applicationId, workerId: req.user.id }
            });
            if (existing) {
                return res.status(400).json({ error: 'You have already filed a complaint for this application.' });
            }
            const complaint = await prisma_1.prisma.complaint.create({
                data: {
                    applicationId,
                    workerId: req.user.id,
                    agentId: application.event.agentId,
                    reason,
                    status: 'PENDING'
                }
            });
            return res.status(201).json({
                message: 'Complaint submitted. Our team will investigate the payment issue and get back to you.',
                complaint,
            });
        }
        else {
            const application = prisma_1.memoryDb.applications.find((a) => a.id === applicationId);
            if (!application)
                return res.status(404).json({ error: 'Application not found.' });
            if (application.workerId !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden: This is not your application.' });
            }
            const lateCheck = checkPaymentOverdue(application.paymentStatus, application.paymentDueAt);
            if (lateCheck.error)
                return res.status(400).json({ error: lateCheck.error });
            if (!prisma_1.memoryDb.complaints)
                prisma_1.memoryDb.complaints = [];
            const existing = prisma_1.memoryDb.complaints.find((c) => c.applicationId === applicationId && c.workerId === req.user.id);
            if (existing) {
                return res.status(400).json({ error: 'You have already filed a complaint for this application.' });
            }
            const event = prisma_1.memoryDb.events.find((e) => e.id === application.eventId);
            const complaint = {
                id: `cmp_${Date.now()}`,
                applicationId,
                workerId: req.user.id,
                agentId: event?.agentId || '',
                reason,
                status: 'PENDING',
                adminNotes: null,
                resolvedAt: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            prisma_1.memoryDb.complaints.push(complaint);
            return res.status(201).json({
                message: 'Complaint submitted. Our team will investigate the payment issue and get back to you.',
                complaint,
            });
        }
    }
    catch (error) {
        console.error('Error filing complaint:', error);
        return res.status(500).json({ error: error.message || 'Failed to file complaint.' });
    }
});
// Shared late-payment gate used by the complaint route above.
function checkPaymentOverdue(paymentStatus, paymentDueAt) {
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
router.get('/my-complaints', auth_1.authenticate, (0, auth_1.requireRole)(['WORKER']), async (req, res) => {
    try {
        if (prisma_1.isDbConnected) {
            const complaints = await prisma_1.prisma.complaint.findMany({
                where: { workerId: req.user.id },
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
            const shaped = complaints.map((c) => {
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
        }
        else {
            if (!prisma_1.memoryDb.complaints)
                prisma_1.memoryDb.complaints = [];
            const complaints = prisma_1.memoryDb.complaints
                .filter((c) => c.workerId === req.user.id)
                .map((c) => {
                const event = prisma_1.memoryDb.events.find((e) => e.id === prisma_1.memoryDb.applications.find((a) => a.id === c.applicationId)?.eventId);
                const agentProfile = prisma_1.memoryDb.agentProfiles?.find((p) => p.userId === event?.agentId);
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to fetch complaints.' });
    }
});
exports.default = router;
