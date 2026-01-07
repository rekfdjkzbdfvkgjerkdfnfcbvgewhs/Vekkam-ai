
import React, { useState, useRef } from 'react';
import { Upload, File, Loader2, Play, Settings, ChevronRight, Save, Wand2, ArrowRight, MessageSquare, BookOpen } from 'lucide-react';
import { Chunk, NoteBlock } from '../types';
import { generateContentOutline, synthesizeNoteBlock, answerFromContext } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface NoteEngineProps {
  allChunks: Chunk[];
  setAllChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  onSaveSession: (notes: NoteBlock[]) => void;
  savedNotes?: NoteBlock[];
}

const NoteEngine: React.FC<NoteEngineProps> = ({ allChunks, setAllChunks, onSaveSession, savedNotes }) => {
  const [step, setStep] = useState<'upload' | 'workspace' | 'synthesizing' | 'results'>(savedNotes ? 'results' : 'upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [outline, setOutline] = useState<{ topic: string; relevant_chunks: string[] }[]>([]);
  const [editableOutlineText, setEditableOutlineText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [finalNotes, setFinalNotes] = useState<NoteBlock[]>(savedNotes || []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    // Simulation of file processing (In a real app, use PDF.js or similar)
    const newChunks: Chunk[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Mocking text extraction
      const mockText = `This is extracted content from ${file.name}. It contains essential study material about the core concepts discussed in the syllabus. It covers foundational topics and more advanced details required for exams.`;
      const chunkId = `file_${Date.now()}_${i}`;
      newChunks.push({ chunk_id: chunkId, text: mockText });
    }
    
    setAllChunks(prev => [...prev, ...newChunks]);
    setIsProcessing(false);
    setStep('workspace');
  };

  const handleGenerateOutline = async () => {
    if (allChunks.length === 0) return;
    setIsProcessing(true);
    try {
      const result = await generateContentOutline(allChunks);
      setOutline(result.outline);
      setEditableOutlineText(result.outline.map((o: any) => o.topic).join('\n'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
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
        const content = await synthesizeNoteBlock(topic, relevantText || "No context found", instructions);
        synthesized.push({ topic, content: content || "", source_chunks: relevantChunkIds });
      } catch (err) {
        synthesized.push({ topic, content: "Failed to synthesize content for this topic.", source_chunks: [] });
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
      const answer = await answerFromContext(userMsg, context);
      setChatMessages(prev => [...prev, { role: 'assistant', content: answer || "I couldn't find an answer in your notes." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "An error occurred while answering." }]);
    } finally {
      setIsAnswering(false);
    }
  };

  if (step === 'upload') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
        <div className="w-full max-w-xl text-center space-y-6">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 mx-auto animate-bounce-slow">
            <Upload size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Note & Lesson Engine</h2>
          <p className="text-gray-500">Upload your study material (PDF, Image, or Audio) to generate high-impact revision notes.</p>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-3xl p-12 bg-white hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all group"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-gray-100 rounded-2xl group-hover:bg-blue-100 transition-colors">
                <File className="text-gray-400 group-hover:text-blue-600" size={32} />
              </div>
              <div className="text-sm font-semibold text-gray-500 group-hover:text-blue-700">Click to select files from your device</div>
              <div className="text-xs text-gray-400">Maximum total size: 150MB</div>
            </div>
          </div>
          
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-blue-600 font-bold">
              <Loader2 className="animate-spin" /> Processing your material...
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
            <h2 className="text-3xl font-extrabold text-gray-900">Vekkam Workspace</h2>
            <p className="text-gray-500">Analyze your content and prepare for synthesis.</p>
          </div>
          <button 
            onClick={handleGenerateOutline}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
            Generate Outline
          </button>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><Settings size={20} /> Content Strategy</h3>
            <textarea
              value={editableOutlineText}
              onChange={(e) => setEditableOutlineText(e.target.value)}
              placeholder="Your outline will appear here. You can also manually add topics..."
              className="w-full h-80 p-6 bg-white border border-gray-200 rounded-3xl text-gray-700 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all resize-none font-medium"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><ArrowRight size={20} /> Instructions (Optional)</h3>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. 'Explain like I'm 15' or 'Focus on technical formulas'..."
              className="w-full h-40 p-6 bg-white border border-gray-200 rounded-3xl text-gray-700 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all resize-none font-medium"
            />
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
               <h4 className="font-bold text-amber-800 mb-2">Pro Tip</h4>
               <p className="text-sm text-amber-700">Adding specific instructions helps the AI prioritize the right level of depth for your upcoming exam.</p>
            </div>
            <button 
              onClick={handleSynthesize}
              disabled={!editableOutlineText.trim()}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
            >
              Synthesize Unified Notes
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
          <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-blue-600">
            <Wand2 size={24} />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900">Synthesizing Notes...</h2>
        <p className="text-gray-500 max-w-sm">We're weaving your study material into a cohesive learning experience. This takes about 10-20 seconds.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Rail */}
        <div className="w-72 border-r border-gray-100 overflow-y-auto p-6 bg-gray-50/50">
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Study Topics</h3>
           <div className="space-y-2">
             {finalNotes.map((note, idx) => (
               <button
                 key={idx}
                 onClick={() => setSelectedIndex(idx)}
                 className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group flex items-center justify-between ${
                   selectedIndex === idx ? 'bg-white shadow-md border border-gray-100 text-blue-600' : 'text-gray-600 hover:bg-white/50'
                 }`}
               >
                 <span className="font-semibold text-sm truncate">{note.topic}</span>
                 <ChevronRight size={16} className={`${selectedIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
               </button>
             ))}
           </div>
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-12">
          {selectedIndex !== null && finalNotes[selectedIndex] ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Module {selectedIndex + 1}</span>
                <button className="p-2 text-gray-400 hover:text-blue-600"><Save size={20} /></button>
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{finalNotes[selectedIndex].topic}</h2>
              <div className="prose prose-blue max-w-none prose-headings:font-extrabold prose-p:text-gray-600 prose-p:leading-relaxed">
                <ReactMarkdown>{finalNotes[selectedIndex].content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <BookOpen size={48} className="mb-4 opacity-20" />
               <p>Select a topic from the sidebar to start learning</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick TA Panel */}
      <div className="h-64 border-t border-gray-100 bg-gray-50 flex flex-col">
        <div className="px-8 py-3 border-b border-gray-100 flex items-center gap-2 bg-white">
          <MessageSquare size={16} className="text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Contextual Chat</span>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
          {chatMessages.length === 0 && (
            <p className="text-center text-sm text-gray-400 pt-4">Ask a question about your newly generated notes...</p>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-4 rounded-3xl text-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 shadow-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isAnswering && <div className="text-xs text-blue-600 animate-pulse">Assistant is thinking...</div>}
        </div>
        <div className="px-8 pb-8">
           <div className="relative">
             <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="Ask anything about this session..."
              className="w-full pl-6 pr-12 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:border-blue-400 transition-colors shadow-sm"
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
