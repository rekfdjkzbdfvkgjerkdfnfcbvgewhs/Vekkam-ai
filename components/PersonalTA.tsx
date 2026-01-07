
import React, { useState } from 'react';
import { MessageSquare, Send, Loader2, Sparkles, History } from 'lucide-react';
import { Session } from '../types';
import { localAnswerer } from '../services/ai_engine';

interface PersonalTAProps {
  sessions: Session[];
}

const PersonalTA: React.FC<PersonalTAProps> = ({ sessions }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Gather all notes from all sessions to provide broad context
      const fullContext = sessions
        .flatMap(s => s.notes)
        .map(n => `Topic: ${n.topic}\nContent: ${n.content}`)
        .join('\n\n---\n\n');

      const response = await localAnswerer(userMsg, fullContext || "No study material found in history.");
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error while consulting your notes." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">Personal TA</h2>
          <p className="text-gray-500">Your dedicated tutor, powered by your entire study history.</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl">
          <History size={18} className="text-blue-600" />
          <span className="text-sm font-bold text-blue-700">{sessions.length} Sessions Connected</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-sm mx-auto">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-4 animate-pulse">
              <Sparkles size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Ask your TA anything</h3>
            <p className="text-gray-500 text-sm">"How does photosynthesis relate to the carbon cycle we studied last week?"</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-6 rounded-3xl shadow-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed">{m.content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl rounded-tl-none flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">TA is thinking...</span>
            </div>
          </div>
        ) }
      </div>

      <div className="p-8 border-t border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Search your knowledge base..."
            className="w-full pl-6 pr-16 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalTA;
