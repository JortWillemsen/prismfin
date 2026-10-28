import { JellyfinClient } from "@/infrastructure/jellyfin/jellyfinClient";
import { AuthApi } from "@/infrastructure/jellyfin/authApi";
import { StorageService } from "@/infrastructure/storage/storageService";
import {
    AuthSession,
    UserProfile,
    QuickConnectState,
} from "@/common/types/user";

export class AuthService {
    private client: JellyfinClient;
    private authApi: AuthApi;
    private currentSession: AuthSession | null = null;

    constructor() {
        this.client = new JellyfinClient();
        this.authApi = new AuthApi(this.client);
        this.currentSession = StorageService.getSession();
    }

    getCurrentSession(): AuthSession | null {
        return this.currentSession;
    }

    isAuthenticated(): boolean {
        return !!this.currentSession?.accessToken;
    }

    async validateCurrentSession(): Promise<boolean> {
        if (
            !this.currentSession?.accessToken ||
            !this.currentSession?.user?.id
        ) {
            return false;
        }
        const isValid = await this.authApi.validateSession(
            this.currentSession.user.id,
            this.currentSession.accessToken
        );
        if (!isValid) {
            this.logout();
        }
        return isValid;
    }

    async getPublicUsers(): Promise<UserProfile[]> {
        return this.authApi.getPublicUsers();
    }

    async loginWithCredentials(
        username: string,
        pw: string
    ): Promise<AuthSession> {
        const session = await this.authApi.authenticateByName(username, pw);
        this.currentSession = session;
        StorageService.saveSession(session);
        return session;
    }

    logout(): void {
        this.currentSession = null;
        StorageService.clearSession();
    }

    getSsoLoginUrl(provider: string = "keycloak"): string {
        return this.authApi.getSsoStartUrl(provider);
    }

    startSsoLogin(provider: string = "keycloak"): void {
        window.location.assign(this.getSsoLoginUrl(provider));
    }

    async completeSsoCallback(
        provider: string = "keycloak",
        searchParamsString: string = window.location.search
    ): Promise<AuthSession> {
        const params = new URLSearchParams(searchParamsString);
        const state = params.get("state");
        const code = params.get("code");
        const error = params.get("error");

        if (error) {
            const errorDesc = params.get("error_description") || error;
            throw new Error(`OIDC Provider returned an error: ${errorDesc}`);
        }

        if (!state || !code) {
            throw new Error(
                'Missing OIDC "state" or "code" query parameters in callback URL.'
            );
        }

        // Step 2: Trigger server-side validation of the OIDC authorization code
        await this.authApi.validateSsoCallback(provider, params.toString());

        // Step 3: Exchange the now-validated single-use state for a Jellyfin token
        const session = await this.authApi.claimSsoAuth(provider, state);
        this.currentSession = session;
        StorageService.saveSession(session);
        return session;
    }

    async initiateQuickConnect(): Promise<QuickConnectState> {
        return this.authApi.initiateQuickConnect();
    }

    async pollQuickConnect(secret: string): Promise<AuthSession | null> {
        const isAuthorized = await this.authApi.checkQuickConnect(secret);
        if (!isAuthorized) {
            return null;
        }

        const session = await this.authApi.authenticateWithQuickConnect(secret);
        this.currentSession = session;
        StorageService.saveSession(session);
        return session;
    }
}

export const authService = new AuthService();
