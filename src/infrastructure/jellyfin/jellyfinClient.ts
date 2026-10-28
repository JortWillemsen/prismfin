import {
    CLIENT_NAME,
    CLIENT_VERSION,
    DEVICE_NAME,
} from "@/common/constants/config";
import { StorageService } from "../storage/storageService";

export interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
    token?: string;
}

export class JellyfinClient {
    private serverUrl: string;

    constructor(serverUrl?: string) {
        this.serverUrl = (serverUrl || StorageService.getServerUrl()).replace(
            /\/+$/,
            ""
        );
    }

    setServerUrl(url: string): void {
        this.serverUrl = url.replace(/\/+$/, "");
    }

    getServerUrl(): string {
        if (
            typeof window !== "undefined" &&
            window.location.protocol === "https:" &&
            this.serverUrl.startsWith("http://")
        ) {
            return `${window.location.origin}/jellyfin-proxy`;
        }
        return this.serverUrl;
    }

    private buildAuthHeader(token?: string): string {
        const deviceId = StorageService.getOrCreateDeviceId();
        let header = `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${deviceId}", Version="${CLIENT_VERSION}"`;
        if (token) {
            header += `, Token="${token}"`;
        }
        return header;
    }

    async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const { params, token, headers = {}, ...rest } = options;
        const normalizedEndpoint = endpoint.startsWith("/")
            ? endpoint
            : `/${endpoint}`;

        const effectiveServerUrl = this.getServerUrl();
        const url = new URL(`${effectiveServerUrl}${normalizedEndpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, val]) => {
                if (val !== undefined && val !== null) {
                    url.searchParams.set(key, val.toString());
                }
            });
        }

        const authHeader = this.buildAuthHeader(token);
        const reqHeaders: Record<string, string> = {
            Authorization: authHeader,
            Accept: "application/json",
            ...((headers as Record<string, string>) || {}),
        };

        if (
            rest.body &&
            typeof rest.body === "string" &&
            !reqHeaders["Content-Type"]
        ) {
            reqHeaders["Content-Type"] = "application/json";
        }

        const response = await fetch(url.toString(), {
            ...rest,
            headers: reqHeaders,
        });

        if (!response.ok) {
            if (response.status === 401) {
                StorageService.clearSession();
                if (typeof window !== "undefined") {
                    window.dispatchEvent(
                        new CustomEvent("prismfin:unauthorized")
                    );
                }
            }
            const errorText = await response.text().catch(() => "");
            throw new Error(
                `Jellyfin API error (${response.status}): ${errorText || response.statusText}`
            );
        }

        if (response.status === 204) {
            return {} as T;
        }

        const contentType = response.headers.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
            return (await response.json()) as T;
        }

        return (await response.text()) as unknown as T;
    }
}
