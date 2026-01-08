
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
  Users, // New icon for Study Groups
  Award // New icon for Achievements
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
    { id: 'notes', name: 'Clearance Engine', icon: Target },
    { id: 'ta', name: 'Strategy TA', icon: MessageSquare },
    { id: 'mock', name: 'The Final Gauntlet', icon: ShieldAlert },
    { id: 'mastery', name: 'Skill Genome', icon: Zap },
    { id: 'groups', name: 'Study Groups', icon: Users }, // New tool
    { id: 'achievements', name: 'Achievements', icon: Award }, // New tool
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300 font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-colors duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">V</div>
            <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Vekkam</h1>
          </div>
          <button 
            onClick={onToggleDarkMode}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 mx-4 my-2 flex items-center gap-3">
          <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-700" />
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{user.given_name}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 opacity-80">Ready for Battle</p>
          </div>
          <button onClick={onLogout} title="Logout" className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <div className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 mb-2">Battle Plan</h2>
            <div className="space-y-1">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                    activeTool === tool.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <tool.icon size={18} />
                  <span className="font-medium text-sm">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Cleared Sessions</h2>
              <History size={14} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="space-y-1">
              {userData.sessions.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-600 italic px-4 py-2">No cleared material yet.</p>
              ) : (
                userData.sessions.map(session => (
                  <div key={session.id} className="rounded-lg overflow-hidden border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-all">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer group"
                      onClick={() => toggleSession(session.id)}
                    >
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{session.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{session.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        {expandedSessions[session.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>
                    {expandedSessions[session.id] && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20">
                        <div className="space-y-1 mb-3">
                          {session.notes.slice(0, 3).map((n, idx) => (
                            <p key={idx} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <span className="w-1 h-1 bg-blue-400 rounded-full"></span> {n.topic}
                            </p>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onSessionSelect(session.id)}
                            className="flex-1 py-1.5 text-[11px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                          >
                            OPEN
                          </button>
                          <button 
                            onClick={() => onSessionDelete(session.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
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
           <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Infinite Limits</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 opacity-75">Full access enabled. No limits on mastery.</p>
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