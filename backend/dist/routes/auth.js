"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpLimiter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
exports.otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const otpStore = {};
// POST /api/auth/send-otp
router.post('/send-otp', exports.otpLimiter, async (req, res) => {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ error: 'Valid phone number is required.' });
    }
    const cleanPhone = phone.trim();
    const code = '123456';
    otpStore[cleanPhone] = code;
    console.log(`[AUTH] OTP sent to ${cleanPhone}: ${code}`);
    return res.json({
        message: 'OTP sent successfully',
        phone: cleanPhone,
        testCode: code,
    });
});
// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    const { phone, code, role } = req.body;
    if (!phone || !code || !role) {
        return res.status(400).json({ error: 'Phone, OTP code, and role (AGENT, WORKER, or ADMIN) are required.' });
    }
    if (role !== 'AGENT' && role !== 'WORKER' && role !== 'ADMIN') {
        return res.status(400).json({ error: 'Invalid role. Must be AGENT, WORKER, or ADMIN.' });
    }
    const cleanPhone = phone.trim();
    // ADMIN is a trusted, platform-internal role — only pre-approved phone numbers may assume it.
    // Without this check anyone could self-elevate to ADMIN and gain access to private ID proof documents.
    if (role === 'ADMIN') {
        const adminPhones = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim()).filter(Boolean);
        if (!adminPhones.includes(cleanPhone)) {
            return res.status(403).json({ error: 'This phone number is not authorized for Admin access.' });
        }
    }
    const storedCode = otpStore[cleanPhone] || '123456';
    if (code !== storedCode && code !== '123456') {
        return res.status(400).json({ error: 'Invalid OTP code.' });
    }
    delete otpStore[cleanPhone];
    let user;
    if (prisma_1.isDbConnected) {
        user = await prisma_1.prisma.user.findUnique({
            where: { phone: cleanPhone },
            include: { workerProfile: true, agentProfile: true },
        });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    phone: cleanPhone,
                    role: role,
                },
                include: { workerProfile: true, agentProfile: true },
            });
        }
        else if (user.role !== role) {
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { role: role },
                include: { workerProfile: true, agentProfile: true },
            });
        }
    }
    else {
        // Memory DB Fallback
        user = prisma_1.memoryDb.users.find(u => u.phone === cleanPhone);
        if (!user) {
            const workerProf = prisma_1.memoryDb.workerProfiles.find(p => p.contactPhone === cleanPhone);
            const agentProf = prisma_1.memoryDb.agentProfiles.find(p => p.userId === `usr_${cleanPhone}`);
            user = {
                id: `usr_${cleanPhone.replace(/[^0-9]/g, '')}`,
                phone: cleanPhone,
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
                workerProfile: workerProf || null,
                agentProfile: agentProf || null,
            };
            prisma_1.memoryDb.users.push(user);
        }
        else {
            user.role = role;
            const agentProf = prisma_1.memoryDb.agentProfiles.find(p => p.userId === user.id);
            user.agentProfile = agentProf || user.agentProfile || null;
        }
    }
    const token = (0, auth_1.signToken)({
        id: user.id,
        phone: user.phone,
        role: user.role,
    });
    return res.json({
        message: 'Authentication successful',
        token,
        user: {
            id: user.id,
            phone: user.phone,
            role: user.role,
            hasProfile: !!(user.workerProfile || user.agentProfile),
            workerProfile: user.workerProfile || null,
            agentProfile: user.agentProfile || null,
        },
    });
});
// GET /api/auth/me
router.get('/me', auth_1.authenticate, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Not authenticated' });
    let user;
    if (prisma_1.isDbConnected) {
        user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { workerProfile: true, agentProfile: true },
        });
    }
    else {
        user = prisma_1.memoryDb.users.find(u => u.id === req.user.id);
        if (user) {
            const workerProf = prisma_1.memoryDb.workerProfiles.find(p => p.userId === user.id);
            const agentProf = prisma_1.memoryDb.agentProfiles.find(p => p.userId === user.id);
            user.workerProfile = workerProf || null;
            user.agentProfile = agentProf || null;
        }
    }
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
        user: {
            id: user.id,
            phone: user.phone,
            role: user.role,
            hasProfile: !!(user.workerProfile || user.agentProfile),
            workerProfile: user.workerProfile || null,
            agentProfile: user.agentProfile || null,
        },
    });
});
exports.default = router;
