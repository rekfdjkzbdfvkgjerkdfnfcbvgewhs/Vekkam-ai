
import React, { useState } from 'react';
import { UserInfo, UserData, Session } from '../types';
import { 
  LogOut, 
  BookOpen, 
  MessageSquare, 
  FileText, 
  Zap, 
  History, 
  ChevronRight,
  ChevronDown,
  Trash2,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

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
    { id: 'notes', name: 'Note & Lesson Engine', icon: BookOpen },
    { id: 'ta', name: 'Personal TA', icon: MessageSquare },
    { id: 'mock', name: 'Mock Test Generator', icon: FileText },
    { id: 'mastery', name: 'Mastery Engine', icon: Zap },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-lg transition-colors duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">V</div>
            <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Vekkam</h1>
          </div>
          <button 
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 mx-4 my-2 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-gray-800 transition-colors">
          <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" />
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{user.given_name}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Free Access Enabled</p>
          </div>
          <button onClick={onLogout} title="Logout" className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <div className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 mb-2">Study Tools</h2>
            <div className="space-y-1">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTool === tool.id 
                    ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <tool.icon size={20} />
                  <span className="font-medium">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">History</h2>
              <History size={14} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="space-y-2">
              {userData.sessions.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-600 italic px-4">No saved sessions yet.</p>
              ) : (
                userData.sessions.map(session => (
                  <div key={session.id} className="group bg-gray-50 dark:bg-gray-800/30 rounded-xl overflow-hidden border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer"
                      onClick={() => toggleSession(session.id)}
                    >
                      <div className="flex-1 truncate">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{session.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{session.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        {expandedSessions[session.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>
                    {expandedSessions[session.id] && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50">
                        <div className="space-y-2 mb-3">
                          {session.notes.slice(0, 3).map((n, idx) => (
                            <p key={idx} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <span className="w-1 h-1 bg-blue-400 rounded-full"></span> {n.topic}
                            </p>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onSessionSelect(session.id)}
                            className="flex-1 py-1.5 text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                          >
                            OPEN
                          </button>
                          <button 
                            onClick={() => onSessionDelete(session.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

        <div className="p-6 border-t border-gray-100 dark:border-gray-800">
           <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Infinite Limits</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 opacity-75">All features are unlocked for your academic success.</p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        {children}
      </main>
    </div>
  );
};

export default Layout;
