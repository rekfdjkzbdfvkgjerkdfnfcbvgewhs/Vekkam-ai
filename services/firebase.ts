
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  Firestore 
} from "firebase/firestore";
import { UserData, Session } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAEZpRngu0QxJ1e1oc5X0d-w2pN78Nu4aU",
  authDomain: "vekkam-ai.firebaseapp.com",
  projectId: "vekkam-ai",
  storageBucket: "vekkam-ai.firebasestorage.app",
  messagingSenderId: "429190305114",
  appId: "1:429190305114:web:965ed5ff8131b241060f63",
  measurementId: "G-0ELJ27ERCT"
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile };

export const ensureUserDoc = async (uid: string, initialData: UserData): Promise<UserData> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, initialData);
    return initialData;
  }
  
  return userSnap.data() as UserData;
};

export const updateFirestoreUser = async (uid: string, data: Partial<UserData>) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
};

export const saveFirestoreSession = async (uid: string, session: Session) => {
  const sessionRef = doc(db, "users", uid, "sessions", session.id);
  await setDoc(sessionRef, session);
};

export const deleteFirestoreSession = async (uid: string, sessionId: string) => {
  const sessionRef = doc(db, "users", uid, "sessions", sessionId);
  await deleteDoc(sessionRef);
};

export const getFirestoreSessions = async (uid: string): Promise<Session[]> => {
  const sessionsRef = collection(db, "users", uid, "sessions");
  const q = query(sessionsRef, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  
  const sessions: Session[] = [];
  querySnapshot.forEach((doc) => {
    sessions.push(doc.data() as Session);
  });
  return sessions;
};

/**
 * Saves anonymized feedback for model learning.
 * Does not include UID to maintain anonymity.
 */
export const saveLearningFeedback = async (input: string, output: string, satisfaction: number) => {
  try {
    const feedbackRef = collection(db, "ai_learning_data");
    await addDoc(feedbackRef, {
      input,
      output,
      satisfaction, // 1 for positive, -1 for negative
      timestamp: serverTimestamp(),
      tool: 'vekkam_chat_engine'
    });
  } catch (err) {
    console.error("Failed to save learning feedback:", err);
  }
};
