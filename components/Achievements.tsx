
import React, { useState } from 'react';
import { Award, Trophy, CheckCircle, Share2, Clipboard, Check } from 'lucide-react';
import { Badge } from '../types';

interface AchievementsProps {
  userBadges: Badge[];
}

const Achievements: React.FC<AchievementsProps> = ({ userBadges }) => {
  const [copiedBadgeId, setCopiedBadgeId] = useState<string | null>(null);

  const handleShare = (badge: Badge) => {
    const shareText = `🎉 I just earned the "${badge.title}" badge on Vekkam! 
I survived ${badge.metadata.pagesCleared} pages of ${badge.metadata.topic} with Vekkam's AI-powered engine. 
AI Accuracy: ${badge.metadata.aiAccuracy}. #Vekkam #AcademicWeapon`;
    
    navigator.clipboard.writeText(shareText);
    setCopiedBadgeId(badge.id);
    setTimeout(() => setCopiedBadgeId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors">
      <div className="p-8 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-extrabold text-black dark:text-white mb-1">Your Achievements</h2>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Victory is Earned</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {userBadges.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-600">
            <Trophy size={48} className="mb-4 opacity-20" />
            <p>No victories recorded yet. Start clearing your syllabus!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {userBadges.map(badge => (
              <div key={badge.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center text-center space-y-4 transition-colors relative">
                <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black">
                  <Award size={32} />
                </div>
                <h3 className="text-xl font-extrabold text-black dark:text-white">{badge.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  I survived <span className="font-bold text-black dark:text-white">{badge.metadata.pagesCleared} pages</span> of <span className="font-bold text-black dark:text-white">{badge.metadata.topic}</span> with Vekkam.
                </p>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  AI Accuracy: <span className="text-black dark:text-white font-bold">{badge.metadata.aiAccuracy}</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Achieved on: {new Date(badge.achievedAt).toLocaleDateString()}</p>
                
                <button 
                  onClick={() => handleShare(badge)}
                  className="mt-4 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-semibold hover:opacity-80 transition-colors flex items-center gap-2 justify-center uppercase tracking-wide"
                >
                  {copiedBadgeId === badge.id ? <Check size={16} /> : <Share2 size={16} />}
                  {copiedBadgeId === badge.id ? 'Copied!' : 'Share Your Victory'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;
