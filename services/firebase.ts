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
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  updateDoc,
  where,
  onSnapshot
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { UserData, Session, Badge, StudyGroup, GroupMessage, NoteBlock } from "../types";

// --- PRIMARY APP (Core User Data) ---
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

// --- SECONDARY APP (Data Logging) ---
const dataFirebaseConfig = {
  apiKey: "AIzaSyBShVJcC6qekqgyfIPor-iQ-6P-2ilUkrI",
  authDomain: "data-15805.firebaseapp.com",
  projectId: "data-15805",
  storageBucket: "data-15805.firebasestorage.app",
  messagingSenderId: "613395923553",
  appId: "1:613395923553:web:7288ead0e01fd611b1e020",
  measurementId: "G-VTHQT014VG"
};

// Initialize secondary app safely
let dataApp: FirebaseApp;
const dataAppName = "vekkamDataStore";

if (getApps().some(app => app.name === dataAppName)) {
  dataApp = getApp(dataAppName);
} else {
  dataApp = initializeApp(dataFirebaseConfig, dataAppName);
}

const dataDb: Firestore = getFirestore(dataApp);

/**
 * Logs structured interaction data to the separate Data Firestore.
 * Contains NO User ID or PII.
 */
export const logDataInteraction = async (data: {
  question: string;
  relevant_context: string;
  explanation: string;
  final_answer: string;
  common_mistake: string;
}) => {
  try {
    const logsRef = collection(dataDb, "interactions");
    await addDoc(logsRef, {
      ...data,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to log interaction to secondary DB:", err);
  }
};


export { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile };

export const ensureUserDoc = async (uid: string, initialData: UserData): Promise<UserData> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Initialize with empty arrays for new fields
    await setDoc(userRef, { ...initialData, badges: [], groupIds: [] });
    return { ...initialData, badges: [], groupIds: [] };
  }
  
  const existingData = userSnap.data() as UserData;
  // Ensure badges and groupIds exist, even if not in old docs
  if (!existingData.badges) existingData.badges = [];
  if (!existingData.groupIds) existingData.groupIds = [];

  return existingData;
};

export const updateFirestoreUser = async (uid: string, data: any) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
};

export const subscribeToUserData = (uid: string, callback: (data: UserData) => void) => {
  const userRef = doc(db, "users", uid);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserData);
    }
  });
};

// Optimized: Splits heavy content from metadata
export const saveFirestoreSession = async (uid: string, session: Session) => {
  // 1. Save metadata (lightweight) to 'sessions' collection
  const sessionRef = doc(db, "users", uid, "sessions", session.id);
  const lightweightNotes = session.notes.map(n => ({
    topic: n.topic,
    content: "", // Strip content to save space
    source_chunks: []
  }));
  const metadataSession: Session = {
    ...session,
    notes: lightweightNotes
  };
  await setDoc(sessionRef, metadataSession);

  // 2. Save full content (heavy) to 'session_contents' collection
  const contentRef = doc(db, "users", uid, "session_contents", session.id);
  await setDoc(contentRef, {
    id: session.id,
    notes: session.notes
  });
};

export const deleteFirestoreSession = async (uid: string, sessionId: string) => {
  // Delete metadata
  const sessionRef = doc(db, "users", uid, "sessions", sessionId);
  await deleteDoc(sessionRef);
  
  // Delete content
  const contentRef = doc(db, "users", uid, "session_contents", sessionId);
  await deleteDoc(contentRef);
};

export const getFirestoreSessions = async (uid: string): Promise<Session[]> => {
  // Only fetches metadata (fast, small docs)
  const sessionsRef = collection(db, "users", uid, "sessions");
  const q = query(sessionsRef, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  
  const sessions: Session[] = [];
  querySnapshot.forEach((doc) => {
    sessions.push(doc.data() as Session);
  });
  return sessions;
};

// New function to fetch heavy content on demand
export const getSessionContent = async (uid: string, sessionId: string): Promise<NoteBlock[]> => {
  const contentRef = doc(db, "users", uid, "session_contents", sessionId);
  const contentSnap = await getDoc(contentRef);

  if (contentSnap.exists()) {
    return contentSnap.data().notes as NoteBlock[];
  } else {
    // Fallback for legacy sessions where content might be in the metadata doc
    const sessionRef = doc(db, "users", uid, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      const data = sessionSnap.data() as Session;
      // If legacy doc has content, return it, otherwise return empty
      if (data.notes && data.notes.length > 0 && data.notes[0].content) {
        return data.notes;
      }
    }
    return [];
  }
};

export const saveUserBadge = async (uid: string, badge: Badge) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    badges: arrayUnion(badge)
  });
};

