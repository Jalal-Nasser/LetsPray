import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import './index.css';
import Home from './components/Home';
import Settings from './components/Settings';
import TitleBar from './components/TitleBar';
import mosqueBg from '/mosque-bg.png';

// Auto-detect city/timezone using multiple fallback APIs (all HTTPS)
async function autoDetectLocation() {
  // Try API 1: ipapi.co (HTTPS, no key needed, generous limits)
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          city: data.city || 'Unknown',
          country: data.country_name || '',
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
    }
  } catch (e) { console.warn('ipapi.co failed:', e); }

  // Try API 2: ipwho.is
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          city: data.city || 'Unknown',
          country: data.country || '',
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone?.id || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
    }
  } catch (e) { console.warn('ipwho.is failed:', e); }

  // Try API 3: ip-api.com (HTTP only, may be blocked)
  try {
    const res = await fetch('http://ip-api.com/json/?fields=city,country,lat,lon,timezone');
    if (res.ok) {
      const data = await res.json();
      if (data.lat && data.lon) {
        return {
          city: data.city || 'Unknown',
          country: data.country || '',
          lat: data.lat,
          lon: data.lon,
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
    }
  } catch (e) { console.warn('ip-api.com failed:', e); }

  // Ultimate fallback: Makkah
  return {
    city: 'Makkah',
    country: 'Saudi Arabia',
    lat: 21.4225,
    lon: 39.8262,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState('home');
  const [settings, setSettings] = useState(null);

  // Apply theme to DOM
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
  };

  useEffect(() => {
    const load = async () => {
      try {
        let all;
        if (window.electronAPI) {
          all = await window.electronAPI.getAllSettings();
        } else {
          all = {
            location: null,
            calculationMethod: 'UmmAlQura', madhab: 'Shafi', language: 'ar', theme: 'dark',
            timeFormat: '12h', audioEnabled: true, notificationsEnabled: true,
            autoStart: false, highLatitudeRule: 'MiddleOfTheNight',
            offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
            muezzin: 'makkah',
          };
        }

        // Auto-detect location on every launch to keep it accurate
        try {
          const detected = await autoDetectLocation();
          if (detected && detected.lat && detected.city !== 'Makkah') {
            all.location = detected;
            if (window.electronAPI) window.electronAPI.setStoreValue('location', detected);
          } else if (!all.location || !all.location.lat) {
            all.location = detected;
            if (window.electronAPI) window.electronAPI.setStoreValue('location', detected);
          }
        } catch (e) { console.warn('Auto-detect skipped:', e); }

        setSettings(all);
        const lang = all.language || 'ar';
        i18n.changeLanguage(lang);
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
        applyTheme(all.theme);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    load();
  }, [i18n]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      if (window.electronAPI) window.electronAPI.setStoreValue(key, value);
      if (key === 'language') {
        i18n.changeLanguage(value);
        document.documentElement.setAttribute('dir', value === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', value);
      }
      if (key === 'theme') {
        applyTheme(value);
      }
      return updated;
    });
  }, [i18n]);

  if (!settings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1923', color: '#8899aa', fontSize: '18px' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <>
      {/* Background image + overlay */}
      <div className="bg-layer">
        <img src={mosqueBg} alt="" />
      </div>
      <div className="bg-overlay" />

      <TitleBar />
      <div className="app-container">
        {view === 'home' ? (
          <Home settings={settings} onOpenSettings={() => setView('settings')} onUpdateSetting={updateSetting} />
        ) : (
          <Settings settings={settings} onUpdate={updateSetting} onBack={() => setView('home')} />
        )}
      </div>
    </>
  );
}

export default App;
