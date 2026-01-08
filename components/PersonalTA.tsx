
import React, { useState } from 'react';
import { MessageSquare, Send, Loader2, Sparkles, Target, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { Session } from '../types';
import { localAnswerer } from '../services/ai_engine';
import { saveLearningFeedback } from '../services/firebase';

interface PersonalTAProps {
  sessions: Session[];
}

interface TAMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  feedbackGiven?: boolean;
}

const PersonalTA: React.FC<PersonalTAProps> = ({ sessions }) => {
  const [messages, setMessages] = useState<TAMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    const userId = `msg_${Date.now()}`;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, id: userId }]);
    setLoading(true);

    try {
      const fullContext = sessions
        .flatMap(s => s.notes)
        .map(n => `Topic: ${n.topic}\nContent: ${n.content}`)
        .join('\n\n---\n\n');

      const response = await localAnswerer(userMsg, fullContext || "You haven't cleared any material yet.");
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response, 
        id: `ai_${Date.now()}` 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Strategy TA is thinking too hard. Try again.",
        id: `err_${Date.now()}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (messageIndex: number, satisfaction: number) => {
    const msg = messages[messageIndex];
    const prevMsg = messages[messageIndex - 1];
    
    if (msg.role !== 'assistant' || !prevMsg) return;

    await saveLearningFeedback(prevMsg.content, msg.content, satisfaction);

    setMessages(prev => prev.map((m, i) => 
      i === messageIndex ? { ...m, feedbackGiven: true } : m
    ));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors">
      <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950 z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Strategy TA</h2>
          <p className="text-gray-500 dark:text-gray-400">"Relax. I know exactly what matters. Follow me."</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl">
          <Target size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{sessions.length} Battle Units Connected</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 animate-pulse">
              <Sparkles size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Question your plan</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">"What's the most likely high-yield topic from the modules I've cleared?"</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%] flex flex-col items-end">
                <div className={`p-4 rounded-xl shadow-sm transition-colors text-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-tl-none'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.role === 'assistant' && !m.feedbackGiven && (
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <button 
                      onClick={() => submitFeedback(i, 1)}
                      className="p-1 text-gray-400 hover:text-emerald-500 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => submitFeedback(i, -1)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}
                {m.role === 'assistant' && m.feedbackGiven && (
                   <div className="flex items-center gap-1 mt-1 px-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                     <Check size={12} /> Learned
                   </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-xl rounded-tl-none flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Calculations...</span>
            </div>
          </div>
        ) }
      </div>

      <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 transition-colors">
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Consult Strategy TA..."
            className="w-full pl-5 pr-14 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-900/10 focus:border-blue-400 dark:focus:border-blue-600 outline-none transition-all font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalTA;