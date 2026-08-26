import React, { useState } from 'react';
import { api, setAuthToken, User } from '../api';
import { Utensils, ShieldCheck, UserCheck, Phone, KeyRound, Clock, DollarSign, Award, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [role, setRole] = useState<'AGENT' | 'WORKER'>('WORKER');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!phone || phone.trim().length < 8) {
      setError('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(phone);
      setInfo(`OTP sent to ${phone}. (Test verification code: ${res.testCode})`);
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!code || code.trim().length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, code, role);
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-emerald-50/60 via-slate-50 to-teal-50/50">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Side: Hero Highlights */}
        <div className="md:col-span-6 space-y-6 text-left pr-0 md:pr-4">
          <div className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
            <Award className="w-3.5 h-3.5 text-emerald-600" /> Premier Catering Marketplace
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Connect & Staff Single-Day <span className="text-emerald-600 font-black">Catering Gigs</span>
          </h1>

          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            The instant platform connecting catering event managers with verified single-day servers, bartenders, chefs, and event crew.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Instant Match</div>
                <div className="text-[10px] text-slate-500 font-medium">Quick hiring</div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Fast Pay</div>
                <div className="text-[10px] text-slate-500 font-medium">Daily payouts</div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Verified Crew</div>
                <div className="text-[10px] text-slate-500 font-medium">Top ratings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="md:col-span-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-7 shadow-xl shadow-emerald-900/5 backdrop-blur-md">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto rounded-2xl green-gradient-bg flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 mb-3">
                <Utensils className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Sign In to GigCater</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Select your portal role and log in via SMS OTP</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-3 font-semibold text-center">
                {error}
              </div>
            )}

            {info && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl p-3.5 font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{info}</span>
              </div>
            )}

            {/* Role Switcher */}
            <div className="mb-6">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 text-center">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setRole('WORKER')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                    role === 'WORKER'
                      ? 'bg-white text-emerald-700 shadow-md shadow-slate-200 border border-emerald-100 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Gig Worker
                </button>
                <button
                  type="button"
                  onClick={() => setRole('AGENT')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                    role === 'AGENT'
                      ? 'bg-white text-emerald-700 shadow-md shadow-slate-200 border border-emerald-100 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  Catering Agent
                </button>
              </div>
            </div>

            {step === 'PHONE' ? (
              <form onSubmit={handleSendOtp} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      placeholder="+1 555-0199 or 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full green-gradient-bg hover:opacity-95 text-white font-extrabold text-sm py-3.5 px-4 rounded-2xl transition shadow-lg shadow-emerald-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending OTP Code...' : 'Send Verification OTP'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Enter 6-Digit OTP Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-bold tracking-widest text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('PHONE')}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3.5 px-3 rounded-2xl transition border border-slate-200"
                  >
                    Change Phone
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 green-gradient-bg text-white text-xs font-extrabold py-3.5 px-3 rounded-2xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enter Portal'}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

