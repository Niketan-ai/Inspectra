import {
  ComplianceRule,
  DashboardMetrics,
  ScanSession,
  UserProfile
} from '../types.js';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('inspectra_token');
  const userId = localStorage.getItem('inspectra_user_id');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

export const api = {
  // Auth (No OTP)
  async createAccount(name: string, mobileNumber: string): Promise<{ user: UserProfile; token: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobileNumber })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to create your account. Please try again.');
      }
      return res.json();
    } catch (err: any) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw err;
    }
  },

  async loginWithPhone(mobileNumber: string): Promise<{ user: UserProfile; token: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 404 || err.code === 'ACCOUNT_NOT_FOUND') {
          const notFoundErr: any = new Error('No Inspectra account found.');
          notFoundErr.code = 'ACCOUNT_NOT_FOUND';
          throw notFoundErr;
        }
        throw new Error(err.error || 'Login failed. Please try again.');
      }
      return res.json();
    } catch (err: any) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw err;
    }
  },

  async login(emailOrPhone: string): Promise<{ user: UserProfile; token: string }> {
    try {
      const cleanDigits = emailOrPhone.replace(/\D/g, '');
      const body = cleanDigits.length === 10 ? { mobileNumber: cleanDigits } : { email: emailOrPhone };
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 404 || err.code === 'ACCOUNT_NOT_FOUND') {
          const notFoundErr: any = new Error('No Inspectra account found.');
          notFoundErr.code = 'ACCOUNT_NOT_FOUND';
          throw notFoundErr;
        }
        throw new Error(err.error || 'Login failed');
      }
      return res.json();
    } catch (err: any) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw err;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {
      // Ignore network errors during logout
    }
    localStorage.removeItem('inspectra_token');
    localStorage.removeItem('inspectra_user_id');
  },

  async signup(data: { name: string; email?: string; mobileNumber?: string; role?: string; organization?: string }): Promise<{ user: UserProfile; token: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to create your account. Please try again.');
      }
      return res.json();
    } catch (err: any) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw err;
    }
  },

  async loginAsGuest(): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch(`${API_BASE}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Guest login failed');
    return res.json();
  },

  async getMe(): Promise<{ user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to get current user');
    return res.json();
  },

  // Dashboard
  async getDashboard(): Promise<{ metrics: DashboardMetrics; recentScans: ScanSession[] }> {
    const res = await fetch(`${API_BASE}/dashboard`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load dashboard');
    return res.json();
  },

  // Scans
  async getScans(search?: string, status?: string): Promise<{ scans: ScanSession[] }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/scans?${params.toString()}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load inspections');
    return res.json();
  },

  async getScan(scanId: string): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load inspection details');
    return res.json();
  },

  async createScan(): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to create scan session');
    return res.json();
  },

  async uploadScanImage(
    scanId: string,
    side: string,
    previewUrl: string,
    fileName?: string
  ): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}/image`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ side, previewUrl, fileName })
    });
    if (!res.ok) throw new Error('Failed to upload image');
    return res.json();
  },

  async removeScanImage(scanId: string, side: string): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}/image/${side}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to remove image');
    return res.json();
  },

  async analyzeScan(scanId: string): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}/analyze`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Inspection pipeline failed');
    }
    return res.json();
  },

  async updateDeclaration(
    scanId: string,
    fieldKey: string,
    newValue: string | null,
    reason: string
  ): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}/declaration`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ fieldKey, newValue, reason })
    });
    if (!res.ok) throw new Error('Failed to update declaration');
    return res.json();
  },

  async updateRawText(
    scanId: string,
    side: string,
    editedRawText: string
  ): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}/raw-text`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ side, editedRawText })
    });
    if (!res.ok) throw new Error('Failed to update raw text');
    return res.json();
  },

  async submitAssessment(
    scanId: string,
    decision: 'ACCEPT' | 'REJECT' | 'ESCALATE_FOR_LEGAL_HEARING',
    notes: string
  ): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}/assessment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ decision, notes })
    });
    if (!res.ok) throw new Error('Failed to submit inspector assessment');
    return res.json();
  },

  async requestHumanReview(
    scanId: string,
    reason: string,
    note?: string
  ): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}/human-review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason, note })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit human review request');
    }
    return res.json();
  },

  async resolveHumanReview(
    scanId: string,
    payload: {
      decision: 'CONFIRMED' | 'CORRECTED' | 'REJECTED';
      observations?: string;
      corrections?: Record<string, { reviewedValue: string; reason: string }>;
    }
  ): Promise<{ session: ScanSession }> {
    const res = await fetch(`${API_BASE}/scans/${scanId}/human-review/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to resolve human review');
    }
    return res.json();
  },

  // Rules
  async getRules(): Promise<{ rules: ComplianceRule[] }> {
    const res = await fetch(`${API_BASE}/rules`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load rules');
    return res.json();
  },

  async toggleRule(ruleId: string, enabled: boolean): Promise<{ rule: ComplianceRule }> {
    const res = await fetch(`${API_BASE}/rules/${ruleId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to toggle rule');
    return res.json();
  },

  async resetDemoData(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/scans/reset-demo`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  }
};
