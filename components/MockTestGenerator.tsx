
import React, { useState } from 'react';
import { FileText, ClipboardList, Send, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MockTestGenerator: React.FC = () => {
  const [syllabus, setSyllabus] = useState('');
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [step, setStep] = useState<'input' | 'results'>('input');

  const handleGenerate = async () => {
    if (!syllabus.trim() || loading) return;
    setLoading(true);

    try {
      const prompt = `You are Vekkam. Generate a high-quality study test based on this syllabus: "${syllabus}". 
      Include 5 MCQs and 2 Short Answer questions. 
      Return ONLY a JSON object.
      Format:
      {
        "mcqs": [ { "question": "", "options": ["A", "B", "C", "D"], "answer": "A" } ],
        "shortAnswers": [ { "question": "", "rubric": "" } ]
      }`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error("Generation failed");

      const rawData = await response.json();
      const text = rawData.text || rawData.response || rawData.generated_text || "{}";
      
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      setTest(data);
      setStep('results');
    } catch (err) {
      console.error(err);
      alert("Failed to generate test. Ensure your syllabus is descriptive.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-white dark:bg-gray-950 flex flex-col transition-colors">
      <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">The Final Gauntlet</h2>
          <p className="text-gray-500 dark:text-gray-400">Transform your syllabus into a gauntlet of practice questions.</p>
        </div>
        <ClipboardList size={32} className="text-blue-600 dark:text-blue-400" />
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar transition-colors">
        {step === 'input' ? (
          <div className="max-w-2xl mx-auto space-y-8 py-12">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 flex gap-6 items-start">
               <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm transition-colors">
                 <FileText size={24} />
               </div>
               <div>
                 <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Paste your Syllabus</h3>
                 <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">The more detail you provide, the sharper the questions.</p>
               </div>
            </div>

            <textarea
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="e.g. 'Chapter 4: Molecular Biology - DNA Replication, Protein Synthesis...'"
              className="w-full h-80 p-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/10 focus:border-blue-400 dark:focus:border-blue-600 outline-none transition-all font-medium text-gray-700 dark:text-gray-300 resize-none"
            />

            <button
              onClick={handleGenerate}
              disabled={!syllabus.trim() || loading}
              className="w-full py-5 bg-blue-600 text-white rounded-3xl font-extrabold text-xl shadow-xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              Generate Final Gauntlet
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Gauntlet Ready</span>
              </div>
              <button 
                onClick={() => setStep('input')} 
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors"
              >
                Reset Gauntlet
              </button>
            </div>

            <section className="space-y-6">
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">1</span>
                Multiple Choice Questions
              </h3>
              <div className="grid gap-6">
                {test?.mcqs?.map((q: any, i: number) => (
                  <div key={i} className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-6 transition-colors">
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{i+1}. {q.question}</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      {q.options?.map((opt: string, j: number) => (
                        <div key={j} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors">
                          {String.fromCharCode(65 + j)}. {opt}
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 size={14} /> Correct Answer: {q.answer}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">2</span>
                Short Answer & Grading Rubrics
              </h3>
              <div className="grid gap-6">
                {test?.shortAnswers?.map((q: any, i: number) => (
                  <div key={i} className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-6 transition-colors">
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{i+1}. {q.question}</p>
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 space-y-2">
                       <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1">
                         <AlertTriangle size={12} /> Grading Rubric
                       </p>
                       <p className="text-sm text-amber-900 dark:text-amber-600 leading-relaxed">{q.rubric}</p>
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

export default MockTestGenerator;
