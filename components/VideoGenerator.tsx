import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Video, Sparkles, Loader2, AlertCircle, Film, Key } from 'lucide-react';

const VideoGenerator: React.FC = () => {
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const selected = await aistudio.hasSelectedApiKey();
      setApiKeySelected(selected);
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      await checkApiKey();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setVideoUri(null);
    setError(null);
    setProgress('Initializing Gemini Veo...');

    try {
      // Create new instance with latest key
      // @ts-ignore - process.env.API_KEY is available in this environment
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      setProgress('Thinking about your scene...');
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      const startTime = Date.now();
      
      while (!operation.done) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setProgress(`Rendering video... (${elapsed}s)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        // Append API Key for secure fetch
        // @ts-ignore
        setVideoUri(`${uri}&key=${process.env.API_KEY}`);
      } else {
        throw new Error("No video URI returned");
      }

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Requested entity was not found")) {
        setApiKeySelected(false);
        setError("API Key invalid or expired. Please re-select.");
      } else {
        setError(err.message || "Failed to generate video.");
      }
    } finally {
      setGenerating(false);
      setProgress('');
    }
  };

  if (!apiKeySelected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
            <Key size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">API Key Required</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            To use the Gemini Veo video generation model, you need to connect your paid Google Cloud API key.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            Select API Key
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noreferrer"
            className="block mt-4 text-xs text-blue-600 hover:underline"
          >
            View Billing Documentation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
            <Film size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Video Studio</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Powered by Veo</p>
          </div>
        </div>
        <button 
          onClick={handleSelectKey}
          className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Switch Account
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-1 shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate (e.g., A neon hologram of a cat driving at top speed)..."
              className="w-full p-4 bg-transparent border-none text-gray-900 dark:text-white rounded-xl resize-none focus:ring-0 text-lg min-h-[120px]"
              disabled={generating}
            />
            <div className="p-2 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
               <span className="text-xs text-gray-400 pl-2">Veo 3.1 Fast Preview</span>
               <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Generate
              </button>
            </div>
          </div>

          {/* Progress / Error */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-100 dark:border-purple-900/30 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-purple-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="mt-4 font-medium text-purple-600 dark:text-purple-400 animate-pulse">{progress}</p>
              <p className="text-xs text-gray-400 mt-2">This usually takes 1-2 minutes</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {/* Result */}
          {videoUri && !generating && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <h3 className="font-bold text-gray-900 dark:text-white text-lg">Generated Result</h3>
               <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 bg-black">
                 <video 
                  src={videoUri} 
                  controls 
                  autoPlay 
                  loop
                  className="w-full h-auto max-h-[600px] block mx-auto"
                />
               </div>
               <div className="flex justify-end">
                 <a 
                   href={videoUri} 
                   download="generated_video.mp4"
                   className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
                 >
                   Download Video
                 </a>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;