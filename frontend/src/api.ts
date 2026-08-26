const API_BASE = '/api';

export interface User {
  id: string;
  phone: string;
  role: 'AGENT' | 'WORKER';
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
  rating?: number;
  totalRatings?: number;
}

export interface AgentProfile {
  id: string;
  userId: string;
  agencyName: string;
  businessLicense: string;
  contactEmail: string;
  officeAddress: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'BLOCKED';
  licenseDocKey?: string | null;
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

export interface ApplicationItem {
  id: string;
  eventId: string;
  workerId: string;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rating?: number | null;
  attendanceConfirmed?: boolean;
  createdAt: string;
  event?: EventItem;
  worker?: {
    id: string;
    phone: string;
    workerProfile?: WorkerProfile;
  };
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
  verifyOtp: (phone: string, code: string, role: 'AGENT' | 'WORKER') =>
    request<{ token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code, role }),
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
  }) => request<{ message: string; profile: WorkerProfile }>('/profile', {
    method: 'POST',
    body: JSON.stringify(profileData),
  }),

  // Agent Profile (Verification & Anti-Fake Agent Protection)
  getAgentProfile: () => request<{ profile: AgentProfile }>('/profile/agent'),
  saveAgentProfile: (profileData: {
    agencyName: string;
    businessLicense: string;
    contactEmail: string;
    officeAddress: string;
    licenseDocKey?: string | null;
  }) => request<{ message: string; profile: AgentProfile }>('/profile/agent', {
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
  updateEventStatus: (id: string, status: 'OPEN' | 'COMPLETED' | 'CANCELLED') =>
    request<{ message: string; event: EventItem }>(`/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Applications
  applyForEvent: (eventId: string) =>
    request<{ message: string; application: ApplicationItem }>('/applications/apply', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    }),
  getMyApplications: () => request<{ applications: ApplicationItem[] }>('/applications/my-applications'),
  updateApplicationStatus: (
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'APPLIED',
    rating?: number
  ) =>
    request<{ message: string; application: ApplicationItem }>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rating }),
    }),

  // S3 Presigned URL Upload
  getPresignedUrl: (fileType: 'profilePhoto' | 'idProof', fileName: string) =>
    request<{ uploadUrl: string; objectKey: string; fileUrl: string; isMock?: boolean }>('/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ fileType, fileName }),
    }),
  uploadToPresignedUrl: async (uploadUrl: string, file: File) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });
    if (!res.ok) throw new Error('Failed to upload file.');
    return true;
  },
};
