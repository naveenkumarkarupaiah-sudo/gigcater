import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { WorkerDashboard } from './components/WorkerDashboard';
import { AgentDashboard } from './components/AgentDashboard';
import { WorkerProfileScreen } from './components/WorkerProfileScreen';
import { AgentProfileScreen } from './components/AgentProfileScreen';
import { api, getAuthToken, removeAuthToken, User } from './api';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('browse');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
      if (res.user.role === 'AGENT') {
        setActiveTab('my-events');
      } else {
        setActiveTab('browse');
      }
    } catch (err) {
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (loggedUser: User) => {
    setUser(loggedUser);
    if (loggedUser.role === 'AGENT') {
      setActiveTab('my-events');
    } else {
      setActiveTab('browse');
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center text-xs font-bold text-emerald-800">
        Initializing GigCater Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] flex flex-col font-sans">
      <Header
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1">
        {!user ? (
          <AuthScreen onSuccess={handleAuthSuccess} />
        ) : user.role === 'WORKER' ? (
          activeTab === 'profile' ? (
            <WorkerProfileScreen
              onProfileUpdated={() => {
                setUser({ ...user, hasProfile: true });
                setActiveTab('browse');
              }}
            />
          ) : (
            <WorkerDashboard
              user={user}
              activeTab={activeTab as 'browse' | 'my-applications'}
              onGoToProfile={() => setActiveTab('profile')}
            />
          )
        ) : activeTab === 'agent-profile' ? (
          <AgentProfileScreen
            onProfileUpdated={(agentProfile) => {
              setUser({ ...user, agentProfile, hasProfile: true });
              setActiveTab('my-events');
            }}
          />
        ) : (
          <AgentDashboard
            activeTab={activeTab as 'my-events' | 'create-event' | 'incoming-requests'}
            setActiveTab={setActiveTab}
          />
        )}
      </main>
    </div>
  );
};

export default App;
