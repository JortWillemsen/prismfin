/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_JELLYFIN_SERVER_URL?: string;
    readonly VITE_APP_NAME?: string;
    readonly VITE_APP_LOGO_URL?: string;
    readonly VITE_APP_ICON_URL?: string;
    readonly VITE_APP_FAVICON_URL?: string;
    readonly VITE_APP_ACCENT_COLOR?: string;
    readonly VITE_FEATURED_PLAYLIST_NAME?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
