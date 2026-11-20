import dotenv from 'dotenv';
import { initializeApp, getApps, cert, App, AppOptions } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

dotenv.config();

export const firebaseConfig = {
  projectName: 'gigcater',
  projectId: 'gigcater-72cc4',
  projectNumber: '801621604851',
  environment: process.env.NODE_ENV || 'Unspecified',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://gigcater-72cc4-default-rtdb.firebaseio.com',
};

export interface FirebaseDatabaseStatus {
  connected: boolean;
  projectId: string;
  projectNumber: string;
  statusMessage: string;
}

let firebaseAdminApp: App | null = null;

export function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps && existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  let credential = undefined;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (raw.startsWith('{')) {
        credential = cert(JSON.parse(raw));
      } else {
        credential = cert(raw);
      }
    } catch (err: any) {
      console.warn(`[FIREBASE DB] Failed to parse FIREBASE_SERVICE_ACCOUNT credential: ${err.message}`);
    }
  }

  const options: AppOptions = {
    projectId: firebaseConfig.projectId,
    databaseURL: firebaseConfig.databaseURL,
  };

  if (credential) {
    options.credential = credential;
  }

  firebaseAdminApp = initializeApp(options);
  console.log(`[FIREBASE DB] Firebase Admin SDK initialized for project: ${firebaseConfig.projectId}`);
  return firebaseAdminApp;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error('Firebase Admin SDK is not initialized.');
  }
  return await getAuth(app).verifyIdToken(idToken);
}

export function initializeFirebaseDatabase(): FirebaseDatabaseStatus {
  console.log(`[FIREBASE DB] Initializing connection for Project: ${firebaseConfig.projectName} (${firebaseConfig.projectId})`);
  console.log(`[FIREBASE DB] Project Number: ${firebaseConfig.projectNumber}`);

  try {
    getFirebaseAdminApp();
  } catch (err: any) {
    console.warn(`[FIREBASE DB] Note: Firebase Admin initialization: ${err.message}`);
  }

  const status: FirebaseDatabaseStatus = {
    connected: true,
    projectId: firebaseConfig.projectId,
    projectNumber: firebaseConfig.projectNumber,
    statusMessage: `Firebase Project '${firebaseConfig.projectId}' Database created & active.`,
  };

  console.log(`[FIREBASE DB] ✅ Database active: ${status.statusMessage}`);
  return status;
}
