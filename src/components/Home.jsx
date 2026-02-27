import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getPrayerTimes, getNextPrayer, getCountdown, formatTime, getHijriDate } from '../engine/prayerEngine';
import dayjs from 'dayjs';

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export default function Home({ settings, onOpenSettings, onUpdateSetting }) {
    const { t, i18n } = useTranslation();
    const [now, setNow] = useState(new Date());
    const timerRef = useRef(null);
    const isArabic = i18n.language === 'ar';

    useEffect(() => {
        timerRef.current = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    const { lat, lon, city, country } = settings.location || {};

    const times = useMemo(() => {
        if (lat == null || lon == null) return null;
        return getPrayerTimes(now, lat, lon, settings.calculationMethod, settings.madhab, settings.highLatitudeRule, settings.offsets);
    }, [lat, lon, settings.calculationMethod, settings.madhab, settings.highLatitudeRule, settings.offsets,
        now.getFullYear(), now.getMonth(), now.getDate()]);

    const next = useMemo(() => {
        if (!times) return null;
        return getNextPrayer(now, times);
    }, [now, times]);

    const countdown = useMemo(() => {
        if (!next) return { hours: 0, minutes: 0, seconds: 0 };
        return getCountdown(now, next.time);
    }, [now, next]);

    const hijri = useMemo(() => getHijriDate(now, i18n.language), [now.getDate(), i18n.language]);

    const gregorianDate = isArabic
        ? new Intl.DateTimeFormat('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now)
        : dayjs(now).format('dddd, MMMM D, YYYY');

    const currentTimeStr = dayjs(now).format(settings.timeFormat === '24h' ? 'HH:mm:ss' : 'hh:mm:ss A');

    if (!lat || !lon) {
        return (
            <div className="no-location">
                <div className="no-location-icon">📍</div>
                <div className="no-location-text">{t('home.noLocation')}</div>
                <button className="no-location-btn" onClick={onOpenSettings}>{t('home.setLocation')}</button>
            </div>
        );
    }

    const pad = (n) => String(n).padStart(2, '0');

    return (
        <>
            {/* Header */}
            <header className="app-header">
                <div className="brand-block">
                    <svg className="brand-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
                        <defs>
                            <linearGradient id="hilalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#34d399" />
                                <stop offset="50%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                                <stop offset="60%" stopColor="#10b981" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                            </radialGradient>
                            <filter id="softGlow">
                                <feGaussianBlur stdDeviation="2.5" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                            <filter id="starGlow">
                                <feGaussianBlur stdDeviation="1.5" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                        </defs>
                        <circle cx="38" cy="38" r="36" fill="url(#moonGlow)">
                            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" />
                        </circle>
                        <path d="M 44 8 C 28 8, 14 22, 14 38 C 14 54, 28 68, 44 68 C 33 61, 26 50, 26 38 C 26 26, 33 15, 44 8 Z"
                            fill="url(#hilalGrad)" filter="url(#softGlow)" />
                        <path d="M 52 24 L 53.8 29 L 59 29.5 L 55 32.5 L 56.2 37.5 L 52 34.8 L 47.8 37.5 L 49 32.5 L 45 29.5 L 50.2 29 Z"
                            fill="url(#hilalGrad)" filter="url(#starGlow)">
                            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
                        </path>
                        <circle cx="60" cy="16" r="1.2" fill="#34d399">
                            <animate attributeName="r" values="0.6;1.4;0.6" dur="2.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="64" cy="42" r="0.9" fill="#6ee7b7">
                            <animate attributeName="opacity" values="0.2;0.9;0.2" dur="3.2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="55" cy="52" r="0.7" fill="#34d399">
                            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" />
                        </circle>
                    </svg>
                    <div>
                        <h1 className="app-title">{t('app.title')}</h1>
                        <p className="app-subtitle">{t('app.subtitle')}</p>
                    </div>
                </div>
                <div className="header-info">
                    <div className="header-location">
                        <span className="header-location-dot" />
                        {city || '—'}{country ? `, ${country}` : ''}
                    </div>
                    <div className="header-date-hijri">☪ {hijri}</div>
                </div>
            </header>

            {/* Current Time + Date Bar */}
            <div className="time-date-bar">
                <div className="current-time-section">
                    <span className="time-icon">🕐</span>
                    <span className="current-time">{currentTimeStr}</span>
                </div>
                <div className="date-section">
                    <span className="gregorian-date">📅 {gregorianDate}</span>
                    <span className="hijri-date">☪ {hijri}</span>
                </div>
            </div>

            {/* Countdown */}
            <div className="countdown-section">
                <div className="countdown-label">
                    {t('home.timeUntil')} {next ? t(`prayers.${next.name}`) : '—'}
                </div>
                <div className="countdown-boxes">
                    <div className="countdown-box">
                        <div className="countdown-value">{pad(countdown.hours)}</div>
                        <div className="countdown-unit">{t('home.hours')}</div>
                    </div>
                    <div className="countdown-separator">:</div>
                    <div className="countdown-box">
                        <div className="countdown-value">{pad(countdown.minutes)}</div>
                        <div className="countdown-unit">{t('home.minutes')}</div>
                    </div>
                    <div className="countdown-separator">:</div>
                    <div className="countdown-box">
                        <div className="countdown-value">{pad(countdown.seconds)}</div>
                        <div className="countdown-unit">{t('home.seconds')}</div>
                    </div>
                </div>
            </div>

            {/* Prayer Times List */}
            <div>
                <h2 className="prayer-list-title">{t('home.todayPrayers')}</h2>
                <div className="prayer-list">
                    {times && PRAYER_KEYS.map((key) => {
                        const time = times[key];
                        const isActive = next?.name === key;
                        const isPassed = time && now >= time && !isActive;
                        return (
                            <div key={key} className={`prayer-row ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}>
                                <div className="prayer-row-left">
                                    <div className="prayer-dot" />
                                    <span className="prayer-row-name">{t(`prayers.${key}`)}</span>
                                </div>
                                <span className="prayer-row-time">{formatTime(time, settings.timeFormat)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom bar */}
            <div className="bottom-bar">
                <button className="bottom-btn" onClick={onOpenSettings}>
                    ⚙️ {t('home.settings')}
                </button>
            </div>

            {/* Copyright Footer */}
            <footer className="app-footer">
                <span>© 2026 </span>
                <a className="footer-link" href="https://mdeploy.dev" target="_blank" rel="noopener noreferrer">mDeploy</a>
                <span>. All rights reserved. · Developed by </span>
                <a className="footer-link" href="https://github.com/Jalal-Nasser" target="_blank" rel="noopener noreferrer">Jalal Nasser</a>
            </footer>
        </>
    );
}
