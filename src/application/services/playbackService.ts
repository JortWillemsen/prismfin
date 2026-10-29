import { JellyfinClient } from "@/infrastructure/jellyfin/jellyfinClient";
import { PlaybackApi } from "@/infrastructure/jellyfin/playbackApi";
import { MediaApi } from "@/infrastructure/jellyfin/mediaApi";
import {
    MediaItem,
    PlaybackStreamInfo,
    TrickplayManifest,
} from "@/common/types/media";
import { authService } from "./authService";

export class PlaybackService {
    private client: JellyfinClient;
    private playbackApi: PlaybackApi;
    private mediaApi: MediaApi;
    private progressInterval: number | null = null;
    private currentStreamInfo: PlaybackStreamInfo | null = null;
    private currentItem: MediaItem | null = null;
    private lastReportedSeconds = 0;

    constructor() {
        this.client = new JellyfinClient();
        this.playbackApi = new PlaybackApi(this.client);
        this.mediaApi = new MediaApi(this.client);
    }

    private getSession() {
        const session = authService.getCurrentSession();
        if (!session) {
            throw new Error("User not authenticated");
        }
        return session;
    }

    async fetchTrickplay(
        itemId: string
    ): Promise<TrickplayManifest | undefined> {
        try {
            const { user, accessToken } = this.getSession();
            const full = await this.mediaApi.getItem(
                user.id,
                itemId,
                accessToken
            );
            return full.trickplayInfo;
        } catch {
            return undefined;
        }
    }

    async preparePlayback(
        item: MediaItem,
        maxBitrate?: number,
        audioIndex?: number,
        subtitleIndex?: number
    ): Promise<PlaybackStreamInfo> {
        const { user, accessToken } = this.getSession();
        const streamInfo = await this.playbackApi.getPlaybackInfo(
            item.id,
            user.id,
            accessToken,
            item.name,
            maxBitrate,
            audioIndex,
            subtitleIndex
        );

        if (item.trickplayInfo) {
            streamInfo.trickplayInfo = item.trickplayInfo;
        } else {
            try {
                const fullItem = await this.mediaApi.getItem(
                    user.id,
                    item.id,
                    accessToken
                );
                if (fullItem.trickplayInfo) {
                    item.trickplayInfo = fullItem.trickplayInfo;
                    streamInfo.trickplayInfo = fullItem.trickplayInfo;
                }
                if (!item.scenes && fullItem.scenes) {
                    item.scenes = fullItem.scenes;
                }
            } catch {
                // Ignore fetch failure
            }
        }

        if (item.playbackPositionTicks && item.playbackPositionTicks > 0) {
            streamInfo.startPositionSeconds = Math.floor(
                item.playbackPositionTicks / 10000000
            );
        }

        this.currentStreamInfo = streamInfo;
        this.currentItem = item;
        return streamInfo;
    }

    getCurrentItem(): MediaItem | null {
        return this.currentItem;
    }

    updatePosition(positionSeconds: number): void {
        this.lastReportedSeconds = positionSeconds;
    }

    startReporting(positionSeconds: number): void {
        const session = authService.getCurrentSession();
        if (!session || !this.currentStreamInfo) {
            return;
        }

        this.updatePosition(positionSeconds);
        const positionTicks = Math.floor(positionSeconds * 10000000);

        this.playbackApi.reportPlaybackStart(
            this.currentStreamInfo.itemId,
            this.currentStreamInfo.playSessionId,
            positionTicks,
            session.accessToken
        );

        this.stopReporting();

        this.progressInterval = window.setInterval(() => {
            if (!this.currentStreamInfo) {
                return;
            }
            const currentTicks = Math.floor(
                this.lastReportedSeconds * 10000000
            );
            this.playbackApi.reportPlaybackProgress(
                this.currentStreamInfo.itemId,
                this.currentStreamInfo.playSessionId,
                currentTicks,
                false,
                session.accessToken
            );
        }, 10000);
    }

    reportProgress(positionSeconds: number, isPaused: boolean): void {
        this.updatePosition(positionSeconds);
        const session = authService.getCurrentSession();
        if (!session || !this.currentStreamInfo) {
            return;
        }
        const currentTicks = Math.floor(positionSeconds * 10000000);
        this.playbackApi.reportPlaybackProgress(
            this.currentStreamInfo.itemId,
            this.currentStreamInfo.playSessionId,
            currentTicks,
            isPaused,
            session.accessToken
        );
    }

    stopReporting(): void {
        if (this.progressInterval !== null) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    async stopPlayback(finalPositionSeconds: number): Promise<void> {
        this.stopReporting();
        const session = authService.getCurrentSession();
        if (session && this.currentStreamInfo) {
            const finalTicks = Math.floor(finalPositionSeconds * 10000000);
            await this.playbackApi.reportPlaybackStopped(
                this.currentStreamInfo.itemId,
                this.currentStreamInfo.playSessionId,
                finalTicks,
                session.accessToken
            );
        }
        this.currentStreamInfo = null;
        this.currentItem = null;
    }
}

export const playbackService = new PlaybackService();
