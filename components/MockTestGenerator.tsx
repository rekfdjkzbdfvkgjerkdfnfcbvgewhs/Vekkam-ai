
import React, { useState } from 'react';
import { FileText, ClipboardList, Send, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MockTestGenerator: React.FC = () => {
  const [syllabus, setSyllabus] = useState('');
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [step, setStep] = useState<'input' | 'results'>('input');

  const handleGenerate = async () => {
    if (!syllabus.trim() || loading) return;
    setLoading(true);

    try {
      const prompt = `Generate a high-quality study test based on this syllabus: "${syllabus}". 
      Include 5 MCQs and 2 Short Answer questions. 
      Format the response as JSON with the following schema:
      {
        "mcqs": [ { "question": "", "options": ["A", "B", "C", "D"], "answer": "A" } ],
        "shortAnswers": [ { "question": "", "rubric": "" } ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mcqs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING }
                  },
                  required: ["question", "options", "answer"]
                }
              },
              shortAnswers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    rubric: { type: Type.STRING }
                  },
                  required: ["question", "rubric"]
                }
              }
            },
            required: ["mcqs", "shortAnswers"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setTest(data);
      setStep('results');
    } catch (err) {
      console.error(err);
      alert("Failed to generate test. Please try again with a more detailed syllabus.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="p-8 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">Mock Test Generator</h2>
          <p className="text-gray-500">Transform your syllabus into a gauntlet of practice questions.</p>
        </div>
        <ClipboardList size={32} className="text-blue-600" />
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {step === 'input' ? (
          <div className="max-w-2xl mx-auto space-y-8 py-12">
            <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 flex gap-6 items-start">
               <div className="p-4 bg-white rounded-2xl text-blue-600 shadow-sm">
                 <FileText size={24} />
               </div>
               <div>
                 <h3 className="text-xl font-extrabold text-gray-900 mb-2">Paste your Syllabus</h3>
                 <p className="text-sm text-gray-600 leading-relaxed">The more detail you provide, the better the AI can align the questions with your exam objectives.</p>
               </div>
            </div>

            <textarea
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="e.g. 'Chapter 4: Molecular Biology - DNA Replication, Protein Synthesis...'"
              className="w-full h-80 p-8 bg-gray-50 border border-gray-200 rounded-[2.5rem] focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-medium text-gray-700 resize-none"
            />

            <button
              onClick={handleGenerate}
              disabled={!syllabus.trim() || loading}
              className="w-full py-5 bg-blue-600 text-white rounded-3xl font-extrabold text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              Generate Custom Practice Test
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Test Generated Successfully</span>
              </div>
              <button onClick={() => setStep('input')} className="text-blue-600 font-bold hover:underline">New Test</button>
            </div>

            <section className="space-y-6">
              <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">1</span>
                Multiple Choice Questions
              </h3>
              <div className="grid gap-6">
                {test.mcqs.map((q: any, i: number) => (
                  <div key={i} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-6">
                    <p className="font-bold text-lg text-gray-800">{i+1}. {q.question}</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      {q.options.map((opt: string, j: number) => (
                        <div key={j} className="p-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-600">
                          {String.fromCharCode(65 + j)}. {opt}
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-gray-200 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                      <CheckCircle2 size={14} /> Correct Answer: {q.answer}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">2</span>
                Short Answer & Grading Rubrics
              </h3>
              <div className="grid gap-6">
                {test.shortAnswers.map((q: any, i: number) => (
                  <div key={i} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-6">
                    <p className="font-bold text-lg text-gray-800">{i+1}. {q.question}</p>
                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                       <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1">
                         <AlertTriangle size={12} /> Grading Rubric
                       </p>
                       <p className="text-sm text-amber-900 leading-relaxed">{q.rubric}</p>
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
