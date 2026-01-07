
import React from 'react';
import { ChevronRight, ShieldCheck, Zap, Clock, Brain, Star, CheckCircle, FileText } from 'lucide-react';

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
            Log In / Try Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-8">
          Study Smarter. <br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Not Longer.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Crack the biggest syllabus in just 6 hours—with AI that knows how you learn. Vekkam is your personalized study plan generator, powered by neuroscience and real-world performance data.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={onLogin}
            className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group"
          >
            Instant Access <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-2 px-6 py-4">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <img key={i} src={`https://picsum.photos/32/32?random=${i}`} className="w-8 h-8 rounded-full border-2 border-white" alt="User" />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-400">Join 2,000+ students</span>
          </div>
        </div>
      </header>

      {/* Trust Badges */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex items-center gap-3 justify-center text-gray-400">
            <Clock size={24} /> <span className="font-bold">6h Battle Plans</span>
          </div>
          <div className="flex items-center gap-3 justify-center text-gray-400">
            <ShieldCheck size={24} /> <span className="font-bold">Privacy Guaranteed</span>
          </div>
          <div className="flex items-center gap-3 justify-center text-gray-400">
            <Brain size={24} /> <span className="font-bold">Neuroscience Built</span>
          </div>
          <div className="flex items-center gap-3 justify-center text-gray-400">
            <Zap size={24} /> <span className="font-bold">Instant Summaries</span>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why students choose Vekkam</h2>
          <p className="text-gray-500">The perfect study workflow for the last-minute panic.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100 hover:shadow-xl hover:scale-[1.02] transition-all">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Laser-Focused Notes</h3>
            <p className="text-gray-600 leading-relaxed">We “inject” you with the must-know facts, distilled from any file you upload. No fluff, just marks.</p>
          </div>
          <div className="p-8 bg-indigo-50 rounded-3xl border border-indigo-100 hover:shadow-xl hover:scale-[1.02] transition-all">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6">
              <Brain size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Skill Tree Learning</h3>
            <p className="text-gray-600 leading-relaxed">Visualize your knowledge. See what's mastered and what needs work before the exam hall.</p>
          </div>
          <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 hover:shadow-xl hover:scale-[1.02] transition-all">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-6">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Personal TA</h3>
            <p className="text-gray-600 leading-relaxed">Chat with an assistant that knows every document you've ever uploaded. Your context, your answers.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Choose your path</h2>
            <p className="text-gray-400">Unlock your academic potential with our tiered plans.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-white/5 border border-white/10 p-10 rounded-3xl flex flex-col backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex gap-2 items-center text-sm text-gray-300"><CheckCircle size={16} className="text-blue-500" /> 10 Total Analyses</li>
                <li className="flex gap-2 items-center text-sm text-gray-300"><CheckCircle size={16} className="text-blue-500" /> Basic Note Engine</li>
                <li className="flex gap-2 items-center text-sm text-gray-300"><CheckCircle size={16} className="text-blue-500" /> Mock Test Access</li>
              </ul>
              <button onClick={onLogin} className="w-full py-4 border border-white/20 rounded-2xl font-bold hover:bg-white/10 transition-colors">Start Free</button>
            </div>
            
            {/* Pro */}
            <div className="bg-blue-600 p-10 rounded-3xl flex flex-col shadow-2xl shadow-blue-500/20 transform scale-105 border-2 border-blue-400">
              <div className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded w-fit mb-4">MOST POPULAR</div>
              <h3 className="text-xl font-bold mb-2">Unlocked</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">₹100</span>
                <span className="text-blue-200">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex gap-2 items-center text-sm"><CheckCircle size={16} /> 3 Analyses per DAY</li>
                <li className="flex gap-2 items-center text-sm"><CheckCircle size={16} /> Advanced Synthesis</li>
                <li className="flex gap-2 items-center text-sm"><CheckCircle size={16} /> Priority Support</li>
                <li className="flex gap-2 items-center text-sm"><CheckCircle size={16} /> Personal TA Context</li>
              </ul>
              <button onClick={onLogin} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-bold hover:bg-blue-50 transition-colors">Go Pro</button>
            </div>

            {/* Topper */}
            <div className="bg-white/5 border border-white/10 p-10 rounded-3xl flex flex-col backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-2">Topper</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">₹250</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex gap-2 items-center text-sm text-gray-300"><CheckCircle size={16} className="text-blue-500" /> Unlimited Everything</li>
                <li className="flex gap-2 items-center text-sm text-gray-300"><CheckCircle size={16} className="text-blue-500" /> Custom Concept Gen</li>
                <li className="flex gap-2 items-center text-sm text-gray-300"><CheckCircle size={16} className="text-blue-500" /> Early Access Tools</li>
              </ul>
              <button disabled className="w-full py-4 border border-white/20 rounded-2xl font-bold opacity-50 cursor-not-allowed">Coming Soon</button>
            </div>
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
