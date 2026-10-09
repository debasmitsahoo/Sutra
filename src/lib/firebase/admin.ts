// Server-only Firebase Admin. Credentials come from GOOGLE_APPLICATION_CREDENTIALS (service-account.json).
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app =
  getApps()[0] ??
  initializeApp({ credential: applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });

export const db = getFirestore(app);
export const adminAuth = getAuth(app);
