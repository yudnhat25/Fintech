import React, { useState } from 'react';
import { UserState } from '../types';
import { INITIAL_STATE } from '../constants';

// --- 1. IMPORT FIREBASE ---
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';

interface AuthProps {
  onLogin: (user: UserState) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  // Đổi AccountID thành Email cho chuẩn Firebase
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Thêm trạng thái đang tải

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true); // Bắt đầu xoay vòng loading

    try {
      if (isLogin) {
        // --- XỬ LÝ ĐĂNG NHẬP ---

        // 1. Đăng nhập qua Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // 2. Lấy thông tin tài sản từ Database
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();
          onLogin(userData); // Vào game
        } else {
          // Trường hợp hiếm: Có nick Auth nhưng mất dữ liệu DB -> Tạo lại
          const newUser: UserState = {
            ...INITIAL_STATE,
            name: email.split('@')[0], // Lấy tạm tên từ email
            accountId: email,
          };
          await set(ref(db, `users/${uid}`), newUser);
          onLogin(newUser);
        }

      } else {
        // --- XỬ LÝ ĐĂNG KÝ ---

        if (!email || !password || !name) {
          throw new Error('Please fill in all fields.');
        }

        // 1. Tạo tài khoản Auth mới
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // 2. Khởi tạo dữ liệu người dùng ban đầu
        const newUser: UserState = {
          ...INITIAL_STATE,
          name,
          accountId: email, // Dùng email làm ID hiển thị
          // Lưu ý: Không lưu password vào DB để bảo mật
        };

        // 3. Lưu lên Firebase Database
        await set(ref(db, `users/${uid}`), newUser);

        // 4. Vào game
        onLogin(newUser);
      }
    } catch (err: any) {
      console.error(err);
      // Dịch lỗi tiếng Anh của Firebase sang tiếng Việt/Anh dễ hiểu
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Incorrect email or password.");
      } else if (err.code === 'auth/user-not-found') {
        setError("Account not found.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email format.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Login is not enabled in Firebase Console.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false); // Tắt loading dù thành công hay thất bại
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
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
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
                  required
                />
              </div>
            )}

            <div>
              {/* Đã đổi label thành Email */}
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                placeholder="name@example.com"
                required
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
                required
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-medium text-center">{error}</p>}

            <button
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isLogin ? 'Enter Dashboard' : 'Create My Account')}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-slate-500 text-sm">
          Protected by CoinWise Security Protocols
        </p>
      </div>
    </div>
  );
};

export default Auth;