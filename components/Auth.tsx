
import React, { useState } from 'react';
import { UserState } from '../types';
import { INITIAL_STATE } from '../constants';
import { auth, db } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthProps {
  onLogin: (user: UserState) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Firebase Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
          onLogin(userDoc.data() as UserState);
        } else {
          setError("Account details not found in database.");
        }
      } else {
        // Firebase Signup
        if (!email || !password || !name) {
          throw new Error("Please fill in all fields.");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const newUser: UserState = {
          ...INITIAL_STATE,
          name,
          accountId: email, // Use email as Account ID for simplicity
        };

        // Save initial state to Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), newUser);
        onLogin(newUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center font-bold text-slate-950 text-3xl mx-auto mb-4 shadow-xl shadow-emerald-500/20">CW</div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">CoinWise AI</h1>
          <p className="text-slate-400">Master Digital Assets. Risk-Free.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-slate-800/50 p-1 rounded-xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Log In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  placeholder="Alex Thompson"
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                placeholder="alex@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-medium text-center bg-rose-500/10 p-2 rounded-lg">{error}</p>}

            <button 
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isLoading && <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              {isLogin ? 'Enter Dashboard' : 'Create My Account'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          Secured by Firebase Auth
        </p>
      </div>
    </div>
  );
};

export default Auth;
