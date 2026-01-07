
import React, { useState } from 'react';
import { Zap, Crown, ChevronRight, Lock, CheckCircle, Info, Sparkles } from 'lucide-react';
import { Chunk, Genome } from '../types';
import { ECON_101_GENOME } from '../constants';

interface MasteryEngineProps {
  chunks: Chunk[];
}

const MasteryEngine: React.FC<MasteryEngineProps> = ({ chunks }) => {
  const [genome] = useState<Genome>(ECON_101_GENOME);
  const [progress, setProgress] = useState<Record<string, 'locked' | 'unlocked' | 'mastered'>>({
    'ECON101_SCARCITY': 'unlocked',
    'ECON101_OPPCOST': 'locked',
    'ECON101_SND': 'locked'
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = genome.nodes.find(n => n.gene_id === selectedNodeId);

  const handleMaster = (id: string) => {
    setProgress(prev => {
      const next = { ...prev, [id]: 'mastered' as const };
      // Unlock dependencies
      genome.edges.filter(e => e.from === id).forEach(e => {
        if (next[e.to] === 'locked') next[e.to] = 'unlocked';
      });
      return next;
    });
  };

  return (
    <div className="flex h-full bg-white">
      {/* Skill Tree Rail */}
      <div className="w-80 border-r border-gray-100 flex flex-col">
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Skill Tree</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{genome.subject}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {genome.nodes.map((node, i) => {
            const status = progress[node.gene_id];
            return (
              <div key={node.gene_id} className="relative">
                <button
                  onClick={() => status !== 'locked' && setSelectedNodeId(node.gene_id)}
                  className={`w-full p-5 rounded-2xl text-left transition-all duration-300 flex items-center gap-4 ${
                    selectedNodeId === node.gene_id 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                      : status === 'locked' 
                        ? 'opacity-50 grayscale cursor-not-allowed bg-gray-50 text-gray-400'
                        : 'bg-white border border-gray-100 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    status === 'mastered' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {status === 'mastered' ? <CheckCircle size={20} /> : status === 'locked' ? <Lock size={18} /> : <Zap size={20} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-tighter opacity-60">Level {node.difficulty}</p>
                    <p className="font-bold truncate">{node.gene_name}</p>
                  </div>
                </button>
                {i < genome.nodes.length - 1 && (
                  <div className="h-6 w-0.5 bg-gray-100 mx-auto my-1"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Viewer */}
      <div className="flex-1 overflow-y-auto p-12 bg-gray-50/30">
        {selectedNode ? (
          <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-right-4">
            <header className="space-y-4">
               <div className="flex items-center gap-3">
                 <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-widest">Concept Genome</span>
                 <div className="h-px flex-1 bg-gray-100"></div>
               </div>
               <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">{selectedNode.gene_name}</h2>
            </header>

            <div className="space-y-10">
              {selectedNode.content_alleles.map((allele, i) => (
                <div key={i} className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                  {allele.type === 'text' ? (
                    <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed">
                      {allele.content}
                    </div>
                  ) : (
                    <div className="aspect-video rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
                       <iframe 
                        width="100%" 
                        height="100%" 
                        src={allele.url} 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                       ></iframe>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-6 pt-12">
               <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 text-center space-y-2 max-w-md">
                  <h4 className="font-extrabold text-blue-900 flex items-center justify-center gap-2">
                    <Sparkles size={18} /> Boss Battle Mode
                  </h4>
                  <p className="text-sm text-blue-700">Master this concept by answering a high-stakes question tailored to your progress.</p>
               </div>
               
               <button
                 onClick={() => handleMaster(selectedNode.gene_id)}
                 disabled={progress[selectedNode.gene_id] === 'mastered'}
                 className={`px-12 py-5 rounded-2xl font-extrabold text-xl shadow-xl transition-all flex items-center gap-3 ${
                   progress[selectedNode.gene_id] === 'mastered'
                    ? 'bg-emerald-500 text-white cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-200'
                 }`}
               >
                 {progress[selectedNode.gene_id] === 'mastered' ? (
                   <> <CheckCircle /> Concept Mastered </>
                 ) : (
                   <> <Crown size={24} /> ⚔️ Challenge Boss </>
                 )}
               </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
             <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-blue-600 border border-gray-100">
               <Zap size={40} className="fill-blue-600/10" />
             </div>
             <h3 className="text-2xl font-extrabold text-gray-900">Select a concept to begin mastery</h3>
             <p className="text-gray-400 max-w-sm">Follow the skill tree from the roots to the branches to build an unbreakable knowledge base.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasteryEngine;
