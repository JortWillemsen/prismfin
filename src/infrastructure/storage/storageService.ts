import { STORAGE_KEYS, DEFAULT_SERVER_URL } from "@/common/constants/config";
import { AuthSession } from "@/common/types/user";
import { SubtitleSettings } from "@/common/types/media";

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
    color: "#ffffff",
    bgColor: "0,0,0",
    bgOpacity: 0.75,
    fontSize: 22,
    margin: 40,
    alignment: "center",
};

export class StorageService {
    static getSession(): AuthSession | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.session);
            if (!raw) {
                return null;
            }
            const session = JSON.parse(raw) as AuthSession;
            if (
                session &&
                typeof window !== "undefined" &&
                window.location.protocol === "https:" &&
                session.serverUrl?.startsWith("http://")
            ) {
                session.serverUrl = `${window.location.origin}/jellyfin-proxy`;
            }
            return session;
        } catch {
            return null;
        }
    }

    static saveSession(session: AuthSession): void {
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    }

    static clearSession(): void {
        localStorage.removeItem(STORAGE_KEYS.session);
    }

    static getServerUrl(): string {
        const url =
            localStorage.getItem(STORAGE_KEYS.serverUrl) || DEFAULT_SERVER_URL;
        if (
            typeof window !== "undefined" &&
            window.location.protocol === "https:" &&
            url.startsWith("http://")
        ) {
            return `${window.location.origin}/jellyfin-proxy`;
        }
        return url;
    }

    static saveServerUrl(url: string): void {
        localStorage.setItem(STORAGE_KEYS.serverUrl, url);
    }

    static getFeaturedPlaylistId(): string | null {
        return localStorage.getItem(STORAGE_KEYS.featuredPlaylistId);
    }

    static saveFeaturedPlaylistId(id: string): void {
        localStorage.setItem(STORAGE_KEYS.featuredPlaylistId, id);
    }

    static getOrCreateDeviceId(): string {
        let deviceId = localStorage.getItem("prismfin_device_id");
        if (!deviceId) {
            deviceId = "pf_" + Math.random().toString(36).substring(2, 12);
            localStorage.setItem("prismfin_device_id", deviceId);
        }
        return deviceId;
    }

    static getSubtitleSettings(): SubtitleSettings {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.subtitleSettings);
            if (raw) {
                const parsed = JSON.parse(raw);
                let fontSize = DEFAULT_SUBTITLE_SETTINGS.fontSize;
                if (typeof parsed.fontSize === "number") {
                    fontSize = parsed.fontSize;
                } else if (typeof parsed.size === "string") {
                    fontSize = parseInt(parsed.size, 10) || 22;
                }
                const alignment =
                    parsed.alignment === "left" ||
                    parsed.alignment === "right" ||
                    parsed.alignment === "center"
                        ? parsed.alignment
                        : "center";
                return {
                    ...DEFAULT_SUBTITLE_SETTINGS,
                    ...parsed,
                    fontSize,
                    alignment,
                };
            }
        } catch {
            // ignore
        }
        return DEFAULT_SUBTITLE_SETTINGS;
    }

    static saveSubtitleSettings(settings: SubtitleSettings): void {
        try {
            localStorage.setItem(
                STORAGE_KEYS.subtitleSettings,
                JSON.stringify(settings)
            );
        } catch {
            // ignore
        }
    }

    static getPreferredSubtitleLanguage(): string | null {
        try {
            return localStorage.getItem(STORAGE_KEYS.preferredSubtitleLanguage);
        } catch {
            return null;
        }
    }

    static savePreferredSubtitleLanguage(lang: string | null): void {
        try {
            if (lang) {
                localStorage.setItem(
                    STORAGE_KEYS.preferredSubtitleLanguage,
                    lang
                );
            } else {
                localStorage.removeItem(STORAGE_KEYS.preferredSubtitleLanguage);
            }
        } catch {
            // ignore
        }
    }

    static getPreferredSubtitleEnabled(): boolean | null {
        try {
            const val = localStorage.getItem(
                STORAGE_KEYS.preferredSubtitleEnabled
            );
            if (val === null) return null;
            return val === "true";
        } catch {
            return null;
        }
    }

    static savePreferredSubtitleEnabled(enabled: boolean): void {
        try {
            localStorage.setItem(
                STORAGE_KEYS.preferredSubtitleEnabled,
                enabled ? "true" : "false"
            );
        } catch {
            // ignore
        }
    }
}
