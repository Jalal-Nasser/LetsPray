import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import './index.css';
import Home from './components/Home';
import Settings from './components/Settings';
import TitleBar from './components/TitleBar';
import mosqueBg from '/mosque-bg.png';
import { getPrayerTimes } from './engine/prayerEngine';
import dayjs from 'dayjs';

const ADHAN_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const MUEZZIN_AUDIO = {
  makkah: 'makkah.mp3',
  madinah: 'madinah.mp3',
  mishary: 'mishary.mp3',
  kurtishi: 'Mevlan Kurtishi.mp3',
  abdulbasit: 'abdulbasit.mp3',
  husary: 'husary.mp3',
  minshawi: 'minshawi.mp3',
};

function getAudioBase() {
  try {
    const loc = window.location.href;
    if (loc.startsWith('file://')) return `${loc.replace(/\/[^/]+$/, '')}/audio/`;
  } catch { }
  return '/audio/';
}

// Auto-detect city/timezone:
// 1) GPS (if user allows)
// 2) IP APIs fallback
async function autoDetectLocation(language = 'ar') {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Step 1: GPS (best accuracy)
  try {
    const gpsPosition = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('geolocation-not-supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      });
    });

    if (gpsPosition?.coords) {
      const lat = gpsPosition.coords.latitude;
      const lon = gpsPosition.coords.longitude;
      let city = '';
      let country = '';

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${language === 'ar' ? 'ar' : 'en'}`,
          { headers: { 'User-Agent': 'LetsPrayApp/1.0' } }
        );
        if (res.ok) {
          const geo = await res.json();
          const addr = geo.address || {};
          city = addr.city || addr.town || addr.village || addr.county || '';
          country = addr.country || '';
        }
      } catch { }

      return {
        city: city || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        country,
        lat,
        lon,
        timezone,
      };
    }
  } catch (e) {
    console.warn('GPS auto-detect failed:', e);
  }

  // Step 2: IP API 1
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
          timezone: data.timezone || timezone,
        };
      }
    }
  } catch (e) { console.warn('ipapi.co failed:', e); }

  // Step 3: IP API 2
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
          timezone: data.timezone?.id || timezone,
        };
      }
    }
  } catch (e) { console.warn('ipwho.is failed:', e); }

  // Step 4: IP API 3 (HTTP only, may be blocked)
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
          timezone: data.timezone || timezone,
        };
      }
    }
  } catch (e) { console.warn('ip-api.com failed:', e); }

  return null;
}

function App() {
  const { i18n } = useTranslation();
  const [view, setView] = useState('home');
  const [settings, setSettings] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const prevNowRef = useRef(null);
  const firedRef = useRef(new Set());

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

        // Auto-detect location on every launch to keep it accurate.
        try {
          const detected = await autoDetectLocation(all.language || 'ar');
          if (detected?.lat != null && detected?.lon != null) {
            all.location = detected;
            if (window.electronAPI) window.electronAPI.setStoreValue('location', detected);
          } else if (!all.location || all.location.lat == null || all.location.lon == null) {
            const fallback = {
              city: 'Makkah',
              country: 'Saudi Arabia',
              lat: 21.4225,
              lon: 39.8262,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
            all.location = fallback;
            if (window.electronAPI) window.electronAPI.setStoreValue('location', fallback);
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

  const openUpdatePage = useCallback(() => {
    const url = updateInfo?.releaseUrl || 'https://github.com/Jalal-Nasser/LetsPray/releases';
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  }, [updateInfo]);

  useEffect(() => {
    if (!window.electronAPI?.checkForUpdates) return undefined;

    let unsubscribe = null;
    if (window.electronAPI.onUpdateAvailable) {
      unsubscribe = window.electronAPI.onUpdateAvailable((info) => {
        if (info?.available) {
          setUpdateInfo(info);
          setUpdateDismissed(false);
        }
      });
    }

    window.electronAPI.checkForUpdates().then((info) => {
      if (info?.available) {
        setUpdateInfo(info);
        setUpdateDismissed(false);
      }
    }).catch((err) => {
      console.warn('Initial update check failed:', err);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    const lat = settings?.location?.lat;
    const lon = settings?.location?.lon;
    if (lat == null || lon == null) return;

    const tick = () => {
      const now = new Date();
      const previousNow = prevNowRef.current;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const times = getPrayerTimes(today, lat, lon, settings.calculationMethod, settings.madhab, settings.highLatitudeRule, settings.offsets);
      const muezzin = settings.muezzin || 'makkah';
      const audioFile = MUEZZIN_AUDIO[muezzin] || MUEZZIN_AUDIO.makkah;
      const audioUrl = `${getAudioBase()}${audioFile}`;

      if (firedRef.current.size > 120) firedRef.current.clear();

      for (const prayer of ADHAN_PRAYERS) {
        const prayerTime = times[prayer];
        if (!prayerTime) continue;
        const dayKey = dayjs(prayerTime).format('YYYY-MM-DD');
        const firedKey = `${dayKey}:${prayer}`;
        if (firedRef.current.has(firedKey)) continue;

        const crossed = previousNow && previousNow < prayerTime && now >= prayerTime;
        const nearOnStart = !previousNow && Math.abs(now.getTime() - prayerTime.getTime()) <= 2000;
        if (!crossed && !nearOnStart) continue;

        firedRef.current.add(firedKey);
        const prayerName = i18n.t(`prayers.${prayer}`);
        const title = i18n.language === 'ar' ? 'دخل وقت الصلاة' : 'Prayer Time';
        const body = i18n.language === 'ar' ? `حان الآن وقت صلاة ${prayerName}` : `It is now time for ${prayerName}`;

        if (settings.notificationsEnabled) {
          if (window.electronAPI?.showNotification) {
            window.electronAPI.showNotification(title, body);
          } else if ('Notification' in window) {
            if (Notification.permission === 'granted') new Notification(title, { body });
            else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') new Notification(title, { body });
              });
            }
          }
        }

        if (settings.audioEnabled) {
          const audio = new Audio(audioUrl);
          audio.play().catch((err) => {
            console.error('[Adhan] Failed to autoplay adhan audio:', err);
          });
        }
      }

      prevNowRef.current = now;
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [settings, i18n]);

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
        {updateInfo?.available && !updateDismissed && (
          <div className="update-banner">
            <div className="update-banner-content">
              <div className="update-banner-title">
                {i18n.language === 'ar' ? 'يتوفر تحديث جديد للتطبيق' : 'A new update is available'}
              </div>
              <div className="update-banner-text">
                {i18n.language === 'ar'
                  ? `الإصدار الحالي ${updateInfo.currentVersion} · الإصدار الجديد ${updateInfo.latestVersion}`
                  : `Current version ${updateInfo.currentVersion} · Latest version ${updateInfo.latestVersion}`}
              </div>
            </div>
            <div className="update-banner-actions">
              <button className="update-btn update-btn-primary" onClick={openUpdatePage}>
                {i18n.language === 'ar' ? 'تنزيل التحديث' : 'Download Update'}
              </button>
              <button className="update-btn update-btn-ghost" onClick={() => setUpdateDismissed(true)}>
                {i18n.language === 'ar' ? 'إغلاق' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}
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
