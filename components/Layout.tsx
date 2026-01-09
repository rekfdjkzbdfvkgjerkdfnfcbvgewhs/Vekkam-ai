
import React, { useState } from 'react';
import { 
  LogOut, 
  Target, 
  MessageSquare, 
  ShieldAlert, 
  Zap, 
  History, 
  ChevronRight,
  ChevronDown,
  Trash2,
  Sun,
  Moon,
  Users,
  Award,
  Siren,
  Microscope,
  BriefcaseMedical
} from 'lucide-react';
import { UserInfo, UserData, Session } from '../types';

interface LayoutProps {
  user: UserInfo;
  userData: UserData & { sessions: Session[] };
  onLogout: () => void;
  onToolSelect: (tool: string) => void;
  activeTool: string;
  onSessionSelect: (id: string) => void;
  onSessionDelete: (id: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  user, 
  userData, 
  onLogout, 
  onToolSelect, 
  activeTool, 
  onSessionSelect,
  onSessionDelete,
  darkMode,
  onToggleDarkMode,
  children 
}) => {
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const toggleSession = (id: string) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tools = [
    { id: 'notes', name: 'The Panic Button', icon: Siren },
    { id: 'mock', name: 'Truth Serum', icon: Microscope },
    { id: 'ta', name: 'Risk Analyst', icon: BriefcaseMedical },
    { id: 'groups', name: 'War Rooms', icon: Users },
    { id: 'achievements', name: 'Survival Record', icon: Award },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-black overflow-hidden transition-colors duration-300 font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-gray-50 dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://vekkam.wordpress.com/wp-content/uploads/2025/05/uniqorn.png?w=88&h=50" 
              alt="Vekkam Logo" 
              className="h-8 w-auto dark:invert" 
            />
            <h1 className="text-xl font-black tracking-tighter text-black dark:text-white uppercase">Vekkam</h1>
          </div>
          <button 
            onClick={onToggleDarkMode}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 mx-4 my-2 flex items-center gap-3">
          <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-800 grayscale" />
          <div className="flex-1 overflow-hidden">
            <p className="font-bold text-sm text-black dark:text-white truncate">{user.given_name}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Risk: <span className="text-black dark:text-white border-b border-black dark:border-white">High</span></p>
          </div>
          <button onClick={onLogout} title="Logout" className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <div className="mb-8">
            <h2 className="text-xs font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest px-4 mb-4">Risk Mitigation</h2>
            <div className="space-y-1">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    activeTool === tool.id 
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900'
                  }`}
                >
                  <tool.icon size={18} className={activeTool === tool.id ? "text-white dark:text-black" : "group-hover:text-black dark:group-hover:text-white transition-colors"} />
                  <span className="font-bold text-sm tracking-tight">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-xs font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Cleared Units</h2>
              <History size={14} className="text-gray-400 dark:text-gray-600" />
            </div>
            <div className="space-y-1">
              {userData.sessions.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-600 italic px-4 py-2">No units secured yet.</p>
              ) : (
                userData.sessions.map(session => (
                  <div key={session.id} className="rounded-lg overflow-hidden border border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-all">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer group"
                      onClick={() => toggleSession(session.id)}
                    >
                      <div className="flex-1 truncate">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-200 truncate group-hover:underline decoration-1 underline-offset-2">{session.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{session.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        {expandedSessions[session.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>
                    {expandedSessions[session.id] && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
                        <div className="space-y-1 mb-3">
                          {session.notes.slice(0, 3).map((n, idx) => (
                            <p key={idx} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1 font-medium">
                              <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full"></span> {n.topic}
                            </p>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onSessionSelect(session.id)}
                            className="flex-1 py-1.5 text-[11px] font-bold bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-black dark:text-white rounded hover:bg-gray-50 dark:hover:bg-gray-900 transition-all uppercase tracking-wide"
                          >
                            Review
                          </button>
                          <button 
                            onClick={() => onSessionDelete(session.id)}
                            className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </nav>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800">
           <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
              <p className="text-xs font-black text-black dark:text-white uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><ShieldAlert size={12}/> Insurance Active</p>
              <p className="text-[10px] text-gray-500 font-medium">Full coverage enabled.</p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-white dark:bg-black transition-colors duration-300">
        {children}
      </main>
    </div>
  );
};

export default Layout;
