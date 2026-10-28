function normalizeImageServerUrl(serverUrl: string): string {
    const clean = serverUrl.replace(/\/+$/, "");
    if (
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        clean.startsWith("http://")
    ) {
        return `${window.location.origin}/jellyfin-proxy`;
    }
    return clean;
}

export function getImageUrl(
    serverUrl: string,
    itemId: string,
    imageType: "Primary" | "Backdrop" | "Logo" | "Thumb" = "Primary",
    options?: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
        tag?: string;
    }
): string {
    const cleanServer = normalizeImageServerUrl(serverUrl);
    const params = new URLSearchParams();

    if (options?.quality) {
        params.set("quality", options.quality.toString());
    } else {
        params.set("quality", "90");
    }

    if (options?.maxWidth) {
        params.set("maxWidth", options.maxWidth.toString());
    }

    if (options?.maxHeight) {
        params.set("maxHeight", options.maxHeight.toString());
    }

    if (options?.tag) {
        params.set("tag", options.tag);
    }

    const query = params.toString();
    const queryPart = query ? `?${query}` : "";

    return `${cleanServer}/Items/${itemId}/Images/${imageType}${queryPart}`;
}

export function getUserAvatarUrl(
    serverUrl: string,
    userId: string,
    tag?: string
): string {
    const cleanServer = normalizeImageServerUrl(serverUrl);
    const tagPart = tag ? `?tag=${tag}` : "";
    return `${cleanServer}/Users/${userId}/Images/Primary${tagPart}`;
}
