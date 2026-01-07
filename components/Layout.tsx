
import React, { useState } from 'react';
import { UserInfo, UserData } from '../types';
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
  Edit2
} from 'lucide-react';

interface LayoutProps {
  user: UserInfo;
  userData: UserData;
  onLogout: () => void;
  onToolSelect: (tool: string) => void;
  activeTool: string;
  onSessionSelect: (id: string) => void;
  onSessionDelete: (id: string) => void;
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">V</div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800">Vekkam Engine</h1>
        </div>

        {/* User Profile */}
        <div className="p-4 mx-4 my-2 bg-blue-50 rounded-2xl flex items-center gap-4">
          <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold text-gray-900 truncate">{user.given_name}</p>
            <p className="text-xs text-blue-600 font-medium">{userData.user_tier.toUpperCase()} TIER</p>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <div className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">Study Tools</h2>
            <div className="space-y-1">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTool === tool.id 
                    ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                    : 'text-gray-600 hover:bg-gray-100'
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
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">History</h2>
              <History size={14} className="text-gray-400" />
            </div>
            <div className="space-y-2">
              {userData.sessions.length === 0 ? (
                <p className="text-sm text-gray-400 italic px-4">No saved sessions yet.</p>
              ) : (
                userData.sessions.map(session => (
                  <div key={session.id} className="group bg-gray-50 rounded-xl overflow-hidden border border-transparent hover:border-gray-200 transition-all">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer"
                      onClick={() => toggleSession(session.id)}
                    >
                      <div className="flex-1 truncate">
                        <p className="text-sm font-semibold text-gray-800 truncate">{session.title}</p>
                        <p className="text-[10px] text-gray-400">{session.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {expandedSessions[session.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>
                    {expandedSessions[session.id] && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-white">
                        <div className="space-y-2 mb-3">
                          {session.notes.slice(0, 3).map((n, idx) => (
                            <p key={idx} className="text-[11px] text-gray-600 flex items-center gap-1">
                              <span className="w-1 h-1 bg-blue-400 rounded-full"></span> {n.topic}
                            </p>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onSessionSelect(session.id)}
                            className="flex-1 py-1.5 text-[11px] font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            OPEN
                          </button>
                          <button 
                            onClick={() => onSessionDelete(session.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

        {/* Tier Info */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-2xl text-white">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-tighter">Usage Status</span>
              {userData.user_tier === 'free' && (
                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">UPGRADE</span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {userData.user_tier === 'free' 
                    ? 10 - userData.total_analyses 
                    : 3 - userData.daily_analyses_count
                  }
                </p>
                <p className="text-[10px] text-gray-400 uppercase font-medium">Remaining Credits</p>
              </div>
              <div className="w-12 h-12 flex items-center justify-center">
                 <Zap size={24} className="text-blue-500 fill-blue-500/20" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
};

export default Layout;
