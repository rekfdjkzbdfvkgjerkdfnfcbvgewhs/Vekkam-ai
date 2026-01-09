
import React, { useState } from 'react';
import { FileText, ClipboardList, Loader2, CheckCircle2, AlertTriangle, ArrowRight, BrainCircuit, ScanSearch, Microscope, Database, MessageSquare, Siren } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NoteBlock, ChatMessage } from '../types';

interface MockTestGeneratorProps {
  notes?: NoteBlock[];
  chatHistory?: ChatMessage[];
}

export const MockTestGenerator: React.FC<MockTestGeneratorProps> = ({ notes, chatHistory = [] }) => {
  const [syllabus, setSyllabus] = useState('');
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [step, setStep] = useState<'input' | 'diagnosing' | 'results'>('input');
  const [diagnosticStage, setDiagnosticStage] = useState<string>('');

  // RAG Pipeline Helpers
  const chunkString = (str: string, size: number) => {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size);
    }
    return chunks;
  };

  const getKeywords = (text: string) => {
    // Simple stopwords filter + frequency analysis
    const stopWords = new Set(['the', 'is', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'a', 'an']);
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const freq: Record<string, number> = {};
    words.forEach(w => {
      if (!stopWords.has(w) && w.length > 3) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
  };

  const runDiagnosticPipeline = async (sourceText: string, chatContext: string) => {
    setStep('diagnosing');
    const combinedText = sourceText + "\n\n" + chatContext;

    // Stage 1: NLP Analysis
    setDiagnosticStage('Scanning for Conceptual Gaps...');
    await new Promise(r => setTimeout(r, 800)); // Simulate processing
    const keywords = getKeywords(combinedText);
    
    // Stage 2: RAG Chunking
    setDiagnosticStage('Isolating High-Yield Risk Areas...');
    await new Promise(r => setTimeout(r, 800));
    
    // Heuristic: If text > 8000 chars, chunk and prioritize
    let refinedContext = combinedText;
    if (combinedText.length > 8000) {
      setDiagnosticStage('Optimizing Challenge Parameters...');
      const chunks = chunkString(combinedText, 1500);
      
      // Simple RAG simulation: Prioritize chunks with high keyword density + First/Last chunks
      const scoredChunks = chunks.map(chunk => {
        let score = 0;
        keywords.forEach(kw => {
           if (chunk.toLowerCase().includes(kw)) score++;
        });
        return { chunk, score };
      });
      
      scoredChunks.sort((a, b) => b.score - a.score);
      // Select top 3 relevant + first chunk (intro) + random for serendipity
      const topChunks = scoredChunks.slice(0, 4).map(c => c.chunk);
      if (chunks.length > 0 && !topChunks.includes(chunks[0])) topChunks.unshift(chunks[0]); 
      
      refinedContext = topChunks.join('\n\n...[content skipped for optimization]...\n\n');
      await new Promise(r => setTimeout(r, 600));
    }

    // Stage 3: Construction
    setDiagnosticStage('Finalizing Truth Serum...');
    return refinedContext;
  };

  const handleGenerate = async (useNotes: boolean = false) => {
    if ((!useNotes && !syllabus.trim()) || loading) return;
    setLoading(true);

    try {
      let notesContext = syllabus;
      let chatsContext = "";

      if (useNotes && notes) {
        // Concatenate all notes
        notesContext = notes.map(n => `# ${n.topic}\n${n.content}`).join('\n\n');
      }

      if (chatHistory.length > 0) {
        chatsContext = "Recent Strategy TA Chats:\n" + chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      }

      // Run Pipeline
      const optimizedContext = await runDiagnosticPipeline(notesContext, chatsContext);
      
      const prompt = `Based on this material, identify the hardest concepts and generate a diagnostic test.
      Material: ${optimizedContext.slice(0, 10000)}
      
      REQUIREMENTS:
      1. 5 MCQs (Hard difficulty - designed to trap students who only skimmed).
      2. 2 Short Answer Questions (Requires synthesis, not just recall).
      3. Return ONLY valid JSON.
      
      Format:
      {
        "mcqs": [ { "question": "", "options": ["A", "B", "C", "D"], "answer": "A" } ],
        "shortAnswers": [ { "question": "", "rubric": "Key points required..." } ]
      }`;

      const response = await fetch('/api/generate-gauntlet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: optimizedContext })
      });

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      setTest(data);
      setStep('results');
    } catch (err) {
      console.error(err);
      alert("Failed to generate test. Ensure your material is sufficient.");
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'diagnosing') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-black p-8 space-y-8 animate-in fade-in">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-gray-200 dark:border-gray-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-black dark:text-white">
            <Microscope size={32} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-black dark:text-white">Analyzing Risk Profile</h2>
          <p className="text-gray-500 font-mono text-sm animate-pulse">{diagnosticStage}</p>
        </div>
        <div className="max-w-md w-full bg-gray-100 dark:bg-gray-900 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-black dark:bg-white animate-progress origin-left"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white dark:bg-black flex flex-col transition-colors">
      <div className="p-8 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-black dark:text-white uppercase tracking-tight">Truth Serum</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Find out if you'll pass before you walk in.</p>
        </div>
        <div className="p-3 bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-lg">
           <Microscope size={28} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar transition-colors">
        {step === 'input' ? (
          <div className="max-w-3xl mx-auto space-y-12 py-6">
            
            {/* Option 1: Use Existing Battle Plan */}
            {notes && notes.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-lg border border-black dark:border-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-black dark:text-white">
                   <Database size={120} />
                 </div>
                 <div className="relative z-10 space-y-4">
                   <div className="flex items-center gap-3 mb-2">
                     <span className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest rounded-full">Recommended</span>
                     <span className="flex items-center gap-1 text-xs font-bold text-black dark:text-white uppercase tracking-wide">
                       <ScanSearch size={14} /> Full Diagnostics
                     </span>
                     {chatHistory.length > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide">
                           <MessageSquare size={14} /> + Chat History
                        </span>
                     )}
                   </div>
                   <h3 className="text-2xl font-black text-black dark:text-white">Run Full Diagnostics</h3>
                   <p className="text-gray-600 dark:text-gray-300 max-w-lg font-medium">
                     We will scan your {notes.length} unlocked units {chatHistory.length > 0 ? `and ${chatHistory.length} interactions` : ''} to build a test designed to expose your specific weaknesses.
                   </p>
                   <button
                    onClick={() => handleGenerate(true)}
                    disabled={loading}
                    className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-black text-lg hover:opacity-80 active:scale-95 transition-all flex items-center gap-3 shadow-md"
                   >
                     {loading ? <Loader2 className="animate-spin" /> : <Siren />}
                     Expose My Blind Spots
                   </button>
                 </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">OR</span>
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
            </div>

            {/* Option 2: Manual Input */}
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                 <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-black dark:text-white">
                   <FileText size={20} />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-black dark:text-white">Manual Override</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Paste raw text to test specific concepts.</p>
                 </div>
              </div>

              <textarea
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                placeholder="Paste chapter content, notes, or syllabus outline here..."
                className="w-full h-48 p-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:border-black dark:focus:border-white outline-none transition-all font-medium text-black dark:text-white resize-none"
              />

              <button
                onClick={() => handleGenerate(false)}
                disabled={!syllabus.trim() || loading}
                className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-wide"
              >
                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                Generate Diagnostic
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-10 pb-16 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-black dark:text-white">
                <CheckCircle2 size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Diagnostic Ready</span>
              </div>
              <button 
                onClick={() => setStep('input')} 
                className="text-gray-500 font-bold hover:text-black dark:hover:text-white transition-colors uppercase text-xs tracking-wide"
              >
                Run Another Scan
              </button>
            </div>

            <section className="space-y-5">
              <h3 className="text-2xl font-extrabold text-black dark:text-white flex items-center gap-2">
                <span className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center text-sm">1</span>
                Multiple Choice (Trap Questions)
              </h3>
              <div className="grid gap-5">
                {test?.mcqs?.map((q: any, i: number) => (
                  <div key={i} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 space-y-5 transition-colors shadow-sm">
                    <p className="font-bold text-lg text-black dark:text-white">{i+1}. {q.question}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {q.options?.map((opt: string, j: number) => (
                        <div key={j} className="p-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                          {String.fromCharCode(65 + j)}. {opt}
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 text-black dark:text-white text-xs font-bold">
                      <CheckCircle2 size={14} /> Correct Answer: {q.answer}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-2xl font-extrabold text-black dark:text-white flex items-center gap-2">
                <span className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center text-sm">2</span>
                Short Answer (Application)
              </h3>
              <div className="grid gap-5">
                {test?.shortAnswers?.map((q: any, i: number) => (
                  <div key={i} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 space-y-5 transition-colors shadow-sm">
                    <p className="font-bold text-lg text-black dark:text-white">{i+1}. {q.question}</p>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 text-sm">
                      <h4 className="font-bold text-black dark:text-white mb-2 uppercase text-xs tracking-wide">Required Key Points:</h4>
                      <div className="prose prose-black dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                        <ReactMarkdown>{q.rubric}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