export const getUserBadges = async (uid: string): Promise<Badge[]> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data() as UserData;
    return userData.badges || [];
  }
  return [];
};


// --- Study Group Functions ---

function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const createStudyGroup = async (creatorId: string, creatorInfo: { id: string, name: string, picture: string }, groupName: string): Promise<StudyGroup> => {
  const groupsRef = collection(db, "study_groups");
  let accessCode = generateAccessCode();
  let codeExists = true;

  // Ensure unique access code
  while (codeExists) {
    const q = query(groupsRef, where("accessCode", "==", accessCode));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      codeExists = false;
    } else {
      accessCode = generateAccessCode();
    }
  }

  const newGroup: StudyGroup = {
    id: "", // Will be filled by Firestore
    name: groupName,
    accessCode: accessCode,
    creatorId: creatorId,
    members: [creatorInfo],
    messages: []
  };

  const docRef = await addDoc(groupsRef, newGroup);
  await setDoc(docRef, { id: docRef.id }, { merge: true }); // Update doc with its own ID

  // Add group to creator's user document
  await updateFirestoreUser(creatorId, {
    groupIds: arrayUnion(docRef.id)
  });

  return { ...newGroup, id: docRef.id };
};

export const joinStudyGroup = async (uid: string, userInfo: { id: string, name: string, picture: string }, accessCode: string): Promise<StudyGroup> => {
  const groupsRef = collection(db, "study_groups");
  const q = query(groupsRef, where("accessCode", "==", accessCode));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Invalid access code.");
  }

  const groupDoc = querySnapshot.docs[0];
  const groupData = groupDoc.data() as StudyGroup;

  // Check if user is already a member
  if (groupData.members.some(member => member.id === uid)) {
    throw new Error("You are already a member of this group.");
  }

  // Add user to group's members array
  await updateDoc(groupDoc.ref, {
    members: arrayUnion(userInfo)
  });

  // Add group ID to user's document
  await updateFirestoreUser(uid, {
    groupIds: arrayUnion(groupDoc.id)
  });

  return { ...groupData, members: [...groupData.members, userInfo] };
};

export const leaveStudyGroup = async (uid: string, groupId: string) => {
  const groupRef = doc(db, "study_groups", groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists()) {
    throw new Error("Group not found.");
  }

  const groupData = groupSnap.data() as StudyGroup;
  const memberToRemove = groupData.members.find(member => member.id === uid);

  if (memberToRemove) {
    await updateDoc(groupRef, {
      members: arrayRemove(memberToRemove)
    });
  }

  await updateFirestoreUser(uid, {
    groupIds: arrayRemove(groupId)
  });
};

export const getStudyGroupsForUser = async (uid: string): Promise<StudyGroup[]> => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return [];

  const userData = userDoc.data() as UserData;
  const groupIds = userData.groupIds || [];

  if (groupIds.length === 0) return [];

  const groups: StudyGroup[] = [];
  for (const groupId of groupIds) {
    const groupDoc = await getDoc(doc(db, "study_groups", groupId));
    if (groupDoc.exists()) {
      groups.push(groupDoc.data() as StudyGroup);
    }
  }
  return groups;
};

export const sendGroupMessage = async (groupId: string, message: Omit<GroupMessage, 'id'>) => {
  const messagesRef = collection(db, "study_groups", groupId, "messages");
  await addDoc(messagesRef, { ...message, timestamp: serverTimestamp() });
};

export const getGroupMessagesStream = (groupId: string, callback: (messages: GroupMessage[]) => void) => {
  const messagesRef = collection(db, "study_groups", groupId, "messages");
  const q = query(messagesRef, orderBy("timestamp"));

  return onSnapshot(q, (snapshot) => {
    const messages: GroupMessage[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
        timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString()
      });
    });
    callback(messages);
  });
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
