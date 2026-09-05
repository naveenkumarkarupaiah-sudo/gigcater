import React from 'react';
import { User } from '../api';
import { Utensils, Calendar, UserCheck, PlusCircle, LogOut, Sparkles, Building, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, activeTab, setActiveTab }) => {
  return (
    <header className="glass-nav border-b border-emerald-900/10 shadow-sm sticky top-0 z-30 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-6">
            <div 
              className="flex items-center space-x-3 cursor-pointer group" 
              onClick={() => setActiveTab && setActiveTab(user?.role === 'AGENT' ? 'my-events' : user?.role === 'ADMIN' ? 'complaints' : 'browse')}
            >
              <div className="w-10 h-10 rounded-2xl green-gradient-bg flex items-center justify-center text-white shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2 font-sans">
                  GigCater
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Staffing
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Connecting Agents & Single-Day Gig Workers</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            {user && setActiveTab && (
              <nav className="hidden md:flex space-x-1.5 ml-4 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
                {user.role === 'ADMIN' ? (
                  <button
                    onClick={() => setActiveTab('complaints')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      activeTab === 'complaints'
                        ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Payment Complaints
                  </button>
                ) : user.role === 'WORKER' ? (
                  <>
                    <button
                      onClick={() => setActiveTab('browse')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        activeTab === 'browse'
                          ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      Browse Catering Gigs
                    </button>
                    <button
                      onClick={() => setActiveTab('my-applications')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        activeTab === 'my-applications'
                          ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      My Applications
                    </button>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        activeTab === 'profile'
                          ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Worker Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab('my-events')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        activeTab === 'my-events'
                          ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      My Events & Gigs
                    </button>
                    <button
                      onClick={() => setActiveTab('incoming-requests')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        activeTab === 'incoming-requests'
                          ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Worker Requests
                    </button>
                    <button
                      onClick={() => setActiveTab('agent-profile')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        activeTab === 'agent-profile'
                          ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Agent Profile
                    </button>
                    <button
                      onClick={() => setActiveTab('create-event')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        activeTab === 'create-event'
                          ? 'green-gradient-bg text-white shadow-md shadow-emerald-600/20'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Post Quick Event
                    </button>
                  </>
                )}
              </nav>
            )}
          </div>

          {/* User Profile Badge & Logout */}
          {user && (
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl px-3.5 py-1.5 shadow-xs">
                <div className="w-7 h-7 rounded-xl green-gradient-bg text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {user.role === 'AGENT' ? 'AG' : user.role === 'ADMIN' ? 'AD' : 'WK'}
                </div>
                <div className="text-left">
                  <div className="font-extrabold text-slate-900 text-[11px] leading-tight">{user.phone}</div>
                  <div className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">{user.role} Portal</div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl px-3.5 py-2 hover:bg-red-50 hover:border-red-200 transition-all font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

