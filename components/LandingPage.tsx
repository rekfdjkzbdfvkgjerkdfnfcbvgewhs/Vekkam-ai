
import React from 'react';
import { ChevronRight, ShieldCheck, Zap, Clock, Brain, CheckCircle, FileText, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onViewPolicies: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onViewPolicies }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
          <span className="text-xl font-bold tracking-tight">Vekkam Engine</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={onViewPolicies} className="text-sm font-medium text-gray-500 hover:text-gray-900">Policies</button>
          <button 
            onClick={onLogin}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all"
          >
            Start Studying Now
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-blue-100">
           <Sparkles size={14} /> Unlimited Free Access
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-8">
          Study Smarter. <br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Not Longer.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Crack the biggest syllabus in just 6 hours—with AI that knows how you learn. Vekkam is now completely free for every student.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={onLogin}
            className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-gray-200"
          >
            Instant Free Access <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      {/* Pricing Section (Updated to Always Free) */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="mb-16">
            <h2 className="text-4xl font-bold mb-4">The Student Mission</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Vekkam was built by students, for students. We've removed all limits so you can focus on mastering your syllabus.</p>
          </div>
          
          <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-sm flex flex-col items-center">
             <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
               <Sparkles size={32} />
             </div>
             <h3 className="text-3xl font-bold mb-2">Vekkam Full Access</h3>
             <div className="flex items-baseline gap-1 mb-8">
                <span className="text-6xl font-black">Free</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-left mb-10">
                <div className="flex items-center gap-3 text-gray-300"><CheckCircle size={18} className="text-blue-500" /> Infinite Analyses</div>
                <div className="flex items-center gap-3 text-gray-300"><CheckCircle size={18} className="text-blue-500" /> Advanced Synthesis</div>
                <div className="flex items-center gap-3 text-gray-300"><CheckCircle size={18} className="text-blue-500" /> Personal TA Context</div>
                <div className="flex items-center gap-3 text-gray-300"><CheckCircle size={18} className="text-blue-500" /> Mastery Skill Trees</div>
                <div className="flex items-center gap-3 text-gray-300"><CheckCircle size={18} className="text-blue-500" /> Mock Test Generator</div>
                <div className="flex items-center gap-3 text-gray-300"><CheckCircle size={18} className="text-blue-500" /> Audio/PDF/Image Support</div>
             </div>
             <button onClick={onLogin} className="w-full py-5 bg-white text-gray-900 rounded-2xl font-black text-xl hover:bg-gray-100 transition-all active:scale-95">Create Free Account</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 max-w-7xl mx-auto px-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">V</div>
          <span className="font-bold">Vekkam Engine</span>
        </div>
        <div className="flex gap-10 text-sm font-medium text-gray-400">
          <button onClick={onViewPolicies} className="hover:text-gray-900">Privacy</button>
          <button onClick={onViewPolicies} className="hover:text-gray-900">Terms</button>
          <button onClick={onViewPolicies} className="hover:text-gray-900">Refunds</button>
          <a href="mailto:team.vekkam@gmail.com" className="hover:text-gray-900">Contact</a>
        </div>
        <p className="text-sm text-gray-400">© 2025 Vekkam Inc. Built for students.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
