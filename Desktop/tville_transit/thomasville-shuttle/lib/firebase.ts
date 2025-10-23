import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVs18B5R6G_GlHASDCBHOVAVaB6qSj0ao",
  authDomain: "thomasville-shuttle.firebaseapp.com",
  projectId: "thomasville-shuttle",
  storageBucket: "thomasville-shuttle.firebasestorage.app",
  messagingSenderId: "485501146347",
  appId: "1:485501146347:web:0b573ad6dfc68857915aae",
  measurementId: "G-PRGJV8HS4P"
};

// Ensure we only initialize once (safe across hot reloads)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firestore instance for client usage
export const db = getFirestore(app);

// Optional: fetch Analytics on the client only if supported
let cachedAnalytics: import("firebase/analytics").Analytics | null = null;
export async function getAnalyticsClient() {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.measurementId) return null;
  if (cachedAnalytics) return cachedAnalytics;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) {
    cachedAnalytics = getAnalytics(app);
    return cachedAnalytics;
  }
  return null;
}

