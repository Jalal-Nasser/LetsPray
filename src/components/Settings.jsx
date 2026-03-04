import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Resolve correct base URL for local audio assets.
// In Electron production: app loads from file:///.../dist/index.html -> audio at ./audio/
// In Vite dev server (Electron dev or browser): audio served at /audio/
const AUDIO_BASE = (() => {
    try {
        const loc = window.location.href;
        if (loc.startsWith('file://')) {
            // file:///C:/path/to/dist/index.html -> file:///C:/path/to/dist/audio/
            return loc.replace(/\/[^/]+$/, '') + '/audio/';
        }
    } catch { }
    return '/audio/';
})();

// Light validation: just check extension is a known audio format.
// The Audio element itself will report onerror if the file can't be played.
// We intentionally avoid HEAD fetch — Vite dev server and Electron CSP may block it.
function validateAudioAsset(url) {
    if (!url || typeof url !== 'string') {
        console.error('[Adhan] Audio URL is empty or invalid:', url);
        return false;
    }
    const allowedExts = ['.mp3', '.wav', '.m4a', '.ogg'];
    if (!allowedExts.some(ext => url.toLowerCase().endsWith(ext))) {
        console.error('[Adhan] Audio URL has unsupported extension:', url);
        return false;
    }
    return true;
}

const METHODS = [
    'MuslimWorldLeague', 'ISNA', 'Egyptian', 'UmmAlQura', 'Karachi',
    'Tehran', 'Dubai', 'Kuwait', 'Qatar', 'Singapore', 'MoonsightingCommittee',
];

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRIVACY_POLICY_URL = 'https://github.com/Jalal-Nasser/LetsPray/blob/main/PRIVACY.md';

