
import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from '../services/firebase';

interface AuthOverlayProps {
  initialMode: 'login' | 'signup';
  onClose: () => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ initialMode, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let message = "An error occurred during authentication.";
      if (err.code === 'auth/wrong-password') message = "Incorrect password.";
      if (err.code === 'auth/user-not-found') message = "No account found with this email.";
      if (err.code === 'auth/email-already-in-use') message = "Email already registered.";
      if (err.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
        >
          <X size={24} />
        </button>

        <div className="p-10 pt-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-200">
              V
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-2">
            {mode === 'login' ? 'Welcome Back' : 'Join Vekkam'}
          </h2>
          <p className="text-gray-500 text-center mb-8 text-sm">
            {mode === 'login' 
              ? 'Enter your credentials to access your workspace' 
              : 'Create your account to start outlearning your syllabus'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-gray-400">
                  <User size={20} />
                </div>
                <input
                  required
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-medium"
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute left-4 top-3.5 text-gray-400">
                <Mail size={20} />
              </div>
              <input
                required
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-medium"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-3.5 text-gray-400">
                <Lock size={20} />
              </div>
              <input
                required
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-medium"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Log In' : 'Create Account'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors"
            >
              {mode === 'login' 
                ? "Don't have an account? Create one" 
                : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthOverlay;
