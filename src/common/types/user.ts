export interface UserProfile {
    id: string;
    name: string;
    serverId: string;
    primaryImageTag?: string;
    hasPassword?: boolean;
}

export interface AuthSession {
    user: UserProfile;
    accessToken: string;
    serverId: string;
    serverUrl: string;
}

export interface QuickConnectState {
    code: string;
    secret: string;
    authenticated: boolean;
}
