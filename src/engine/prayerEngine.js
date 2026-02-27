import { Coordinates, CalculationMethod, CalculationParameters, PrayerTimes, Madhab, HighLatitudeRule, Prayer } from 'adhan';
import dayjs from 'dayjs';

// Map string keys to adhan CalculationMethod calls
const METHOD_MAP = {
    MuslimWorldLeague: () => CalculationMethod.MuslimWorldLeague(),
    ISNA: () => CalculationMethod.NorthAmerica(),
    Egyptian: () => CalculationMethod.Egyptian(),
    UmmAlQura: () => CalculationMethod.UmmAlQura(),
    Karachi: () => CalculationMethod.Karachi(),
    Tehran: () => CalculationMethod.Tehran(),
    Dubai: () => CalculationMethod.Dubai(),
    Kuwait: () => CalculationMethod.Kuwait(),
    Qatar: () => CalculationMethod.Qatar(),
    Singapore: () => CalculationMethod.Singapore(),
    MoonsightingCommittee: () => CalculationMethod.MoonsightingCommittee(),
};

const MADHAB_MAP = {
    Shafi: Madhab.Shafi,
    Hanafi: Madhab.Hanafi,
};

const HIGH_LAT_MAP = {
    MiddleOfTheNight: HighLatitudeRule.MiddleOfTheNight,
    SeventhOfTheNight: HighLatitudeRule.SeventhOfTheNight,
    TwilightAngle: HighLatitudeRule.TwilightAngle,
};

/**
 * Calculate prayer times for a given date and location.
 */
export function getPrayerTimes(date, lat, lon, methodKey = 'UmmAlQura', madhabKey = 'Shafi', highLatKey = 'MiddleOfTheNight', offsets = {}) {
    const coords = new Coordinates(lat, lon);
    const params = (METHOD_MAP[methodKey] || METHOD_MAP.UmmAlQura)();

    params.madhab = MADHAB_MAP[madhabKey] || Madhab.Shafi;
    params.highLatitudeRule = HIGH_LAT_MAP[highLatKey] || HighLatitudeRule.MiddleOfTheNight;

    // Apply manual offsets
    if (offsets) {
        params.adjustments = {
            fajr: offsets.fajr || 0,
            sunrise: offsets.sunrise || 0,
            dhuhr: offsets.dhuhr || 0,
            asr: offsets.asr || 0,
            maghrib: offsets.maghrib || 0,
            isha: offsets.isha || 0,
        };
    }

    const pt = new PrayerTimes(coords, date, params);

    return {
        fajr: pt.fajr,
        sunrise: pt.sunrise,
        dhuhr: pt.dhuhr,
        asr: pt.asr,
        maghrib: pt.maghrib,
        isha: pt.isha,
    };
}

/**
 * Get the next prayer name and time from prayer times.
 */
export function getNextPrayer(now, times) {
    const prayerOrder = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

    for (const name of prayerOrder) {
        if (times[name] && now < times[name]) {
            return { name, time: times[name] };
        }
    }

    // All prayers passed — next is tomorrow's Fajr (return null so caller handles it)
    return null;
}

/**
 * Get countdown { hours, minutes, seconds } between now and a target time.
 */
export function getCountdown(now, targetTime) {
    const diff = targetTime.getTime() - now.getTime();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds, total: totalSeconds };
}

/**
 * Format a Date to a time string.
 */
export function formatTime(date, format = '12h') {
    if (!date) return '--:--';
    return dayjs(date).format(format === '24h' ? 'HH:mm' : 'h:mm A');
}

/**
 * Get a simple Hijri date string using Intl.
 */
export function getHijriDate(date, locale = 'en') {
    try {
        return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
    } catch {
        return '';
    }
}
