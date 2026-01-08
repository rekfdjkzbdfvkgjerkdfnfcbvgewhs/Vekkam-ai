
import React, { useState, useRef } from 'react';
import { File, Loader2, ChevronRight, Save, ArrowRight, MessageSquare, BookOpen, CheckCircle2, ThumbsUp, ThumbsDown, Check, Target } from 'lucide-react';
import { Chunk, NoteBlock, UserData } from '../types';
import { localAnswerer, processSyllabusFile } from '../services/ai_engine';
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
  const [step, setStep] = useState<'upload' | 'synthesizing' | 'results'>(savedNotes ? 'results' : 'upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [outline, setOutline] = useState<{ topic: string; relevant_chunks: string[] }[]>([]);
  const [instructions, setInstructions] = useState(''); // Kept for future optional use
  const [finalNotes, setFinalNotes] = useState<NoteBlock[]>(savedNotes || []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If there are saved notes (from an existing session), initialize the outline and notes
  React.useEffect(() => {
    if (savedNotes && savedNotes.length > 0) {
      setFinalNotes(savedNotes);
      setOutline(savedNotes.map(n => ({ topic: n.topic, relevant_chunks: n.source_chunks || [] })));
      // No editableOutlineText anymore
      setStep('results');
    }
  }, [savedNotes]);


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessStatus(`Prioritizing ${files[0].name} for optimal clearance...`);
    setStep('synthesizing'); // Transition to synthesizing step

    try {
      const file = files[0]; 

      // Send the file and instructions to the new backend /api/process-syllabus endpoint
      const { outline: backendOutline, finalNotes: backendFinalNotes, fullText } = await processSyllabusFile(file, instructions); // instructions can be an empty string if not used
      
      setAllChunks([{ chunk_id: 'syllabus_full', text: fullText }]); 
      setOutline(backendOutline);
      setFinalNotes(backendFinalNotes);
      onSaveSession(backendFinalNotes); // Save the new session immediately

      setStep('results'); // Directly go to results after processing
    } catch (err: any) {
      console.error(err);
      alert("Failed to prioritize these files: " + err.message);
      setStep('upload'); // Go back to upload on error
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Target size={20} />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Compressing Syllabus...</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">{processStatus || "We're weaving your material into a question-first battle plan."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors">
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
                 <ChevronRight size={16} className={`${selectedIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
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
          {chatMessages.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-600 pt-2 italic">Strategy TA: "Ask anything about this clearance module. I know exactly what matters."</p>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[70%] flex flex-col">
                <div className={`p-3 rounded-xl text-sm ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white self-end rounded-br-none' 
                  : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 self-start rounded-tl-none'
                }`}>
                  {m.content}
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