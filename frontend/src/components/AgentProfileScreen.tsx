import React, { useState, useEffect } from 'react';
import { api, AgentProfile } from '../api';
import { getFirebaseDatabaseStatus } from '../firebase';
import {
  User,
  Phone,
  MessageSquare,
  FileCheck,
  ShieldCheck,
  CheckCircle,
  UploadCloud,
  AlertTriangle,
  Camera,
  Database,
  Lock,
  Sparkles
} from 'lucide-react';

interface AgentProfileScreenProps {
  onProfileUpdated?: (profile: AgentProfile) => void;
}

export const AgentProfileScreen: React.FC<AgentProfileScreenProps> = ({ onProfileUpdated }) => {
  // STRICT 5 AGENT PROFILE FIELDS
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photos, setPhotos] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [originalProofDoc, setOriginalProofDoc] = useState<string | null>(null);

  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'PENDING' | 'BLOCKED'>('VERIFIED');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [proofUploading, setProofUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const dbStatus = getFirebaseDatabaseStatus();

  useEffect(() => {
    loadAgentProfile();
  }, []);

  const loadAgentProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getAgentProfile();
      if (res.profile) {
        setName(res.profile.name || '');
        setPhone(res.profile.phone || '');
        setPhotos(res.profile.photos || null);
        setWhatsappNumber(res.profile.whatsappNumber || '');
        setOriginalProofDoc(res.profile.originalProofDoc || null);
        setVerificationStatus(res.profile.verificationStatus || 'VERIFIED');
      }
    } catch (err: any) {
      // New profile setup
    } finally {
      setLoading(false);
    }
  };

  // Upload Agent Photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setError(null);

    try {
      const presigned = await api.getPresignedUrl('profilePhoto', file.name);
      await api.uploadToPresignedUrl(presigned.uploadUrl, file);
      setPhotos(presigned.fileUrl || presigned.objectKey);
      setSuccessMsg('Agent photo uploaded successfully.');
    } catch (err: any) {
      setError(`Failed to upload photo: ${err.message}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Upload Original Proof Document (Visa / National ID Proof)
  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofUploading(true);
    setError(null);

    try {
      const presigned = await api.getPresignedUrl('idProof', file.name);
      await api.uploadToPresignedUrl(presigned.uploadUrl, file);
      setOriginalProofDoc(presigned.objectKey);
      setSuccessMsg('Original identity/visa proof document uploaded successfully.');
    } catch (err: any) {
      setError(`Failed to upload proof document: ${err.message}`);
    } finally {
      setProofUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name || !phone || !whatsappNumber) {
      setError('Please fill in Name, Phone Number, and WhatsApp Number.');
      return;
    }

    if (!photos) {
      setError('Please upload and confirm your Profile/Face Photo before saving — agents must be identifiable to workers.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveAgentProfile({
        name,
        phone,
        photos,
        whatsappNumber,
        originalProofDoc,
      });
      setSuccessMsg('Agent Profile saved and verified successfully!');
      setVerificationStatus(res.profile.verificationStatus);
      if (onProfileUpdated) onProfileUpdated(res.profile);
    } catch (err: any) {
      setError(err.message || 'Failed to save agent profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs font-semibold text-slate-500">Loading agent profile details...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Firebase Database Connection Status Bar */}
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Database: {dbStatus.projectId}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Project Name: <span className="text-slate-200 font-bold">{dbStatus.projectName}</span> • Project Number: <span className="text-slate-200 font-bold">{dbStatus.projectNumber}</span>
            </p>
          </div>
        </div>

        <div className="text-[10px] bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 font-mono text-slate-300">
          Environment: {dbStatus.environment}
        </div>
      </div>

      {/* Hero Header */}
      <div className="dark-hero-gradient rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-emerald-100 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Verified Agent Identity
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">
              {name ? name : 'Agent Profile Setup'}
            </h1>
            <p className="text-xs text-emerald-100 mt-1 font-medium leading-relaxed">
              Your profile contains your verified name, contact details, photos, WhatsApp number, and original proof document.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[160px] text-center shrink-0">
            <div className="text-[10px] uppercase font-bold text-emerald-200">Agent Status</div>
            <div className="inline-flex items-center gap-1 text-sm font-black text-white mt-1 uppercase tracking-wider">
              {verificationStatus === 'VERIFIED' ? (
                <span className="bg-emerald-400/30 text-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-300" /> Verified Agent
                </span>
              ) : (
                <span className="bg-amber-400/30 text-amber-100 border border-amber-300 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Setup Required
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Form: ONLY 5 FIELDS */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5">
        <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" /> Agent Profile Information
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Only 5 essential identity items are required for Agent verification.
            </p>
          </div>
          <span className="bg-emerald-50 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-200">
            5 Fields Standard
          </span>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 font-semibold">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl p-4 font-semibold flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* FIELD 1: AGENT NAME */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. Agent Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter your full official name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* FIELD 2 & 4: PHONE NUMBER & WHATSAPP NUMBER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FIELD 2: PHONE NUMBER */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                2. Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* FIELD 4: WHATSAPP NUMBER */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                4. WhatsApp Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* FIELD 3: PHOTOS */}
          <div className="border-t border-slate-100 pt-5">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              3. Agent Photo / Profile Picture *
            </label>
            <p className="text-[11px] text-slate-500 font-medium mb-2 -mt-1">
              Required — workers see this photo when deciding whether to trust and apply to your gigs. You can replace it any time.
            </p>

            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="w-20 h-20 rounded-2xl green-gradient-bg text-white flex items-center justify-center text-xl font-extrabold overflow-hidden shrink-0 shadow-md border-2 border-emerald-300">
                {photos ? (
                  <img src={photos} alt="Agent Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-7 h-7 text-white/80" />
                )}
              </div>

              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-800 mb-1">{photos ? 'Replace Photo' : 'Upload Photo'}</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={photoUploading}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />
                {photoUploading && <p className="text-[11px] text-teal-600 mt-1 font-semibold">Uploading photo...</p>}
                {!photoUploading && photos && (
                  <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 mt-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Photo uploaded & confirmed
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FIELD 5: ORIGINAL PROOF (VISA / IDENTITY PROOF) */}
          <div className="border-t border-slate-100 pt-5">
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 hover:border-amber-300 transition">
              <div className="flex items-center gap-2 mb-1.5">
                <FileCheck className="w-5 h-5 text-amber-600 shrink-0" />
                <label className="text-xs font-extrabold text-amber-950">
                  5. Original Verification Proof (Must Be Original Visa / ID Document) *
                </label>
              </div>

              <p className="text-[11px] text-amber-800 font-medium mb-3 leading-relaxed">
                Please upload an <strong>original</strong> copy of your Visa, National Passport, or official Identity proof document. Scans/copies must be authentic and original.
              </p>

              {originalProofDoc && (
                <div className="text-[11px] text-emerald-900 font-mono bg-emerald-100/80 p-2.5 rounded-xl border border-emerald-300 mb-3 truncate font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Original Document Attached: {originalProofDoc}</span>
                </div>
              )}

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleProofUpload}
                disabled={proofUploading}
                className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer shadow-xs"
              />
              {proofUploading && <p className="text-[11px] text-amber-700 mt-1 font-semibold">Uploading original proof document...</p>}
            </div>
          </div>

          <div className="pt-3 flex flex-col items-end gap-2">
            <button
              type="submit"
              disabled={saving || photoUploading || !photos}
              title={!photos ? 'Upload your Profile/Face Photo to continue' : undefined}
              className="green-gradient-bg hover:opacity-95 text-white font-extrabold text-xs px-7 py-4 rounded-2xl transition shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? 'Saving Agent Profile...' : 'Save & Confirm Agent Profile'}
              <Sparkles className="w-4 h-4" />
            </button>
            {!photos && (
              <p className="text-[11px] text-slate-500 font-semibold">Upload your Profile/Face Photo above to enable saving.</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
