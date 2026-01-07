
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, Firestore } from "firebase/firestore";
import { UserData } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAEZpRngu0QxJ1e1oc5X0d-w2pN78Nu4aU",
  authDomain: "vekkam-ai.firebaseapp.com",
  projectId: "vekkam-ai",
  storageBucket: "vekkam-ai.firebasestorage.app",
  messagingSenderId: "429190305114",
  appId: "1:429190305114:web:965ed5ff8131b241060f63",
  measurementId: "G-0ELJ27ERCT"
};

// Initialize Firebase only once
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Auth helper exports
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile };

/**
 * Ensures a user document exists in Firestore and returns the data.
 */
export const ensureUserDoc = async (uid: string, initialData: UserData): Promise<UserData> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, initialData);
    return initialData;
  }
  
  return userSnap.data() as UserData;
};

/**
 * Atomic update for user data in Firestore.
 */
export const updateFirestoreUser = async (uid: string, data: Partial<UserData>) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
};
