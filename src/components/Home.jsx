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
                    <img src="/hilal-logo.svg" alt="Hilal" className="brand-logo" />
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
