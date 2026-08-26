import React, { useState, useEffect } from 'react';
import { api, WorkerProfile } from '../api';
import { UserCheck, ShieldCheck, UploadCloud, CheckCircle, FileText, Camera, Award, Sparkles, Phone, User, Calendar } from 'lucide-react';

interface WorkerProfileScreenProps {
  onProfileUpdated?: (profile: WorkerProfile) => void;
}

export const WorkerProfileScreen: React.FC<WorkerProfileScreenProps> = ({ onProfileUpdated }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [profilePhotoKey, setProfilePhotoKey] = useState<string | null>(null);
  const [idProofKey, setIdProofKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [idUploading, setIdUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getProfile();
      if (res.profile) {
        setName(res.profile.name || '');
        setAge(res.profile.age ? String(res.profile.age) : '');
        setContactPhone(res.profile.contactPhone || '');
        setProfilePhotoKey(res.profile.profilePhotoKey || null);
        setIdProofKey(res.profile.idProofKey || null);
      }
    } catch (err: any) {
      // Profile does not exist yet for new worker
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = () => {
    let score = 0;
    if (name) score += 25;
    if (age) score += 25;
    if (contactPhone) score += 25;
    if (profilePhotoKey || idProofKey) score += 25;
    return score;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'profilePhoto' | 'idProof'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileType === 'profilePhoto') setPhotoUploading(true);
    else setIdUploading(true);
    setError(null);

    try {
      const presigned = await api.getPresignedUrl(fileType, file.name);
      await api.uploadToPresignedUrl(presigned.uploadUrl, file);

      if (fileType === 'profilePhoto') {
        setProfilePhotoKey(presigned.objectKey);
      } else {
        setIdProofKey(presigned.objectKey);
      }
      setSuccessMsg(`${fileType === 'profilePhoto' ? 'Profile Photo' : 'ID Proof'} uploaded successfully.`);
    } catch (err: any) {
      setError(`Failed to upload ${fileType}: ${err.message}`);
    } finally {
      if (fileType === 'profilePhoto') setPhotoUploading(false);
      else setIdUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name || !age || !contactPhone) {
      setError('Please fill in Name, Age, and Contact Phone.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveProfile({
        name,
        age: parseInt(age, 10),
        contactPhone,
        profilePhotoKey,
        idProofKey,
      });
      setSuccessMsg('Worker Profile saved successfully.');
      if (onProfileUpdated) onProfileUpdated(res.profile);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs font-semibold text-slate-500">Loading worker profile details...</div>;
  }

  const completionScore = calculateCompletion();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Profile Completion Widget */}
      <div className="dark-hero-gradient rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-emerald-100 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
              <Award className="w-3 h-3 text-emerald-300" /> Verification Status
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">
              {name ? `${name}'s Profile` : 'Complete Worker Profile'}
            </h1>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              Verified worker profiles receive 3x priority selection by Catering Event Agents.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[160px] text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-200">Completion Level</div>
            <div className="text-2xl font-black text-white mt-0.5">{completionScore}%</div>
            <div className="w-full bg-white/20 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-emerald-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionScore}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" /> Personal & Verification Info
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Your details are shared with catering agents when you apply for events.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 font-semibold">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl p-4 font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Age *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  placeholder="e.g. 24"
                  min="18"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Phone Number *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                placeholder="e.g. +1 555-0199"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>

          {/* S3 File Upload Cards */}
          <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 hover:border-emerald-200 transition">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <label className="text-xs font-bold text-slate-800">
                  Profile Photo Upload
                </label>
              </div>
              {profilePhotoKey && (
                <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50 p-2 rounded-xl border border-emerald-200 mb-2.5 truncate font-semibold">
                  Uploaded: {profilePhotoKey}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'profilePhoto')}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                disabled={photoUploading}
              />
              {photoUploading && <p className="text-[11px] text-teal-600 mt-1 font-semibold">Uploading photo to S3 storage...</p>}
            </div>

            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 hover:border-emerald-200 transition">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <label className="text-xs font-bold text-slate-800">
                  ID / Verification Doc
                </label>
              </div>
              {idProofKey && (
                <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50 p-2 rounded-xl border border-emerald-200 mb-2.5 truncate font-semibold">
                  Uploaded: {idProofKey}
                </div>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'idProof')}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-100 file:text-teal-800 hover:file:bg-teal-200 cursor-pointer"
                disabled={idUploading}
              />
              {idUploading && <p className="text-[11px] text-teal-600 mt-1 font-semibold">Uploading document to S3 storage...</p>}
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="green-gradient-bg hover:opacity-95 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl transition shadow-lg shadow-emerald-600/25 disabled:opacity-50"
            >
              {saving ? 'Saving Profile...' : 'Save & Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

