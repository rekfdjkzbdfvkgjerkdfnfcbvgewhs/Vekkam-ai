
import React from 'react';
import { ChevronRight, Zap, Target, Flame, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onViewPolicies: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onViewPolicies }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
          <span className="text-xl font-bold tracking-tight dark:text-white">Vekkam</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onViewPolicies} className="hidden md:block text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Policies</button>
          <button 
            onClick={onLogin}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            Clear the Exam
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
           <Zap size={14} className="fill-current" /> Zero to Hero in 6 Hours
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white leading-[1.1] mb-6 tracking-tight">
          From Zero to Exam-Ready <br />
          <span className="text-blue-600 dark:text-blue-400">in 6 Hours or Less.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
          Vekkam is an exam-first learning engine built for the crunch. We don't teach by lectures or flashcards—<span className="text-gray-900 dark:text-white font-semibold">we teach by questions</span>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={onLogin}
            className="w-full sm:w-auto px-8 py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-black dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
          >
            Start Clearing Now <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Stop studying everything. Start clearing.</p>
        </div>
      </header>

      {/* The Hard Truth */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-5">Before an exam, you don't lack content. <br /><span className="text-blue-600">You lack control.</span></h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto">
            Notes are scattered. PDFs are endless. Videos are slow. You have information—you just don't have it **when you need it**. Vekkam compiles everything into one adaptive system and pushes you through it module by module.
          </p>
        </div>
      </section>

      {/* Question-First Philosophy */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">Why Questions?</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Exams don’t ask what you watched—they ask what you can *solve*. Questions reveal what you *think* you know vs. what you actually don’t.
              </p>
              <div className="grid gap-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><Target size={20} /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Force Active Recall</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Decision-making and reasoning exactly like the exam hall.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Flame size={20} /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Expose Weak Spots</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Every weakness is tracked and pressed until it breaks.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative bg-white dark:bg-gray-800 p-7 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-lg">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Battle Unit</span>
                    <CheckCircle className="text-emerald-500" size={16} />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">"Exams ask what you can solve. Prove you can solve this module."</p>
                  <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full mb-2"></div>
                    <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Positioning */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-10 relative z-10">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight">Everything you need. <br /><span className="text-blue-500">Nothing you don't.</span></h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Vekkam is not for students who want to feel productive. It's for students who want to walk into the exam hall calm. 
          </p>
          <button 
            onClick={onLogin}
            className="px-10 py-5 bg-white text-gray-900 rounded-xl font-black text-xl hover:bg-blue-50 transition-all active:scale-95"
          >
            Start Clearing the Exam
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-gray-100 dark:border-gray-800 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">V</div>
          <span className="font-bold dark:text-white">Vekkam</span>
        </div>
        <p className="text-sm text-gray-400">© 2025 Vekkam. The friend who tells you what matters.</p>
        <div className="flex gap-6 text-sm font-semibold text-gray-400">
          <button onClick={onViewPolicies} className="hover:text-blue-600">Legal</button>
          <a href="mailto:team.vekkam@gmail.com" className="hover:text-blue-600">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;