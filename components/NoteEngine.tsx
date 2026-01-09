
import React, { useState, useRef, useEffect } from 'react';
import { File, Loader2, ChevronRight, Save, ArrowRight, MessageSquare, BookOpen, CheckCircle2, ThumbsUp, ThumbsDown, Check, Target, Trophy, ShieldAlert, XCircle, RefreshCw, Gamepad2, Brain } from 'lucide-react';
import { Chunk, NoteBlock, UserData, Badge, QuizQuestion, ChatMessage } from '../types';
import { localAnswerer, processSyllabusFile, generateBattleQuiz } from '../services/ai_engine';
import { saveLearningFeedback, saveUserBadge } from '../services/firebase';
import ReactMarkdown from 'react-markdown';

interface NoteEngineProps {
  allChunks: Chunk[];
  userData: UserData;
  setAllChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  onSaveSession: (notes: NoteBlock[], fullTextContent: string) => void;
  savedNotes?: NoteBlock[];
  userPicture: string;
  userId: string;
  chatHistory: ChatMessage[];
  onChatUpdate: (messages: ChatMessage[]) => void;
}

const NoteEngine: React.FC<NoteEngineProps> = ({ 
  allChunks, 
  userData, 
  setAllChunks, 
  onSaveSession, 
  savedNotes,
  userPicture,
  userId,
  chatHistory,
  onChatUpdate
}) => {
  const [step, setStep] = useState<'upload' | 'synthesizing' | 'results'>(savedNotes ? 'results' : 'upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [outline, setOutline] = useState<{ topic: string; relevant_chunks: string[] }[]>([]);
  const [instructions, setInstructions] = useState(''); 
  const [finalNotes, setFinalNotes] = useState<NoteBlock[]>(savedNotes || []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [chatInput, setChatInput] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz State
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizMode, setQuizMode] = useState<'closed' | 'active' | 'victory' | 'defeat'>('closed');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizScore, setQuizScore] = useState(0);

  // If there are saved notes, initialize
  useEffect(() => {
    if (savedNotes && savedNotes.length > 0) {
      setFinalNotes(savedNotes);
      setOutline(savedNotes.map(n => ({ topic: n.topic, relevant_chunks: n.source_chunks || [] })));
      setStep('results');
    }
  }, [savedNotes]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    setIsProcessing(true);
    setProcessStatus(`Prioritizing ${files[0].name} for optimal clearance...`);
    setStep('synthesizing');

    try {
      const file = files[0]; 
      const { outline: backendOutline, finalNotes: backendFinalNotes, fullText } = await processSyllabusFile(file, instructions);
      
      setAllChunks([{ chunk_id: 'syllabus_full', text: fullText }]); 
      setOutline(backendOutline);
      setFinalNotes(backendFinalNotes);
      onSaveSession(backendFinalNotes, fullText); 

      const hasBadge = userData.badges?.some(b => b.type === 'syllabus_survivor');
      if (!hasBadge) {
        const pagesCleared = Math.ceil(fullText.split(/\s+/).length / 250);
        const badge: Badge = {
          id: `survivor_${Date.now()}`,
          type: 'syllabus_survivor',
          title: 'Syllabus Survivor',
          description: `Conquered a ${pagesCleared} page syllabus in record time.`,
          achievedAt: new Date().toISOString(),
          metadata: {
            pagesCleared: pagesCleared,
            topic: backendFinalNotes[0]?.topic || "Unknown Topic",
            aiAccuracy: "0 Hallucinations"
          }
        };
        await saveUserBadge(userId, badge);
      }

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Battle Plan Ready", {
          body: "Your syllabus has been synthesized. Time to clear the exam.",
          icon: "/favicon.ico" 
        });
      }

      setStep('results'); 
    } catch (err: any) {
      console.error(err);
      alert("Failed to prioritize these files: " + err.message);
      setStep('upload'); 
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };
  
  const handleChat = async () => {
    if (!chatInput.trim() || isAnswering) return;
    const userMsg = chatInput;
    setChatInput('');
    const newMessages = [...chatHistory, { role: 'user', content: userMsg } as ChatMessage];
    onChatUpdate(newMessages);
    setIsAnswering(true);

    try {
      const context = finalNotes.map(n => n.content).join('\n\n');
      const answer = await localAnswerer(userMsg, context);
      onChatUpdate([...newMessages, { role: 'assistant', content: answer || "This isn't in the battle plan." }]);
    } catch (err) {
      onChatUpdate([...newMessages, { role: 'assistant', content: "Strategy TA is temporarily offline." }]);
    } finally {
      setIsAnswering(false);
    }
  };

  const submitFeedback = async (messageIndex: number, satisfaction: number) => {
    const msg = chatHistory[messageIndex];
    const prevMsg = chatHistory[messageIndex - 1];
    
    if (msg.role !== 'assistant' || !prevMsg) return;

    await saveLearningFeedback(prevMsg.content, msg.content, satisfaction);

    const updated = chatHistory.map((m, i) => 
      i === messageIndex ? { ...m, feedbackGiven: true } : m
    );
    onChatUpdate(updated);
  };

  const handleUnlockNextBattle = async () => {
    if (selectedIndex === null || !finalNotes[selectedIndex]) return;

    setQuizLoading(true);
    setQuizMode('active');
    setUserAnswers({});
    setQuizScore(0);
    setQuizQuestions([]);

    try {
      // Logic handled in backend now (taxonomy enforcement)
      const questions = await generateBattleQuiz(finalNotes[selectedIndex].content);
      setQuizQuestions(questions);
    } catch (err) {
      console.error("Quiz generation failed", err);
      setQuizMode('closed');
      alert("Failed to generate Gatekeeper Quiz. Please try again.");
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) score++;
    });
    setQuizScore(score);
    if (score >= 4) {
      setQuizMode('victory');
    } else {
      setQuizMode('defeat');
    }
  };

  const proceedToNextUnit = () => {
    setQuizMode('closed');
    if (selectedIndex !== null && selectedIndex < finalNotes.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  // Helper to map taxonomy to color/intensity
  const getTaxonomyColor = (level: string) => {
    switch (level) {
      case 'Remembering': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'Understanding': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Applying': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Analyzing': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Evaluating': return 'bg-purple-50 text-purple-600 border-purple-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (step === 'upload') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
        <div className="w-full max-w-xl text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto transition-colors">
            <Target size={28} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Clearance Engine</h2>
          <p className="text-gray-500 dark:text-gray-400">Upload your terrifyingly large syllabus. We'll turn it into a 6-hour plan.</p>
          
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 transition-all group ${!isProcessing ? 'border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer' : 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              multiple 
              accept=".pdf,image/*,audio/*,.txt" 
              disabled={isProcessing} 
            />
            <div className="flex flex-col items-center gap-4">
              <File className={`text-gray-400 dark:text-gray-500 ${!isProcessing ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''}`} size={32} />
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                Click to select exam material (PDF, image, audio, TXT)
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'synthesizing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-8 animate-in fade-in">
        <div className="space-y-4">
          <div className="relative mx-auto w-fit">
            <div className="w-20 h-20 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Target size={20} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Compressing Syllabus...</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{processStatus || "We're weaving your material into a question-first battle plan."}</p>
          </div>
        </div>

        {/* Game Wait Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-xl shadow-gray-200 dark:shadow-none mx-auto transform hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
               <Gamepad2 size={14} /> While you wait
             </h3>
             <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">Playable</span>
          </div>
          
          <a 
            href="https://www.y8.com/games/territory_war_" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block group relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
          >
            <div className="aspect-video w-full relative">
              <img 
                src="https://cdn2.y8.com/cloudimage/1025/file/w180h135_webp-062e45d6a2cfa11faeccca66a2116fae.webp" 
                alt="Territory War" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                <p className="text-white font-bold text-lg leading-tight">Territory War</p>
                <div className="flex items-center gap-1 text-blue-300 text-xs font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  Click to Play <ArrowRight size={12} />
                </div>
              </div>
            </div>
          </a>
          
          <p className="text-xs text-gray-400 mt-4 font-medium flex items-center justify-center gap-1">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
             We'll send a desktop notification when ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors relative">
      
      {/* Quiz Overlay */}
      {quizMode !== 'closed' && (
        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-blue-600 dark:text-blue-400" size={24} />
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Gatekeeper Protocol</h3>
              </div>
              <button onClick={() => setQuizMode('closed')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {quizLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                   <Loader2 className="animate-spin text-blue-600" size={40} />
                   <div className="text-center">
                     <p className="text-gray-900 dark:text-gray-100 font-bold">Scanning Battle Unit...</p>
                     <p className="text-gray-500 text-sm">Generating Bloom's Taxonomy Ladder (1-5)</p>
                   </div>
                </div>
              ) : quizMode === 'active' ? (
                <div className="space-y-8">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
                    <Brain className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-bold">Clearance Required: 80% (4/5)</p>
                      <p className="opacity-80">Questions progress in cognitive difficulty. You must demonstrate deep understanding, not just recall.</p>
                    </div>
                  </div>

                  {quizQuestions.map((q, idx) => (
                    <div key={idx} className="space-y-3 relative">
                      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gray-100 dark:bg-gray-800"></div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                          <span className="text-gray-400 mr-2">{idx + 1}.</span> {q.question}
                        </h4>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getTaxonomyColor(q.taxonomy)}`}>
                          Level {idx + 1}: {q.taxonomy}
                        </span>
                      </div>
                      <div className="space-y-2 pl-2">
                        {q.options.map((opt, optIdx) => (
                          <label 
                            key={optIdx} 
                            className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                              userAnswers[idx] === opt 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name={`q-${idx}`} 
                              value={opt} 
                              checked={userAnswers[idx] === opt}
                              onChange={() => setUserAnswers(prev => ({ ...prev, [idx]: opt }))}
                              className="hidden"
                            />
                            <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${
                               userAnswers[idx] === opt ? 'border-blue-600 bg-blue-600' : 'border-gray-400'
                            }`}>
                              {userAnswers[idx] === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={submitQuiz}
                    disabled={Object.keys(userAnswers).length < 5}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    Submit Solutions
                  </button>
                </div>
              ) : quizMode === 'victory' ? (
                <div className="text-center py-10 space-y-6 animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                    <Trophy size={48} />
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white">BATTLE WON</h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300">
                    Score: <span className="font-bold text-emerald-600">{quizScore}/5</span>. You have conquered this unit.
                  </p>
                  <button 
                    onClick={proceedToNextUnit}
                    className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl text-lg hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto"
                  >
                    Enter Next Battle <ArrowRight size={20} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 space-y-6 animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
                    <XCircle size={48} />
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white">DEFEAT</h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300">
                    Score: <span className="font-bold text-red-600">{quizScore}/5</span>. Insufficient clearance.
                  </p>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-left text-sm space-y-4">
                    <div className="flex items-center gap-2 text-gray-500 uppercase tracking-widest text-xs font-bold border-b border-gray-200 dark:border-gray-700 pb-2">
                       <ShieldAlert size={14} /> Tactical Analysis
                    </div>
                    <ul className="space-y-3">
                      {quizQuestions.map((q, i) => (
                        userAnswers[i] !== q.answer && (
                          <li key={i} className="text-gray-600 dark:text-gray-400 text-sm">
                            <div className="flex justify-between mb-1">
                               <span className="font-bold text-red-500">Failed Level {i+1}: {q.taxonomy}</span>
                            </div>
                            <p>{q.explanation}</p>
                          </li>
                        )
                      ))}
                    </ul>
                  </div>
                  <button 
                    onClick={() => setQuizMode('closed')}
                    className="px-8 py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl text-lg hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw size={20} /> Retreat & Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-gray-100 dark:border-gray-800 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
           <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">Battle Units</h3>
           <div className="space-y-2">
             {finalNotes.map((note, idx) => (
               <button
                 key={idx}
                 onClick={() => setSelectedIndex(idx)}
                 className={`w-full text-left p-3 rounded-lg transition-all duration-200 group flex items-center justify-between ${
                   selectedIndex === idx 
                   ? 'bg-blue-600 text-white' 
                   : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                 }`}
               >
                 <span className="font-semibold text-sm truncate">{note.topic}</span>
                 {idx < (selectedIndex || 0) && <CheckCircle2 size={16} className="text-emerald-300" />}
                 {idx > (selectedIndex || 0) && <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700" />}
               </button>
             ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          {selectedIndex !== null && finalNotes[selectedIndex] ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full uppercase">Unit {selectedIndex + 1}</span>
                <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><Save size={18} /></button>
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{finalNotes[selectedIndex].topic}</h2>
              <div className="prose prose-blue dark:prose-invert max-w-none prose-headings:font-extrabold prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed transition-colors">
                <ReactMarkdown>{finalNotes[selectedIndex].content}</ReactMarkdown>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                <button
                  onClick={handleUnlockNextBattle}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto shadow-lg shadow-emerald-200 dark:shadow-none"
                >
                  <Trophy size={20} /> Unlock Next Battle 
                </button>
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 font-medium">
                  Warning: Gatekeeper Quiz (Bloom's Taxonomy) active. 80% pass rate required.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
               <BookOpen size={48} className="mb-4 opacity-20" />
               <p>Select a battle unit to begin clearing.</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-60 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
        <div className="px-8 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 bg-white dark:bg-gray-900">
          <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Strategy TA</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
          {chatHistory.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-600 pt-2 italic">Strategy TA: "Ask anything about this clearance module. I know exactly what matters."</p>
          )}
          {chatHistory.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[70%] flex flex-col">
                <div className={`p-3 rounded-xl text-sm ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white self-end rounded-br-none' 
                  : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 self-start rounded-tl-none'
                }`}>
                   {/* Render markdown for chat messages to support detailed output */}
                   {m.role === 'user' ? (
                     m.content
                   ) : (
                     <div className="prose prose-sm prose-invert max-w-none">
                       <ReactMarkdown>{m.content}</ReactMarkdown>
                     </div>
                   )}
                </div>
                {m.role === 'assistant' && !m.feedbackGiven && (
                  <div className="flex items-center gap-1 mt-1 px-1 self-start">
                    <button 
                      onClick={() => submitFeedback(i, 1)}
                      className="p-1 text-gray-400 hover:text-emerald-500 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button 
                      onClick={() => submitFeedback(i, -1)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
                {m.role === 'assistant' && m.feedbackGiven && (
                   <div className="mt-1 px-1 text-[9px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-tighter self-start">
                     <Check size={10} /> Verified
                   </div>
                )}
              </div>
            </div>
          ))}
          {isAnswering && <div className="text-xs text-blue-600 dark:text-blue-400 animate-pulse px-4">Strategizing...</div>}
        </div>
        <div className="px-8 pb-6">
           <div className="relative">
             <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="Query battle unit details..."
              className="w-full pl-5 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors"
             />
             <button onClick={handleChat} className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
               <ArrowRight size={18} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEngine;
