import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { User } from '../../types';
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const Profile: React.FC = () => {
  const { user, token } = useAuth();
  // Cached user profile state
  const [userDetails, setUserDetails] = useState<User | null>(() => {
    const cached = localStorage.getItem('profile_cache');
    return cached ? JSON.parse(cached) : user;
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [healthStatus, setHealthStatus] = useState<string>('');

  // Early return if no token
  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Nicht authentifiziert</h3>
          <p className="text-gray-500">Bitte melden Sie sich an, um Ihr Profil zu sehen.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (token) {
      // Show cached state immediately, then update
      loadUserProfile();
      checkApiHealth();
    }
    // eslint-disable-next-line
  }, [token]);

  const loadUserProfile = async () => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const response = await authAPI.getUserProfile(token);
      if (response.success) {
        setUserDetails(response.data);
        localStorage.setItem('profile_cache', JSON.stringify(response.data));
      } else {
        setError('Fehler beim Laden des Benutzerprofils.');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Fehler beim Laden des Benutzerprofils.');
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  };

  const checkApiHealth = async () => {
    try {
      const response = await authAPI.checkHealth();
      setHealthStatus(response.status);
    } catch (error) {
      console.error('Error checking API health:', error);
      setHealthStatus('error');
    }
  };

  const renderUserField = (label: string, value: string | undefined, icon?: React.ComponentType<any>) => {
    if (!value) return null;

    const Icon = icon || IdentificationIcon;

    return (
      <div className="flex items-center p-4 border border-gray-200 rounded-lg">
        <Icon className="h-6 w-6 text-gray-400 mr-3" />
        <div>
          <div className="text-sm font-medium text-gray-500">{label}</div>
          <div className="text-gray-900">{value}</div>
        </div>
      </div>
    );
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Show cached state immediately, but if no cached and loading, show skeleton
  if (isLoading && (!userDetails)) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profil</h1>
        <p className="text-gray-600">Ihre Benutzerinformationen und Kontodetails</p>
      </div>


      {/* Spinner indicator for updating */}
      {isUpdating && (
        <div className="flex items-center gap-2 px-4 py-2 text-primary-600">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 inline-block"></span>
          <span>Aktualisiere...</span>
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Information */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {userDetails?.firstname && userDetails?.lastname 
                    ? `${userDetails.firstname} ${userDetails.lastname}`
                    : userDetails?.username || 'Benutzer'
                  }
                </h2>
                <p className="text-gray-600">Schüler/Student</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderUserField('Benutzername', userDetails?.username, UserIcon)}
              {renderUserField('Vorname', userDetails?.firstname, IdentificationIcon)}
              {renderUserField('Nachname', userDetails?.lastname, IdentificationIcon)}
              {renderUserField('E-Mail', userDetails?.email, EnvelopeIcon)}
              {renderUserField('Schul-ID', userDetails?.school_id, BuildingOfficeIcon)}

              {/* Additional user fields */}
              {userDetails && Object.entries(userDetails).map(([key, value]) => {
                // Skip already rendered fields
                if (['username', 'firstname', 'lastname', 'email', 'school_id', 'encryption_ready'].includes(key)) {
                  return null;
                }

                // Skip empty or undefined values
                if (!value || value === '') {
                  return null;
                }

                // Format field name
                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

                return (
                  <div key={key} className="flex items-center p-4 border border-gray-200 rounded-lg">
                    <InformationCircleIcon className="h-6 w-6 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-500">{label}</div>
                      <div className="text-gray-900">{value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Security Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShieldCheckIcon className="h-6 w-6 mr-2 text-green-500" />
              Sicherheit
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Verschlüsselung</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  userDetails?.encryption_ready === 'true' || userDetails?.encryption_ready === 'True'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {userDetails?.encryption_ready === 'true' || userDetails?.encryption_ready === 'True'
                    ? 'Aktiv'
                    : 'Inaktiv'
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Session</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Aktiv
                </span>
              </div>
            </div>
          </div>

          {/* API Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              API Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Verbindung</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(healthStatus)}`}>
                  {healthStatus === 'ok' ? 'Verbunden' : healthStatus === 'error' ? 'Fehler' : 'Unbekannt'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Session gültig</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Ja
                </span>
              </div>
            </div>
          </div>

          {/* Application Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Anwendung
            </h3>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Version:</span> 1.0.0
              </p>
              <p>
                <span className="font-medium">Typ:</span> Inoffizielle UI
              </p>
              <p>
                <span className="font-medium">Backend:</span> Schulportal Hessen API
              </p>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Hinweis</p>
                  <p className="mt-1">
                    Dies ist eine inoffizielle Benutzeroberfläche für das Schulportal Hessen.
                    Alle Daten werden sicher über die offiziellen APIs abgerufen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;