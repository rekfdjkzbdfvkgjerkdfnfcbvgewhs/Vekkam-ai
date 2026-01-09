
import React from 'react';
import { ChevronRight, CheckCircle2, Zap, BookOpen, Users, BarChart3, Star, Shield } from 'lucide-react';

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
           <div className="absolute top-40 right-20 w-72 h-72 bg-emerald-100 rounded-full blur-3xl opacity-60 mix-blend-multiply"></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <Star size={12} fill="currentColor" /> The Smartest Way to Prepare
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-8 leading-[1.1]">
            Master Your Syllabus in <br/>
            <span className="text-blue-600">Half the Time</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop reading passively. Vekkam turns your notes into active learning tools—quizzes, summaries, and diagnostic tests—so you can walk into your exam with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={onLogin}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 group"
            >
              Get Started for Free <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
               <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-emerald-500" /> No credit card required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid (Bento Style) */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Ace It</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">We've combined the best active recall techniques into one seamless dashboard.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                  <BookOpen size={24} />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Syllabus</h3>
               <p className="text-gray-600 leading-relaxed">
                  Upload any PDF or text. We break it down into "Battle Units"—digestible chunks focused on high-yield concepts.
               </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                  <BarChart3 size={24} />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-3">Diagnostic Tests</h3>
               <p className="text-gray-600 leading-relaxed">
                  Identify your weak spots before the exam does. Our AI generates diagnostic quizzes to benchmark your knowledge.
               </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                  <Users size={24} />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-3">Study Groups</h3>
               <p className="text-gray-600 leading-relaxed">
                  Collaborate with classmates. Share notes, ask questions, and keep each other accountable in real-time.
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-20 bg-white border-t border-gray-100">
         <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8 text-center divide-x divide-gray-100">
               <div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">10k+</div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pages Analyzed</div>
               </div>
               <div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">500+</div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Students</div>
               </div>
               <div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">94%</div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Exam Pass Rate</div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="bg-gray-200 rounded p-1 text-gray-600">
               <Zap size={16} fill="currentColor" />
             </div>
            <span className="font-bold text-gray-700">Vekkam</span>
          </div>
          <p className="text-sm text-gray-500">© 2025 Vekkam. Intelligent Study Engine.</p>
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <button onClick={onViewPolicies} className="hover:text-blue-600 transition-colors">Legal</button>
            <a href="mailto:team.vekkam@gmail.com" className="hover:text-blue-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
