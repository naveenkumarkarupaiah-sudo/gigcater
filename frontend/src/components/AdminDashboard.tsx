import React, { useEffect, useState } from 'react';
import { api, AdminComplaintItem } from '../api';
import { resolveUploadedFileUrl } from '../mediaUrl';
import { formatTimeLabel } from '../timeUtils';
import {
  ShieldAlert,
  User,
  Phone,
  Calendar,
  MapPin,
  DollarSign,
  Wallet,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  X,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<AdminComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const [idProofLoading, setIdProofLoading] = useState<string | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getAdminComplaints();
      setComplaints(res.complaints || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  const selected = complaints.find(c => c.id === selectedId) || null;

  const openComplaint = (c: AdminComplaintItem) => {
    setSelectedId(c.id);
    setAdminNotes(c.adminNotes || '');
  };

  const handleViewIdProof = async (role: 'worker' | 'agent', userId: string) => {
    setIdProofLoading(`${role}_${userId}`);
    setErrorMsg(null);
    try {
      const blobUrl = await api.getIdProofBlobUrl(role, userId);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load ID proof document.');
    } finally {
      setIdProofLoading(null);
    }
  };

  const handleResolve = async (status: 'RESOLVED_GENUINE' | 'RESOLVED_INVALID') => {
    if (!selected) return;
    setResolving(true);
    setErrorMsg(null);
    try {
      await api.resolveComplaint(selected.id, status, adminNotes);
      setSuccessMsg(`Complaint marked as ${status === 'RESOLVED_GENUINE' ? 'Genuine' : 'Invalid'}.`);
      setSelectedId(null);
      fetchComplaints();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update complaint.');
    } finally {
      setResolving(false);
    }
  };

  const renderPhoto = (label: string, url: string | null, accentClass: string) => (
    <div>
      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">{label}</span>
      {url ? (
        <button
          type="button"
          onClick={() => setEnlargedPhoto({ url, label })}
          className={`block w-full aspect-square rounded-xl overflow-hidden border-2 ${accentClass} shadow-sm hover:opacity-90 transition cursor-zoom-in`}
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

  const statusBadge = (status: AdminComplaintItem['status']) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
      RESOLVED_GENUINE: 'bg-red-100 text-red-800 border-red-300',
      RESOLVED_INVALID: 'bg-slate-100 text-slate-700 border-slate-300',
    };
    const label: Record<string, string> = {
      PENDING: 'Pending Review',
      RESOLVED_GENUINE: 'Genuine — Agent At Fault',
      RESOLVED_INVALID: 'Invalid Complaint',
    };
    return (
      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${map[status]}`}>
        {label[status]}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="dark-hero-gradient rounded-3xl p-6 text-white shadow-xl shadow-emerald-950/10">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-red-300" />
          <h2 className="text-lg font-extrabold tracking-tight">Payment Complaint Review</h2>
        </div>
        <p className="text-xs text-emerald-100 font-medium">
          Investigate late-payment complaints — review the worker, agent, event, payment details, and work photos before deciding.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 font-semibold flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold ml-2 hover:text-red-900">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl p-4 font-semibold flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold ml-2 hover:text-emerald-950">✕</button>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-900/5">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-900">All Complaints ({complaints.length})</h3>
          <button
            onClick={fetchComplaints}
            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-200 transition"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs font-semibold text-slate-500">Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="p-10 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No payment complaints have been filed yet.
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openComplaint(c)}
                className="w-full text-left bg-slate-50/70 hover:border-emerald-300 border border-slate-200/80 rounded-2xl p-4 transition flex flex-col sm:flex-row justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900">{c.worker.name}</span>
                    <span className="text-[11px] text-slate-500">vs</span>
                    <span className="font-bold text-sm text-slate-700">{c.agent.name}</span>
                    {statusBadge(c.status)}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">{c.event?.title || 'Event'} • ₹{Number(c.event?.payPerWorker || 0).toFixed(2)}/worker</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">"{c.reason}"</p>
                </div>
                <div className="text-[11px] text-slate-400 font-semibold shrink-0">
                  Filed {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* COMPLAINT DETAIL MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-left border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Complaint Investigation</h3>
                <div className="mt-1">{statusBadge(selected.status)}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-700">
              <span className="font-extrabold text-slate-900 block mb-1">Worker's Reason:</span>
              "{selected.reason}"
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="font-extrabold text-slate-800 flex items-center gap-1.5"><User className="w-4 h-4 text-emerald-600" /> Worker</div>
                <div className="flex items-center gap-1.5 text-slate-600"><Phone className="w-3.5 h-3.5" /> {selected.worker.phone || 'N/A'}</div>
                <div className="flex items-center gap-1.5 text-slate-600"><Wallet className="w-3.5 h-3.5" /> UPI: {selected.worker.gpayNumber || 'Not provided'}</div>
                <button
                  type="button"
                  onClick={() => handleViewIdProof('worker', selected.worker.id)}
                  disabled={!selected.worker.hasIdProof || idProofLoading === `worker_${selected.worker.id}`}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {idProofLoading === `worker_${selected.worker.id}` ? 'Loading…' : selected.worker.hasIdProof ? 'View Worker ID Proof' : 'No ID Proof Uploaded'}
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="font-extrabold text-slate-800 flex items-center gap-1.5"><User className="w-4 h-4 text-teal-600" /> Agent</div>
                <div className="flex items-center gap-1.5 text-slate-600"><Phone className="w-3.5 h-3.5" /> {selected.agent.phone || 'N/A'}</div>
                <div className="flex items-center gap-1.5 text-slate-600">WhatsApp: {selected.agent.whatsappNumber || 'N/A'}</div>
                <button
                  type="button"
                  onClick={() => handleViewIdProof('agent', selected.agent.id)}
                  disabled={!selected.agent.hasIdProof || idProofLoading === `agent_${selected.agent.id}`}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg border border-teal-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {idProofLoading === `agent_${selected.agent.id}` ? 'Loading…' : selected.agent.hasIdProof ? 'View Agent ID Proof' : 'No ID Proof Uploaded'}
                </button>
              </div>
            </div>

            {/* Event & Payment */}
            {selected.event && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-1.5">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-emerald-600" /> {selected.event.title}</div>
                <div className="flex items-center gap-1.5 text-slate-600"><MapPin className="w-3.5 h-3.5" /> {selected.event.location}</div>
                <div className="text-slate-600">{new Date(selected.event.date).toLocaleDateString()} • {formatTimeLabel(selected.event.startTime)} – {formatTimeLabel(selected.event.endTime)}</div>
                <div className="flex items-center gap-1.5 font-black text-emerald-800"><DollarSign className="w-3.5 h-3.5" /> ₹{Number(selected.event.payPerWorker).toFixed(2)} agreed amount</div>
                {selected.application && (
                  <div className="pt-2 mt-2 border-t border-emerald-200/60 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Payment Status: <strong>{selected.application.paymentStatus || 'Not yet due'}</strong>
                    </div>
                    {selected.application.paymentDueAt && (
                      <div className="text-slate-600">Due by: {new Date(selected.application.paymentDueAt).toLocaleString()}</div>
                    )}
                    {selected.application.paymentReference && (
                      <div className="text-slate-600">Reference/UTR: <span className="font-mono">{selected.application.paymentReference}</span></div>
                    )}
                    {selected.application.paymentProofKey && (
                      <a
                        href={resolveUploadedFileUrl(selected.application.paymentProofKey)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-emerald-700 underline font-bold"
                      >
                        View Payment Proof Screenshot →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Work Photos */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Work Photo Evidence</h4>
              <div className="grid grid-cols-3 gap-3">
                {renderPhoto('Profile Photo', resolveUploadedFileUrl(selected.worker.profilePhotoKey), 'border-slate-300')}
                {renderPhoto('In-Time Photo', resolveUploadedFileUrl(selected.application?.checkInPhoto), 'border-emerald-300')}
                {renderPhoto('Out-Time Photo', resolveUploadedFileUrl(selected.application?.checkOutPhoto), 'border-amber-300')}
              </div>
            </div>

            {/* Admin Decision */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-700">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Confirmed with agent by phone — payment was genuinely missed. Contact details released to worker."
                className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 font-medium"
              />
              <div className="flex flex-wrap gap-2 justify-end pt-1">
                <button
                  onClick={() => handleResolve('RESOLVED_INVALID')}
                  disabled={resolving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Mark Invalid
                </button>
                <button
                  onClick={() => handleResolve('RESOLVED_GENUINE')}
                  disabled={resolving}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Mark Genuine & Release Agent Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen photo viewer */}
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
