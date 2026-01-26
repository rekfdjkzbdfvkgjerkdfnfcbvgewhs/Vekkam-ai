
import React, { useState, useMemo } from 'react';
import { ConceptGraph } from './components/ConceptGraph';
import { ConceptDetail } from './components/ConceptDetail';
import { CONCEPTS, DEPENDENCIES } from './core/data/curriculum';
import { UserConceptState } from './core/concept/schema';
import { LayoutDashboard, Network, FileCode } from 'lucide-react';

const App: React.FC = () => {
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  
  // Mock Database in Local State
  const [userConceptStates, setUserConceptStates] = useState<Record<string, UserConceptState>>(() => {
    const initial: Record<string, UserConceptState> = {};
    CONCEPTS.forEach(c => {
      initial[c.id] = {
        user_id: 'guest',
        concept_id: c.id,
        mastery: 0.0,
        confusion_vectors: [],
        is_confused: false,
        signals: { replays: 0, quiz_failures: 0, hesitation_time: 0, report_count: 0 }
      };
    });
    return initial;
  });

  const selectedConcept = useMemo(() => 
    CONCEPTS.find(c => c.id === selectedConceptId), 
  [selectedConceptId]);

  const handleReportConfusion = (conceptId: string, reason: string) => {
    setUserConceptStates(prev => {
      const current = prev[conceptId];
      return {
        ...prev,
        [conceptId]: {
          ...current,
          is_confused: true,
          confusion_vectors: [...current.confusion_vectors, reason],
          signals: {
            ...current.signals,
            report_count: current.signals.report_count + 1
          }
        }
      };
    });
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">
      
      {/* Sidebar / Navigation */}
      <aside className="w-16 flex flex-col items-center py-6 border-r border-gray-200 bg-gray-50 z-20">
        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xl mb-8">
          OS
        </div>
        <nav className="space-y-4">
          <button className="p-3 bg-white border border-gray-200 rounded-xl text-blue-600 shadow-sm">
            <Network size={20} />
          </button>
          <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <LayoutDashboard size={20} />
          </button>
          <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <FileCode size={20} />
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        
        {/* Graph Visualizer */}
        <div className="flex-1 relative">
          <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur border border-gray-200 p-3 rounded-lg shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Concept Graph</h2>
            <p className="text-xs text-gray-500">Machine Learning (v1.0)</p>
          </div>
          <ConceptGraph 
            concepts={CONCEPTS} 
            dependencies={DEPENDENCIES} 
            onConceptSelect={setSelectedConceptId}
            userStates={userConceptStates}
          />
        </div>

        {/* Right Panel: Details / Compiler Output */}
        <div className={`w-[450px] border-l border-gray-200 bg-white shadow-xl transform transition-transform duration-300 absolute right-0 top-0 bottom-0 z-10
          ${selectedConcept ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedConcept ? (
            <ConceptDetail 
              concept={selectedConcept}
              userState={userConceptStates[selectedConcept.id]}
              onReportConfusion={handleReportConfusion}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a concept
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;
