import { useCachedState } from '../../hooks/useCachedState';
import { readPersonalCache, writePersonalCache } from '../../utils/accountDataWrites';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import axios from 'axios';
import { User } from '../../types';
import SEO from '../seo/SEO';
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { isDemoRoute, notifyDemoCacheWrite } from '../../utils/demoMode';
import { canWriteAccountData, captureAccountDataGeneration } from '../../utils/accountDataWrites';

const Profile: React.FC = () => {
  const { user, token } = useAuth();
  const [userDetails, setUserDetails] = useCachedState<User | null>('profile', () => {
    try {
      const cached = isDemoRoute() ? null : readPersonalCache('profile_cache');
      return cached ? JSON.parse(cached) : user;
    } catch { return user; }
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(!userDetails);
  const [error, setError] = useState('');
  const [healthStatus, setHealthStatus] = useState<string>('');

  // Early return if no token
  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">Nicht authentifiziert</h3>
          <p className="text-surface-500">Bitte melden Sie sich an, um Ihr Profil zu sehen.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!token) return;
    const abortController = new AbortController();
    const { signal } = abortController;
    loadUserProfile(signal);
    checkApiHealth(signal);
    return () => abortController.abort();
  }, [token]);

  const loadUserProfile = async (signal?: AbortSignal) => {
    if (!token) return;
    const writeGeneration = captureAccountDataGeneration();
    setIsUpdating(true);
    try {
      setError('');
      const response = await authAPI.getUserProfile(token, signal);
      if (signal?.aborted) return;
      if (response.success) {
        setUserDetails(response.data);
        if (canWriteAccountData(writeGeneration)) {
          const cachedProfile = JSON.stringify(response.data);
          notifyDemoCacheWrite('profile_cache', cachedProfile);
          writePersonalCache('profile_cache', cachedProfile, writeGeneration);
        }
      } else {
        setError('Fehler beim Laden des Benutzerprofils.');
      }
      setIsLoading(false);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error loading user profile:', error);
      setError('Fehler beim Laden des Benutzerprofils.');
      setIsLoading(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const checkApiHealth = async (signal?: AbortSignal) => {
    try {
      const response = await authAPI.checkHealth(signal);
      if (signal?.aborted) return;
      setHealthStatus(response.status);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error checking API health:', error);
      setHealthStatus('error');
    }
  };

  const renderUserField = (label: string, value: string | undefined, icon?: React.ComponentType<any>) => {
    if (!value && !(isLoading && !userDetails)) return null;
    const Icon = icon || IdentificationIcon;
    return (
      <div className="flex items-center gap-3 p-3.5 border border-surface-200 dark:border-surface-700 rounded-xl">
        <Icon className="h-5 w-5 text-surface-400 flex-shrink-0" />
        <div>
          <div className="text-xs font-medium text-surface-500">{label}</div>
          <div className="text-sm text-surface-900 dark:text-surface-100">{isLoading && !userDetails ? <div className="skeleton h-5 w-28 max-w-full" aria-hidden="true" /> : value}</div>
        </div>
      </div>
    );
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
      default:
        return 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700';
    }
  };


  return (
    <div className="module-page">
      <SEO
        title="Mein Profil"
        description="Lanis Profil — Deine Benutzerinformationen und Kontodetails im Schulportal Hessen."
        path="/profile"
        noindex
      />
        <div className="page-header">
          <h1 className="page-title">Profil</h1>
          <p className="page-subtitle">Ihre Benutzerinformationen und Kontodetails</p>
        </div>

        
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-soft-md">
                  <UserIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                    {isLoading && !userDetails ? <span className="skeleton block h-7 w-40" aria-hidden="true" /> : userDetails?.firstname && userDetails?.lastname
                      ? `${userDetails.firstname} ${userDetails.lastname}`
                      : userDetails?.username || 'Benutzer'
                    }
                  </h2>
                  <p className="text-sm text-surface-500">Schüler/Student</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-busy={isLoading && !userDetails} aria-label="Profilinformationen">
                {renderUserField('Benutzername', userDetails?.username, UserIcon)}
                {renderUserField('Vorname', userDetails?.firstname, IdentificationIcon)}
                {renderUserField('Nachname', userDetails?.lastname, IdentificationIcon)}
                {renderUserField('E-Mail', userDetails?.email, EnvelopeIcon)}
                {renderUserField('Schul-ID', userDetails?.school_id, BuildingOfficeIcon)}

                {userDetails && Object.entries(userDetails).map(([key, value]) => {
                  if (['username', 'firstname', 'lastname', 'email', 'school_id', 'encryption_ready', 'is_first_school_user'].includes(key)) {
                    return null;
                  }
                  if (!value || value === '') {
                    return null;
                  }
                  const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                  return (
                    <div key={key} className="flex items-center gap-3 p-3.5 border border-surface-200 dark:border-surface-700 rounded-xl">
                      <InformationCircleIcon className="h-5 w-5 text-surface-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-surface-500">{label}</div>
                        <div className="text-sm text-surface-900 dark:text-surface-100">{value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="card">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                Sicherheit
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-600">Verschlüsselung</span>
                  <span className="badge bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs">
                    Aktiv
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-600">Session</span>
                  <span className="badge bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs">Aktiv</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">API Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-600">Verbindung</span>
                  <span className={`badge text-xs ${getHealthStatusColor(healthStatus)}`}>
                    {healthStatus === 'ok' ? 'Verbunden' : healthStatus === 'error' ? 'Fehler' : 'Unbekannt'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-600">Session gültig</span>
                  <span className="badge bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs">Ja</span>
                </div>
              </div>
            </div>

          </div>
        </div>
    </div>
  );
};

export default Profile;
