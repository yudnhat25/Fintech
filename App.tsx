
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import PortfolioSummary from './components/PortfolioSummary';
import TradingPanel from './components/TradingPanel';
import AIChatBot from './components/AIChatBot';
import Auth from './components/Auth';
import CompetitionView from './components/CompetitionView';
import CompetitionPaymentModal from './components/CompetitionPaymentModal';
import TransactionHistory from './components/TransactionHistory';
import { UserState, MarketData, Transaction, UsersMap, LeaderboardEntry } from './types';
import { fetchMarketPrices } from './services/api';
import { CRYPTO_SYMBOLS, INITIAL_STATE, ENTRY_FEE, BASELINE_NET_WORTH } from './constants';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserState | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [marketPrices, setMarketPrices] = useState<MarketData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'competition'>('dashboard');
  const [isCompPaymentOpen, setIsCompPaymentOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('15m');
  const [showIndicators, setShowIndicators] = useState({ ema: true, rsi: true });

  // Handle Firebase Auth Persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data() as UserState);
        }
      } else {
        setCurrentUser(null);
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const syncToFirestore = async (updatedUser: UserState) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { ...updatedUser });
    } catch (error) {
      console.error("Firestore Sync Error:", error);
    }
  };

  useEffect(() => {
    const updatePrices = async () => {
      const data = await fetchMarketPrices(CRYPTO_SYMBOLS);
      if (data.length > 0) {
        setMarketPrices(data);
        setLastUpdate(Date.now());
      }
    };
    
    updatePrices();
    const interval = setInterval(updatePrices, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (user: UserState) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const handleRegisterClick = () => {
    setIsCompPaymentOpen(true);
  };

  const handleCompleteCompetitionPayment = () => {
    if (!currentUser) return;
    
    const competitionEndTime = Date.now() + 60000;

    const updatedUser: UserState = {
      ...currentUser,
      balance: BASELINE_NET_WORTH,
      assets: [],
      competition: {
        isCompeting: true,
        entryNetWorth: BASELINE_NET_WORTH,
        entryTime: Date.now(),
        pnlPercent: 0,
        currentRank: 0,
        ...( { endTime: competitionEndTime } as any)
      },
      transactions: [...currentUser.transactions, {
        id: Math.random().toString(36).substr(2, 9),
        type: 'DEPOSIT',
        asset: 'ENTRY-FEE',
        amount: 1,
        price: ENTRY_FEE,
        total: ENTRY_FEE,
        timestamp: Date.now()
      }, {
        id: Math.random().toString(36).substr(2, 9),
        type: 'DEPOSIT',
        asset: 'ARENA-INIT',
        amount: 1,
        price: BASELINE_NET_WORTH,
        total: BASELINE_NET_WORTH,
        timestamp: Date.now() + 1
      }]
    };

    setCurrentUser(updatedUser);
    syncToFirestore(updatedUser);
    setIsCompPaymentOpen(false);
  };

  const handleResetCompetition = () => {
    if (!currentUser) return;
    const updatedUser: UserState = {
      ...currentUser,
      competition: {
        isCompeting: false,
        entryNetWorth: 0,
        entryTime: 0,
        pnlPercent: 0,
        currentRank: 0
      }
    };
    setCurrentUser(updatedUser);
    syncToFirestore(updatedUser);
    setActiveTab('dashboard');
  };

  const handleTrade = (type: 'BUY' | 'SELL', symbol: string, amount: number, price: number) => {
    if (!currentUser) return;
    const total = amount * price;
    let updatedUser: UserState = { ...currentUser };

    if (type === 'BUY') {
      if (updatedUser.balance < total) {
        alert("Insufficient funds! Please deposit more simulation capital.");
        return;
      }
      const existingAssetIndex = updatedUser.assets.findIndex(a => a.symbol === symbol);
      const newAssets = [...updatedUser.assets];
      if (existingAssetIndex >= 0) {
        newAssets[existingAssetIndex].amount += amount;
      } else {
        newAssets.push({ symbol, amount });
      }
      updatedUser = {
        ...updatedUser,
        balance: updatedUser.balance - total,
        assets: newAssets,
        transactions: [...updatedUser.transactions, {
          id: Math.random().toString(36).substr(2, 9),
          type: 'BUY',
          asset: symbol,
          amount,
          price,
          total: -total,
          timestamp: Date.now()
        }]
      };
    } else {
      const existingAssetIndex = updatedUser.assets.findIndex(a => a.symbol === symbol);
      if (existingAssetIndex === -1 || updatedUser.assets[existingAssetIndex].amount < amount) {
        alert(`Insufficient ${symbol}!`);
        return;
      }
      const newAssets = [...updatedUser.assets];
      newAssets[existingAssetIndex].amount -= amount;
      const finalAssets = newAssets.filter(a => a.amount > 0);
      updatedUser = {
        ...updatedUser,
        balance: updatedUser.balance + total,
        assets: finalAssets,
        transactions: [...updatedUser.transactions, {
          id: Math.random().toString(36).substr(2, 9),
          type: 'SELL',
          asset: symbol,
          amount,
          price,
          total: total,
          timestamp: Date.now()
        }]
      };
    }
    setCurrentUser(updatedUser);
    syncToFirestore(updatedUser);
  };

  const handleDeposit = (amount: number) => {
    if (!currentUser) return;
    const updatedUser: UserState = {
      ...currentUser,
      balance: currentUser.balance + amount,
      transactions: [...currentUser.transactions, {
        id: Math.random().toString(36).substr(2, 9),
        type: 'DEPOSIT',
        asset: 'USD',
        amount,
        price: 1,
        total: amount,
        timestamp: Date.now()
      }]
    };
    setCurrentUser(updatedUser);
    syncToFirestore(updatedUser);
  };

  const currentPrice = marketPrices.find(m => m.symbol === selectedAsset)?.price || 0;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center font-bold text-slate-950 text-3xl shadow-xl shadow-emerald-500/20 animate-bounce">CW</div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-emerald-500 font-black uppercase tracking-[0.3em] text-xs">CoinWise Secure</p>
          <p className="text-slate-500 text-sm animate-pulse">Syncing your digital vault...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Auth onLogin={handleLogin} />;

  return (
    <Layout user={currentUser} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'competition' ? (
        <CompetitionView 
          user={currentUser} marketPrices={marketPrices} 
          onRegister={handleRegisterClick} onReset={handleResetCompetition}
        />
      ) : (
        <div className="animate-in fade-in duration-500 space-y-6">
          <PortfolioSummary userState={currentUser} marketPrices={marketPrices} />

          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col min-h-[600px]">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trading Pair</span>
                      <span className="text-xl font-black text-white">{selectedAsset.replace('USDT', '')}/USDT</span>
                    </div>
                    <div className="h-10 w-px bg-slate-800 hidden md:block" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Price</span>
                      <span className={`text-xl font-black ${currentPrice > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        ${currentPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl">
                    {['1m', '15m', '1h', '4h', '1D'].map(tf => (
                      <button 
                        key={tf} onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${timeframe === tf ? 'bg-slate-800 text-emerald-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {tf}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-slate-800 mx-1" />
                    <button 
                      onClick={() => setShowIndicators(s => ({ ...s, ema: !s.ema }))}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${showIndicators.ema ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500'}`}
                    >
                      EMA
                    </button>
                    <button 
                      onClick={() => setShowIndicators(s => ({ ...s, rsi: !s.rsi }))}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${showIndicators.rsi ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500'}`}
                    >
                      RSI
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-950/50 rounded-2xl relative border border-slate-800/50 overflow-hidden flex flex-col">
                   <div className="flex-1 relative group cursor-crosshair">
                      <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-[0.03] pointer-events-none">
                        {[...Array(72)].map((_, i) => <div key={i} className="border border-white" />)}
                      </div>
                      
                      <div className="absolute inset-0 p-8 flex items-end justify-between gap-1 md:gap-2">
                        {[...Array(30)].map((_, i) => {
                          const height = 20 + Math.random() * 60;
                          const bullish = Math.random() > 0.45;
                          const wickHeight = height + Math.random() * 20;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end group/candle relative" style={{ height: '100%' }}>
                              <div className="w-px bg-slate-700 absolute" style={{ height: `${wickHeight}%`, bottom: `${Math.random() * 10}%` }} />
                              <div className={`w-full rounded-sm relative z-10 transition-all ${bullish ? 'bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.2)]'}`} style={{ height: `${height}%` }} />
                            </div>
                          )
                        })}
                      </div>

                      {showIndicators.ema && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none p-8" preserveAspectRatio="none">
                           <path d="M0 150 Q 100 80, 200 120 T 400 90 T 600 140 T 800 110 T 1000 130" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" className="animate-in fade-in duration-1000" />
                        </svg>
                      )}

                      <div className="absolute top-[20%] left-0 w-full border-t border-rose-500/30 border-dashed flex justify-end">
                        <span className="bg-rose-500/20 text-rose-400 text-[8px] px-1 font-bold">RESISTANCE: ${(currentPrice * 1.05).toFixed(0)}</span>
                      </div>
                   </div>

                   <div className="h-16 border-t border-slate-800/50 flex items-end gap-1 px-8 pb-2">
                     {[...Array(30)].map((_, i) => (
                       <div key={i} className="flex-1 bg-slate-800/40 rounded-t-sm" style={{ height: `${20 + Math.random() * 80}%` }} />
                     ))}
                   </div>

                   {showIndicators.rsi && (
                     <div className="h-24 border-t border-slate-800/50 bg-slate-900/30 p-4 relative animate-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-center text-[8px] font-bold text-slate-600 mb-2 uppercase tracking-widest">
                           <span>RSI(14) Indicator</span>
                           <span className="text-purple-400">Current: 54.2</span>
                        </div>
                        <div className="absolute inset-x-4 top-10 bottom-4 bg-slate-800/20 rounded-lg">
                           <div className="absolute top-0 w-full border-t border-purple-500/20" /> 
                           <div className="absolute bottom-0 w-full border-t border-purple-500/20" /> 
                           <svg className="w-full h-full" preserveAspectRatio="none">
                              <path d="M0 30 L 100 45 L 200 20 L 300 60 L 400 35 L 500 50 L 600 25 L 700 40 L 800 15 L 900 30" fill="none" stroke="#a855f7" strokeWidth="1.5" />
                           </svg>
                        </div>
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <TradingPanel 
                marketData={marketPrices} 
                userState={currentUser} 
                onTrade={handleTrade} 
                onDeposit={handleDeposit}
                selectedAsset={selectedAsset}
                onAssetChange={setSelectedAsset}
              />
            </div>
          </div>

          <div className="w-full">
            <TransactionHistory transactions={currentUser.transactions} />
          </div>
        </div>
      )}
      <AIChatBot userState={currentUser} marketData={marketPrices} />
      {isCompPaymentOpen && (
        <CompetitionPaymentModal onClose={() => setIsCompPaymentOpen(false)} onSuccess={handleCompleteCompetitionPayment} />
      )}
    </Layout>
  );
};

export default App;
