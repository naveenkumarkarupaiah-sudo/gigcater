import React, { useState } from 'react';
import { api, setAuthToken, User } from '../api';
import { Utensils, ShieldCheck, UserCheck, Clock, DollarSign, Award, ArrowRight, ShieldAlert, Percent } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickLogin = async (selectedRole: 'AGENT' | 'WORKER' | 'ADMIN') => {
    setLoading(true);
    setError(null);
    try {
      // Use standard default phone numbers depending on the selected role.
      // ADMIN must match the backend's ADMIN_PHONES allowlist — anyone else is rejected server-side.
      const testPhone = selectedRole === 'WORKER' ? '9876543210' : selectedRole === 'ADMIN' ? '0000000000' : '9999999999';
      const testOtp = '123456';

      const res = await api.verifyOtp(testPhone, testOtp, selectedRole);
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
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

        {/* Right Side: Quick Auth Card */}
        <div className="md:col-span-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl shadow-emerald-900/5 backdrop-blur-md">
            {/* Core value proposition — always the first thing anyone sees on login */}
            <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl px-4 py-3.5 shadow-lg shadow-emerald-600/25 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight leading-tight">0% Commission — No Commission Ever</div>
                <p className="text-[11px] text-emerald-50 font-semibold mt-0.5">Workers keep 100% of their pay. Agents keep 100% of their margin.</p>
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto rounded-2xl green-gradient-bg flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 mb-3 animate-bounce">
                <Utensils className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Access GigCater Portal</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Select your portal role to log in instantly</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-3.5 font-semibold text-center">
                {error}
              </div>
            )}

            {/* Quick Login Options */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleQuickLogin('WORKER')}
                disabled={loading}
                className="w-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 flex items-center justify-between transition-all duration-300 group shadow-xs hover:shadow-md disabled:opacity-60 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Enter as Gig Worker</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Find gigs, check-in with GPS, and verify work</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('AGENT')}
                disabled={loading}
                className="w-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 flex items-center justify-between transition-all duration-300 group shadow-xs hover:shadow-md disabled:opacity-60 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Enter as Catering Agent</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Post new events, review team presence, and rate crew</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={loading}
                className="w-full bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-2xl p-5 flex items-center justify-between transition-all duration-300 group shadow-xs hover:shadow-md disabled:opacity-60 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Enter as Platform Admin</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Investigate payment complaints and verify ID proofs</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-medium mt-6 text-center">
              * Verification phone numbers and test tokens are generated automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

