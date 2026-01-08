
import React, { useState, useRef } from 'react';
import { Upload, File, Loader2, Settings, ChevronRight, Save, Wand2, ArrowRight, MessageSquare, BookOpen, CheckCircle2, ThumbsUp, ThumbsDown, Check, Target } from 'lucide-react';
import { Chunk, NoteBlock, UserData } from '../types';
import { generateLocalOutline, synthesizeLocalNote, localAnswerer, extractTextFromFile, chunkText } from '../services/ai_engine';
import { saveLearningFeedback } from '../services/firebase';
import ReactMarkdown from 'react-markdown';

interface NoteEngineProps {
  allChunks: Chunk[];
  userData: UserData;
  setAllChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  onSaveSession: (notes: NoteBlock[]) => void;
  savedNotes?: NoteBlock[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  feedbackGiven?: boolean;
}

const NoteEngine: React.FC<NoteEngineProps> = ({ 
  allChunks, 
  userData, 
  setAllChunks, 
  onSaveSession, 
  savedNotes 
}) => {
  const [step, setStep] = useState<'upload' | 'workspace' | 'synthesizing' | 'results'>(savedNotes ? 'results' : 'upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [outline, setOutline] = useState<{ topic: string; relevant_chunks: string[] }[]>([]);
  const [editableOutlineText, setEditableOutlineText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [finalNotes, setFinalNotes] = useState<NoteBlock[]>(savedNotes || []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newChunks: Chunk[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessStatus(`Prioritizing ${file.name}...`);
        const extractedText = await extractTextFromFile(file);
        const fileChunks = chunkText(extractedText, `file_${Date.now()}_${i}`);
        newChunks.push(...fileChunks);
      }
      
      setAllChunks(prev => [...prev, ...newChunks]);
      setStep('workspace');
    } catch (err) {
      console.error(err);
      alert("Failed to prioritize these files. Check format and try again.");
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  const handleGenerateOutline = async () => {
    if (allChunks.length === 0) return;
    setIsProcessing(true);
    setProcessStatus('Calculating optimal clearing path...');
    try {
      const result = await generateLocalOutline(allChunks);
      if (result.outline && result.outline.length > 0) {
        setOutline(result.outline);
        setEditableOutlineText(result.outline.map((o: any) => o.topic).join('\n'));
      } else {
        const topics = ["Exam Overview", "Core High-Yield Concepts", "Critical Reasoning", "Application Patterns", "Final Clearance"];
        setEditableOutlineText(topics.join('\n'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  const handleSynthesize = async () => {
    setStep('synthesizing');
    const topics = editableOutlineText.split('\n').filter(t => t.trim());
    const synthesized: NoteBlock[] = [];
    
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const relevantChunkIds = outline.find(o => o.topic === topic)?.relevant_chunks || [];
      const relevantText = allChunks
        .filter(c => relevantChunkIds.includes(c.chunk_id))
        .map(c => c.text)
        .join('\n\n');

      try {
        const content = await synthesizeLocalNote(topic, relevantText || allChunks.slice(0, 3).map(c => c.text).join('\n'), instructions);
        synthesized.push({ topic, content: content || "", source_chunks: relevantChunkIds });
      } catch (err) {
        synthesized.push({ topic, content: "Clearance failed for this unit.", source_chunks: [] });
      }
    }

    setFinalNotes(synthesized);
    onSaveSession(synthesized);
    setStep('results');
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isAnswering) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsAnswering(true);

    try {
      const context = finalNotes.map(n => n.content).join('\n\n');
      const answer = await localAnswerer(userMsg, context);
      setChatMessages(prev => [...prev, { role: 'assistant', content: answer || "This isn't in the battle plan." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Strategy TA is temporarily offline." }]);
    } finally {
      setIsAnswering(false);
    }
  };

  const submitFeedback = async (messageIndex: number, satisfaction: number) => {
    const msg = chatMessages[messageIndex];
    const prevMsg = chatMessages[messageIndex - 1];
    
    if (msg.role !== 'assistant' || !prevMsg) return;

    await saveLearningFeedback(prevMsg.content, msg.content, satisfaction);

    setChatMessages(prev => prev.map((m, i) => 
      i === messageIndex ? { ...m, feedbackGiven: true } : m
    ));
  };

  if (step === 'upload') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
        <div className="w-full max-w-xl text-center space-y-6">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto animate-bounce-slow shadow-xl">
            <Target size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Clearance Engine</h2>
          <p className="text-gray-500 dark:text-gray-400">Upload your terrifyingly large syllabus. We'll turn it into a 6-hour plan.</p>
          
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 bg-white dark:bg-gray-900 transition-all group ${!isProcessing ? 'border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer' : 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              multiple 
              accept=".pdf,image/*,audio/*"
              disabled={isProcessing} 
            />
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-2xl transition-colors ${!isProcessing ? 'bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40' : 'bg-gray-50 dark:bg-gray-900'}`}>
                <File className={`text-gray-400 dark:text-gray-500 ${!isProcessing ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''}`} size={32} />
              </div>
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {isProcessing ? 'Chunking content...' : 'Click to select exam material'}
              </div>
            </div>
          </div>
          
          {isProcessing && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl flex items-center gap-4 text-blue-700 dark:text-blue-400">
              <Loader2 className="animate-spin" />
              <div className="text-left">
                <p className="font-bold text-sm">Ruthless Prioritization in Progress</p>
                <p className="text-xs opacity-75">{processStatus}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'workspace') {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Exam Content Compiled</span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Clearance Workspace</h2>
            <p className="text-gray-500 dark:text-gray-400">Review the clearing path. Nothing you don't need makes it through.</p>
          </div>
          <button 
            onClick={handleGenerateOutline}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
            Refine Clearance Path
          </button>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 dark:text-gray-200"><Settings size={20} /> Modular Battle Units</h3>
            <textarea
              value={editableOutlineText}
              onChange={(e) => setEditableOutlineText(e.target.value)}
              className="w-full h-80 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl text-gray-700 dark:text-gray-300 focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-600 outline-none transition-all resize-none font-medium"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 dark:text-gray-200"><ArrowRight size={20} /> Mission Constraints</h3>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. 'Exam is math-heavy', 'Only high-yield topics'..."
              className="w-full h-40 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl text-gray-700 dark:text-gray-300 focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-600 outline-none transition-all resize-none font-medium"
            />
            <button 
              onClick={handleSynthesize}
              disabled={!editableOutlineText.trim()}
              className="w-full py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 dark:hover:bg-blue-700 transition-all shadow-xl shadow-gray-200 dark:shadow-blue-900/20 disabled:opacity-50"
            >
              Start Synthesis
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'synthesizing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Target size={24} />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Compressing Syllabus...</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">We're weaving your material into a question-first battle plan.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-gray-100 dark:border-gray-800 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
           <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">Battle Units</h3>
           <div className="space-y-2">
             {finalNotes.map((note, idx) => (
               <button
                 key={idx}
                 onClick={() => setSelectedIndex(idx)}
                 className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group flex items-center justify-between ${
                   selectedIndex === idx 
                   ? 'bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700 text-blue-600 dark:text-blue-400' 
                   : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                 }`}
               >
                 <span className="font-semibold text-sm truncate">{note.topic}</span>
                 <ChevronRight size={16} className={`${selectedIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
               </button>
             ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12">
          {selectedIndex !== null && finalNotes[selectedIndex] ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full uppercase">Unit {selectedIndex + 1}</span>
                <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Save size={20} /></button>
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{finalNotes[selectedIndex].topic}</h2>
              <div className="prose prose-blue dark:prose-invert max-w-none prose-headings:font-extrabold prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed transition-colors">
                <ReactMarkdown>{finalNotes[selectedIndex].content}</ReactMarkdown>
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

      <div className="h-64 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
        <div className="px-8 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 bg-white dark:bg-gray-900/80">
          <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Strategy TA</span>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
          {chatMessages.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-600 pt-4 italic">Strategy TA: "Ask anything about this clearance module. I know exactly what matters."</p>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[70%] flex flex-col items-end">
                <div className={`p-4 rounded-3xl text-sm ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 shadow-sm'
                }`}>
                  {m.content}
                </div>
                {m.role === 'assistant' && !m.feedbackGiven && (
                  <div className="flex items-center gap-2 mt-1 px-1">
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
                {m.role === 'assistant' && m.feedbackGiven && (
                   <div className="mt-1 px-1 text-[9px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-tighter">
                     <Check size={10} /> Verified
                   </div>
                )}
              </div>
            </div>
          ))}
          {isAnswering && <div className="text-xs text-blue-600 dark:text-blue-400 animate-pulse px-4">Strategizing...</div>}
        </div>
        <div className="px-8 pb-8">
           <div className="relative">
             <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="Query battle unit details..."
              className="w-full pl-6 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors shadow-sm"
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
