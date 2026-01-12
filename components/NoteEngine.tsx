
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Loader2, CheckCircle2, Save, ArrowRight, MessageSquare, BookOpen, ThumbsUp, ThumbsDown, Check, Trophy, AlertCircle, RefreshCw, Brain, UploadCloud, Library, XCircle, File, X, LayoutTemplate, Gamepad2, ExternalLink } from 'lucide-react';
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
  // Replaced manual instructions with checkbox state
  const [useSyllabusMapping, setUseSyllabusMapping] = useState(true); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startProcessing = async () => {
    if (!selectedFile) return;

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    setIsProcessing(true);
    setProcessStatus(`Reading ${selectedFile.name}...`);
    setStep('synthesizing');

    // Generate instructions based on checkbox
    const instructions = useSyllabusMapping 
      ? "Strictly organize the content into academic units matching a standard syllabus structure. Ensure clear separation of topics." 
      : "";

    try {
      const { outline: backendOutline, finalNotes: backendFinalNotes, fullText } = await processSyllabusFile(selectedFile, instructions);
      
      setAllChunks([{ chunk_id: 'syllabus_full', text: fullText }]); 
      setOutline(backendOutline);
      setFinalNotes(backendFinalNotes);
      onSaveSession(backendFinalNotes, fullText); 

      // Send Notification when done
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Vekkam Engine", { 
          body: "Analysis complete! Your study guide is ready.",
          icon: "/favicon.ico" // assuming default favicon path
        });
      }

      // Badge logic
      const hasBadge = userData.badges?.some(b => b.type === 'syllabus_survivor');
      if (!hasBadge) {
        const pagesCleared = Math.ceil(fullText.split(/\s+/).length / 250);
        const badge: Badge = {
          id: `survivor_${Date.now()}`,
          type: 'syllabus_survivor',
          title: 'Notes Master',
          description: `Processed a ${pagesCleared} page syllabus successfully.`,
          achievedAt: new Date().toISOString(),
          metadata: {
            pagesCleared: pagesCleared,
            topic: backendFinalNotes[0]?.topic || "General",
            aiAccuracy: "Verified"
          }
        };
        await saveUserBadge(userId, badge);
      }

      setStep('results'); 
    } catch (err: any) {
      console.error(err);
      alert("Extraction failed. Please check the file format.");
      setStep('upload'); 
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      onChatUpdate([...newMessages, { role: 'assistant', content: answer || "I couldn't find a direct answer in your notes." }]);
    } catch (err) {
      onChatUpdate([...newMessages, { role: 'assistant', content: "The AI tutor is temporarily unavailable." }]);
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
      const questions = await generateBattleQuiz(finalNotes[selectedIndex].content);
      setQuizQuestions(questions);
    } catch (err) {
      console.error("Quiz generation failed", err);
      setQuizMode('closed');
      alert("Failed to generate quiz. Please try again.");
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
      case 'Remembering': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Understanding': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Applying': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Analyzing': return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'Evaluating': return 'bg-orange-50 text-orange-700 border-orange-100';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (step === 'upload') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
        <div className="w-full max-w-xl text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mx-auto shadow-sm">
            <Library size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Smart Syllabus</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Upload your notes or syllabus. <br />We'll organize them into a study plan.</p>
          </div>
          
          {!selectedFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept=".pdf,image/*,audio/*,.txt" 
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:text-blue-600 transition-colors">
                  <UploadCloud size={32} />
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    Click to upload document
                  </div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    PDF, TXT, or Images supported
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm text-left animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                    <File size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-xs" title={selectedFile.name}>
                      {selectedFile.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button 
                  onClick={handleClearFile}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={useSyllabusMapping}
                      onChange={(e) => setUseSyllabusMapping(e.target.checked)}
                    />
                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                    <Check size={14} className="absolute left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-200 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      <LayoutTemplate size={16} /> Map to Syllabus Structure
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      AI will analyze content and organize it into standard academic units. Recommended for exam preparation.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={startProcessing}
                   className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                 >
                   Analyze Document <ArrowRight size={18} />
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'synthesizing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-8 animate-in fade-in">
        <div className="space-y-6">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analyzing Content...</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{processStatus || "Identifying key concepts."}</p>
          </div>
        </div>

        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
           <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full mx-auto mb-4">
             <Gamepad2 size={24} /> 
           </div>
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Analysis in Progress</h3>
           <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
             This process can take a minute. Why not keep your brain active? 
             We'll send you a notification when your study guide is ready.
           </p>
           <button 
             onClick={() => window.open('https://play2048.co/', '_blank')}
             className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
           >
             Play 2048 <ExternalLink size={16} />
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors relative">
      
      {/* Quiz Overlay */}
      {quizMode !== 'closed' && (
        <div className="absolute inset-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Knowledge Check</h3>
              </div>
              <button onClick={() => setQuizMode('closed')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {quizLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                   <Loader2 className="animate-spin text-blue-600" size={40} />
                   <p className="text-gray-600 dark:text-gray-300 font-medium">Generating questions...</p>
                </div>
              ) : quizMode === 'active' ? (
                <div className="space-y-8">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-4">
                    <Brain className="text-blue-600 shrink-0 mt-0.5" size={24} />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-semibold text-base">Assessment In Progress</p>
                      <p className="opacity-90">Answer these questions to verify your understanding of the material.</p>
                    </div>
                  </div>

                  {quizQuestions.map((q, idx) => (
                    <div key={idx} className="space-y-3 relative">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                          <span className="text-gray-400 mr-2 font-mono">{idx + 1}.</span> {q.question}
                        </h4>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getTaxonomyColor(q.taxonomy)}`}>
                          {q.taxonomy}
                        </span>
                      </div>
                      <div className="space-y-2 pl-4">
                        {q.options.map((opt, optIdx) => (
                          <label 
                            key={optIdx} 
                            className={`flex items-center p-3.5 rounded-lg border cursor-pointer transition-all ${
                              userAnswers[idx] === opt 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                               userAnswers[idx] === opt ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {userAnswers[idx] === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="text-gray-700 dark:text-gray-200 font-medium">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={submitQuiz}
                    disabled={Object.keys(userAnswers).length < 5}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    Submit Answers
                  </button>
                </div>
              ) : quizMode === 'victory' ? (
                <div className="text-center py-10 space-y-6 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <Trophy size={40} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Great Job!</h2>
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    You scored <span className="font-bold text-emerald-600">{quizScore}/5</span>. You have a solid grasp of this unit.
                  </p>
                  <button 
                    onClick={proceedToNextUnit}
                    className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-emerald-600/20"
                  >
                    Next Unit <ArrowRight size={20} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 space-y-6 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto text-amber-600">
                    <AlertCircle size={40} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Review Recommended</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                       Score: <span className="font-bold text-amber-600">{quizScore}/5</span>. Let's look at what was missed.
                    </p>
                  </div>
                  
                  <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-left text-sm space-y-4 border border-amber-100 dark:border-amber-800">
                    <h4 className="font-bold text-amber-800 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800 pb-2">Feedback</h4>
                    <ul className="space-y-4">
                      {quizQuestions.map((q, i) => (
                        userAnswers[i] !== q.answer && (
                          <li key={i} className="text-gray-700 dark:text-gray-300">
                            <span className="font-bold text-amber-600 text-xs uppercase block mb-1">Concept: {q.taxonomy}</span>
                            <p className="leading-relaxed">{q.explanation}</p>
                          </li>
                        )
                      ))}
                    </ul>
                  </div>
                  <button 
                    onClick={() => setQuizMode('closed')}
                    className="px-8 py-4 bg-gray-900 dark:bg-white dark:text-black text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw size={20} /> Review Material
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
           <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Study Plan</h3>
           <div className="space-y-2">
             {finalNotes.map((note, idx) => (
               <button
                 key={idx}
                 onClick={() => setSelectedIndex(idx)}
                 className={`w-full text-left p-3 rounded-lg transition-all duration-200 group flex items-center justify-between ${
                   selectedIndex === idx 
                   ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700' 
                   : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                 }`}
               >
                 <span className="font-medium text-sm truncate">{note.topic}</span>
                 {idx < (selectedIndex || 0) && <CheckCircle2 size={16} className="text-emerald-500" />}
                 {idx > (selectedIndex || 0) && <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700" />}
               </button>
             ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          {selectedIndex !== null && finalNotes[selectedIndex] ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">Unit {selectedIndex + 1}</span>
                <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"><Save size={18} /></button>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{finalNotes[selectedIndex].topic}</h2>
              <div className="prose prose-blue dark:prose-invert max-w-none prose-headings:font-bold prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed">
                <ReactMarkdown>{finalNotes[selectedIndex].content}</ReactMarkdown>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                <button
                  onClick={handleUnlockNextBattle}
                  className="px-8 py-4 bg-gray-900 dark:bg-white dark:text-black text-white rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto shadow-lg"
                >
                  <CheckCircle2 size={20} /> Check Understanding
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
               <BookOpen size={64} className="mb-4 opacity-10" />
               <p className="font-medium">Select a unit to begin studying.</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-64 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col transition-colors z-10">
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 bg-gray-50 dark:bg-gray-900">
          <MessageSquare size={16} className="text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">AI Tutor</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
          {chatHistory.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-600 pt-2 italic">Ask questions about this unit. I'm here to help.</p>
          )}
          {chatHistory.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%] flex flex-col">
                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white self-end rounded-br-none shadow-md' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 self-start rounded-tl-none'
                }`}>
                   {m.role === 'user' ? (
                     m.content
                   ) : (
                     <div className="prose prose-sm prose-invert max-w-none">
                       <ReactMarkdown>{m.content}</ReactMarkdown>
                     </div>
                   )}
                </div>
                {m.role === 'assistant' && !m.feedbackGiven && (
                  <div className="flex items-center gap-1 mt-1 px-1 self-start opacity-0 hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => submitFeedback(i, 1)}
                      className="p-1 text-gray-400 hover:text-emerald-500 transition-colors"
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button 
                      onClick={() => submitFeedback(i, -1)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isAnswering && <div className="text-xs text-gray-400 animate-pulse px-4">Thinking...</div>}
        </div>
        <div className="px-6 pb-6 pt-2">
           <div className="relative">
             <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="Ask a question about the content..."
              className="w-full pl-5 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all shadow-sm"
             />
             <button onClick={handleChat} className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
               <ArrowRight size={18} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEngine;
