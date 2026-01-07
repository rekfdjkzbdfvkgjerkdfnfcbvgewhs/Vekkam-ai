
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Layout from './components/Layout';
import NoteEngine from './components/NoteEngine';
import CheckoutModal from './components/CheckoutModal';
import AuthOverlay from './components/AuthOverlay';
import { UserInfo, UserData, Session, NoteBlock, Chunk } from './types';
import { MessageSquare, FileText, Zap, Loader2 } from 'lucide-react';
import { auth, db, updateFirestoreUser, ensureUserDoc } from './services/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'none' | 'login' | 'signup'>('none');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userData, setUserData] = useState<UserData>({
    sessions: [],
    user_tier: 'free',
    total_analyses: 0,
    last_analysis_date: null,
    daily_analyses_count: 0
  });
  const [activeTool, setActiveTool] = useState('notes');
  const [allChunks, setAllChunks] = useState<Chunk[]>([]);
  const [activeSessionNotes, setActiveSessionNotes] = useState<NoteBlock[] | undefined>();
  const [showCheckout, setShowCheckout] = useState(false);

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

        // Ensure user data exists in Firestore
        const today = new Date().toDateString();
        const initialData: UserData = {
          sessions: [],
          user_tier: 'free',
          total_analyses: 0,
          last_analysis_date: today,
          daily_analyses_count: 0
        };
        
        try {
          await ensureUserDoc(firebaseUser.uid, initialData);

          // Set up real-time Firestore listener for this user
          const unsubDoc = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserData;
              
              // Check for daily reset locally
              if (data.last_analysis_date !== today) {
                updateFirestoreUser(firebaseUser.uid, {
                  daily_analyses_count: 0,
                  last_analysis_date: today
                });
              } else {
                setUserData(data);
              }
            }
          });

          setLoading(false);
          return () => unsubDoc();
        } catch (err) {
          console.error("Error ensuring user doc:", err);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAllChunks([]);
      setActiveSessionNotes(undefined);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSaveSession = async (notes: NoteBlock[]) => {
    if (!user) return;

    const newSession: Session = {
      id: `session_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      title: notes[0]?.topic || "Untitled Session",
      notes
    };

    const updatedSessions = [newSession, ...userData.sessions];
    await updateFirestoreUser(user.id, {
      sessions: updatedSessions,
      total_analyses: userData.total_analyses + 1,
      daily_analyses_count: userData.daily_analyses_count + 1
    });
  };

  const handleSessionSelect = (id: string) => {
    const session = userData.sessions.find(s => s.id === id);
    if (session) {
      setActiveSessionNotes(session.notes);
      setActiveTool('notes');
    }
  };

  const handleSessionDelete = async (id: string) => {
    if (!user) return;
    const updatedSessions = userData.sessions.filter(s => s.id !== id);
    await updateFirestoreUser(user.id, { sessions: updatedSessions });
  };

  const handleUpgradeSuccess = async (tier: 'paid') => {
    if (!user) return;
    await updateFirestoreUser(user.id, { user_tier: tier });
    setShowCheckout(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 font-medium">Initializing Vekkam...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage 
          onLogin={() => setAuthMode('login')} 
          onViewPolicies={() => alert('Policies view requested')} 
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

  return (
    <>
      <Layout 
        user={user} 
        userData={userData} 
        onLogout={handleLogout} 
        onToolSelect={setActiveTool} 
        activeTool={activeTool}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
        onUpgradeClick={() => setShowCheckout(true)}
      >
        <div className="h-full">
          {activeTool === 'notes' && (
            <NoteEngine 
              allChunks={allChunks} 
              userData={userData}
              setAllChunks={setAllChunks} 
              onSaveSession={handleSaveSession}
              onUpgradeRequest={() => setShowCheckout(true)}
              savedNotes={activeSessionNotes}
            />
          )}
          {activeTool === 'ta' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <MessageSquare size={48} className="mx-auto text-blue-600 mb-6" />
                <h2 className="text-3xl font-bold">Personal TA</h2>
                <p className="text-gray-500 max-w-sm">Chat across all your saved sessions and get instant clarity on complex topics using your own study context.</p>
              </div>
            </div>
          )}
          {activeTool === 'mock' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <FileText size={48} className="mx-auto text-blue-600 mb-6" />
                <h2 className="text-3xl font-bold">Mock Test Generator</h2>
                <p className="text-gray-500 max-w-sm">Test your knowledge across MCQ, VSA, SA, and LA formats to identify your weak points before the real exam.</p>
              </div>
            </div>
          )}
          {activeTool === 'mastery' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Zap size={48} className="mx-auto text-blue-600 mb-6" />
                <h2 className="text-3xl font-bold">Mastery Engine</h2>
                <p className="text-gray-500 max-w-sm">Visualize your syllabus as a skill tree and master concepts through targeted boss battles.</p>
              </div>
            </div>
          )}
        </div>
      </Layout>

      {showCheckout && (
        <CheckoutModal 
          onClose={() => setShowCheckout(false)} 
          onSuccess={handleUpgradeSuccess} 
        />
      )}
    </>
  );
};

export default App;
