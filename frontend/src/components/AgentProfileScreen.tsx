import React, { useState, useEffect } from 'react';
import { api, AgentProfile } from '../api';
import { Building, ShieldCheck, CheckCircle, FileText, Mail, MapPin, Award, UploadCloud, AlertTriangle } from 'lucide-react';

interface AgentProfileScreenProps {
  onProfileUpdated?: (profile: AgentProfile) => void;
}

export const AgentProfileScreen: React.FC<AgentProfileScreenProps> = ({ onProfileUpdated }) => {
  const [agencyName, setAgencyName] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [licenseDocKey, setLicenseDocKey] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'PENDING' | 'BLOCKED'>('PENDING');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docUploading, setDocUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAgentProfile();
  }, []);

  const loadAgentProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getAgentProfile();
      if (res.profile) {
        setAgencyName(res.profile.agencyName || '');
        setBusinessLicense(res.profile.businessLicense || '');
        setContactEmail(res.profile.contactEmail || '');
        setOfficeAddress(res.profile.officeAddress || '');
        setLicenseDocKey(res.profile.licenseDocKey || null);
        setVerificationStatus(res.profile.verificationStatus || 'VERIFIED');
      }
    } catch (err: any) {
      // Profile does not exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocUploading(true);
    setError(null);

    try {
      const presigned = await api.getPresignedUrl('idProof', file.name);
      await api.uploadToPresignedUrl(presigned.uploadUrl, file);
      setLicenseDocKey(presigned.objectKey);
      setSuccessMsg('Business Trade License / Registration document uploaded successfully.');
    } catch (err: any) {
      setError(`Failed to upload license document: ${err.message}`);
    } finally {
      setDocUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!agencyName || !businessLicense || !contactEmail || !officeAddress) {
      setError('Please fill in Agency Name, Business License Number, Contact Email, and Office Address.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveAgentProfile({
        agencyName,
        businessLicense,
        contactEmail,
        officeAddress,
        licenseDocKey,
      });
      setSuccessMsg('Catering Agency Profile verified & saved successfully! You can now publish catering events.');
      setVerificationStatus(res.profile.verificationStatus);
      if (onProfileUpdated) onProfileUpdated(res.profile);
    } catch (err: any) {
      setError(err.message || 'Failed to save agency profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs font-semibold text-slate-500">Loading agency profile details...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Verification Badge Hero Header */}
      <div className="dark-hero-gradient rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-emerald-100 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Anti-Fake Agent Protection
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">
              {agencyName ? agencyName : 'Catering Agency Verification'}
            </h1>
            <p className="text-xs text-emerald-100 mt-1 font-medium leading-relaxed">
              Register your business license to verify your agency identity and protect gig workers from fraudulent job posts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[160px] text-center shrink-0">
            <div className="text-[10px] uppercase font-bold text-emerald-200">Agency Status</div>
            <div className="inline-flex items-center gap-1 text-sm font-black text-white mt-1 uppercase tracking-wider">
              {verificationStatus === 'VERIFIED' ? (
                <span className="bg-emerald-400/30 text-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-300" /> Verified Agency
                </span>
              ) : (
                <span className="bg-amber-400/30 text-amber-100 border border-amber-300 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Profile Required
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" /> Business License & Verification Info
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Verified agency information is displayed on your catering event listings.
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Agency / Company Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Royal Gourmet Catering Ltd."
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Trade / Business License No. *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. LIC-984210-BD or REG-55241"
                  value={businessLicense}
                  onChange={(e) => setBusinessLicense(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Business Email *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="e.g. contact@royalgourmet.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Office / HQ Address *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. House 42, Road 11, Banani, Dhaka"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Trade License Document Upload */}
          <div className="border-t border-slate-100 pt-5">
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 hover:border-emerald-200 transition">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <label className="text-xs font-bold text-slate-800">
                  Trade License / Business Document (Optional PDF / Image Upload)
                </label>
              </div>
              {licenseDocKey && (
                <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50 p-2 rounded-xl border border-emerald-200 mb-2.5 truncate font-semibold">
                  Uploaded Key: {licenseDocKey}
                </div>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                disabled={docUploading}
              />
              {docUploading && <p className="text-[11px] text-teal-600 mt-1 font-semibold">Uploading document to S3 storage...</p>}
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="green-gradient-bg hover:opacity-95 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl transition shadow-lg shadow-emerald-600/25 disabled:opacity-50"
            >
              {saving ? 'Verifying Agency Profile...' : 'Save & Verify Agency Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
