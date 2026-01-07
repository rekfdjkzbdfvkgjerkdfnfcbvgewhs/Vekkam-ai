
import React from 'react';
import { ChevronRight, ShieldCheck, Zap, Clock, Brain, CheckCircle, FileText, Sparkles, Target, Flame, Trophy } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onViewPolicies: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onViewPolicies }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
          <span className="text-xl font-bold tracking-tight dark:text-white">Vekkam</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={onViewPolicies} className="hidden md:block text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Policies</button>
          <button 
            onClick={onLogin}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:shadow-xl transition-all"
          >
            Clear Your Exam
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-blue-100 dark:border-blue-900/30">
           <Zap size={14} className="fill-current" /> Built for the Crunch Time
        </div>
        <h1 className="text-5xl md:text-8xl font-extrabold text-gray-900 dark:text-white leading-[1] mb-8 tracking-tighter">
          Zero to Exam-Ready. <br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">In 6 Hours or Less.</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
          Vekkam is the exam-first learning engine for students who start late but refuse to panic. We don't teach with lectures or flashcards—<span className="text-gray-900 dark:text-white font-bold underline decoration-blue-500 underline-offset-4">we teach with questions</span>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={onLogin}
            className="w-full sm:w-auto px-10 py-5 bg-gray-900 dark:bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-black dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group shadow-2xl shadow-gray-200 dark:shadow-none"
          >
            Clear Your Exam Now <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm font-bold text-gray-400 dark:text-gray-500">100% Free. Unlimited Access.</p>
        </div>
      </header>

      {/* The Core Truth Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Stop studying everything.<br />
                <span className="text-blue-600">Start clearing the exam.</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Before an exam, you don't lack content—you lack control. Notes are scattered, PDFs are endless, and videos are too slow. 
                <br /><br />
                Vekkam compresses massive syllabi into exam-relevant modules. You don't "cover" topics. You <span className="font-bold text-gray-900 dark:text-white italic">clear</span> them.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Target size={20} /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Zero-Fluff Prioritization</h4>
                    <p className="text-sm text-gray-500">We identify exactly what matters for the exam and cut the rest.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Flame size={20} /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Pressure-Tested Learning</h4>
                    <p className="text-sm text-gray-500">We push you through modules using questions to expose and fix gaps instantly.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-xl">
                 <div className="space-y-4">
                    <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="pt-8 space-y-4">
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-2 uppercase tracking-widest">Mastery Question</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">"Explain the core tension between scarcity and theoretically limitless wants."</p>
                        <div className="mt-4 flex gap-2">
                           <div className="h-10 flex-1 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"></div>
                           <div className="h-10 w-10 bg-blue-600 rounded-xl"></div>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Vekkam Wins */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          <div>
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight">We Teach by Questions</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 mt-4 max-w-2xl mx-auto">Exams don't ask what you watched. They ask what you can solve.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-10 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 text-left hover:shadow-2xl transition-all">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <Brain size={24} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">Reveal What You Think You Know</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Flashcards and videos give a false sense of mastery. Questions expose exactly where your understanding breaks.</p>
            </div>
            <div className="p-10 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 text-left hover:shadow-2xl transition-all">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Clock size={24} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">Active Recall Under Pressure</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Vekkam simulates the cognitive load of the exam hall, forcing your brain to retrieve and apply info instantly.</p>
            </div>
            <div className="p-10 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 text-left hover:shadow-2xl transition-all">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <Trophy size={24} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">Earned Explanations</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">We don't lecture you for hours. We give you just enough context to clear the next challenge, making learning sticky.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / CTA */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="mb-16">
            <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">Everything you need.<br /><span className="text-blue-500">Nothing you don't.</span></h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">Vekkam is not for students who want to feel productive. It's for students who want to walk into the exam hall calm.</p>
          </div>
          
          <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 p-12 rounded-[4rem] backdrop-blur-sm flex flex-col items-center">
             <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
               <Sparkles size={32} />
             </div>
             <h3 className="text-3xl font-bold mb-2">Full Battle Plan Access</h3>
             <div className="flex items-baseline gap-1 mb-8">
                <span className="text-7xl font-black tracking-tighter">Free</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-left mb-10">
                <div className="flex items-center gap-3 text-gray-300 font-medium"><CheckCircle size={18} className="text-blue-500" /> Syllabus Modularization</div>
                <div className="flex items-center gap-3 text-gray-300 font-medium"><CheckCircle size={18} className="text-blue-500" /> Question-Based Mastery</div>
                <div className="flex items-center gap-3 text-gray-300 font-medium"><CheckCircle size={18} className="text-blue-500" /> Infinite Practice Tests</div>
                <div className="flex items-center gap-3 text-gray-300 font-medium"><CheckCircle size={18} className="text-blue-500" /> Personal Exam TA</div>
                <div className="flex items-center gap-3 text-gray-300 font-medium"><CheckCircle size={18} className="text-blue-500" /> Multimodal File Support</div>
                <div className="flex items-center gap-3 text-gray-300 font-medium"><CheckCircle size={18} className="text-blue-500" /> Zero Fluff. Pure Recall.</div>
             </div>
             <button onClick={onLogin} className="w-full py-6 bg-white text-gray-900 rounded-[2rem] font-black text-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-xl">Start Clearing Now</button>
             <p className="mt-6 text-gray-500 text-sm font-bold uppercase tracking-widest">Built by students. for students.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 max-w-7xl mx-auto px-6 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-8 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">V</div>
          <span className="font-bold dark:text-white">Vekkam</span>
        </div>
        <div className="flex gap-10 text-sm font-medium text-gray-400">
          <button onClick={onViewPolicies} className="hover:text-gray-900 dark:hover:text-white">Privacy</button>
          <button onClick={onViewPolicies} className="hover:text-gray-900 dark:hover:text-white">Terms</button>
          <a href="mailto:team.vekkam@gmail.com" className="hover:text-gray-900 dark:hover:text-white">Contact</a>
        </div>
        <p className="text-sm text-gray-400">© 2025 Vekkam. The friend who tells you what matters.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
