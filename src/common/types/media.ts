export type MediaType =
    | "Movie"
    | "Series"
    | "Season"
    | "Episode"
    | "BoxSet"
    | "Playlist"
    | "Person"
    | "Folder";

export interface PersonItem {
    id: string;
    name: string;
    role: string;
    type: string;
    primaryImageTag?: string;
}

export interface SceneItem {
    name: string;
    startPositionTicks: number;
    startPositionSeconds: number;
    imageTag?: string;
}

export interface MediaItem {
    id: string;
    name: string;
    originalTitle?: string;
    type: MediaType;
    overview?: string;
    productionYear?: number;
    communityRating?: number;
    criticRating?: number;
    officialRating?: string;
    runTimeTicks?: number;
    runTimeMinutes?: number;
    primaryImageTag?: string;
    backdropImageTag?: string;
    logoImageTag?: string;
    thumbImageTag?: string;
    logoItemId?: string;
    genres?: string[];
    studios?: string[];
    director?: string;
    isFavorite: boolean;
    playbackPositionTicks?: number;
    played?: boolean;
    seriesId?: string;
    seriesName?: string;
    seasonId?: string;
    seasonName?: string;
    episodeNumber?: number;
    seasonNumber?: number;
    collectionId?: string;
    collectionName?: string;
    collectionImageTag?: string;
    videoResolution?: string;
    videoCodec?: string;
    audioCodec?: string;
    hdrType?: string;
    people?: PersonItem[];
    scenes?: SceneItem[];
    trickplayInfo?: TrickplayManifest;
}

export interface TrickplayManifest {
    width: number;
    height: number;
    tileWidth: number;
    tileHeight: number;
    thumbnailCount: number;
    interval: number;
    bandwidth?: number;
}

export interface HomeSection {
    id: string;
    key: string;
    name: string;
    viewMode: "Portrait" | "Landscape";
    items: MediaItem[];
}

export interface PlaybackStreamDetails {
    streamType: "Direct Play" | "Direct Stream" | "Remux" | "Transcoding";
    transcodeReasons: string[];
    transcodeReasonText?: string;
    videoCodec?: string;
    videoWidth?: number;
    videoHeight?: number;
    videoBitrate?: number;
    videoFps?: number;
    videoHdr?: string;
    soundCodec?: string;
    soundChannels?: number;
    soundBitrate?: number;
    soundSampleRate?: number;
}

export interface PlaybackStreamInfo {
    itemId: string;
    title: string;
    seriesTitle?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    streamUrl: string;
    isHls: boolean;
    startPositionSeconds: number;
    durationSeconds: number;
    mediaSourceId?: string;
    playSessionId?: string;
    availableAudioStreams: AudioStreamTrack[];
    availableSubtitles: SubtitleTrack[];
    selectedAudioIndex: number;
    selectedSubtitleIndex: number;
    trickplayInfo?: TrickplayManifest;
    hasEmbeddedSubtitles?: boolean;
    playbackDetails?: PlaybackStreamDetails;
}

export interface AudioStreamTrack {
    index: number;
    displayTitle: string;
    language?: string;
    codec?: string;
    isDefault: boolean;
}

export interface SubtitleTrack {
    index: number;
    displayTitle: string;
    language?: string;
    isDefault: boolean;
    isForced: boolean;
    deliveryUrl?: string;
}

export interface SubtitleSettings {
    color: string;
    bgColor: string;
    bgOpacity: number;
    fontSize: number;
    margin: number;
    alignment: "left" | "center" | "right";
}