const CITIES = [
    { city: 'مكة المكرمة', cityEn: 'Makkah', country: 'السعودية', countryEn: 'Saudi Arabia', lat: 21.4225, lon: 39.8262, tz: 'Asia/Riyadh' },
    { city: 'المدينة المنورة', cityEn: 'Madinah', country: 'السعودية', countryEn: 'Saudi Arabia', lat: 24.4672, lon: 39.6024, tz: 'Asia/Riyadh' },
    { city: 'الرياض', cityEn: 'Riyadh', country: 'السعودية', countryEn: 'Saudi Arabia', lat: 24.7136, lon: 46.6753, tz: 'Asia/Riyadh' },
    { city: 'جدة', cityEn: 'Jeddah', country: 'السعودية', countryEn: 'Saudi Arabia', lat: 21.5433, lon: 39.1728, tz: 'Asia/Riyadh' },
    { city: 'الخبر', cityEn: 'Al Khobar', country: 'السعودية', countryEn: 'Saudi Arabia', lat: 26.2172, lon: 50.1971, tz: 'Asia/Riyadh' },
    { city: 'الدمام', cityEn: 'Dammam', country: 'السعودية', countryEn: 'Saudi Arabia', lat: 26.4207, lon: 50.0888, tz: 'Asia/Riyadh' },
    { city: 'الظهران', cityEn: 'Dhahran', country: 'السعودية', countryEn: 'Saudi Arabia', lat: 26.2361, lon: 50.0393, tz: 'Asia/Riyadh' },
    { city: 'القاهرة', cityEn: 'Cairo', country: 'مصر', countryEn: 'Egypt', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' },
    { city: 'إسطنبول', cityEn: 'Istanbul', country: 'تركيا', countryEn: 'Turkey', lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul' },
    { city: 'دبي', cityEn: 'Dubai', country: 'الإمارات', countryEn: 'UAE', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
    { city: 'كوالالمبور', cityEn: 'Kuala Lumpur', country: 'ماليزيا', countryEn: 'Malaysia', lat: 3.1390, lon: 101.6869, tz: 'Asia/Kuala_Lumpur' },
    { city: 'جاكرتا', cityEn: 'Jakarta', country: 'إندونيسيا', countryEn: 'Indonesia', lat: -6.2088, lon: 106.8456, tz: 'Asia/Jakarta' },
    { city: 'لندن', cityEn: 'London', country: 'بريطانيا', countryEn: 'UK', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
    { city: 'نيويورك', cityEn: 'New York', country: 'أمريكا', countryEn: 'USA', lat: 40.7128, lon: -74.0060, tz: 'America/New_York' },
    { city: 'تورنتو', cityEn: 'Toronto', country: 'كندا', countryEn: 'Canada', lat: 43.6511, lon: -79.3470, tz: 'America/Toronto' },
    { city: 'باريس', cityEn: 'Paris', country: 'فرنسا', countryEn: 'France', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
    { city: 'عمّان', cityEn: 'Amman', country: 'الأردن', countryEn: 'Jordan', lat: 31.9454, lon: 35.9284, tz: 'Asia/Amman' },
    { city: 'بغداد', cityEn: 'Baghdad', country: 'العراق', countryEn: 'Iraq', lat: 33.3152, lon: 44.3661, tz: 'Asia/Baghdad' },
    { city: 'الدوحة', cityEn: 'Doha', country: 'قطر', countryEn: 'Qatar', lat: 25.2854, lon: 51.5310, tz: 'Asia/Qatar' },
    { city: 'الكويت', cityEn: 'Kuwait City', country: 'الكويت', countryEn: 'Kuwait', lat: 29.3759, lon: 47.9774, tz: 'Asia/Kuwait' },
    { city: 'بيروت', cityEn: 'Beirut', country: 'لبنان', countryEn: 'Lebanon', lat: 33.8938, lon: 35.5018, tz: 'Asia/Beirut' },
    { city: 'إسلام آباد', cityEn: 'Islamabad', country: 'باكستان', countryEn: 'Pakistan', lat: 33.6844, lon: 73.0479, tz: 'Asia/Karachi' },
    { city: 'دكا', cityEn: 'Dhaka', country: 'بنغلادش', countryEn: 'Bangladesh', lat: 23.8103, lon: 90.4125, tz: 'Asia/Dhaka' },
    { city: 'الدار البيضاء', cityEn: 'Casablanca', country: 'المغرب', countryEn: 'Morocco', lat: 33.5731, lon: -7.5898, tz: 'Africa/Casablanca' },
    { city: 'صنعاء', cityEn: "Sana'a", country: 'اليمن', countryEn: 'Yemen', lat: 15.3694, lon: 44.1910, tz: 'Asia/Aden' },
    { city: 'مسقط', cityEn: 'Muscat', country: 'عُمان', countryEn: 'Oman', lat: 23.5880, lon: 58.3829, tz: 'Asia/Muscat' },
    { city: 'الخرطوم', cityEn: 'Khartoum', country: 'السودان', countryEn: 'Sudan', lat: 15.5007, lon: 32.5599, tz: 'Africa/Khartoum' },
    { city: 'الجزائر', cityEn: 'Algiers', country: 'الجزائر', countryEn: 'Algeria', lat: 36.7538, lon: 3.0588, tz: 'Africa/Algiers' },
    { city: 'سيدني', cityEn: 'Sydney', country: 'أستراليا', countryEn: 'Australia', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
    { city: 'لوس أنجلوس', cityEn: 'Los Angeles', country: 'أمريكا', countryEn: 'USA', lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
];

// sourceType: 'adhan' — all items MUST be Adhan recordings, not Quran recitation.
// audioFile: filename only. Full URL = AUDIO_BASE + audioFile at runtime.
// All files are real Adhan (call to prayer) recordings downloaded from archive.org.
const MUEZZINS = [
    { id: 'makkah', sourceType: 'adhan', nameAr: 'أذان المسجد الحرام', nameEn: 'Masjid Al-Haram (Makkah)', originAr: 'مكة المكرمة', originEn: 'Makkah, Saudi Arabia', icon: '🕋', audioFile: 'makkah.mp3' },
    { id: 'madinah', sourceType: 'adhan', nameAr: 'أذان المسجد النبوي', nameEn: 'Masjid An-Nabawi (Madinah)', originAr: 'المدينة المنورة', originEn: 'Madinah, Saudi Arabia', icon: '🕌', audioFile: 'madinah.mp3' },
    { id: 'mishary', sourceType: 'adhan', nameAr: 'مشاري العفاسي', nameEn: 'Mishary Alafasy', originAr: 'الكويت', originEn: 'Kuwait', icon: '🎙', audioFile: 'mishary.mp3' },
    { id: 'kurtishi', sourceType: 'adhan', nameAr: 'مولانا كورش', nameEn: 'Mevlan Kurtishi', originAr: 'مقدونيا الشمالية', originEn: 'North Macedonia', icon: '�', audioFile: 'Mevlan Kurtishi.mp3' },
    { id: 'abdulbasit', sourceType: 'adhan', nameAr: 'عبد الباسط عبد الصمد', nameEn: 'Abdul Basit Abdus-Samad', originAr: 'مصر', originEn: 'Egypt', icon: '🎵', audioFile: 'abdulbasit.mp3' },
    { id: 'husary', sourceType: 'adhan', nameAr: 'محمود خليل الحصري', nameEn: 'Mahmoud Al-Husary', originAr: 'مصر', originEn: 'Egypt', icon: '📿', audioFile: 'husary.mp3' },
    { id: 'minshawi', sourceType: 'adhan', nameAr: 'محمد صديق المنشاوي', nameEn: 'Muhammad Al-Minshawi', originAr: 'مصر', originEn: 'Egypt', icon: '⭐', audioFile: 'minshawi.mp3' },
].filter(m => m.sourceType === 'adhan'); // Safety guard: never render non-Adhan items

const DEFAULT_SETTINGS = {
    location: null, calculationMethod: 'UmmAlQura', madhab: 'Shafi', language: 'ar',
    theme: 'dark', timeFormat: '12h', audioEnabled: true, notificationsEnabled: true,
    autoStart: false, highLatitudeRule: 'MiddleOfTheNight',
    offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    // 'muezzin' key = default Adhan voice. Valid IDs: makkah | madinah | mishary | kurtishi | abdulbasit | husary | minshawi
    muezzin: 'makkah',
};

export default function Settings({ settings, onUpdate, onBack }) {
    const { t, i18n } = useTranslation();
    const [detecting, setDetecting] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [appVersion, setAppVersion] = useState('');
    const audioRef = useRef(null);
    const isArabic = i18n.language === 'ar';

    useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }, []);

    useEffect(() => {
        if (!window.electronAPI?.getAppVersion) return;
        window.electronAPI.getAppVersion()
            .then((version) => {
                if (version) setAppVersion(version);
            })
            .catch(() => { });
    }, []);

    const handleCityChange = (e) => {
        const selectedValue = e.target.value;
        if (selectedValue === 'current') return;
        const idx = parseInt(selectedValue, 10);
        if (idx >= 0) {
            const c = CITIES[idx];
            onUpdate('location', { city: isArabic ? c.city : c.cityEn, country: isArabic ? c.country : c.countryEn, lat: c.lat, lon: c.lon, timezone: c.tz });
        }
    };

    const handleAutoDetect = async () => {
        setDetecting(true);
        try {
            // ── Step 1: Try GPS via browser geolocation (accurate to street level) ──
            const gpsPosition = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) { reject(new Error('no-gps')); return; }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 8000, maximumAge: 0
                });
            }).catch(() => null);

            if (gpsPosition) {
                const { latitude: lat, longitude: lon } = gpsPosition.coords;
                // Reverse geocode with Nominatim (OpenStreetMap) — free, no API key
                let city = '', country = '';
                try {
                    const r = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${isArabic ? 'ar' : 'en'}`,
                        { headers: { 'User-Agent': 'LetsPrayApp/1.0' } }
                    );
                    if (r.ok) {
                        const geo = await r.json();
                        const addr = geo.address || {};
                        city = addr.city || addr.town || addr.village || addr.county || '';
                        country = addr.country || '';
                    }
                } catch { }
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                onUpdate('location', { city: city || `${lat.toFixed(4)}, ${lon.toFixed(4)}`, country, lat, lon, timezone: tz });
                setDetecting(false);
                return;
            }

            // ── Step 2: Fallback to IP geolocation (less accurate — ISP city level) ──
            if (window.electronAPI?.detectLocationByIp) {
                try {
                    const detected = await window.electronAPI.detectLocationByIp();
                    if (detected?.lat != null && detected?.lon != null) {
                        onUpdate('location', {
                            city: detected.city || 'Unknown',
                            country: detected.country || '',
                            lat: detected.lat,
                            lon: detected.lon,
                            timezone: detected.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                        });
                        setDetecting(false);
                        return;
                    }
                } catch (err) {
                    console.warn('Main-process IP detect failed:', err);
                }
            }

            let data = null;
            try { const r = await fetch('https://ipapi.co/json/'); if (r.ok) data = await r.json(); } catch { }
            if (!data?.latitude) {
                try {
                    const r = await fetch('https://ipwho.is/');
                    if (r.ok) { const d = await r.json(); data = { city: d.city, country_name: d.country, latitude: d.latitude, longitude: d.longitude, timezone: d.timezone?.id }; }
                } catch { }
            }
            if (data?.latitude) {
                onUpdate('location', { city: data.city || 'Unknown', country: data.country_name || data.country || '', lat: data.latitude, lon: data.longitude, timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone });
            }
        } catch (err) { console.error('Auto-detect failed:', err); }
        setDetecting(false);
    };

    const handlePlayMuezzin = (m) => {
        // Stop any currently playing Adhan preview
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        // Toggle off if same muezzin clicked again
        if (playingId === m.id) { setPlayingId(null); return; }

        const resolvedUrl = AUDIO_BASE + m.audioFile;
        console.log('[Adhan] Preview URL:', resolvedUrl, '| muezzin:', m.id);

        if (!validateAudioAsset(resolvedUrl)) {
            console.error('[Adhan] Cannot play: invalid URL for', m.id);
            return;
        }

        const audio = new Audio(resolvedUrl);
        audio.preload = 'auto';
        audioRef.current = audio;
        setPlayingId(m.id);
        audio.play().catch((err) => {
            console.error('[Adhan] play() rejected for', m.id, '-', err.message);
            setPlayingId(null);
            audioRef.current = null;
        });
        audio.onended = () => { setPlayingId(null); audioRef.current = null; };
        audio.onerror = () => {
            const code = audio.error?.code;
            const msg = audio.error?.message || 'unknown';
            console.error('[Adhan] Audio error for', m.id, '- code:', code, msg);
            setPlayingId(null);
            audioRef.current = null;
        };
    };

    const handleResetSettings = () => {
        Object.entries(DEFAULT_SETTINGS).forEach(([k, v]) => onUpdate(k, v));
        setShowResetConfirm(false);
        handleAutoDetect();
    };

    const openLink = (url) => {
        if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
        else window.open(url, '_blank');
    };

    const handleTestNotification = () => {
        const title = isArabic ? 'اختبار الإشعار' : 'Notification Test';
        const body = isArabic ? 'هذا إشعار تجريبي للتأكد من عمل التنبيهات.' : 'This is a test notification to verify alerts.';
        if (window.electronAPI?.showNotification) {
            window.electronAPI.showNotification(title, body);
            return;
        }
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') new Notification(title, { body });
            });
        }
    };

    const handleTestAdhanNow = () => {
        const selected = MUEZZINS.find(m => m.id === settings.muezzin) || MUEZZINS[0];
        if (!selected) return;
        handlePlayMuezzin(selected);
    };

    const hasLocation = settings.location?.lat != null && settings.location?.lon != null;
    const currentCityIdx = CITIES.findIndex(c => Math.abs(c.lat - (settings.location?.lat || 0)) < 0.01 && Math.abs(c.lon - (settings.location?.lon || 0)) < 0.01);
    const currentCityValue = currentCityIdx >= 0 ? String(currentCityIdx) : (hasLocation ? 'current' : '-1');

    return (
        <div className="settings-page">
            <div className="settings-header">
                <button className="settings-back" onClick={onBack}>←</button>
                <h2 className="settings-title">{t('settings.title')} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>v{appVersion || '1.0.9'}</span></h2>
            </div>

            <div className="settings-group" style={{ marginTop: '8px' }}>
                <div className="settings-group-label">{isArabic ? 'اختبار سريع' : 'Quick Test'}</div>
                <div className="settings-item" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="detect-btn" onClick={handleTestAdhanNow} style={{ flex: 1, minWidth: '170px' }}>
                        {isArabic ? 'اختبار صوت الأذان' : 'Test Adhan Sound'}
                    </button>
                    <button className="detect-btn" onClick={handleTestNotification} style={{ flex: 1, minWidth: '170px' }}>
                        {isArabic ? 'اختبار الإشعار' : 'Test Notification'}
                    </button>
                </div>
            </div>

            <div className="settings-grid">
                {/* Location */}
                <div className="settings-group">
                    <div className="settings-group-label">{t('settings.location')}</div>
                    <div className="settings-item">
                        <span className="settings-label">{t('settings.city')}</span>
                        <select className="settings-select" value={currentCityValue} onChange={handleCityChange}>
                            <option value={-1}>-- {t('settings.city')} --</option>
                            {hasLocation && currentCityIdx < 0 && (
                                <option value="current">{settings.location.city}, {settings.location.country}</option>
                            )}
                            {CITIES.map((c, i) => (<option key={i} value={i}>{isArabic ? c.city : c.cityEn}, {isArabic ? c.country : c.countryEn}</option>))}
                        </select>
                    </div>
                    <div className="settings-item">
                        <span className="settings-label">{t('home.detectLocation')}</span>
                        <button className="detect-btn" onClick={handleAutoDetect} disabled={detecting}>📍 {detecting ? t('home.detecting') : t('home.detectLocation')}</button>
                    </div>
                    {settings.location?.city && (
                        <div className="settings-item" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            <span>📍 {settings.location.city}, {settings.location.country}</span>
                            <span>{settings.location.lat?.toFixed(4)}, {settings.location.lon?.toFixed(4)}</span>
                        </div>
                    )}
                </div>

                {/* Calculation Method */}
                <div className="settings-group">
                    <div className="settings-group-label">{t('settings.calculationMethod')}</div>
                    <div className="settings-item">
                        <select className="settings-select" style={{ maxWidth: '100%', width: '100%' }} value={settings.calculationMethod} onChange={(e) => onUpdate('calculationMethod', e.target.value)}>
                            {METHODS.map(m => <option key={m} value={m}>{t(`methods.${m}`)}</option>)}
                        </select>
                    </div>
                </div>

                {/* Madhab */}
                <div className="settings-group">
                    <div className="settings-group-label">{t('settings.madhab')}</div>
                    <div className="settings-item">
                        <select className="settings-select" value={settings.madhab} onChange={(e) => onUpdate('madhab', e.target.value)}>
                            <option value="Shafi">{t('madhabs.Shafi')}</option>
                            <option value="Hanafi">{t('madhabs.Hanafi')}</option>
                        </select>
                    </div>
                </div>

                {/* Language */}
                <div className="settings-group">
                    <div className="settings-group-label">{t('settings.language')}</div>
                    <div className="settings-item">
                        <span className="settings-label">{t('settings.language')}</span>
                        <select className="settings-select" value={settings.language} onChange={(e) => onUpdate('language', e.target.value)}>
                            <option value="ar">العربية</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                </div>

                {/* Theme */}
                <div className="settings-group">
                    <div className="settings-group-label">{t('settings.theme')}</div>
                    <div className="settings-item">
                        <span className="settings-label">{t('settings.theme')}</span>
                        <select className="settings-select" value={settings.theme || 'dark'} onChange={(e) => onUpdate('theme', e.target.value)}>
                            <option value="dark">🌙 {t('settings.dark')}</option>
                            <option value="light">☀️ {t('settings.light')}</option>
                        </select>
                    </div>
                </div>

                {/* Time Format */}
                <div className="settings-group">
                    <div className="settings-group-label">{t('settings.timeFormat')}</div>
                    <div className="settings-item">
                        <span className="settings-label">{t('settings.timeFormat')}</span>
                        <select className="settings-select" value={settings.timeFormat} onChange={(e) => onUpdate('timeFormat', e.target.value)}>
                            <option value="12h">12h (AM/PM)</option>
                            <option value="24h">24h</option>
                        </select>
                    </div>
                </div>

                {/* Audio + Notifications */}
                <div className="settings-group">
                    <div className="settings-group-label">{t('settings.audio')}</div>
                    <div className="settings-item">
                        <span className="settings-label">{t('settings.audioEnabled')}</span>
                        <label className="toggle"><input type="checkbox" checked={settings.audioEnabled} onChange={(e) => onUpdate('audioEnabled', e.target.checked)} /><span className="toggle-slider" /></label>
                    </div>
                    <div className="settings-item">
                        <span className="settings-label">{t('settings.notificationsEnabled')}</span>
                        <label className="toggle"><input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => onUpdate('notificationsEnabled', e.target.checked)} /><span className="toggle-slider" /></label>
                    </div>
                </div>

                {/* High Latitude Rule */}
                <div className="settings-group">
                    <div className="settings-group-label">{t('settings.highLatitudeRule')}</div>
                    <div className="settings-item">
                        <select className="settings-select" style={{ maxWidth: '100%', width: '100%' }} value={settings.highLatitudeRule} onChange={(e) => onUpdate('highLatitudeRule', e.target.value)}>
                            <option value="MiddleOfTheNight">{t('highLatRules.MiddleOfTheNight')}</option>
                            <option value="SeventhOfTheNight">{t('highLatRules.SeventhOfTheNight')}</option>
                            <option value="TwilightAngle">{t('highLatRules.TwilightAngle')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Adhan Muezzin Selection (Audio Library) ── */}
            <div className="settings-group" style={{ marginTop: '20px' }}>
                <div className="settings-group-label">{isArabic ? 'صوت الأذان (المؤذن)' : 'Adhan Voice (Muezzin)'}</div>
                <div className="muezzin-grid">
                    {MUEZZINS.map(m => (
                        <div key={m.id} className={`muezzin-card ${settings.muezzin === m.id ? 'selected' : ''}`} onClick={() => onUpdate('muezzin', m.id)}>
                            <div className="muezzin-avatar">{m.icon}</div>
                            <div className="muezzin-info">
                                <div className="muezzin-name">{isArabic ? m.nameAr : m.nameEn}</div>
                                <div className="muezzin-origin">{isArabic ? m.originAr : m.originEn}</div>
                            </div>
                            <button className={`muezzin-play ${playingId === m.id ? 'playing' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handlePlayMuezzin(m); }}
                                title={playingId === m.id ? (isArabic ? 'إيقاف' : 'Stop') : (isArabic ? 'استمع' : 'Preview')}>
                                {playingId === m.id ? '⏹' : '▶'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Per-Prayer Offsets ── */}
            <div className="settings-group" style={{ marginTop: '20px' }}>
                <div className="settings-group-label">{t('settings.offsets')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    {PRAYER_KEYS.map(key => (
                        <div className="settings-item" key={key}>
                            <span className="settings-label">{t(`prayers.${key}`)}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input className="offset-input" type="number" value={settings.offsets?.[key] || 0}
                                    onChange={(e) => { const v = parseInt(e.target.value, 10) || 0; onUpdate('offsets', { ...settings.offsets, [key]: v }); }} />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('settings.minutes')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Feedback ── */}
            <div className="settings-group" style={{ marginTop: '20px' }}>
                <div className="settings-group-label">{isArabic ? '💬 ملاحظات واقتراحات' : '💬 Feedback'}</div>
                <button className="detect-btn" onClick={() => openLink('https://github.com/Jalal-Nasser/LetsPray/issues')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px' }}>
                    <svg height="20" viewBox="0 0 16 16" version="1.1" width="20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                    </svg>
                    {isArabic ? 'إرسال الملاحظات (GitHub)' : 'Send Feedback (GitHub)'}
                </button>
            </div>

            {/* ── About / Version ── */}
            <div className="settings-group" style={{ marginTop: '20px' }}>
                <div className="settings-group-label">{isArabic ? 'حول التطبيق' : 'About'}</div>
                <div className="about-card" onClick={() => setShowAbout(!showAbout)}>
                    <svg className="about-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
                        <defs>
                            <linearGradient id="aboutHilalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#34d399" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <filter id="aboutSoftGlow">
                                <feGaussianBlur stdDeviation="2.5" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                        </defs>
                        <path d="M 44 8 C 28 8, 14 22, 14 38 C 14 54, 28 68, 44 68 C 33 61, 26 50, 26 38 C 26 26, 33 15, 44 8 Z"
                            fill="url(#aboutHilalGrad)" filter="url(#aboutSoftGlow)" />
                        <path d="M 52 24 L 53.8 29 L 59 29.5 L 55 32.5 L 56.2 37.5 L 52 34.8 L 47.8 37.5 L 49 32.5 L 45 29.5 L 50.2 29 Z"
                            fill="url(#aboutHilalGrad)" />
                    </svg>
                    <div className="about-info">
                        <div className="about-name" style={{ fontFamily: isArabic ? '' : "'Cinzel Decorative', 'Outfit', sans-serif" }}>
                            {isArabic ? 'حي على الصلاة' : "Let's Pray"}
                        </div>
                        <div className="about-version">v{appVersion || '1.0.9'}</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{showAbout ? '▲' : '▼'}</span>
                </div>
                {showAbout && (
                    <div className="about-details">
                        <p>{isArabic ? 'تطبيق مواقيت الصلاة والأذان لسطح المكتب' : 'Desktop Prayer Times & Azan Application'}</p>
                        <p>{isArabic ? 'مبني بـ Electron + React + Vite' : 'Built with Electron + React + Vite'}</p>
                        <p>{isArabic ? 'محرك حساب الصلاة: adhan.js' : 'Prayer engine: adhan.js'}</p>
                        <div className="about-links">
                            <button className="about-link" onClick={() => openLink('https://github.com/Jalal-Nasser/LetsPray.git')}>
                                GitHub
                            </button>
                            <button className="about-link" onClick={() => openLink('https://mdeploy.dev')}>
                                mDeploy
                            </button>
                            <button className="about-link" onClick={() => openLink(PRIVACY_POLICY_URL)}>
                                {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Reset Settings ── */}
            <div className="settings-group" style={{ marginTop: '20px' }}>
                <button className="reset-btn" onClick={() => setShowResetConfirm(true)}>
                    🔄 {isArabic ? 'إعادة تعيين الإعدادات' : 'Reset All Settings'}
                </button>
            </div>

            {/* ── Copyright Footer ── */}
            <footer className="app-footer">
                <span>© 2026 </span>
                <a className="footer-link" onClick={() => openLink('https://mdeploy.dev')}>mDeploy</a>
                <span>. All rights reserved. · Developed by </span>
                <a className="footer-link" onClick={() => openLink('https://github.com/Jalal-Nasser')}>Jalal Nasser</a>
            </footer>

            {/* Reset Confirmation Dialog */}
            {showResetConfirm && (
                <div className="reset-confirm-overlay" onClick={() => setShowResetConfirm(false)}>
                    <div className="reset-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="reset-confirm-title">{isArabic ? '⚠️ إعادة تعيين الإعدادات' : '⚠️ Reset Settings'}</div>
                        <div className="reset-confirm-text">{isArabic ? 'هل أنت متأكد؟ سيتم إعادة جميع الإعدادات إلى الوضع الافتراضي.' : 'Are you sure? All settings will be restored to default values.'}</div>
                        <div className="reset-confirm-btns">
                            <button className="reset-confirm-yes" onClick={handleResetSettings}>{isArabic ? 'نعم، إعادة تعيين' : 'Yes, Reset'}</button>
                            <button className="reset-confirm-no" onClick={() => setShowResetConfirm(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

