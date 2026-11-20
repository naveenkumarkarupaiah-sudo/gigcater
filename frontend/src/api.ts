const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export interface User {
  id: string;
  phone: string;
  role: 'AGENT' | 'WORKER' | 'ADMIN';
  hasProfile?: boolean;
  workerProfile?: WorkerProfile | null;
  agentProfile?: AgentProfile | null;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  contactPhone: string;
  profilePhotoKey?: string | null;
  idProofKey?: string | null;
  gpayNumber?: string | null;
  rating?: number;
  totalRatings?: number;
}

export interface AgentProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  photos?: string | null;
  whatsappNumber: string;
  originalProofDoc?: string | null;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'BLOCKED';
}

export interface EventItem {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  location: string;
  category?: string;
  date: string;
  startTime: string;
  endTime: string;
  workersNeeded: number;
  payPerWorker: number;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  agent?: { id: string; phone: string };
  applications?: ApplicationItem[];
  _count?: { applications: number };
}

export interface AdditionalWorker {
  name: string;
  phone: string;
  photoUrl?: string | null;
}

export interface ApplicationItem {
  id: string;
  eventId: string;
  workerId: string;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'PAID';
  groupSize?: number;
  additionalWorkers?: AdditionalWorker[] | string | null;
  rating?: number | null;
  attendanceConfirmed?: boolean;
  checkInPhoto?: string | null;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkInTime?: string | null;
  checkOutPhoto?: string | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  checkOutTime?: string | null;
  paymentStatus?: 'PENDING' | 'PAID' | null;
  paymentDueAt?: string | null;
  paymentPaidAt?: string | null;
  paymentReference?: string | null;
  paymentProofKey?: string | null;
  createdAt: string;
  event?: EventItem;
  worker?: { id: string; phone: string; workerProfile?: WorkerProfile };
}

export interface ComplaintItem {
  id: string;
  applicationId: string;
  workerId: string;
  agentId: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED_GENUINE' | 'RESOLVED_INVALID';
  adminNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  agentContactDetails?: AgentContactDetails | null;
}

export interface AdminComplaintItem {
  id: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED_GENUINE' | 'RESOLVED_INVALID';
  adminNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  worker: { id: string; phone?: string; name: string; profilePhotoKey?: string | null; gpayNumber?: string | null; hasIdProof: boolean };
  agent: { id: string; phone?: string; name: string; whatsappNumber?: string | null; hasIdProof: boolean };
  event: { id: string; title: string; location: string; date: string; startTime: string; endTime: string; payPerWorker: number } | null;
  application: { id: string; checkInPhoto?: string | null; checkInTime?: string | null; checkInLat?: number | null; checkInLng?: number | null; checkOutPhoto?: string | null; checkOutTime?: string | null; checkOutLat?: number | null; checkOutLng?: number | null; paymentStatus?: 'PENDING' | 'PAID' | null; paymentDueAt?: string | null; paymentPaidAt?: string | null; paymentReference?: string | null; paymentProofKey?: string | null } | null;
}

export interface AgentContactDetails {
  name: string;
  phone: string;
  whatsappNumber: string;
  eventTitle: string;
  payPerWorker: number;
}

export const getAuthToken = () => localStorage.getItem('gigcater_token');
export const setAuthToken = (token: string) => localStorage.setItem('gigcater_token', token);
export const removeAuthToken = () => localStorage.removeItem('gigcater_token');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An unexpected error occurred.');
  }

  return data as T;
}

