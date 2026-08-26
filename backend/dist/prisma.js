"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryDb = exports.isDbConnected = exports.prisma = void 0;
exports.checkDatabaseConnection = checkDatabaseConnection;
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient();
exports.isDbConnected = false;
// Memory fallback database with rich catering events & ratings
exports.memoryDb = {
    users: [],
    workerProfiles: [],
    events: [
        {
            id: 'demo-evt-1',
            agentId: 'agent-demo-id',
            title: 'Bhuna Khichuri & Thai Catering Server',
            description: 'Serving luxury buffet lunch & dinner spread. Uniform: Black formal trousers & clean white shirt.',
            location: 'Dhanmondi, Dhaka Sector 4',
            category: 'Banquet Serving',
            date: new Date(Date.now() + 86400000 * 1),
            startTime: '11:00 AM',
            endTime: '06:00 PM',
            workersNeeded: 6,
            payPerWorker: 180.00,
            status: 'OPEN',
            createdAt: new Date(),
            updatedAt: new Date(),
            agent: { id: 'agent-demo-id', phone: '+1 555-0199' },
            applications: [],
            _count: { applications: 0 },
        },
        {
            id: 'demo-evt-2',
            agentId: 'agent-demo-id',
            title: 'Grand Wedding Reception Banquet Attendant',
            description: 'Plated dinner service, welcome drink distribution, and dessert counter replenishment.',
            location: 'Metropolitan Convention Hall, Downtown',
            category: 'Banquet Serving',
            date: new Date(Date.now() + 86400000 * 3),
            startTime: '04:00 PM',
            endTime: '11:00 PM',
            workersNeeded: 8,
            payPerWorker: 210.00,
            status: 'OPEN',
            createdAt: new Date(),
            updatedAt: new Date(),
            agent: { id: 'agent-demo-id', phone: '+1 555-0199' },
            applications: [],
            _count: { applications: 0 },
        },
        {
            id: 'demo-evt-3',
            agentId: 'agent-demo-id',
            title: 'Corporate Summit Buffet Helper & Busser',
            description: 'Table setup, tray passing, and dish clearance for tech summit luncheon.',
            location: 'Grand Plaza Hotel, Westside',
            category: 'Kitchen & Clearing',
            date: new Date(Date.now() + 86400000 * 5),
            startTime: '09:00 AM',
            endTime: '03:00 PM',
            workersNeeded: 4,
            payPerWorker: 150.00,
            status: 'OPEN',
            createdAt: new Date(),
            updatedAt: new Date(),
            agent: { id: 'agent-demo-id', phone: '+1 555-0199' },
            applications: [],
            _count: { applications: 0 },
        }
    ],
    applications: [],
};
async function checkDatabaseConnection() {
    try {
        await exports.prisma.$connect();
        await exports.prisma.$queryRaw `SELECT 1`;
        exports.isDbConnected = true;
        console.log('✅ PostgreSQL database connected successfully via Prisma.');
    }
    catch (error) {
        exports.isDbConnected = false;
        console.warn('⚠️ Could not connect to PostgreSQL database on localhost:5432.');
        console.warn('ℹ️ Fallback in-memory database enabled for seamless local dev & instant testing.');
    }
}
