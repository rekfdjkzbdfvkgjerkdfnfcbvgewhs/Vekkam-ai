
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

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
