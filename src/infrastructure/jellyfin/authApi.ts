import { JellyfinApiError, JellyfinClient } from "./jellyfinClient";
import {
    AuthSession,
    UserProfile,
    QuickConnectState,
} from "@/common/types/user";
import {
    getAppName,
    CLIENT_VERSION,
    DEVICE_NAME,
} from "@/common/constants/config";
import { StorageService } from "../storage/storageService";

interface AuthenticateResponse {
    User: {
        Id: string;
        Name: string;
        ServerId: string;
        PrimaryImageTag?: string;
    };
    AccessToken: string;
    ServerId: string;
}

interface PublicUserResponse {
    Id: string;
    Name: string;
    ServerId: string;
    PrimaryImageTag?: string;
    HasPassword?: boolean;
}

interface QuickConnectInitiateResponse {
    Code: string;
    Secret: string;
    Authenticated: boolean;
}

export class AuthApi {
    private client: JellyfinClient;

    constructor(client: JellyfinClient) {
        this.client = client;
    }

    async authenticateByName(
        username: string,
        pw: string
    ): Promise<AuthSession> {
        const body = JSON.stringify({ Username: username, Pw: pw });
        const res = await this.client.request<AuthenticateResponse>(
            "/Users/AuthenticateByName",
            {
                method: "POST",
                body,
            }
        );

        return {
            user: {
                id: res.User.Id,
                name: res.User.Name,
                serverId: res.User.ServerId,
                primaryImageTag: res.User.PrimaryImageTag,
            },
            accessToken: res.AccessToken,
            serverId: res.ServerId,
            serverUrl: this.client.getServerUrl(),
        };
    }

    async getPublicUsers(): Promise<UserProfile[]> {
        const list =
            await this.client.request<PublicUserResponse[]>("/Users/Public");
        return (list || []).map((u) => ({
            id: u.Id,
            name: u.Name,
            serverId: u.ServerId,
            primaryImageTag: u.PrimaryImageTag,
            hasPassword: u.HasPassword,
        }));
    }

    /**
     * Step 1: Navigates on the current origin so the proxy sends Host: client.host.com to Jellyfin.
     */
    getSsoStartUrl(provider: string = "keycloak"): string {
        return `/sso/OID/start/${encodeURIComponent(provider)}`;
    }

    /**
     * Step 2: Validates the OIDC authorization code against Jellyfin in the background.
     * Rewritten by proxy to /sso/OID/redirect/{provider}?code=...&state=... with Host: client.host.com.
     * The HTML response from the plugin is discarded.
     */
    async validateSsoCallback(
        provider: string,
        paramsString: string
    ): Promise<void> {
        const validateUrl = `/api/sso-validate/${encodeURIComponent(provider)}?${paramsString}`;
        const response = await fetch(validateUrl, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Accept: "text/html",
            },
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(
                `Failed to validate OIDC callback (${response.status}): ${errorText || response.statusText}`
            );
        }
    }

    /**
     * Step 3: Exchanges the authorized single-use `state` for a Jellyfin AuthenticationResult JSON.
     * Forwarded by proxy to POST /sso/OID/Auth/{provider} on Jellyfin.
     */
    async claimSsoAuth(provider: string, state: string): Promise<AuthSession> {
        const deviceId = StorageService.getOrCreateDeviceId();
        const response = await fetch(
            `/sso/OID/Auth/${encodeURIComponent(provider)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    deviceId,
                    deviceName: DEVICE_NAME,
                    appName: getAppName(),
                    appVersion: CLIENT_VERSION,
                    data: state,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(
                `Failed to exchange SSO state for Jellyfin token (${response.status}): ${errorText || response.statusText}`
            );
        }

        const res: AuthenticateResponse = await response.json();
        return {
            user: {
                id: res.User.Id,
                name: res.User.Name,
                serverId: res.User.ServerId,
                primaryImageTag: res.User.PrimaryImageTag,
            },
            accessToken: res.AccessToken,
            serverId: res.ServerId,
            serverUrl: this.client.getServerUrl(),
        };
    }

    async initiateQuickConnect(): Promise<QuickConnectState> {
        const res = await this.client.request<QuickConnectInitiateResponse>(
            "/QuickConnect/Initiate",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: "{}",
            }
        );

        return {
            code: res.Code,
            secret: res.Secret,
            authenticated: res.Authenticated,
        };
    }

    async checkQuickConnect(secret: string): Promise<boolean> {
        const res = await this.client.request<{ Authenticated: boolean }>(
            "/QuickConnect/Connect",
            {
                params: { secret },
            }
        );
        return !!res.Authenticated;
    }

    async authenticateWithQuickConnect(secret: string): Promise<AuthSession> {
        const res = await this.client.request<AuthenticateResponse>(
            "/Users/AuthenticateWithQuickConnect",
            {
                params: { secret },
            }
        );

        return {
            user: {
                id: res.User.Id,
                name: res.User.Name,
                serverId: res.User.ServerId,
                primaryImageTag: res.User.PrimaryImageTag,
            },
            accessToken: res.AccessToken,
            serverId: res.ServerId,
            serverUrl: this.client.getServerUrl(),
        };
    }

    async validateSession(userId: string, token: string): Promise<boolean> {
        try {
            await this.client.request(`/Users/${userId}`, { token });
            return true;
        } catch (error) {
            if (
                error instanceof JellyfinApiError &&
                (error.status === 401 || error.status === 404)
            ) {
                return false;
            }
            throw error;
        }
    }
}
