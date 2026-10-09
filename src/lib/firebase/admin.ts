// Server-only Firebase Admin. Credentials come from GOOGLE_APPLICATION_CREDENTIALS (service-account.json).
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const existing = getApps()[0];
const app = existing ?? initializeApp({ credential: applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });

// Optional schema fields (e.g. state on overseas projects) arrive as undefined; drop them instead of failing.
// Settings can only be applied once, so reuse the instance on hot reload.
export const db = getFirestore(app);
if (!existing) db.settings({ ignoreUndefinedProperties: true });
export const adminAuth = getAuth(app);
