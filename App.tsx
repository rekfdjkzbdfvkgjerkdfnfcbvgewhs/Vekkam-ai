import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, ensureUserDoc, subscribeToUserData, getFirestoreSessions, getStudyGroupsForUser } from './services/firebase';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import AuthOverlay from './components/AuthOverlay';
import PoliciesView from './components/PoliciesView';
import PersonalTA from './components/PersonalTA';
import VideoGenerator from './components/VideoGenerator';
import { UserInfo, UserData, Session, StudyGroup } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userData, setUserData] = useState<UserData & { sessions: Session[] }>({ 
    total_analyses: 0, 
    sessions: [],
    badges: [],
    groupIds: []
  });
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [showPolicies, setShowPolicies] = useState(false);
  const [activeTool, setActiveTool] = useState('ta');
  
  // Study Groups State (Needed for context in TA)
  const [userStudyGroups, setUserStudyGroups] = useState<StudyGroup[]>([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userInfo: UserInfo = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Student',
          email: firebaseUser.email || '',
          picture: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'User'}&background=random`,
          given_name: firebaseUser.displayName?.split(' ')[0] || 'Student'
        };
        setUser(userInfo);
        
        await ensureUserDoc(firebaseUser.uid, { total_analyses: 0 });

        subscribeToUserData(firebaseUser.uid, async (data) => {
           const sessions = await getFirestoreSessions(firebaseUser.uid);
           setUserData({ ...data, sessions });
        });
        
        try {
          const groups = await getStudyGroupsForUser(firebaseUser.uid);
          setUserStudyGroups(groups);
        } catch (e) {
          console.error("Failed to load study groups", e);
        }

      } else {
        setUser(null);
        setUserData({ total_analyses: 0, sessions: [], badges: [], groupIds: [] });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showPolicies) return <PoliciesView onBack={() => setShowPolicies(false)} />;

  if (!user) {
    return (
      <>
        <LandingPage 
          onLogin={() => setAuthMode('login')} 
          onViewPolicies={() => setShowPolicies(true)} 
        />
        {authMode && (
          <AuthOverlay 
            initialMode={authMode} 
            onClose={() => setAuthMode(null)} 
          />
        )}
      </>
    );
  }

  return (
    <Layout 
      user={user} 
      userData={userData} 
      onLogout={handleLogout}
      onToolSelect={setActiveTool}
      activeTool={activeTool}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
    >
      {activeTool === 'ta' && (
        <PersonalTA 
          sessions={userData.sessions}
          studyGroups={userStudyGroups}
          userBadges={userData.badges}
        />
      )}
      {activeTool === 'video' && (
        <VideoGenerator />
      )}
    </Layout>
  );
};

export default App;