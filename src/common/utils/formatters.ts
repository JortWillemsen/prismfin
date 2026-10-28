export function formatDurationTicks(ticks?: number): string {
    if (!ticks) {
        return "";
    }
    const totalSeconds = Math.floor(ticks / 10000000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

export function formatTimeSeconds(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) {
        seconds = 0;
    }
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, "0");

    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${minutes}:${pad(secs)}`;
}

export function formatResolution(width?: number, height?: number): string {
    if (!width && !height) {
        return "";
    }
    const w = width || 0;
    const h = height || 0;

    if (w >= 3800 || h >= 2100) {
        return "4K";
    }
    if (w >= 1900 || h >= 1000) {
        return "1080p";
    }
    if (w >= 1200 || h >= 700) {
        return "720p";
    }
    return `${h}p`;
}

export function formatScore(score?: number): string {
    if (score === undefined || score === null) {
        return "";
    }
    return score.toFixed(1);
}
