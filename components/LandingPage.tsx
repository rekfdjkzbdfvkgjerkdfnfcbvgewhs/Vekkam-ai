import React from 'react';
import { ChevronRight, CheckCircle2, Zap, GraduationCap, Video, Star } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onViewPolicies: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onViewPolicies }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 rounded-lg p-1.5 text-white">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Vekkam</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onViewPolicies} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              Privacy & Terms
            </button>
            <button 
              onClick={onLogin}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-32 lg:pt-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
           <div className="absolute top-20 left-20 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-60 mix-blend-multiply"></div>
           <div className="absolute top-40 right-20 w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-60 mix-blend-multiply"></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <Star size={12} fill="currentColor" /> AI-First Education Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-8 leading-[1.1]">
            Learn with AI. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Create with Veo.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Your personal AI Tutor for mastering concepts, combined with a powerful Video Studio for bringing ideas to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={onLogin}
              className="px-8 py-4 bg-gray-900 text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2 group"
            >
              Launch Studio <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                  <GraduationCap size={24} />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-3">Personal AI Tutor</h3>
               <p className="text-gray-600 leading-relaxed">
                  Chat with an AI that knows your specific study materials. Get instant answers, summaries, and complex topic breakdowns.
               </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                  <Video size={24} />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-3">Veo Video Studio</h3>
               <p className="text-gray-600 leading-relaxed">
                  Generate stunning high-definition videos from simple text prompts using Google's latest Veo 3.1 models.
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="bg-gray-200 rounded p-1 text-gray-600">
               <Zap size={16} fill="currentColor" />
             </div>
            <span className="font-bold text-gray-700">Vekkam</span>
          </div>
          <p className="text-sm text-gray-500">© 2025 Vekkam. Built with Gemini.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;