export const api = {
  // Auth
  sendOtp: (phone: string) => request<{ message: string; testCode: string }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  }),
  verifyOtp: (phone: string, code: string, role: 'AGENT' | 'WORKER' | 'ADMIN') =>
    request<{ token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code, role }),
    }),
  loginWithGoogle: (idToken: string, requestedRole: 'AGENT' | 'WORKER') =>
    request<{ token: string; user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, requestedRole }),
    }),
  getMe: () => request<{ user: User }>('/auth/me'),

  // Worker Profile
  getProfile: () => request<{ profile: WorkerProfile }>('/profile'),
  saveProfile: (profileData: {
    name: string;
    age: number;
    contactPhone: string;
    profilePhotoKey?: string | null;
    idProofKey?: string | null;
    gpayNumber?: string | null;
  }) =>
    request<{ message: string; profile: WorkerProfile }>('/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    }),

  // Agent Profile
  getAgentProfile: () => request<{ profile: AgentProfile }>('/profile/agent'),
  saveAgentProfile: (profileData: {
    name: string;
    phone: string;
    photos?: string | null;
    whatsappNumber: string;
    originalProofDoc?: string | null;
  }) =>
    request<{ message: string; profile: AgentProfile }>('/profile/agent', {
      method: 'POST',
      body: JSON.stringify(profileData),
    }),

  // Events
  getOpenEvents: (params?: { location?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.location) query.append('location', params.location);
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{ events: EventItem[] }>(`/events${queryString}`);
  },
  getMyEvents: () => request<{ events: EventItem[] }>('/events/my-events'),
  getEventDetails: (id: string) => request<{ event: EventItem }>(`/events/${id}`),
  createEvent: (eventData: Omit<EventItem, 'id' | 'agentId' | 'status' | 'createdAt'>) =>
    request<{ message: string; event: EventItem }>('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    }),
  deleteEvent: (id: string) => request<{ message: string }>(`/events/${id}`, { method: 'DELETE' }),
  updateEventStatus: (id: string, status: 'OPEN' | 'COMPLETED' | 'CANCELLED') =>
    request<{ message: string; event: EventItem }>(`/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Applications
  applyForEvent: (eventId: string, groupSize: number = 1, additionalWorkers: AdditionalWorker[] = []) =>
    request<{ message: string; application: ApplicationItem }>('/applications/apply', {
      method: 'POST',
      body: JSON.stringify({ eventId, groupSize, additionalWorkers }),
    }),
  getMyApplications: () => request<{ applications: ApplicationItem[] }>('/applications/my-applications'),
  updateApplicationStatus: (id: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'APPLIED', rating?: number) =>
    request<{ message: string; application: ApplicationItem }>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rating }),
    }),
  cancelApplication: (id: string) => request<{ message: string }>(`/applications/${id}`, { method: 'DELETE' }),
  confirmPayment: (id: string) =>
    request<{ message: string; application: ApplicationItem }>(`/applications/${id}/payment-confirm`, { method: 'PATCH' }),
  markPaid: (id: string, paymentProofKey: string, paymentReference?: string) =>
    request<{ message: string; application: ApplicationItem }>(`/applications/${id}/mark-paid`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentReference, paymentProofKey }),
    }),

  // Complaints
  fileComplaint: (applicationId: string, reason: string) =>
    request<{ message: string; complaint: ComplaintItem }>('/complaints', {
      method: 'POST',
      body: JSON.stringify({ applicationId, reason }),
    }),
  getMyComplaints: () => request<{ complaints: ComplaintItem[] }>('/complaints/my-complaints'),

  // Admin
  getAdminComplaints: () => request<{ complaints: AdminComplaintItem[] }>('/admin/complaints'),
  resolveComplaint: (id: string, status: 'RESOLVED_GENUINE' | 'RESOLVED_INVALID', adminNotes?: string) =>
    request<{ message: string; complaint: AdminComplaintItem }>(`/admin/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNotes }),
    }),

  checkIn: (id: string, checkInPhoto: string, latitude: number, longitude: number) =>
    request<{ message: string; application: ApplicationItem }>(`/applications/${id}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ checkInPhoto, latitude, longitude }),
    }),

  checkOut: (id: string, checkOutPhoto: string, latitude: number, longitude: number) =>
    request<{ message: string; application: ApplicationItem }>(`/applications/${id}/check-out`, {
      method: 'POST',
      body: JSON.stringify({ checkOutPhoto, latitude, longitude }),
    }),
  // S3 Presigned Upload
  getPresignedUrl: (fileType: 'profilePhoto' | 'idProof' | 'checkInPhoto' | 'checkOutPhoto' | 'paymentProof', fileName: string) =>
    request<{ uploadUrl: string; objectKey: string; fileUrl: string; isMock?: boolean }>('/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ fileType, fileName }),
    }),
  uploadToPresignedUrl: async (uploadUrl: string, file: File) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) throw new Error('Failed to upload file.');
    return true;
  },

  // ID Proof
  getIdProofBlobUrl: async (role: 'worker' | 'agent', userId: string): Promise<string> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/profile/id-proof/${role}/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to load ID proof document.');
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
