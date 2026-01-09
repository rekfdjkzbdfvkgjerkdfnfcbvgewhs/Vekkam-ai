
import React from 'react';
import { ChevronRight, Zap, ShieldAlert, Flame, BrainCircuit, Activity, Lock, Users } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onViewPolicies: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onViewPolicies }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-2">
          <img 
              src="https://vekkam.wordpress.com/wp-content/uploads/2025/05/uniqorn.png?w=88&h=50" 
              alt="Vekkam Logo" 
              className="h-8 w-auto dark:invert" 
          />
          <span className="text-xl font-black tracking-tighter text-black dark:text-white uppercase">Vekkam</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onViewPolicies} className="hidden md:block text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors uppercase tracking-widest text-xs">Legal</button>
          <button 
            onClick={onLogin}
            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-black hover:opacity-80 transition-all uppercase tracking-wide border border-transparent"
          >
            Get Insured
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-black dark:border-white text-black dark:text-white rounded-full text-xs font-black uppercase tracking-widest mb-8">
           <ShieldAlert size={14} /> Warning: Passive Studying Fails
        </div>
        <h1 className="text-6xl md:text-9xl font-black text-black dark:text-white leading-[0.9] mb-8 tracking-tighter">
          Don't Study. <br />
          <span className="text-gray-400 dark:text-gray-600">Clear It.</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
          Reading your notes is a lie. If you can't answer the question now, you won't answer it in the hall. Vekkam tells you <span className="text-black dark:text-white font-bold border-b-2 border-black dark:border-white">exactly what you will fail</span>—before the exam does.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={onLogin}
            className="w-full sm:w-auto px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-none font-black text-xl hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Hit The Panic Button <ChevronRight strokeWidth={4} />
          </button>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-4 sm:mt-0">Cheaper than a retake.</p>
        </div>
      </header>

      {/* The Enemy: Illusion of Competence */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 border-y border-black dark:border-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-6xl font-black text-black dark:text-white leading-none tracking-tighter">
                The "Illusion of Competence" is <span className="line-through decoration-4 decoration-black dark:decoration-white">killing</span> your GPA.
              </h2>
              <div className="space-y-6">
                 <div className="flex gap-4">
                    <div className="p-3 bg-white dark:bg-black border-2 border-black dark:border-white rounded-none h-fit">
                       <BrainCircuit className="text-black dark:text-white" />
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-black dark:text-white uppercase tracking-tight">Passive Reading = Failure</h4>
                       <p className="text-gray-600 dark:text-gray-400 mt-1">Highlighting notes feels like work. It isn't. It's fake studying. You are building familiarity, not mastery.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="p-3 bg-white dark:bg-black border-2 border-black dark:border-white rounded-none h-fit">
                       <Activity className="text-black dark:text-white" />
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-black dark:text-white uppercase tracking-tight">The Truth Serum</h4>
                       <p className="text-gray-600 dark:text-gray-400 mt-1">Vekkam doesn't summarize. It interrogates. We expose your blind spots instantly so you don't discover them during the final.</p>
                    </div>
                 </div>
              </div>
            </div>
            
            {/* Visual: The Diagnostic */}
            <div className="relative group cursor-pointer" onClick={onLogin}>
               <div className="absolute inset-0 bg-black dark:bg-white blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
               <div className="relative bg-white dark:bg-black p-8 border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                  <div className="flex justify-between items-center mb-6 border-b-2 border-gray-100 dark:border-gray-800 pb-4">
                     <span className="text-xs font-black text-black dark:text-white uppercase tracking-widest flex items-center gap-2"><Flame size={14} /> Risk Analysis</span>
                     <span className="text-xs font-bold text-gray-400">UNIT 3: THERMODYNAMICS</span>
                  </div>
                  <div className="space-y-4">
                     <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-start gap-4">
                        <ShieldAlert className="text-black dark:text-white shrink-0" />
                        <div>
                           <p className="font-bold text-black dark:text-white">Critical Failure Detected</p>
                           <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">You identified the formula but failed to apply the boundary condition. You will fail this question type.</p>
                        </div>
                     </div>
                     <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 border border-black dark:border-white">
                        <div className="h-full w-[42%] bg-black dark:bg-white"></div>
                     </div>
                     <p className="text-center text-sm font-bold text-gray-500">Current Survival Probability: 42%</p>
                  </div>
                  <div className="absolute -bottom-5 left-0 right-0 flex justify-center">
                     <div className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-sm font-bold shadow-lg flex items-center gap-2 group-hover:scale-105 transition-transform">
                        Fix This Leak <ChevronRight size={16} />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 3 Angles */}
      <section className="py-24 max-w-7xl mx-auto px-6">
         <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-black dark:text-white tracking-tighter">Three Ways We Save Your Grade</h2>
         </div>
         <div className="grid md:grid-cols-3 gap-8">
            {/* Angle 1: Panic Button */}
            <div className="p-8 bg-white dark:bg-black border-2 border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors group">
               <div className="w-14 h-14 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black mb-6 group-hover:scale-110 transition-transform">
                  <Zap strokeWidth={3} />
               </div>
               <h3 className="text-2xl font-black text-black dark:text-white mb-3 uppercase tracking-tight">The Panic Button</h3>
               <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  48 hours left? Don't read 500 pages. Upload the syllabus. Vekkam strips the fluff and attacks you with the 40 high-yield questions that actually matter.
               </p>
            </div>

             {/* Angle 2: Truth Serum */}
            <div className="p-8 bg-white dark:bg-black border-2 border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors group">
               <div className="w-14 h-14 bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-black dark:text-white mb-6 group-hover:scale-110 transition-transform">
                  <Activity strokeWidth={3} />
               </div>
               <h3 className="text-2xl font-black text-black dark:text-white mb-3 uppercase tracking-tight">The Truth Serum</h3>
               <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  Think you know it? Prove it. Generate a "Gatekeeper Quiz." If you can't pass our 80% threshold, you don't know the material. We don't let you lie to yourself.
               </p>
            </div>

             {/* Angle 3: Gamified Anxiety */}
            <div className="p-8 bg-white dark:bg-black border-2 border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors group">
               <div className="w-14 h-14 bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-black dark:text-white mb-6 group-hover:scale-110 transition-transform">
                  <Users strokeWidth={3} />
               </div>
               <h3 className="text-2xl font-black text-black dark:text-white mb-3 uppercase tracking-tight">Gamified Anxiety</h3>
               <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  Bet you can't answer this. Generate a "Death Match" link from your notes and send it to the group chat. See who actually knows the content.
               </p>
            </div>
         </div>
      </section>

      {/* ROI CTA */}
      <section className="py-20 bg-black dark:bg-white text-white dark:text-black relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="inline-block px-4 py-2 border border-white/20 dark:border-black/20 text-sm font-bold backdrop-blur-sm uppercase tracking-widest">
             ROI ANALYSIS
          </div>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">
            Cheaper than a retake. <br />
            <span className="text-gray-500">Faster than failing.</span>
          </h2>
          <p className="text-xl text-gray-400 dark:text-gray-600 max-w-2xl mx-auto leading-relaxed font-medium">
            $3.50 isn't a subscription. It's insurance. It's the price of walking into that hall knowing you are bulletproof.
          </p>
          <button 
            onClick={onLogin}
            className="px-12 py-6 bg-white dark:bg-black text-black dark:text-white font-black text-2xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all active:scale-95 border-2 border-transparent"
          >
            Buy Exam Insurance
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-gray-200 dark:border-gray-800 transition-colors">
        <div className="flex items-center gap-2">
           <img 
              src="https://vekkam.wordpress.com/wp-content/uploads/2025/05/uniqorn.png?w=88&h=50" 
              alt="Vekkam Logo" 
              className="h-6 w-auto dark:invert opacity-50" 
           />
          <span className="font-black text-gray-400 uppercase tracking-wider">Vekkam</span>
        </div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">© 2025 Vekkam. Risk Mitigation Engine.</p>
        <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-gray-400">
          <button onClick={onViewPolicies} className="hover:text-black dark:hover:text-white transition-colors">Legal</button>
          <a href="mailto:team.vekkam@gmail.com" className="hover:text-black dark:hover:text-white transition-colors">Contact Support</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
