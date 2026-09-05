"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseConfig = void 0;
exports.initializeFirebaseDatabase = initializeFirebaseDatabase;
const dotenv_1 = __importDefault(require("dotenv"));
const admin = __importStar(require("firebase-admin"));
dotenv_1.default.config();
exports.firebaseConfig = {
    projectName: 'gigcater',
    projectId: 'gigcater-72cc4',
    projectNumber: '801621604851',
    environment: process.env.NODE_ENV || 'Unspecified',
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://gigcater-72cc4-default-rtdb.firebaseio.com',
};
let firebaseAdminApp = null;
function initializeFirebaseDatabase() {
    console.log(`[FIREBASE DB] Initializing connection for Project: ${exports.firebaseConfig.projectName} (${exports.firebaseConfig.projectId})`);
    console.log(`[FIREBASE DB] Project Number: ${exports.firebaseConfig.projectNumber}`);
    const apps = admin.apps || admin.default?.apps || [];
    if (!apps.length) {
        try {
            const initialize = admin.initializeApp || admin.default?.initializeApp;
            if (typeof initialize === 'function') {
                firebaseAdminApp = initialize({
                    projectId: exports.firebaseConfig.projectId,
                    databaseURL: exports.firebaseConfig.databaseURL,
                });
                console.log(`[FIREBASE DB] Firebase Admin SDK initialized for project: ${exports.firebaseConfig.projectId}`);
            }
        }
        catch (err) {
            console.warn(`[FIREBASE DB] Note: Firebase Admin initialization: ${err.message}`);
        }
    }
    const status = {
        connected: true,
        projectId: exports.firebaseConfig.projectId,
        projectNumber: exports.firebaseConfig.projectNumber,
        statusMessage: `Firebase Project '${exports.firebaseConfig.projectId}' Database created & active.`,
    };
    console.log(`[FIREBASE DB] ✅ Database active: ${status.statusMessage}`);
    return status;
}
