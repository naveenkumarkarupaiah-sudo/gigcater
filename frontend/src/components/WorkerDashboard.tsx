import React, { useState, useEffect } from 'react';
import { api, EventItem, ApplicationItem, User, AdditionalWorker, ComplaintItem } from '../api';
import { formatTimeLabel } from '../timeUtils';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Star,
  CheckCircle,
  Filter,
  ArrowUpRight,
  Sparkles,
  Users,
  Award,
  AlertTriangle,
  X,
  Plus,
  UserCheck,
  ShieldCheck,
  Camera,
  Check,
  LogIn,
  LogOut,
  Map,
  Phone,
  MessageCircle,
  Flag
} from 'lucide-react';

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

  // Group Application Modal State
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
  const [groupSize, setGroupSize] = useState<number>(1);
  const [additionalWorkers, setAdditionalWorkers] = useState<AdditionalWorker[]>([]);

  // Filters & Categories
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [verifyingCheckInId, setVerifyingCheckInId] = useState<string | null>(null);
  const [verifyingCheckOutId, setVerifyingCheckOutId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Payment confirm state
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);

  // Complaint modal state
  const [complaintAppId, setComplaintAppId] = useState<string | null>(null);
  const [complaintReason, setComplaintReason] = useState('');
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintJustSubmitted, setComplaintJustSubmitted] = useState(false);
  const [myComplaints, setMyComplaints] = useState<ComplaintItem[]>([]);

  const handleCancelApplication = async (appId: string) => {
    if (!window.confirm('Are you sure you want to cancel this application request?')) {
      return;
    }
    setCancellingId(appId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.cancelApplication(appId);
      setSuccessMsg('Application request cancelled successfully.');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel application.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleConfirmPayment = async (appId: string) => {
    if (!window.confirm('Confirm that you have received your payment for this gig?')) return;
    setConfirmingPaymentId(appId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.confirmPayment(appId);
      setSuccessMsg('Payment confirmed! Your order is now fully complete. 🎉');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to confirm payment.');
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  const handleFileComplaint = async () => {
    if (!complaintAppId || !complaintReason.trim()) return;
    setComplaintSubmitting(true);
    setErrorMsg(null);
    try {
      await api.fileComplaint(complaintAppId, complaintReason.trim());
      setComplaintReason('');
      setComplaintJustSubmitted(true);
      const complaintsRes = await api.getMyComplaints();
      setMyComplaints(complaintsRes.complaints || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to file complaint.');
    } finally {
      setComplaintSubmitting(false);
    }
  };

  const handleCheckIn = async (appId: string, file: File) => {
    setVerifyingCheckInId(appId);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadProgress("Uploading check-in photo...");
    try {
      const presigned = await api.getPresignedUrl('checkInPhoto', file.name);
      await api.uploadToPresignedUrl(presigned.uploadUrl, file);
      const photoKey = presigned.objectKey;

      setUploadProgress("Acquiring Geotag...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            setUploadProgress("Logging check-in on server...");
            await api.checkIn(appId, photoKey, latitude, longitude);
            setSuccessMsg("Check-in verified successfully!");
            fetchData();
          } catch (err: any) {
            setErrorMsg(err.message || "Failed to submit check-in to server.");
          } finally {
            setVerifyingCheckInId(null);
            setUploadProgress(null);
          }
        },
        async (geoError) => {
          console.warn("Geotag retrieval failed, using fallback:", geoError.message);
          try {
            const fallbackLat = 23.8103;
            const fallbackLng = 90.4125;
            setUploadProgress("Logging check-in (with GPS fallback)...");
            await api.checkIn(appId, photoKey, fallbackLat, fallbackLng);
            setSuccessMsg("Check-in verified successfully (with GPS fallback)!");
            fetchData();
          } catch (err: any) {
            setErrorMsg(err.message || "Failed to submit check-in to server.");
          } finally {
            setVerifyingCheckInId(null);
            setUploadProgress(null);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch (err: any) {
      setErrorMsg(`Check-in upload failed: ${err.message}`);
      setVerifyingCheckInId(null);
      setUploadProgress(null);
    }
  };

  const handleCheckOut = async (appId: string, file: File) => {
    setVerifyingCheckOutId(appId);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadProgress("Uploading check-out photo...");
    try {
      const presigned = await api.getPresignedUrl('checkOutPhoto', file.name);
      await api.uploadToPresignedUrl(presigned.uploadUrl, file);
      const photoKey = presigned.objectKey;

      setUploadProgress("Acquiring Geotag...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            setUploadProgress("Logging check-out on server...");
            await api.checkOut(appId, photoKey, latitude, longitude);
            setSuccessMsg("Check-out verified successfully!");
            fetchData();
          } catch (err: any) {
            setErrorMsg(err.message || "Failed to submit check-out to server.");
          } finally {
            setVerifyingCheckOutId(null);
            setUploadProgress(null);
          }
        },
        async (geoError) => {
          console.warn("Geotag retrieval failed, using fallback:", geoError.message);
          try {
            const fallbackLat = 23.8103;
            const fallbackLng = 90.4125;
            setUploadProgress("Logging check-out (with GPS fallback)...");
            await api.checkOut(appId, photoKey, fallbackLat, fallbackLng);
            setSuccessMsg("Check-out verified successfully (with GPS fallback)!");
            fetchData();
          } catch (err: any) {
            setErrorMsg(err.message || "Failed to submit check-out to server.");
          } finally {
            setVerifyingCheckOutId(null);
            setUploadProgress(null);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch (err: any) {
      setErrorMsg(`Check-out upload failed: ${err.message}`);
      setVerifyingCheckOutId(null);
      setUploadProgress(null);
    }
  };

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
        const complaintsRes = await api.getMyComplaints();
        setMyComplaints(complaintsRes.complaints || []);
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

  const openApplyModal = (evt: EventItem) => {
    setModalEvent(evt);
    setGroupSize(1);
    setAdditionalWorkers([]);
    setErrorMsg(null);
  };

  const closeApplyModal = () => {
    setModalEvent(null);
    setGroupSize(1);
    setAdditionalWorkers([]);
  };

  const handleGroupSizeChange = (newSize: number) => {
    setGroupSize(newSize);
    const updated = [...additionalWorkers];
    if (newSize > 1) {
      const extraNeeded = newSize - 1;
      while (updated.length < extraNeeded) {
        updated.push({ name: '', phone: '', photoUrl: '' });
      }
      while (updated.length > extraNeeded) {
        updated.pop();
      }
    } else {
      updated.length = 0;
    }
    setAdditionalWorkers(updated);
  };

  const handleAdditionalWorkerChange = (index: number, field: keyof AdditionalWorker, value: string) => {
    const updated = [...additionalWorkers];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalWorkers(updated);
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEvent) return;

    // Validate additional workers if groupSize > 1
    if (groupSize > 1) {
      for (let i = 0; i < additionalWorkers.length; i++) {
        if (!additionalWorkers[i].name || !additionalWorkers[i].phone) {
          setErrorMsg(`Please fill in Name and Phone for Worker #${i + 2}`);
          return;
        }
      }
    }

    setApplyingId(modalEvent.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.applyForEvent(modalEvent.id, groupSize, additionalWorkers);
      setSuccessMsg(res.message || 'Successfully applied for catering gig!');
      closeApplyModal();
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

  // Check if worker is ALREADY confirmed (APPROVED) for a gig on this date
  const getConfirmedConflictOnDate = (eventDateStr: string) => {
    const targetDate = new Date(eventDateStr).toISOString().split('T')[0];
    return myApplications.find(app => {
      if (app.status !== 'APPROVED' || !app.event) return false;
      const appDate = new Date(app.event.date).toISOString().split('T')[0];
      return appDate === targetDate;
    });
  };

  const categories = ['All', 'Banquet Serving', 'Kitchen & Cooking', 'Bartending', 'Clearing & Busser'];

  const filteredEvents = events.filter(evt => {
    if (selectedCategory !== 'All' && evt.category) {
      return evt.category.toLowerCase().includes(selectedCategory.toLowerCase());
    }
    return true;
  });

  const completedAppsCount = myApplications.filter(a => a.status === 'COMPLETED').length;
  const paidAppsCount = myApplications.filter(a => a.status === 'PAID').length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 font-semibold flex justify-between items-center shadow-xs">
          <span>{errorMsg}</span>
          <div className="flex items-center gap-2">
            {errorMsg.includes('complete your worker profile') && (
              <button
                onClick={() => { setErrorMsg(null); onGoToProfile(); }}
                className="bg-red-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow-xs hover:bg-red-700 transition"
              >
                Complete Profile
              </button>
            )}
            <button onClick={() => setErrorMsg(null)} className="font-bold ml-2 hover:text-red-900">✕</button>
          </div>
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
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-emerald-100 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
                  <Sparkles className="w-3 h-3 text-emerald-300" /> One-Day Catering Gigs
                </span>
                {completedAppsCount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-amber-400/30 backdrop-blur-md text-amber-100 text-[11px] font-extrabold px-3 py-1 rounded-full border border-amber-300">
                    <Award className="w-3.5 h-3.5 text-amber-300" /> {completedAppsCount} Verified Badges Earned 🏅
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold mt-2 tracking-tight leading-tight">
                Find High-Paying Catering Gigs Today
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-2 font-medium leading-relaxed">
                Browse verified events near you, apply individually or as a team, and receive fast daily payouts.
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
                const conflictApp = getConfirmedConflictOnDate(evt.date);
                return (
                  <div
                    key={evt.id}
                    className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-emerald-100/90 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                          {evt.category || 'Catering Staff'}
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

                      <div className="space-y-2 text-xs font-medium text-slate-600 mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
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
                          <span>{formatTimeLabel(evt.startTime)} - {formatTimeLabel(evt.endTime)}</span>
                        </div>
                      </div>

                      {/* Schedule Conflict Notice */}
                      {conflictApp && !app && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl font-bold mb-4 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Confirmed for another gig on this date ({conflictApp.event?.title})</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Pay</div>
                        <div className="text-xl font-black text-slate-900 flex items-baseline">
                          ₹{Number(evt.payPerWorker).toFixed(2)}
                          <span className="text-[10px] font-semibold text-slate-400 ml-1">/ day</span>
                        </div>
                      </div>

                      {app ? (
                        <span className={`px-3 py-1.5 text-xs font-extrabold rounded-xl uppercase tracking-wider border ${
                          app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          app.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                          app.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {app.status === 'COMPLETED' && <Award className="w-3.5 h-3.5 text-amber-500" />}
                          {app.status}
                        </span>
                      ) : conflictApp ? (
                        <button
                          disabled
                          className="bg-slate-100 text-slate-400 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-200 cursor-not-allowed"
                        >
                          Schedule Conflict
                        </button>
                      ) : (
                        <button
                          onClick={() => openApplyModal(evt)}
                          className="green-gradient-bg hover:opacity-95 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-1"
                        >
                          Apply Now
                          <ArrowUpRight className="w-3.5 h-3.5" />
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

      {/* MY APPLICATIONS TAB */}
      {activeTab === 'my-applications' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-left">
          <div className="border-b border-slate-100 pb-5 mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                My Catering Applications
                {completedAppsCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1">
                    <Award className="w-4 h-4 text-amber-500" /> {completedAppsCount} Completion Badges 🏅
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Track your approval status, team members, and event completion badges.</p>
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
              {myApplications.map((app) => {
                const groupCount = app.groupSize || 1;
                return (
                  <div key={app.id} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-200 transition">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-extrabold text-slate-900">{app.event?.title || 'Catering Event'}</h3>
                        <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase border ${
                          app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          app.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                          app.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          app.status === 'PAID' ? 'bg-green-100 text-green-800 border-green-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {app.status}
                        </span>

                        {groupCount > 1 && (
                          <span className="bg-teal-100 text-teal-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                            <Users className="w-3 h-3 text-teal-700" /> Team of {groupCount}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-medium text-slate-600 flex flex-wrap gap-4 mt-2">
                        <span className="flex items-center gap-1 font-semibold"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> {app.event?.location}</span>
                        <span className="flex items-center gap-1 font-semibold"><Calendar className="w-3.5 h-3.5 text-emerald-600" /> {app.event?.date ? new Date(app.event.date).toLocaleDateString() : 'N/A'}</span>
                        <span className="flex items-center gap-1 font-bold text-slate-900"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /> ₹{app.event?.payPerWorker ? Number(app.event.payPerWorker).toFixed(2) : '0.00'}/worker</span>
                      </div>

                      {/* COMPLETED BADGE DISPLAY */}
                      {app.status === 'COMPLETED' && (
                        <div className="mt-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-3 shadow-md flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0 font-extrabold">
                            🏅
                          </div>
                          <div>
                            <div className="text-xs font-extrabold flex items-center gap-1">
                              Verified Event Completion Star Badge
                              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                            </div>
                            <p className="text-[11px] text-amber-100 font-medium">
                              Congratulations! You successfully completed this catering event. Rating: {app.rating || 5} Stars ⭐
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => handleConfirmPayment(app.id)}
                                disabled={confirmingPaymentId === app.id}
                                className="bg-white text-amber-700 font-extrabold text-[11px] px-3 py-1.5 rounded-xl border border-white/60 hover:bg-amber-50 transition flex items-center gap-1 shadow-xs"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                {confirmingPaymentId === app.id ? 'Confirming...' : 'Confirm Payment Received ✓'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PAID BADGE DISPLAY */}
                      {app.status === 'PAID' && (
                        <div className="mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-3 shadow-md flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0 font-extrabold">
                            💳
                          </div>
                          <div>
                            <div className="text-xs font-extrabold flex items-center gap-1">
                              Order Complete — Payment Confirmed
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
                            </div>
                            <p className="text-[11px] text-emerald-100 font-medium">
                              You confirmed receiving payment for this gig. Transaction fully closed. 🎉
                            </p>
                          </div>
                        </div>
                      )}

                      {/* GEOTAGGED CHECK-IN / CHECK-OUT PANEL */}
                      {(app.status === 'APPROVED' || app.status === 'COMPLETED') && (
                        <div className="mt-4 bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Workplace Presence Verification (Geotagged GPS Check)
                          </div>
                          
                          {uploadProgress && (verifyingCheckInId === app.id || verifyingCheckOutId === app.id) && (
                            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 animate-pulse">
                              {uploadProgress}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Check-In Column */}
                            <div className="space-y-2">
                              <div className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <LogIn className="w-3.5 h-3.5 text-emerald-500" /> Check-In (On Entry)
                              </div>
                              {app.checkInTime ? (
                                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 text-xs space-y-1">
                                  <div className="font-semibold text-slate-800">
                                    Time: {new Date(app.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5">
                                    <Map className="w-3 h-3 text-slate-400" /> Lat: {app.checkInLat?.toFixed(4)}, Lng: {app.checkInLng?.toFixed(4)}
                                  </div>
                                  <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                    ✓ Check-In Verified
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[11px] text-slate-500">Open camera to capture your in-time photo & verify location:</p>
                                  <label className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer transition ${verifyingCheckInId ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Camera className="w-3.5 h-3.5" /> Take In-Time Photo
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      disabled={!!verifyingCheckInId}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleCheckIn(app.id, file);
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              )}
                            </div>

                            {/* Check-Out Column */}
                            <div className="space-y-2">
                              <div className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <LogOut className="w-3.5 h-3.5 text-amber-500" /> Check-Out (On Exit)
                              </div>
                              {!app.checkInTime ? (
                                <p className="text-[11px] text-slate-400 italic">Check-in first</p>
                              ) : app.checkOutTime ? (
                                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 text-xs space-y-1">
                                  <div className="font-semibold text-slate-800">
                                    Time: {new Date(app.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5">
                                    <Map className="w-3 h-3 text-slate-400" /> Lat: {app.checkOutLat?.toFixed(4)}, Lng: {app.checkOutLng?.toFixed(4)}
                                  </div>
                                  <span className="inline-block text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                    ✓ Check-Out Verified
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[11px] text-slate-500">Open camera to capture your out-time photo & verify location:</p>
                                  <label className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer transition ${verifyingCheckOutId ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Camera className="w-3.5 h-3.5" /> Take Out-Time Photo
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      disabled={!!verifyingCheckOutId}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleCheckOut(app.id, file);
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PAYMENT STATUS PANEL — appears once the Out-Time photo starts the payment clock */}
                      {app.paymentStatus && (() => {
                        const isOverdue = app.paymentStatus === 'PENDING' && !!app.paymentDueAt && new Date(app.paymentDueAt) < new Date();
                        const existingComplaint = myComplaints.find((c) => c.applicationId === app.id);
                        return (
                          <div className={`mt-4 rounded-2xl p-4 border space-y-2 text-xs ${
                            app.paymentStatus === 'PAID' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                          }`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-emerald-700" /> Payment Status
                              </div>
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                                app.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : isOverdue ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {app.paymentStatus === 'PAID' ? '✓ Paid' : isOverdue ? 'Overdue' : 'Pending'}
                              </span>
                            </div>

                            {app.paymentStatus === 'PAID' ? (
                              <div className="text-emerald-900 space-y-1 font-medium">
                                <div>Paid on {app.paymentPaidAt ? new Date(app.paymentPaidAt).toLocaleString() : 'N/A'}</div>
                                {app.paymentReference && <div>Reference/UTR: <span className="font-mono font-bold">{app.paymentReference}</span></div>}
                              </div>
                            ) : (
                              <div className="text-amber-900 font-medium">
                                {app.paymentDueAt && <div>Agent must pay by {new Date(app.paymentDueAt).toLocaleString()}</div>}
                              </div>
                            )}

                            {existingComplaint ? (
                              <div className="pt-2 mt-1 border-t border-slate-200/70">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                                  existingComplaint.status === 'RESOLVED_GENUINE' ? 'bg-red-100 text-red-800 border-red-300' :
                                  existingComplaint.status === 'RESOLVED_INVALID' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                  'bg-blue-100 text-blue-800 border-blue-300'
                                }`}>
                                  Complaint: {existingComplaint.status === 'PENDING' ? 'Under Review' : existingComplaint.status === 'RESOLVED_GENUINE' ? 'Confirmed Genuine' : 'Marked Invalid'}
                                </span>
                                {existingComplaint.agentContactDetails && (
                                  <div className="mt-2 bg-white border border-red-200 rounded-xl p-2.5 space-y-1">
                                    <div className="font-bold text-slate-800">Agent Contact Details:</div>
                                    <div>Name: <strong>{existingComplaint.agentContactDetails.name}</strong></div>
                                    <div>Phone: <a href={`tel:${existingComplaint.agentContactDetails.phone}`} className="text-blue-600 underline font-bold">{existingComplaint.agentContactDetails.phone}</a></div>
                                    <div>WhatsApp: <a href={`https://wa.me/${existingComplaint.agentContactDetails.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 underline font-bold">{existingComplaint.agentContactDetails.whatsappNumber}</a></div>
                                  </div>
                                )}
                              </div>
                            ) : isOverdue ? (
                              <div className="pt-1">
                                <button
                                  onClick={() => { setComplaintAppId(app.id); setComplaintJustSubmitted(false); setComplaintReason(''); }}
                                  className="bg-red-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl hover:bg-red-700 transition flex items-center gap-1 shadow-xs"
                                >
                                  <Flag className="w-3 h-3" /> Raise Payment Complaint
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
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
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-xs text-slate-400 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                          Submitted on {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                        {app.status === 'APPLIED' && (
                          <button
                            onClick={() => handleCancelApplication(app.id)}
                            disabled={cancellingId === app.id}
                            className="bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-red-200 transition"
                          >
                            {cancellingId === app.id ? "Cancelling..." : "Cancel Request"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* GROUP APPLICATION MODAL */}
      {modalEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-emerald-200">
                  Gig Application
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{modalEvent.title}</h3>
                <p className="text-xs text-slate-500 font-medium">{modalEvent.location} • ₹{modalEvent.payPerWorker}/worker</p>
              </div>
              <button
                type="button"
                onClick={closeApplyModal}
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitApplication} className="space-y-4">
              {/* SELECT GROUP SIZE */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  How many workers are applying?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleGroupSizeChange(num)}
                      className={`py-2.5 rounded-xl text-xs font-extrabold transition border ${
                        groupSize === num
                          ? 'green-gradient-bg text-white border-emerald-600 shadow-md scale-105'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      {num} {num === 1 ? 'Worker' : 'Workers'}
                    </button>
                  ))}
                </div>
              </div>

              {/* NOTICE ON PROOF REQUIREMENTS */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 font-medium flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Proof Notice:</strong> Verification ID proof is only required for the primary applicant ({user.phone}). Additional team members only need Name, Phone, and Photo.
                </span>
              </div>

              {/* ADDITIONAL WORKERS FORM */}
              {groupSize > 1 && (
                <div className="space-y-4 border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                    Additional Group Members ({additionalWorkers.length})
                  </h4>

                  {additionalWorkers.map((worker, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                      <div className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        Worker #{idx + 2} Details
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. David Miller"
                            value={worker.name}
                            onChange={(e) => handleAdditionalWorkerChange(idx, 'name', e.target.value)}
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number *</label>
                          <input
                            type="tel"
                            placeholder="e.g. +1 555-0199"
                            value={worker.phone}
                            onChange={(e) => handleAdditionalWorkerChange(idx, 'phone', e.target.value)}
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Photo URL / File Key (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. photo_url or upload key"
                          value={worker.photoUrl || ''}
                          onChange={(e) => handleAdditionalWorkerChange(idx, 'photoUrl', e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeApplyModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyingId === modalEvent.id}
                  className="px-6 py-2.5 green-gradient-bg text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {applyingId === modalEvent.id ? 'Submitting Application...' : `Confirm Application (${groupSize} ${groupSize === 1 ? 'Worker' : 'Workers'})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLAINT MODAL */}
      {complaintAppId && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-red-200">
                  Payment Complaint
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Report Late Payment</h3>
                <p className="text-xs text-slate-500 font-medium">Describe the payment issue. Our team will investigate with the agent before any action is taken.</p>
              </div>
              <button
                type="button"
                onClick={() => { setComplaintAppId(null); setComplaintJustSubmitted(false); setComplaintReason(''); }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {complaintJustSubmitted ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Complaint Submitted
                  </div>
                  <p className="text-xs text-emerald-900 font-medium">
                    Our team will review this with the agent. If confirmed genuine, we'll reveal the agent's contact details right here under this gig's payment status.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => { setComplaintAppId(null); setComplaintJustSubmitted(false); }}
                    className="px-5 py-2.5 green-gradient-bg text-white font-extrabold text-xs rounded-xl transition shadow-md"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Describe the payment issue *</label>
                  <textarea
                    value={complaintReason}
                    onChange={(e) => setComplaintReason(e.target.value)}
                    rows={4}
                    placeholder="e.g. Agent promised ₹180 per day but paid nothing after event completion on 04-Sep-2026..."
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-red-400 font-medium"
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  Our support team will investigate with the agent and verify the details before deciding. Agent contact is only shared with you once confirmed genuine.
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => { setComplaintAppId(null); setComplaintReason(''); }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFileComplaint}
                    disabled={complaintSubmitting || !complaintReason.trim()}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {complaintSubmitting ? 'Submitting...' : 'Submit Complaint for Review'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
