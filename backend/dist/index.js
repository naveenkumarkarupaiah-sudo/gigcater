"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const profile_1 = __importDefault(require("./routes/profile"));
const events_1 = __importDefault(require("./routes/events"));
const applications_1 = __importDefault(require("./routes/applications"));
const upload_1 = __importDefault(require("./routes/upload"));
const prisma_1 = require("./prisma");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'GigCater API', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api/events', events_1.default);
app.use('/api/applications', applications_1.default);
app.use('/api/upload', upload_1.default);
// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});
app.listen(PORT, async () => {
    console.log(`=================================`);
    console.log(`🚀 GigCater Backend API running on http://localhost:${PORT}`);
    await (0, prisma_1.checkDatabaseConnection)();
    console.log(`=================================`);
});
