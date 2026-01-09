
import React, { useState, useRef, useEffect } from 'react';
import { File, Loader2, ChevronRight, Save, ArrowRight, MessageSquare, BookOpen, CheckCircle2, ThumbsUp, ThumbsDown, Check, Target, Trophy, ShieldAlert, XCircle, RefreshCw, Gamepad2, Brain, Siren, Zap } from 'lucide-react';
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
    setProcessStatus(`Initiating rapid extraction from ${files[0].name}...`);
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
        new Notification("Risk Analysis Complete", {
          body: "Your syllabus has been scanned for failure points. Review immediately.",
          icon: "/favicon.ico" 
        });
      }

      setStep('results'); 
    } catch (err: any) {
      console.error(err);
      alert("Extraction failed. File format may be corrupted.");
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
      onChatUpdate([...newMessages, { role: 'assistant', content: answer || "I cannot assess that risk based on current data." }]);
    } catch (err) {
      onChatUpdate([...newMessages, { role: 'assistant', content: "Risk Analyst temporarily offline." }]);
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

  const getTaxonomyColor = (level: string) => {
    switch (level) {
      case 'Remembering': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'Understanding': return 'bg-gray-100 text-black border-gray-300';
      case 'Applying': return 'bg-gray-200 text-black border-gray-400';
      case 'Analyzing': return 'bg-black text-white border-black';
      case 'Evaluating': return 'bg-black text-white border-black';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (step === 'upload') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
        <div className="w-full max-w-xl text-center space-y-6">
          <div className="w-20 h-20 bg-black dark:bg-white rounded-none flex items-center justify-center text-white dark:text-black mx-auto transition-colors shadow-none animate-pulse">
            <Siren size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-black dark:text-white tracking-tighter uppercase">The Panic Button</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium mt-2">Upload your terrifyingly large syllabus. <br />We'll identify exactly what you don't know.</p>
          </div>
          
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-none p-12 transition-all group ${!isProcessing ? 'border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer' : 'border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed'}`}
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
              <div className={`p-4 rounded-none bg-black dark:bg-white text-white dark:text-black ${!isProcessing ? 'group-hover:scale-110' : ''} transition-transform`}>
                <File size={32} />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-black dark:text-white uppercase tracking-tight">
                  Drop exam material here
                </div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  PDFs, Images, Audio, TXT supported
                </div>
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
        <div className="space-y-6">
          <div className="relative mx-auto w-fit">
            <div className="w-24 h-24 border-4 border-gray-200 dark:border-gray-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-black dark:text-white">
              <Zap size={28} fill="currentColor" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-black dark:text-white uppercase tracking-tight">Extracting Failure Points...</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium mt-2">{processStatus || "Identifying concepts you are likely to misunderstand."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors relative">
      
      {/* Quiz Overlay */}
      {quizMode !== 'closed' && (
        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-black rounded-xl shadow-2xl border border-black dark:border-white overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-black dark:text-white" size={24} />
                <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">Gatekeeper Protocol</h3>
              </div>
              <button onClick={() => setQuizMode('closed')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {quizLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                   <Loader2 className="animate-spin text-black dark:text-white" size={48} />
                   <div className="text-center">
                     <p className="text-black dark:text-white font-black text-lg">Scanning for weaknesses...</p>
                     <p className="text-gray-500 text-sm">Generating Bloom's Taxonomy Ladder (1-5)</p>
                   </div>
                </div>
              ) : quizMode === 'active' ? (
                <div className="space-y-8">
                  <div className="p-4 bg-gray-100 dark:bg-gray-900 border border-black dark:border-white flex items-start gap-4">
                    <Brain className="text-black dark:text-white shrink-0 mt-0.5" size={24} />
                    <div className="text-sm text-black dark:text-white">
                      <p className="font-bold text-base">Clearance Required: 80% (4/5)</p>
                      <p className="opacity-80">If you cannot pass this, you do not know the material. Don't lie to yourself.</p>
                    </div>
                  </div>

                  {quizQuestions.map((q, idx) => (
                    <div key={idx} className="space-y-3 relative">
                      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-800"></div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-black dark:text-white text-lg">
                          <span className="text-gray-400 mr-2 font-mono">{idx + 1}.</span> {q.question}
                        </h4>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getTaxonomyColor(q.taxonomy)}`}>
                          {q.taxonomy}
                        </span>
                      </div>
                      <div className="space-y-2 pl-2">
                        {q.options.map((opt, optIdx) => (
                          <label 
                            key={optIdx} 
                            className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                              userAnswers[idx] === opt 
                              ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black' 
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
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
                               userAnswers[idx] === opt ? 'border-white dark:border-black bg-transparent' : 'border-gray-400'
                            }`}>
                              {userAnswers[idx] === opt && <div className="w-2 h-2 bg-white dark:bg-black rounded-full" />}
                            </div>
                            <span className="font-medium">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={submitQuiz}
                    disabled={Object.keys(userAnswers).length < 5}
                    className="w-full py-4 bg-black dark:bg-white dark:text-black text-white font-black rounded-lg text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide"
                  >
                    Submit For Judgment
                  </button>
                </div>
              ) : quizMode === 'victory' ? (
                <div className="text-center py-10 space-y-6 animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto text-white dark:text-black">
                    <Trophy size={48} />
                  </div>
                  <h2 className="text-4xl font-black text-black dark:text-white uppercase tracking-tighter">Unit Secured</h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                    Score: <span className="font-bold text-black dark:text-white">{quizScore}/5</span>. You are safe here.
                  </p>
                  <button 
                    onClick={proceedToNextUnit}
                    className="px-10 py-5 bg-black dark:bg-white dark:text-black text-white font-bold rounded-lg text-lg hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
                  >
                    Unlock Next Risk Area <ArrowRight size={20} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 space-y-8 animate-in zoom-in-95">
                  <div className="w-24 h-24 border-4 border-black dark:border-white rounded-full flex items-center justify-center mx-auto text-black dark:text-white">
                    <XCircle size={48} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-black dark:text-white uppercase tracking-tighter mb-2">Critical Failure</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                       Score: <span className="font-bold text-black dark:text-white">{quizScore}/5</span>. You will fail this unit in the exam.
                    </p>
                  </div>
                  
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg text-left text-sm space-y-5 border border-black dark:border-white">
                    <div className="flex items-center gap-2 text-black dark:text-white uppercase tracking-widest text-xs font-bold border-b border-gray-200 dark:border-gray-800 pb-3">
                       <ShieldAlert size={14} /> Post-Mortem Analysis
                    </div>
                    <ul className="space-y-4">
                      {quizQuestions.map((q, i) => (
                        userAnswers[i] !== q.answer && (
                          <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">
                            <div className="flex justify-between mb-1">
                               <span className="font-bold text-black dark:text-white text-xs uppercase">Failed: {q.taxonomy}</span>
                            </div>
                            <p className="leading-relaxed">{q.explanation}</p>
                          </li>
                        )
                      ))}
                    </ul>
                  </div>
                  <button 
                    onClick={() => setQuizMode('closed')}
                    className="px-10 py-5 bg-black dark:bg-white dark:text-black text-white font-black rounded-lg text-lg hover:opacity-90 transition-all flex items-center gap-2 mx-auto uppercase tracking-wide"
                  >
                    <RefreshCw size={20} /> Retake & Survive
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-6 bg-gray-50 dark:bg-black">
           <h3 className="text-xs font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-6">Battle Units</h3>
           <div className="space-y-2">
             {finalNotes.map((note, idx) => (
               <button
                 key={idx}
                 onClick={() => setSelectedIndex(idx)}
                 className={`w-full text-left p-3 rounded-lg transition-all duration-200 group flex items-center justify-between ${
                   selectedIndex === idx 
                   ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' 
                   : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900'
                 }`}
               >
                 <span className="font-bold text-sm truncate">{note.topic}</span>
                 {idx < (selectedIndex || 0) && <CheckCircle2 size={16} className="text-gray-400 dark:text-gray-600" />}
                 {idx > (selectedIndex || 0) && <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700" />}
               </button>
             ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          {selectedIndex !== null && finalNotes[selectedIndex] ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-black dark:text-white bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full uppercase tracking-wider">Unit {selectedIndex + 1}</span>
                <button className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><Save size={18} /></button>
              </div>
              <h2 className="text-4xl font-black text-black dark:text-white tracking-tight">{finalNotes[selectedIndex].topic}</h2>
              <div className="prose prose-black dark:prose-invert max-w-none prose-headings:font-black prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed transition-colors">
                <ReactMarkdown>{finalNotes[selectedIndex].content}</ReactMarkdown>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                <button
                  onClick={handleUnlockNextBattle}
                  className="px-10 py-5 bg-black dark:bg-white dark:text-black text-white rounded-lg font-black text-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto uppercase tracking-wide"
                >
                  <ShieldAlert size={20} className="text-white dark:text-black" /> Verify Survival 
                </button>
                <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide">
                  Passing requires 80% Clearance on Bloom's Taxonomy Scale.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
               <BookOpen size={64} className="mb-4 opacity-10" />
               <p className="font-bold">Select a unit to start risk analysis.</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-60 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black flex flex-col transition-colors">
        <div className="px-8 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 bg-white dark:bg-black">
          <MessageSquare size={16} className="text-black dark:text-white" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Risk Analyst</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
          {chatHistory.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-600 pt-2 italic">Analyst: "I am scanning this unit for exam risks. Ask me anything."</p>
          )}
          {chatHistory.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[70%] flex flex-col">
                <div className={`p-3 rounded-xl text-sm font-medium ${
                  m.role === 'user' 
                  ? 'bg-black text-white self-end rounded-br-none' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 self-start rounded-tl-none shadow-sm'
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
                      className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button 
                      onClick={() => submitFeedback(i, -1)}
                      className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
                {m.role === 'assistant' && m.feedbackGiven && (
                   <div className="mt-1 px-1 text-[9px] font-bold text-black dark:text-white flex items-center gap-1 uppercase tracking-tighter self-start">
                     <Check size={10} /> Verified
                   </div>
                )}
              </div>
            </div>
          ))}
          {isAnswering && <div className="text-xs text-black dark:text-white animate-pulse px-4 font-bold">Assessing Risk...</div>}
        </div>
        <div className="px-8 pb-6">
           <div className="relative">
             <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="Query specific failure points..."
              className="w-full pl-5 pr-12 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:border-black dark:focus:border-white transition-colors font-medium"
             />
             <button onClick={handleChat} className="absolute right-2 top-1.5 p-1.5 bg-black dark:bg-white dark:text-black text-white rounded-md hover:opacity-80 transition-opacity">
               <ArrowRight size={18} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEngine;
