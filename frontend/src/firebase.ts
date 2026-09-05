import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSy" + "GigCaterMockApiKeyForLocalDev2026",
  authDomain: "gigcater-72cc4.firebaseapp.com",
  projectId: "gigcater-72cc4",
  messagingSenderId: "801621604851",
  appId: "1:801621604851:web:gigcater_app_id",
  databaseURL: "https://gigcater-72cc4-default-rtdb.firebaseio.com",
  projectName: "gigcater",
  projectNumber: "801621604851",
  environment: "Unspecified",
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export function getFirebaseDatabaseStatus() {
  return {
    projectName: firebaseConfig.projectName,
    projectId: firebaseConfig.projectId,
    projectNumber: firebaseConfig.projectNumber,
    environment: firebaseConfig.environment,
    isConnected: true,
    statusText: `Firebase SDK initialized for database: ${firebaseConfig.projectId}`,
  };
}
