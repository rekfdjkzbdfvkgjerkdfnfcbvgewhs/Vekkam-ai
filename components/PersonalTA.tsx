
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Sparkles, Target, ThumbsUp, ThumbsDown, Check, BrainCircuit, Link, Database, Trash2, BriefcaseMedical } from 'lucide-react';
import { Session, StudyGroup, Badge } from '../types';
import { queryStrategyTA } from '../services/ai_engine';
import { saveLearningFeedback } from '../services/firebase';
import ReactMarkdown from 'react-markdown';

interface PersonalTAProps {
  sessions: Session[];
  studyGroups?: StudyGroup[];
  userBadges?: Badge[];
}

interface TAMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  feedbackGiven?: boolean;
  sources?: string[]; // New: Track which sources were used
}

const PersonalTA: React.FC<PersonalTAProps> = ({ sessions, studyGroups = [], userBadges = [] }) => {
  const [messages, setMessages] = useState<TAMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    const userId = `msg_${Date.now()}`;
    setInput('');
    
    // Prepare history from existing messages
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { role: 'user', content: userMsg, id: userId }]);
    setLoading(true);

    try {
      // Use the unified RAG function with chat history
      const { text, sources } = await queryStrategyTA(userMsg, history, sessions, studyGroups, userBadges);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: text, 
        id: `ai_${Date.now()}`,
        sources: sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I lost the signal to your knowledge base. Please try asking again.",
        id: `err_${Date.now()}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Clear chat history? This will reset the analyst's short-term memory.")) {
      setMessages([]);
    }
  };

  const submitFeedback = async (messageIndex: number, satisfaction: number) => {
    const msg = messages[messageIndex];
    const prevMsg = messages[messageIndex - 1];
    if (msg.role !== 'assistant' || !prevMsg) return;
    await saveLearningFeedback(prevMsg.content, msg.content, satisfaction);
    setMessages(prev => prev.map((m, i) => i === messageIndex ? { ...m, feedbackGiven: true } : m));
  };

  const suggestionChips = [
    "What's my weakest topic?",
    "Generate a quiz from Unit 2",
    "Summarize my Physics notes",
    "Any updates in the Econ group?"
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-black z-10">
        <div>
          <h2 className="text-2xl font-extrabold text-black dark:text-white flex items-center gap-2">
            <BriefcaseMedical className="text-black dark:text-white" /> Risk Analyst
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Connected to {sessions.length} units, {studyGroups.length} war rooms.</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-black dark:hover:text-white rounded-lg transition-colors"
              title="Clear Context"
            >
              <Trash2 size={18} />
            </button>
          )}
          <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-black dark:text-white text-xs font-bold rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-black dark:bg-white rounded-full"></div> RAG Active
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 max-w-md mx-auto">
            <div className="relative">
              <div className="w-20 h-20 bg-white dark:bg-black border border-black dark:border-white rounded-none flex items-center justify-center text-black dark:text-white animate-bounce-slow">
                <BriefcaseMedical size={32} />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-black dark:text-white">I know what you're afraid of.</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                I'm linked to your notes, your study groups, and your failed quizzes. Ask me where you are weakest.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(chip)}
                  className="px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all text-left flex items-center justify-between group"
                >
                  {chip} <Send size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                
                {/* Message Bubble */}
                <div className={`p-4 rounded-xl shadow-sm text-sm leading-relaxed font-medium ${
                  m.role === 'user' 
                    ? 'bg-black text-white dark:bg-white dark:text-black rounded-br-none' 
                    : 'bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-black dark:text-gray-200 rounded-tl-none'
                }`}>
                   {m.role === 'user' ? (
                     <p className="whitespace-pre-wrap">{m.content}</p>
                   ) : (
                     <div className="prose prose-sm prose-black dark:prose-invert max-w-none">
                       <ReactMarkdown>{m.content}</ReactMarkdown>
                     </div>
                   )}
                </div>

                {/* AI Metadata (Sources & Feedback) */}
                {m.role === 'assistant' && (
                  <div className="mt-2 pl-1 w-full space-y-2">
                    
                    {/* Sources Used */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {m.sources.map((src, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[10px] font-medium text-gray-600 dark:text-gray-400">
                            <Link size={8} /> {src}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Feedback Actions */}
                    {!m.feedbackGiven ? (
                      <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <button 
                          onClick={() => submitFeedback(i, 1)}
                          className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                          title="Helpful"
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button 
                          onClick={() => submitFeedback(i, -1)}
                          className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                          title="Not Helpful"
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    ) : (
                       <div className="flex items-center gap-1 text-[10px] font-bold text-black dark:text-white uppercase tracking-widest">
                         <Check size={10} /> Feedback Recorded
                       </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4 rounded-xl rounded-tl-none flex items-center gap-3 shadow-sm">
              <Loader2 size={18} className="animate-spin text-black dark:text-white" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-black dark:text-white">Connecting dots...</span>
                <span className="text-[10px] text-gray-400">Scanning notes, chats, and history</span>
              </div>
            </div>
          </div>
        ) }
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Risk Analyst (e.g., 'Do I know enough about Unit 3 to pass?')"
            className="relative w-full pl-5 pr-14 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-black dark:text-white rounded-lg focus:border-black dark:focus:border-white outline-none transition-all font-medium"
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-md hover:opacity-80 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
          Powered by a RAG pipeline connecting your Notes, War Rooms, and Survival Records.
        </p>
      </div>
    </div>
  );
};

export default PersonalTA;
