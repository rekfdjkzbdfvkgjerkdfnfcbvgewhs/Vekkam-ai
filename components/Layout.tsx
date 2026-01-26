import React from 'react';
import { 
  LogOut, 
  Zap, 
  Sun, 
  Moon,
  GraduationCap,
  Video
} from 'lucide-react';
import { UserInfo, UserData, Session } from '../types';

interface LayoutProps {
  user: UserInfo;
  userData: UserData & { sessions: Session[] };
  onLogout: () => void;
  onToolSelect: (tool: string) => void;
  activeTool: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  user, 
  onLogout, 
  onToolSelect, 
  activeTool, 
  darkMode,
  onToggleDarkMode,
  children 
}) => {
  
  const tools = [
    { id: 'ta', name: 'Personal AI Tutor', icon: GraduationCap },
    { id: 'video', name: 'Video Studio', icon: Video },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300 shadow-sm z-10">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 rounded-lg p-1.5 text-white">
              <Zap size={20} fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Vekkam</h1>
          </div>
          <button 
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* User Profile */}
        <div className="px-4 py-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{user.given_name}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Pro Plan Active</p>
            </div>
            <button onClick={onLogout} title="Logout" className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar space-y-8">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">Tools</h2>
            <div className="space-y-1">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                    activeTool === tool.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <tool.icon size={20} className={activeTool === tool.id ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600"} />
                  <span className="text-sm">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto h-full">
           {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;