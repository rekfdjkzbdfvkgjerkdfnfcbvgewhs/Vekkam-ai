
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Layout from './components/Layout';
import NoteEngine from './components/NoteEngine';
import AuthOverlay from './components/AuthOverlay';
import PoliciesView from './components/PoliciesView';
import PersonalTA from './components/PersonalTA';
import { MockTestGenerator } from './components/MockTestGenerator';
// import MasteryEngine from './components/MasteryEngine'; // Removed
import StudyGroups from './components/StudyGroups'; // New import
import Achievements from './components/Achievements'; // New import
import { UserInfo, UserData, Session, NoteBlock, Chunk, StudyGroup, Badge } from './types';
import { Loader2, Info } from 'lucide-react';
import { 
  auth, 
  db, 
  updateFirestoreUser, 
  ensureUserDoc, 
  saveFirestoreSession, 
  getFirestoreSessions,
  deleteFirestoreSession,
  getStudyGroupsForUser, // New import
  getUserBadges, // New import
  getSessionContent, // New import
  subscribeToUserData // New import
} from './services/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { Analytics } from "@vercel/analytics/react";

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'none' | 'login' | 'signup'>('none');
  const [view, setView] = useState<'app' | 'policies'>('app');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [userData, setUserData] = useState<UserData>({
    total_analyses: 0,
    badges: [], // Initialize
    groupIds: [] // Initialize
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]); // New state for study groups
  const [userBadges, setUserBadges] = useState<Badge[]>([]); // New state for badges
  const [activeTool, setActiveTool] = useState('notes');
  const [allChunks, setAllChunks] = useState<Chunk[]>([]);
  const [activeSessionNotes, setActiveSessionNotes] = useState<NoteBlock[] | undefined>();
  const [isFetchingContent, setIsFetchingContent] = useState(false);

  // LLM Fallback state - set to true to indicate temporary Gemini usage
  const [showLLMFallbackAlert, setShowLLMFallbackAlert] = useState(true);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userInfo: UserInfo = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Student',
          given_name: firebaseUser.displayName?.split(' ')[0] || 'Student',
          email: firebaseUser.email || '',
          picture: `https://picsum.photos/100/100?seed=${firebaseUser.uid}`
        };
        setUser(userInfo);

        const initialData: UserData = {
          total_analyses: 0,
          badges: [],
          groupIds: []
        };
        
        try {
          await ensureUserDoc(firebaseUser.uid, initialData);
          const userSessions = await getFirestoreSessions(firebaseUser.uid);
          setSessions(userSessions);

          const userGroups = await getStudyGroupsForUser(firebaseUser.uid); // Fetch groups
          setStudyGroups(userGroups);

          const fetchedBadges = await getUserBadges(firebaseUser.uid); // Fetch badges
          setUserBadges(fetchedBadges);

          const unsubDoc = subscribeToUserData(firebaseUser.uid, (data) => {
             setUserData(data);
             setUserBadges(data.badges || []); // Update badges from snapshot
             // No direct update to studyGroups from snapshot here as group details are in 'study_groups' collection
             // but groupIds are updated here. If group data needs to be live, a separate listener is needed.
          });

          setLoading(false);
          return () => unsubDoc();
        } catch (err) {
          console.error("Error ensuring user doc or fetching data:", err);
          setLoading(false);
        }
      } else {
        setUser(null);
        setSessions([]);
        setStudyGroups([]); // Clear groups
        setUserBadges([]); // Clear badges
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAllChunks([]);
      setSessions([]);
      setStudyGroups([]); // Clear groups
      setUserBadges([]); // Clear badges
      setActiveSessionNotes(undefined);
      setActiveTool('notes');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSaveSession = async (notes: NoteBlock[], fullTextContent: string) => {
    if (!user) return;

    const newSession: Session = {
      id: `session_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      title: notes[0]?.topic || "Untitled Session",
      notes
    };

    try {
      await saveFirestoreSession(user.id, newSession);
      await updateFirestoreUser(user.id, {
        total_analyses: (userData.total_analyses || 0) + 1
      });
      // Update local state with the new session, containing full notes initially for immediate display
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionNotes(notes);
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  };

  const handleSessionSelect = async (id: string) => {
    if (!user) return;

    // First check if we already have the full notes in memory (optimization for just-saved session)
    // Actually, sessions in state might only have metadata (empty content) if fetched from DB
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    
    // Check if the current session object has content. If it does (e.g. just saved), use it.
    if (session.notes.length > 0 && session.notes[0].content && session.notes[0].content.length > 0) {
      setActiveSessionNotes(session.notes);
      setActiveTool('notes');
      return;
    }

    // Otherwise fetch content from Firestore
    setIsFetchingContent(true);
    try {
      const content = await getSessionContent(user.id, id);
      setActiveSessionNotes(content);
      setActiveTool('notes');
    } catch (err) {
      console.error("Failed to fetch session content:", err);
      // Fallback: use what we have (likely empty content, but prevents crash)
      setActiveSessionNotes(session.notes);
      setActiveTool('notes');
    } finally {
      setIsFetchingContent(false);
    }
  };

  const handleSessionDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteFirestoreSession(user.id, id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionNotes && activeSessionNotes[0]?.topic === sessions.find(s => s.id === id)?.notes[0]?.topic) {
        setActiveSessionNotes(undefined);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Synchronizing Workspace...</p>
      </div>
    );
  }

  if (view === 'policies') {
    return <PoliciesView onBack={() => setView('app')} />;
  }

  if (!user) {
    return (
      <>
        <Analytics />
        <LandingPage 
          onLogin={() => setAuthMode('login')} 
          onViewPolicies={() => setView('policies')} 
        />
        {authMode !== 'none' && (
          <AuthOverlay 
            initialMode={authMode === 'login' ? 'login' : 'signup'} 
            onClose={() => setAuthMode('none')} 
          />
        )}
      </>
    );
  }

  const layoutUserData = { ...userData, sessions };

  return (
    <>
      <Analytics />
      <Layout 
        user={user} 
        userData={layoutUserData} 
        onLogout={handleLogout} 
        onToolSelect={setActiveTool} 
        activeTool={activeTool}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      >
        {showLLMFallbackAlert && (
          <div className="bg-amber-500 dark:bg-amber-700 text-white p-3 flex items-center justify-center gap-3 text-sm font-medium">
            <Info size={18} />
            <span>Facing some problems with our primary LLM. Temporarily using Gemini for text generation.</span>
            <button onClick={() => setShowLLMFallbackAlert(false)} className="ml-auto p-1 rounded-md hover:bg-white/20 transition-colors">
              Dismiss
            </button>
          </div>
        )}
        <div className="h-full relative">
          {isFetchingContent && (
             <div className="absolute inset-0 bg-white/80 dark:bg-gray-950/80 z-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
             </div>
          )}
          {activeTool === 'notes' && (
            <NoteEngine 
              allChunks={allChunks} 
              userData={userData}
              setAllChunks={setAllChunks} 
              onSaveSession={handleSaveSession}
              savedNotes={activeSessionNotes}
              userPicture={user.picture}
              userId={user.id}
            />
          )}
          {activeTool === 'ta' && (
            <PersonalTA sessions={sessions} />
          )}
          {activeTool === 'mock' && (
            <MockTestGenerator notes={activeSessionNotes} />
          )}
          {/* {activeTool === 'mastery' && ( // Removed Skill Genome
            <MasteryEngine chunks={allChunks} />
          )} */}
          {activeTool === 'groups' && user && ( // Render StudyGroups component
            <StudyGroups 
              user={user} 
              userStudyGroups={studyGroups} 
              setUserStudyGroups={setStudyGroups}
            />
          )}
          {activeTool === 'achievements' && user && ( // Render Achievements component
            <Achievements 
              userBadges={userBadges} 
            />
          )}
        </div>
      </Layout>
    </>
  );
};

export default App;
