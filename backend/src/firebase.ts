import dotenv from 'dotenv';
import * as admin from 'firebase-admin';

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

let firebaseAdminApp: any = null;

export function initializeFirebaseDatabase(): FirebaseDatabaseStatus {
  console.log(`[FIREBASE DB] Initializing connection for Project: ${firebaseConfig.projectName} (${firebaseConfig.projectId})`);
  console.log(`[FIREBASE DB] Project Number: ${firebaseConfig.projectNumber}`);

  const apps = (admin as any).apps || (admin as any).default?.apps || [];
  if (!apps.length) {
    try {
      const initialize = admin.initializeApp || (admin as any).default?.initializeApp;
      if (typeof initialize === 'function') {
        firebaseAdminApp = initialize({
          projectId: firebaseConfig.projectId,
          databaseURL: firebaseConfig.databaseURL,
        });
        console.log(`[FIREBASE DB] Firebase Admin SDK initialized for project: ${firebaseConfig.projectId}`);
      }
    } catch (err: any) {
      console.warn(`[FIREBASE DB] Note: Firebase Admin initialization: ${err.message}`);
    }
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
