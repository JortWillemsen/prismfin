export interface PrismFinRuntimeConfig {
    appName?: string;
    appLogoUrl?: string;
    appIconUrl?: string;
    appFaviconUrl?: string;
    accentColor?: string;
    featuredPlaylist?: string;
    defaultServerUrl?: string;
}

declare global {
    interface Window {
        __PRISMFIN_CONFIG__?: PrismFinRuntimeConfig;
    }
}

export const CLIENT_VERSION = "0.7.0";
export const DEVICE_NAME = "Web Client";

export function getAppName(): string {
    return (
        window.__PRISMFIN_CONFIG__?.appName ||
        import.meta.env?.VITE_APP_NAME ||
        "PrismFin"
    );
}

export function getAppLogoUrl(): string {
    return (
        window.__PRISMFIN_CONFIG__?.appLogoUrl ||
        import.meta.env?.VITE_APP_LOGO_URL ||
        "/assets/branding/Logo.png"
    );
}

export function getAppIconUrl(): string {
    return (
        window.__PRISMFIN_CONFIG__?.appIconUrl ||
        import.meta.env?.VITE_APP_ICON_URL ||
        "/assets/branding/icon.png"
    );
}

export function getAppFaviconUrl(): string {
    return (
        window.__PRISMFIN_CONFIG__?.appFaviconUrl ||
        import.meta.env?.VITE_APP_FAVICON_URL ||
        "/assets/branding/favicon.png"
    );
}

export function getAppAccentColor(): string {
    return (
        window.__PRISMFIN_CONFIG__?.accentColor ||
        import.meta.env?.VITE_APP_ACCENT_COLOR ||
        "#06A1DB"
    );
}

export function getFeaturedPlaylistName(): string {
    return (
        window.__PRISMFIN_CONFIG__?.featuredPlaylist ||
        import.meta.env?.VITE_FEATURED_PLAYLIST_NAME ||
        ""
    );
}

export function getDefaultServerUrl(): string {
    return (
        window.__PRISMFIN_CONFIG__?.defaultServerUrl ||
        import.meta.env?.VITE_JELLYFIN_SERVER_URL ||
        "http://jellyfin.local:8096:30013"
    );
}

export const DEFAULT_SERVER_URL = getDefaultServerUrl();
export const CLIENT_NAME = getAppName();

export const STORAGE_KEYS = {
    session: "prismfin_session",
    serverUrl: "prismfin_server_url",
    featuredPlaylistId: "prismfin_featured_playlist_id",
    subtitleSettings: "prismfin_subtitle_settings",
    preferredSubtitleLanguage: "prismfin_preferred_subtitle_language",
    preferredSubtitleEnabled: "prismfin_preferred_subtitle_enabled",
};

export function hexToRgb(hex: string): string {
    let clean = hex.replace("#", "").trim();
    if (clean.length === 3) {
        clean = clean
            .split("")
            .map((c) => c + c)
            .join("");
    }
    if (clean.length === 6) {
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `${r}, ${g}, ${b}`;
        }
    }
    return "6, 161, 219";
}

export function applyAppBranding(): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const accent = getAppAccentColor();
    const rgb = hexToRgb(accent);

    root.style.setProperty("--color-accent", accent);
    root.style.setProperty("--color-accent-rgb", rgb);
    root.style.setProperty("--color-accent-hover", accent);

    const appName = getAppName();
    if (appName) {
        document.title = appName;

        const appleTitleMeta = document.querySelector(
            'meta[name="apple-mobile-web-app-title"]'
        );
        if (appleTitleMeta) {
            appleTitleMeta.setAttribute("content", appName);
        }

        const appNameMeta = document.querySelector(
            'meta[name="application-name"]'
        );
        if (appNameMeta) {
            appNameMeta.setAttribute("content", appName);
        }
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta && accent) {
        themeColorMeta.setAttribute("content", accent);
    }

    const favicon = getAppFaviconUrl();
    if (favicon) {
        const favicons = document.querySelectorAll(
            "link[rel*='icon']:not([rel='apple-touch-icon'])"
        );
        favicons.forEach((l) => ((l as HTMLLinkElement).href = favicon));
    }

    const iconUrl = getAppIconUrl();
    if (iconUrl && iconUrl !== "/assets/branding/icon.png") {
        const appleIcons = document.querySelectorAll(
            "link[rel='apple-touch-icon']"
        );
        appleIcons.forEach((l) => ((l as HTMLLinkElement).href = iconUrl));
    }
}
