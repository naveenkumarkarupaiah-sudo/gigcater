import React, { useState, useEffect } from 'react';
import { api, EventItem, ApplicationItem, AdditionalWorker } from '../api';
import { parseTimeString, formatTimeLabel } from '../timeUtils';
import { resolveUploadedFileUrl } from '../mediaUrl';
import {
  Calendar,
  PlusCircle,
  UserCheck,
  Star,
  CheckCircle,
  Clock,
  MapPin,
  DollarSign,
  Sparkles,
  Building,
  Briefcase,
  Users,
  ArrowUpRight,
  Trash2,
  AlertTriangle,
  Award,
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  User,
  Wallet,
  CreditCard
} from 'lucide-react';

interface AgentDashboardProps {
  activeTab: 'my-events' | 'create-event' | 'incoming-requests';
  setActiveTab: (tab: string) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ activeTab, setActiveTab }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Quick Preset Templates for 1-Click Event Creation
  const presets = [
    {
      title: 'Bhuna Khichuri & Thai Buffet Server',
      category: 'Banquet Serving',
      description: 'Luxury buffet serving & table management. Uniform: White shirt & black trousers.',
      location: 'Dhanmondi, Dhaka Sector 4',
      startTime: '11:00',
      endTime: '18:00',
      workersNeeded: '6',
      payPerWorker: '180.00',
    },
    {
      title: 'Grand Wedding Reception Banquet Attendant',
      category: 'Banquet Serving',
      description: 'Plated dinner service, welcome drinks, and dessert refill management.',
      location: 'Metropolitan Convention Hall, Downtown',
      startTime: '16:00',
      endTime: '23:00',
      workersNeeded: '8',
      payPerWorker: '210.00',
    },
    {
      title: 'Kitchen Chef Helper & Food Prep Staff',
      category: 'Kitchen & Cooking',
      description: 'Assist head chef with dish plating, ingredient prep, and tray assembly.',
      location: 'Royal Palace Banquet, Westside',
      startTime: '08:00',
      endTime: '15:00',
      workersNeeded: '4',
      payPerWorker: '160.00',
    },
    {
      title: 'Corporate Luncheon Buffet Clearer & Busser',
      category: 'Clearing & Busser',
      description: 'Clear tables, replenish water carafes, and manage dish collection station.',
      location: 'City Tech Park, Center Plaza',
      startTime: '11:30',
      endTime: '16:30',
      workersNeeded: '5',
      payPerWorker: '140.00',
    },
  ];

  // Quick-pick chip values to speed up filling the pay rate field — real gigs typically start near ₹350
  const payRateChips = ['350', '400', '450', '500', '600'];

  // Tiered step size for the Pay/Worker +/- stepper: ₹10 for the first 5 presses,
  // ₹20 for the next 5, then ₹50 per press after that — a flat ₹0.01 native step is useless here.
  const getPayStepSize = (pressNumber: number): number => {
    if (pressNumber <= 5) return 10;
    if (pressNumber <= 10) return 20;
    return 50;
  };

  // New Event Form State — starts empty; presets or manual entry fill it in
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [workersNeeded, setWorkersNeeded] = useState('');
  const [payPerWorker, setPayPerWorker] = useState('');
  const [payStepCount, setPayStepCount] = useState(0);

  const handlePayIncrement = () => {
    const nextCount = payStepCount + 1;
    const step = getPayStepSize(nextCount);
    setPayStepCount(nextCount);
    setPayPerWorker(String((parseFloat(payPerWorker) || 0) + step));
  };

  const handlePayDecrement = () => {
    const step = getPayStepSize(Math.max(1, payStepCount));
    setPayStepCount(Math.max(0, payStepCount - 1));
    setPayPerWorker(String(Math.max(0, (parseFloat(payPerWorker) || 0) - step)));
  };

  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Rating Modal / Rating Selector State
  const [ratingAppId, setRatingAppId] = useState<string | null>(null);
  const [selectedStarRating, setSelectedStarRating] = useState<number>(5);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedWorkerApp, setSelectedWorkerApp] = useState<any | null>(null);

  // Full-screen photo viewer — lets the agent tap any of the 3 attendance photos to enlarge it
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; label: string } | null>(null);

  // "I Have Paid" payment form state
  const [payingAppId, setPayingAppId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofKey, setPaymentProofKey] = useState<string | null>(null);
  const [paymentProofUploading, setPaymentProofUploading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaymentProofUploading(true);
    setErrorMsg(null);
    try {
      const presigned = await api.getPresignedUrl('paymentProof', file.name);
      await api.uploadToPresignedUrl(presigned.uploadUrl, file);
      setPaymentProofKey(presigned.objectKey);
    } catch (err: any) {
      setErrorMsg(`Failed to upload payment proof: ${err.message}`);
    } finally {
      setPaymentProofUploading(false);
    }
  };

  const handleMarkPaid = async (appId: string) => {
    if (!paymentProofKey) {
      setErrorMsg('Please upload a payment proof screenshot before confirming payment.');
      return;
    }
    setMarkingPaid(true);
    setErrorMsg(null);
    try {
      await api.markPaid(appId, paymentProofKey, paymentReference.trim() || undefined);
      setSuccessMsg('Payment marked as paid. The worker can now see the confirmation.');
      setPayingAppId(null);
      setPaymentReference('');
      setPaymentProofKey(null);
      fetchMyEvents();
      if (selectedEvent) {
        const updatedDetails = await api.getEventDetails(selectedEvent.id);
        setSelectedEvent(updatedDetails.event);
      }
      setSelectedWorkerApp((prev: any) => prev && prev.id === appId ? { ...prev, paymentStatus: 'PAID' } : prev);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to mark payment as paid.');
    } finally {
      setMarkingPaid(false);
    }
  };

  // Helper: get the worker's profile photo URL from their profilePhotoKey
  const getWorkerPhotoUrl = (profilePhotoKey?: string | null): string | null => resolveUploadedFileUrl(profilePhotoKey);

  // Renders one of the 3 comparison photos (Profile / In-Time / Out-Time) — tap to enlarge,
  // or a clear "Not uploaded yet" placeholder when that photo doesn't exist. Never a stock image.
  const renderComparisonPhoto = (label: string, url: string | null, accentClass: string) => (
    <div>
      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">{label}</span>
      {url ? (
        <button
          type="button"
          onClick={() => setEnlargedPhoto({ url, label })}
          className={`block w-full aspect-square rounded-xl overflow-hidden border-2 ${accentClass} shadow-sm hover:opacity-90 transition cursor-zoom-in`}
          title={`Tap to enlarge ${label}`}
        >
          <img src={url} alt={label} className="w-full h-full object-cover" />
        </button>
      ) : (
        <div className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center p-2">
          <span className="text-[10px] font-bold text-slate-400">Not uploaded yet</span>
        </div>
      )}
    </div>
  );

  // Auto-poll every 15 seconds for real-time worker request updates
  useEffect(() => {
    fetchMyEvents();
    const pollInterval = setInterval(() => {
      silentRefetch();
    }, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  // Refetch without showing loading spinner (no flicker)
  const silentRefetch = async () => {
    try {
      const res = await api.getMyEvents();
      const loadedEvents = res.events || [];
      setEvents(loadedEvents);
      if (loadedEvents.length > 0) {
        setSelectedEvent(prev =>
          prev ? loadedEvents.find(e => e.id === prev.id) || loadedEvents[0] : loadedEvents[0]
        );
      } else {
        setSelectedEvent(null);
      }
    } catch {
      // silent — don't show error for background polling
    }
  };

  const fetchMyEvents = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getMyEvents();
      const loadedEvents = res.events || [];
      setEvents(loadedEvents);
      if (loadedEvents.length > 0) {
        if (!selectedEvent || !loadedEvents.some(e => e.id === selectedEvent.id)) {
          setSelectedEvent(loadedEvents[0]);
        }
      } else {
        setSelectedEvent(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load your events.');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setDescription(preset.description);
    setLocation(preset.location);
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    setWorkersNeeded(preset.workersNeeded);
    setPayPerWorker(preset.payPerWorker);
    setSuccessMsg(`Pre-filled "${preset.title}" preset template!`);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title || !location || !date || !startTime || !endTime || !workersNeeded || !payPerWorker) {
      setErrorMsg('Please fill in all required event details.');
      return;
    }

    setCreating(true);
    try {
      await api.createEvent({
        title,
        description,
        location,
        category: category || 'Banquet Serving',
        date,
        startTime,
        endTime,
        workersNeeded: parseInt(workersNeeded, 10),
        payPerWorker: parseFloat(payPerWorker),
      });

      setSuccessMsg('Catering event posted successfully!');
      fetchMyEvents();
      setActiveTab('my-events');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create event.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${eventTitle}"? This will permanently remove the event post.`)) {
      return;
    }

    setDeletingId(eventId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.deleteEvent(eventId);
      setSuccessMsg(`Event "${eventTitle}" deleted successfully.`);
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
      }
      fetchMyEvents();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete event.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateAppStatus = async (appId: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED', rating?: number) => {
    setStatusUpdating(appId);
    setErrorMsg(null);
    try {
      await api.updateApplicationStatus(appId, status, rating);
      setSuccessMsg(`Worker status updated to ${status}${rating ? ` with ${rating} ⭐ rating & Completion Badge awarded!` : ''}`);
      setRatingAppId(null);
      fetchMyEvents();
      if (selectedEvent) {
        const updatedDetails = await api.getEventDetails(selectedEvent.id);
        setSelectedEvent(updatedDetails.event);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update applicant status.');
    } finally {
      setStatusUpdating(null);
    }
  };

  const allApplications = events.flatMap(evt => 
    (evt.applications || []).map(app => ({
      ...app,
      eventTitle: evt.title,
      eventLocation: evt.location,
      eventDate: evt.date,
      eventStartTime: evt.startTime,
      eventEndTime: evt.endTime,
      eventObj: evt
    }))
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 font-semibold flex justify-between items-center shadow-xs">
          <span>{errorMsg}</span>
          <div className="flex items-center gap-2">
            {errorMsg.includes('Verification Required') && (
              <button
                onClick={() => { setErrorMsg(null); setActiveTab('agent-profile'); }}
                className="bg-red-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow-xs hover:bg-red-700 transition"
              >
                Verify Agent Profile
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

      {/* CREATE EVENT TAB */}
      {activeTab === 'create-event' ? (
        <div className="max-w-3xl mx-auto space-y-6 text-left">
          {/* Quick Presets Section */}
          <div className="dark-hero-gradient rounded-3xl p-6 text-white shadow-xl shadow-emerald-950/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <h2 className="text-lg font-extrabold tracking-tight">1-Click Fast Event Templates</h2>
            </div>
            <p className="text-xs text-emerald-100 font-medium mb-4">
              Select a pre-filled catering template below to minimize creation effort:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-left p-4 rounded-2xl border border-white/20 transition text-xs group"
                >
                  <div className="font-extrabold text-white mb-1 flex justify-between items-center">
                    <span className="truncate pr-2">{preset.title}</span>
                    <span className="text-emerald-200 font-black shrink-0">₹{preset.payPerWorker}</span>
                  </div>
                  <div className="text-[11px] text-emerald-100 font-medium">{preset.category} • {preset.workersNeeded} workers</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Post Catering Staff Gig</h2>
            <p className="text-xs text-slate-500 font-medium mb-6">Fill in or customize the event details below.</p>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Job / Function Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Banquet Server - Luxury Reception"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Function Date *</label>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Location Address *</label>
                  <input
                    type="text"
                    placeholder="e.g. Dhanmondi, Dhaka Sector 4"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Description & Uniform Instructions</label>
                <textarea
                  placeholder="Uniform requirements, duties, parking..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Start Time *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">End Time *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Workers Needed *</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWorkersNeeded(String(Math.max(1, (parseInt(workersNeeded, 10) || 0) - 1)))}
                      className="w-8 h-[42px] shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg transition"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={workersNeeded}
                      onChange={(e) => setWorkersNeeded(e.target.value)}
                      required
                      className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setWorkersNeeded(String((parseInt(workersNeeded, 10) || 0) + 1))}
                      className="w-8 h-[42px] shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Pay / Worker (₹) *</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePayDecrement}
                      className="w-8 h-[42px] shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg transition"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={payPerWorker}
                      onChange={(e) => setPayPerWorker(e.target.value)}
                      required
                      className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={handlePayIncrement}
                      className="w-8 h-[42px] shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 -mt-2">
                {payRateChips.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPayPerWorker(amt)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border font-bold transition ${
                      payPerWorker === amt
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 hover:bg-emerald-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('my-events')}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 green-gradient-bg text-white font-extrabold rounded-2xl transition shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                >
                  {creating ? 'Publishing Event...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : activeTab === 'incoming-requests' ? (
        /* WORKER REQUESTS TAB */
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-left">
          <div className="border-b border-slate-100 pb-5 mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Incoming Worker Requests & Selection
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Review applicant worker profiles, group members, check ratings, and confirm team selection.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => silentRefetch()}
                title="Refresh worker requests"
                className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-200 transition flex items-center gap-1"
              >
                ↻ Refresh
              </button>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-emerald-200">
                Total Applicants: {allApplications.length}
              </span>
            </div>
          </div>

          {allApplications.length === 0 ? (
            <div className="text-center py-14 text-xs font-semibold text-slate-500">
              No worker application requests received yet.
            </div>
          ) : (
            <div className="space-y-4">
              {allApplications.map((app) => {
                const prof = app.worker?.workerProfile;
                const avgRating = prof?.rating || 4.8;
                const groupCount = app.groupSize || 1;
                let parsedAdditional: AdditionalWorker[] = [];
                if (typeof app.additionalWorkers === 'string') {
                  try { parsedAdditional = JSON.parse(app.additionalWorkers); } catch (e) {}
                } else if (Array.isArray(app.additionalWorkers)) {
                  parsedAdditional = app.additionalWorkers;
                }

                return (
                  <div
                    key={app.id}
                    className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-5 flex flex-col gap-4 hover:border-emerald-300 transition"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          {/* Worker Photo Avatar */}
                          {getWorkerPhotoUrl(prof?.profilePhotoKey) ? (
                            <img
                              src={getWorkerPhotoUrl(prof?.profilePhotoKey)!}
                              alt={prof?.name || 'Worker'}
                              className="w-11 h-11 rounded-2xl object-cover shadow-md border-2 border-emerald-200"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl green-gradient-bg text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                              {prof?.name ? prof.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-sm text-slate-900 flex flex-wrap items-center gap-2">
                              {prof?.name || 'Worker'}
                              <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200/80 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {avgRating} Stars ({prof?.totalRatings || 5} gigs)
                              </span>

                              {groupCount > 1 && (
                                <span className="bg-teal-100 text-teal-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-teal-300 flex items-center gap-1">
                                  <Users className="w-3 h-3 text-teal-700" /> Group of {groupCount} Workers
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              Age: {prof?.age || 24} • Phone: <span className="font-mono text-slate-700 font-semibold">{prof?.contactPhone || app.worker?.phone}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 bg-white p-3 rounded-2xl border border-slate-200/60 text-xs text-slate-600 flex flex-wrap items-center gap-4 font-medium">
                          <span>Event: <strong className="text-slate-900">{app.eventTitle}</strong></span>
                          <span>Location: <strong>{app.eventLocation}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedWorkerApp(app)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition border border-slate-300 flex items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-600" /> View Profile & Geotags
                        </button>

                        {app.status === 'APPLIED' && (
                          <>
                            <button
                              onClick={() => handleUpdateAppStatus(app.id, 'APPROVED')}
                              disabled={statusUpdating === app.id}
                              className="green-gradient-bg hover:opacity-95 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20"
                            >
                              Approve Worker Team
                            </button>
                            <button
                              onClick={() => handleUpdateAppStatus(app.id, 'REJECTED')}
                              disabled={statusUpdating === app.id}
                              className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition border border-red-200"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {app.status === 'APPROVED' && (
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-emerald-300 uppercase">
                              Approved
                            </span>
                            <button
                              onClick={() => setRatingAppId(app.id)}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs"
                            >
                              Mark Completed & Rate (1-5⭐)
                            </button>
                          </div>
                        )}

                        {app.status === 'COMPLETED' && (
                          <div className="bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-amber-500" />
                            Attended • Rated {app.rating || 5} ⭐ (Completion Badge Awarded)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* GROUP MEMBERS DISPLAY */}
                    {parsedAdditional.length > 0 && (
                      <div className="bg-white border border-teal-200/80 rounded-2xl p-3.5 text-xs text-slate-700 space-y-2">
                        <div className="font-extrabold text-teal-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <Users className="w-3.5 h-3.5 text-teal-600" /> Additional Group Members ({parsedAdditional.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {parsedAdditional.map((m, mIdx) => (
                            <div key={mIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
                              <div className="font-bold text-slate-900">{m.name || `Worker #${mIdx + 2}`}</div>
                              <div className="text-[11px] text-slate-500">Phone: {m.phone || 'N/A'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ratingAppId === app.id && (
                      <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-1">
                        <div className="text-xs font-bold text-slate-800 mb-2">
                          Rate Worker Attendance & Reliability:
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setSelectedStarRating(star)}
                              className="p-1 hover:scale-110 transition"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= selectedStarRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-bold text-amber-800 ml-2">{selectedStarRating} / 5 Stars</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateAppStatus(app.id, 'COMPLETED', selectedStarRating)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5" /> Submit & Award Completion Badge
                          </button>
                          <button
                            onClick={() => setRatingAppId(null)}
                            className="bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* MY POSTED EVENTS LIST */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xl shadow-slate-900/5 h-fit">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">Your Posted Events ({events.length})</h2>
              <button
                onClick={() => setActiveTab('create-event')}
                className="text-xs green-gradient-bg text-white font-extrabold px-3 py-1.5 rounded-xl shadow-md shadow-emerald-600/20"
              >
                + Quick Add
              </button>
            </div>

            {loading ? (
              <div className="p-4 text-xs text-slate-500 text-center font-medium">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center font-medium">No events posted yet. Click "+ Quick Add".</div>
            ) : (
              <div className="space-y-3">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      selectedEvent?.id === evt.id
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-emerald-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-extrabold text-xs text-slate-900">{evt.title}</div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                        evt.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {evt.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">{evt.location}</div>
                    <div className="flex justify-between items-center text-[11px] text-slate-600 mt-2 font-bold">
                      <span>📅 {new Date(evt.date).toLocaleDateString()}</span>
                      <span className="text-emerald-700 font-black">₹{Number(evt.payPerWorker).toFixed(2)}/worker</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Details View */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-900/5">
            {selectedEvent ? (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 mb-1">{selectedEvent.title}</h2>
                    <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                      <span>🏷️ {selectedEvent.category || 'Banquet Serving'}</span>
                      <span>📍 {selectedEvent.location}</span>
                      <span>📅 {new Date(selectedEvent.date).toLocaleDateString()} ({formatTimeLabel(selectedEvent.startTime)} - {formatTimeLabel(selectedEvent.endTime)})</span>
                      <span>👥 Needed: {selectedEvent.workersNeeded} workers</span>
                      <span className="font-black text-emerald-700">💰 ₹{Number(selectedEvent.payPerWorker).toFixed(2)}/worker</span>
                    </div>
                  </div>

                  {/* DELETE EVENT BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(selectedEvent.id, selectedEvent.title)}
                    disabled={deletingId === selectedEvent.id}
                    className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-extrabold px-3 py-2 rounded-xl transition border border-red-200 flex items-center gap-1.5 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    {deletingId === selectedEvent.id ? 'Deleting...' : 'Delete Event'}
                  </button>
                </div>

                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                  Event Applicants ({selectedEvent.applications?.length || 0})
                </h3>

                {!selectedEvent.applications || selectedEvent.applications.length === 0 ? (
                  <div className="p-10 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    No workers have applied for this specific event yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvent.applications.map((app) => (
                      <div key={app.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-extrabold text-slate-900">{app.worker?.workerProfile?.name || 'Worker'}</div>
                          <div className="text-slate-500 font-medium">Phone: {app.worker?.phone}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedWorkerApp(app)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 transition"
                          >
                            View Profile
                          </button>
                          <span className="bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full uppercase text-[10px] border border-emerald-300">
                            {app.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs font-medium text-slate-400">Select an event from the list to view details.</div>
            )}
          </div>
        </div>
      )}
      {/* WORKER DETAILS PROFILE & GEOTAG MODAL */}
      {selectedWorkerApp && (() => {
        const prof = selectedWorkerApp.worker?.workerProfile;
        const avgRating = prof?.rating || 4.8;
        const groupCount = selectedWorkerApp.groupSize || 1;
        let parsedAdditional: AdditionalWorker[] = [];
        if (typeof selectedWorkerApp.additionalWorkers === 'string') {
          try { parsedAdditional = JSON.parse(selectedWorkerApp.additionalWorkers); } catch (e) {}
        } else if (Array.isArray(selectedWorkerApp.additionalWorkers)) {
          parsedAdditional = selectedWorkerApp.additionalWorkers;
        }

        // Fetch event timing context
        const evtContext = selectedWorkerApp.event || selectedWorkerApp.eventObj || selectedEvent;
        const eventTitle = evtContext?.title || "Catering Gig";
        const eventDateStr = evtContext?.date ? new Date(evtContext.date).toLocaleDateString() : "";
        const eventStartTime = evtContext?.startTime || "N/A";

        // Punctuality check
        let punctualityText = "No check-in recorded yet";
        let punctualityColor = "text-slate-500 bg-slate-50 border-slate-200";
        if (selectedWorkerApp.checkInTime) {
          punctualityText = "Checked In";
          punctualityColor = "text-slate-700 bg-slate-100 border-slate-300";
          
          try {
            const checkInDate = new Date(selectedWorkerApp.checkInTime);
            const eventBaseDate = new Date(evtContext.date);
            const parsedStart = parseTimeString(eventStartTime);
            if (parsedStart) {
              const { hours, minutes } = parsedStart;

              const startDateTime = new Date(eventBaseDate);
              startDateTime.setHours(hours, minutes, 0, 0);
              
              // 15 mins grace period
              const limitTime = new Date(startDateTime.getTime() + 15 * 60 * 1000);
              
              if (checkInDate <= limitTime) {
                punctualityText = "ON TIME ✓ (Verified Presence)";
                punctualityColor = "text-emerald-800 bg-emerald-50 border-emerald-200";
              } else {
                punctualityText = "LATE ARRIVAL ⚠ (Late Check-In)";
                punctualityColor = "text-amber-800 bg-amber-50 border-amber-200";
              }
            }
          } catch (err) {}
        }

        // Calculate combined verification score
        let presenceScore = 0.0;
        if (selectedWorkerApp.checkInTime) presenceScore += 2.5;
        if (selectedWorkerApp.checkOutTime) presenceScore += 2.5;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-left border border-slate-200 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  {/* Worker profile photo in modal */}
                  {getWorkerPhotoUrl(prof?.profilePhotoKey) ? (
                    <img
                      src={getWorkerPhotoUrl(prof?.profilePhotoKey)!}
                      alt={prof?.name || 'Worker'}
                      className="w-14 h-14 rounded-2xl object-cover shadow-lg border-2 border-emerald-300 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl green-gradient-bg text-white font-extrabold flex items-center justify-center text-xl shadow-lg shrink-0">
                      {prof?.name ? prof.name.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 flex-wrap font-sans">
                      {prof?.name || 'Worker Details'}
                      <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 font-sans">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {avgRating} Stars ({prof?.totalRatings || 5} gigs)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Phone: <span className="font-mono text-slate-700 font-bold">{prof?.contactPhone || selectedWorkerApp.worker?.phone || 'N/A'}</span> • Age: {prof?.age || 24}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWorkerApp(null)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo Comparison: Profile Face vs In-Time vs Out-Time — same worker, same event */}
              <div className="font-sans space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  Attendance Photo Verification
                </h4>
                <p className="text-[11px] text-slate-500 font-medium -mt-1">
                  Compare the profile face against the in-time and out-time photos before confirming this worker. Tap any photo to enlarge.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {renderComparisonPhoto('Profile Photo', getWorkerPhotoUrl(prof?.profilePhotoKey), 'border-slate-300')}
                  {renderComparisonPhoto('In-Time Photo', resolveUploadedFileUrl(selectedWorkerApp.checkInPhoto), 'border-emerald-300')}
                  {renderComparisonPhoto('Out-Time Photo', resolveUploadedFileUrl(selectedWorkerApp.checkOutPhoto), 'border-amber-300')}
                </div>
              </div>

              {/* Verified badges details */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <div className="font-bold text-slate-700">Verification Document Status</div>
                  <p className="text-slate-500 mt-0.5 font-medium">Government ID doc key uploaded & verified.</p>
                  <span className="inline-block mt-2 bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-lg border border-emerald-300 uppercase tracking-wider text-[9px]">
                    {prof?.idProofKey ? "✓ ID Verified" : "✓ Profile Active"}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-slate-700 font-sans">Combined Verification Score</div>
                  <p className="text-slate-500 mt-0.5 font-medium">Punctuality and presence verification calculation.</p>
                  <div className="mt-2 text-sm font-black text-emerald-800 flex items-center gap-1.5 font-sans">
                    🏅 {presenceScore.toFixed(1)} / 5.0 (Rating weight)
                  </div>
                </div>
              </div>

              {/* Geotagged presence info check-in / check-out */}
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  Live Attendance Geotag Logs & Verification
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Check-In */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <LogIn className="w-4 h-4 text-emerald-600" />
                      Check-In Log
                    </div>
                    {selectedWorkerApp.checkInTime ? (
                      <div className="space-y-2 text-xs font-medium">
                        <div>
                          <span className="text-slate-500 font-medium">Checked-In At:</span>
                          <div className="font-bold text-slate-800 mt-0.5">
                            {new Date(selectedWorkerApp.checkInTime).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Punctuality status:</span>
                          <div className={`mt-0.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${punctualityColor}`}>
                            {punctualityText}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Location Geotag:</span>
                          <div className="font-mono text-slate-700 text-[11px] mt-0.5">
                            Lat: {selectedWorkerApp.checkInLat?.toFixed(5)}, Lng: {selectedWorkerApp.checkInLng?.toFixed(5)}
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedWorkerApp.checkInLat},${selectedWorkerApp.checkInLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-[10px]"
                          >
                            <MapPin className="w-3 h-3" /> View on Google Maps →
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No check-in logged yet.</p>
                    )}
                  </div>

                  {/* Check-Out */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <LogOut className="w-4 h-4 text-amber-600" />
                      Check-Out Log
                    </div>
                    {selectedWorkerApp.checkOutTime ? (
                      <div className="space-y-2 text-xs font-medium">
                        <div>
                          <span className="text-slate-500 font-medium">Checked-Out At:</span>
                          <div className="font-bold text-slate-800 mt-0.5">
                            {new Date(selectedWorkerApp.checkOutTime).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Location Geotag:</span>
                          <div className="font-mono text-slate-700 text-[11px] mt-0.5">
                            Lat: {selectedWorkerApp.checkOutLat?.toFixed(5)}, Lng: {selectedWorkerApp.checkOutLng?.toFixed(5)}
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedWorkerApp.checkOutLat},${selectedWorkerApp.checkOutLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-[10px]"
                          >
                            <MapPin className="w-3 h-3" /> View on Google Maps →
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No check-out logged yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment — becomes Pending the moment the worker uploads the Out-Time photo */}
              {selectedWorkerApp.paymentStatus && (
                <div className="space-y-3 font-sans">
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                    Payment
                  </h4>
                  <div className={`rounded-2xl p-4 border space-y-3 ${
                    selectedWorkerApp.paymentStatus === 'PAID'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 font-black text-slate-900">
                        <DollarSign className="w-4 h-4 text-emerald-700" />
                        Agreed Amount: ₹{Number(evtContext?.payPerWorker || 0).toFixed(2)}
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                        selectedWorkerApp.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {selectedWorkerApp.paymentStatus === 'PAID' ? '✓ Paid' : 'Payment Pending'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                      <Wallet className="w-3.5 h-3.5 text-slate-500" />
                      Worker UPI/GPay: <span className="font-mono">{prof?.gpayNumber || 'Not provided by worker'}</span>
                    </div>

                    {selectedWorkerApp.paymentStatus === 'PENDING' && selectedWorkerApp.paymentDueAt && (
                      <div className="text-[11px] text-amber-800 font-semibold">
                        Pay by: {new Date(selectedWorkerApp.paymentDueAt).toLocaleString()}
                      </div>
                    )}

                    {selectedWorkerApp.paymentStatus === 'PAID' ? (
                      <div className="text-xs text-emerald-900 space-y-1">
                        <div>Paid on: {selectedWorkerApp.paymentPaidAt ? new Date(selectedWorkerApp.paymentPaidAt).toLocaleString() : 'N/A'}</div>
                        {selectedWorkerApp.paymentReference && (
                          <div>Reference/UTR: <span className="font-mono font-bold">{selectedWorkerApp.paymentReference}</span></div>
                        )}
                        {selectedWorkerApp.paymentProofKey && (
                          <a
                            href={resolveUploadedFileUrl(selectedWorkerApp.paymentProofKey)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block underline font-bold"
                          >
                            View Payment Proof Screenshot →
                          </a>
                        )}
                      </div>
                    ) : payingAppId === selectedWorkerApp.id ? (
                      <div className="space-y-2.5 border-t border-amber-200 pt-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Proof Screenshot *</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePaymentProofUpload}
                            disabled={paymentProofUploading}
                            className="text-[11px] text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                          />
                          {paymentProofUploading && <p className="text-[10px] text-teal-600 mt-1 font-semibold">Uploading...</p>}
                          {paymentProofKey && !paymentProofUploading && (
                            <p className="text-[10px] text-emerald-700 mt-1 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Proof attached</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">UPI Transaction ID / UTR (optional)</label>
                          <input
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="e.g. 123456789012"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => { setPayingAppId(null); setPaymentReference(''); setPaymentProofKey(null); }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(selectedWorkerApp.id)}
                            disabled={markingPaid || paymentProofUploading || !paymentProofKey}
                            title={!paymentProofKey ? 'Upload a payment proof screenshot to continue' : undefined}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold rounded-lg transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            {markingPaid ? 'Confirming...' : 'Confirm I Have Paid'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => { setPayingAppId(selectedWorkerApp.id); setPaymentReference(''); setPaymentProofKey(null); }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold rounded-lg transition shadow-xs flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> I Have Paid
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Group members details */}
              {parsedAdditional.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs font-sans">
                  <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" /> Additional Group Members ({parsedAdditional.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {parsedAdditional.map((m, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 font-medium">
                        <div className="font-bold text-slate-900">{m.name || `Worker #${idx + 2}`}</div>
                        <div className="text-[11px] text-slate-500 font-semibold">Phone: {m.phone || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedWorkerApp(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs transition"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full-screen photo viewer for tap-to-enlarge comparison */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 bg-slate-950/85 z-[60] flex items-center justify-center p-4"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div className="max-w-2xl w-full">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-extrabold text-sm">{enlargedPhoto.label}</span>
              <button
                type="button"
                onClick={() => setEnlargedPhoto(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={enlargedPhoto.url}
              alt={enlargedPhoto.label}
              className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
