import React, { useState, useEffect } from 'react';
import { api, EventItem, ApplicationItem, User } from '../api';
import { Search, MapPin, Calendar, Clock, DollarSign, Star, CheckCircle, Filter, ArrowUpRight, Sparkles, Building, ChevronRight } from 'lucide-react';

interface WorkerDashboardProps {
  user: User;
  activeTab: 'browse' | 'my-applications' | 'profile';
  onGoToProfile: () => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ user, activeTab, onGoToProfile }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [myApplications, setMyApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Filters & Categories
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'browse') {
        const res = await api.getOpenEvents({ location: locationFilter, search: searchFilter });
        setEvents(res.events || []);
        const appRes = await api.getMyApplications();
        setMyApplications(appRes.applications || []);
      } else if (activeTab === 'my-applications') {
        const res = await api.getMyApplications();
        setMyApplications(res.applications || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleApply = async (eventId: string) => {
    setApplyingId(eventId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.applyForEvent(eventId);
      setSuccessMsg(res.message || 'Successfully applied for catering gig!');
      const appRes = await api.getMyApplications();
      setMyApplications(appRes.applications || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply for event.');
    } finally {
      setApplyingId(null);
    }
  };

  const getAppliedApplication = (eventId: string) => {
    return myApplications.find((app) => app.eventId === eventId);
  };

  const categories = ['All', 'Banquet Serving', 'Kitchen & Cooking', 'Bartending', 'Clearing & Busser'];

  const filteredEvents = events.filter(evt => {
    if (selectedCategory !== 'All' && evt.category) {
      return evt.category.toLowerCase().includes(selectedCategory.toLowerCase());
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 font-semibold flex justify-between items-center shadow-xs">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold ml-2 hover:text-red-900">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl p-4 font-semibold flex justify-between items-center shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold ml-2 hover:text-emerald-950">✕</button>
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="space-y-6 text-left">
          {/* Header Hero Banner */}
          <div className="dark-hero-gradient rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-emerald-950/10 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="max-w-2xl relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-emerald-100 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
                <Sparkles className="w-3 h-3 text-emerald-300" /> One-Day Catering Gigs
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold mt-3 tracking-tight leading-tight">
                Find High-Paying Catering Gigs Today
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-2 font-medium leading-relaxed">
                Browse verified events near you, apply with a single click, and receive fast daily payouts.
              </p>
            </div>

            {/* Search Bar Container */}
            <form onSubmit={handleSearchSubmit} className="mt-8 bg-white p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-2 relative z-10">
              <div className="flex-1 flex items-center px-3.5 bg-slate-50 rounded-xl border border-slate-200/60 focus-within:bg-white focus-within:border-emerald-500 transition">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Role, keyword (e.g. Server, Bartender)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-xs text-slate-900 focus:outline-none font-semibold"
                />
              </div>

              <div className="flex-1 flex items-center px-3.5 bg-slate-50 rounded-xl border border-slate-200/60 focus-within:bg-white focus-within:border-emerald-500 transition">
                <MapPin className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Location or venue..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-xs text-slate-900 focus:outline-none font-semibold"
                />
              </div>

              <button
                type="submit"
                className="green-gradient-bg hover:opacity-95 text-white font-extrabold text-xs py-3 px-7 rounded-xl transition-all shadow-md shadow-emerald-600/30 shrink-0"
              >
                Search Gigs
              </button>
            </form>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
            <span className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter by:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'green-gradient-bg text-white shadow-md shadow-emerald-600/20 scale-[1.02]'
                    : 'bg-white text-slate-600 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Gigs Cards Grid */}
          {loading ? (
            <div className="p-16 text-center text-xs font-semibold text-slate-500 bg-white rounded-3xl border border-slate-200/80">
              Loading available catering gigs...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-extrabold text-slate-900">No matching catering gigs found</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Try broadening your search query or location filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => {
                const app = getAppliedApplication(evt.id);
                return (
                  <div
                    key={evt.id}
                    className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-emerald-100/90 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                          {evt.category || 'Banquet Serving'}
                        </span>
                        <div className="flex items-center text-amber-600 text-xs font-extrabold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                          <span>4.9</span>
                        </div>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug mb-2 group-hover:text-emerald-700 transition-colors">
                        {evt.title}
                      </h3>

                      <p className="text-xs text-slate-500 mb-4 line-clamp-2 font-medium leading-relaxed">
                        {evt.description || 'Professional one-day catering event staffing needed.'}
                      </p>

                      <div className="space-y-2 text-xs font-medium text-slate-600 mb-5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate font-semibold">{evt.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{evt.startTime} - {evt.endTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Pay</div>
                        <div className="text-xl font-black text-slate-900 flex items-baseline">
                          ${Number(evt.payPerWorker).toFixed(2)}
                          <span className="text-[10px] font-semibold text-slate-400 ml-1">/ day</span>
                        </div>
                      </div>

                      {app ? (
                        <span className={`px-3 py-1.5 text-xs font-extrabold rounded-xl uppercase tracking-wider border ${
                          app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          app.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                          app.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {app.status}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApply(evt.id)}
                          disabled={applyingId === evt.id}
                          className="green-gradient-bg hover:opacity-95 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1"
                        >
                          {applyingId === evt.id ? 'Applying...' : 'Apply Now'}
                          {!applyingId && <ArrowUpRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'my-applications' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-left">
          <div className="border-b border-slate-100 pb-5 mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">My Catering Applications</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Track your approval status, schedule, and agent ratings.</p>
            </div>
            <span className="bg-emerald-50 text-emerald-800 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-emerald-200">
              Total: {myApplications.length}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-500">Loading your applications...</div>
          ) : myApplications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-extrabold text-slate-800">You haven't submitted any applications yet.</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Switch to "Browse Catering Gigs" to apply for open positions!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myApplications.map((app) => (
                <div key={app.id} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-200 transition">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-extrabold text-slate-900">{app.event?.title || 'Catering Event'}</h3>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase border ${
                        app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        app.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                        app.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-600 flex flex-wrap gap-4 mt-2.5">
                      <span className="flex items-center gap-1 font-semibold"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> {app.event?.location}</span>
                      <span className="flex items-center gap-1 font-semibold"><Calendar className="w-3.5 h-3.5 text-emerald-600" /> {app.event?.date ? new Date(app.event.date).toLocaleDateString() : 'N/A'}</span>
                      <span className="flex items-center gap-1 font-bold text-slate-900"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /> ${app.event?.payPerWorker ? Number(app.event.payPerWorker).toFixed(2) : '0.00'}</span>
                    </div>
                  </div>

                  {app.rating ? (
                    <div className="bg-white border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 shadow-xs">
                      <span className="text-xs font-bold text-slate-700">Rating:</span>
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= (app.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                      Submitted on {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

