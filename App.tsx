
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Layout from './components/Layout';
import NoteEngine from './components/NoteEngine';
import { UserInfo, UserData, Session, NoteBlock, Chunk } from './types';
import { MessageSquare, FileText, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  // Initialize data from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('vekkam_user');
    const savedData = localStorage.getItem('vekkam_data');
    if (savedUser && savedData) {
      setUser(JSON.parse(savedUser));
      setUserData(JSON.parse(savedData));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    // Mocking OAuth login
    const mockUser: UserInfo = {
      id: 'user_123',
      name: 'Aditya Dash',
      given_name: 'Aditya',
      email: 'aditya@example.com',
      picture: 'https://picsum.photos/100/100?random=10'
    };
    setUser(mockUser);
    setIsAuthenticated(true);
    localStorage.setItem('vekkam_user', JSON.stringify(mockUser));
    
    // Check for existing data
    const savedData = localStorage.getItem('vekkam_data');
    if (!savedData) {
      const initialData: UserData = {
        sessions: [],
        user_tier: 'free',
        total_analyses: 0,
        last_analysis_date: null,
        daily_analyses_count: 0
      };
      setUserData(initialData);
      localStorage.setItem('vekkam_data', JSON.stringify(initialData));
    } else {
      setUserData(JSON.parse(savedData));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('vekkam_user');
  };

  const handleSaveSession = (notes: NoteBlock[]) => {
    const newSession: Session = {
      id: `session_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      title: notes[0]?.topic || "Untitled Session",
      notes
    };

    setUserData(prev => {
      const updated = {
        ...prev,
        sessions: [newSession, ...prev.sessions],
        total_analyses: prev.total_analyses + 1
      };
      localStorage.setItem('vekkam_data', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSessionSelect = (id: string) => {
    const session = userData.sessions.find(s => s.id === id);
    if (session) {
      setActiveSessionNotes(session.notes);
      setActiveTool('notes');
    }
  };

  const handleSessionDelete = (id: string) => {
    setUserData(prev => {
      const updated = {
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== id)
      };
      localStorage.setItem('vekkam_data', JSON.stringify(updated));
      return updated;
    });
  };

  if (!isAuthenticated || !user) {
    return <LandingPage onLogin={handleLogin} onViewPolicies={() => alert('Policies view requested')} />;
  }

  return (
    <Layout 
      user={user} 
      userData={userData} 
      onLogout={handleLogout} 
      onToolSelect={setActiveTool} 
      activeTool={activeTool}
      onSessionSelect={handleSessionSelect}
      onSessionDelete={handleSessionDelete}
    >
      <div className="h-full">
        {activeTool === 'notes' && (
          <NoteEngine 
            allChunks={allChunks} 
            setAllChunks={setAllChunks} 
            onSaveSession={handleSaveSession}
            savedNotes={activeSessionNotes}
          />
        )}
        {activeTool === 'ta' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <MessageSquare size={48} className="mx-auto text-blue-600 mb-6" />
              <h2 className="text-3xl font-bold">Personal TA</h2>
              <p className="text-gray-500 max-w-sm">This module is coming soon in the React migration. It will allow you to chat across all your saved sessions.</p>
            </div>
          </div>
        )}
        {activeTool === 'mock' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <FileText size={48} className="mx-auto text-blue-600 mb-6" />
              <h2 className="text-3xl font-bold">Mock Test Generator</h2>
              <p className="text-gray-500 max-w-sm">This module is coming soon. Test your knowledge across MCQ, VSA, SA, and LA formats.</p>
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
  );
};

export default App;
