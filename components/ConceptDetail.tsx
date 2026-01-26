
import React, { useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle, BrainCircuit, Target, ArrowRight } from 'lucide-react';
import { Concept, UserConceptState } from '../core/concept/schema';

interface ConceptDetailProps {
  concept: Concept;
  userState: UserConceptState;
  onReportConfusion: (conceptId: string, reason: string) => void;
}

export const ConceptDetail: React.FC<ConceptDetailProps> = ({ concept, userState, onReportConfusion }) => {
  const [isReporting, setIsReporting] = useState(false);
  const [reason, setReason] = useState('');

  const handleReport = () => {
    onReportConfusion(concept.id, reason);
    setIsReporting(false);
    setReason('');
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest
            ${concept.level === 'intro' ? 'bg-emerald-100 text-emerald-700' : 
              concept.level === 'intermediate' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
            {concept.level}
          </span>
          <span className="text-xs text-gray-500 font-medium">{concept.domain}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{concept.name}</h1>
      </div>

      <div className="p-6 space-y-8 flex-1">
        
        {/* Definition (Traceability) */}
        <section>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BookOpen size={16} /> Canonical Definition
          </h3>
          <div className="p-4 bg-gray-50 border-l-4 border-blue-500 rounded-r-lg">
            <p className="text-lg font-medium text-gray-800 leading-relaxed">
              {concept.definition.canonical}
            </p>
          </div>
          {concept.definition.variants.length > 0 && (
             <div className="mt-2 text-sm text-gray-500">
               <span className="font-semibold">Also known as:</span> {concept.definition.variants.join(', ')}
             </div>
          )}
        </section>

        {/* Claims (Truth) */}
        <section>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Target size={16} /> Claims & Truths
          </h3>
          <ul className="space-y-3">
            {concept.claims.map(claim => (
              <li key={claim.id} className="flex items-start gap-3 group">
                <CheckCircle size={18} className="text-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-700">{claim.statement}</p>
                  <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Confidence: {(claim.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Pedagogy (Cognitive Load) */}
        <section>
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BrainCircuit size={16} /> Pedagogy
          </h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-3 border border-gray-200 rounded-lg">
               <div className="text-xs text-gray-500">Best First Step</div>
               <div className="font-semibold capitalize text-gray-800">{concept.pedagogy.best_first}</div>
             </div>
             <div className="p-3 border border-gray-200 rounded-lg">
               <div className="text-xs text-gray-500">Cognitive Load</div>
               <div className="flex items-center gap-2">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400" style={{ width: `${concept.pedagogy.cognitive_load * 100}%` }}></div>
                  </div>
                  <span className="text-xs font-bold">{concept.pedagogy.cognitive_load}</span>
               </div>
             </div>
          </div>
          {concept.pedagogy.common_confusions.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-100">
              <span className="font-bold block mb-1">Common Pitfalls:</span>
              <ul className="list-disc pl-4">
                {concept.pedagogy.common_confusions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </section>

      </div>

      {/* User Model Feedback (The Loop) */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        {userState.is_confused ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={20} />
            </div>
            <h4 className="font-bold text-red-700">Confusion Recorded</h4>
            <p className="text-xs text-red-600 mb-3">We've updated your confusion vector. The lecture compiler will allocate more time to this concept in the next generation.</p>
            <div className="text-xs font-mono text-gray-500 bg-white p-2 rounded border border-gray-200 text-left">
              Signal: REPORT_COUNT_INC<br/>
              Vector: [{userState.confusion_vectors.length} entries]
            </div>
          </div>
        ) : (
          !isReporting ? (
            <button 
              onClick={() => setIsReporting(true)}
              className="w-full py-4 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <AlertTriangle size={20} /> I don't understand this
            </button>
          ) : (
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-lg animate-in slide-in-from-bottom-2">
              <h4 className="font-bold text-gray-900 mb-2">What is confusing you?</h4>
              <textarea 
                className="w-full p-3 bg-gray-50 rounded-lg text-sm border-0 focus:ring-2 focus:ring-blue-500 mb-3"
                rows={3}
                placeholder="The definition is circular..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsReporting(false)}
                  className="flex-1 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReport}
                  className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700"
                >
                  Submit Signal
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
