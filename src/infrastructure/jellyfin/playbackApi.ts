import { JellyfinClient } from "./jellyfinClient";
import {
    PlaybackStreamInfo,
    AudioStreamTrack,
    SubtitleTrack,
} from "@/common/types/media";
import { StorageService } from "../storage/storageService";

interface JellyfinPlaybackInfoResponse {
    PlaySessionId?: string;
    MediaSources?: Array<{
        Id: string;
        Container?: string;
        SupportsDirectPlay?: boolean;
        SupportsDirectStream?: boolean;
        SupportsTranscoding?: boolean;
        TranscodingUrl?: string;
        TranscodingSubtitles?: string;
        TranscodingReasons?: string[];
        Bitrate?: number;
        RunTimeTicks?: number;
        MediaStreams?: Array<{
            Index: number;
            Type: string;
            DisplayTitle?: string;
            Language?: string;
            Codec?: string;
            IsDefault?: boolean;
            IsForced?: boolean;
            DeliveryUrl?: string;
            DeliveryMethod?: string;
            Width?: number;
            Height?: number;
            BitRate?: number;
            AverageFrameRate?: number;
            RealFrameRate?: number;
            Channels?: number;
            SampleRate?: number;
            ColorRange?: string;
            ColorSpace?: string;
            ColorTransfer?: string;
            ColorPrimaries?: string;
            BitDepth?: number;
            VideoRange?: string;
            DvVersionMajor?: number;
        }>;
    }>;
}

export class PlaybackApi {
    private client: JellyfinClient;

    constructor(client: JellyfinClient) {
        this.client = client;
    }

    async getPlaybackInfo(
        itemId: string,
        userId: string,
        token: string,
        title: string,
        maxBitrate?: number,
        audioIndex?: number,
        subtitleIndex?: number
    ): Promise<PlaybackStreamInfo> {
        const deviceId = StorageService.getOrCreateDeviceId();
        const server = this.client.getServerUrl();
        const streamingBitrate =
            maxBitrate && maxBitrate > 0 ? maxBitrate : 100000000;

        const params: Record<string, string | number | boolean | undefined> = {
            userId,
            StartTimeTicks: 0,
            IsPlayback: true,
            AutoOpenLiveStream: true,
        };
        if (audioIndex !== undefined && audioIndex >= 0) {
            params.AudioStreamIndex = audioIndex;
        }
        if (subtitleIndex !== undefined && subtitleIndex >= 0) {
            params.SubtitleStreamIndex = subtitleIndex;
        }

        const canPlayAudio = (mime: string) => {
            if (typeof document === "undefined") return false;
            const a = document.createElement("audio");
            return !!a.canPlayType && a.canPlayType(mime) !== "";
        };

        const supportedAudioList = ["aac", "mp3", "opus", "flac"];
        if (canPlayAudio('audio/mp4; codecs="ac-3"')) {
            supportedAudioList.push("ac3");
        }
        if (canPlayAudio('audio/mp4; codecs="ec-3"')) {
            supportedAudioList.push("eac3");
        }
        if (canPlayAudio('audio/mp4; codecs="alac"')) {
            supportedAudioList.push("alac");
        }
        const directAudioCodecs = supportedAudioList.join(",");

        const canPlayVideo = (mime: string) => {
            if (typeof document === "undefined") return false;
            const v = document.createElement("video");
            return !!v.canPlayType && v.canPlayType(mime) !== "";
        };

        const supportedVideoList = ["h264"];
        if (
            canPlayVideo('video/mp4; codecs="hev1.1.6.L93.B0"') ||
            canPlayVideo('video/mp4; codecs="hvc1.1.6.L93.B0"')
        ) {
            supportedVideoList.push("hevc");
        }
        if (canPlayVideo('video/webm; codecs="vp9"')) {
            supportedVideoList.push("vp9");
        }
        if (canPlayVideo('video/mp4; codecs="av01.0.08M.08"')) {
            supportedVideoList.push("av1");
        }
        const directVideoCodecs = supportedVideoList.join(",");

        const res = await this.client.request<JellyfinPlaybackInfoResponse>(
            `/Items/${itemId}/PlaybackInfo`,
            {
                method: "POST",
                token,
                params,
                body: JSON.stringify({
                    DeviceProfile: {
                        Name: "PrismFin Web",
                        MaxStreamingBitrate: streamingBitrate,
                        MusicStreamingTranscodingBitrate: 320000,
                        TimelineOffsetSeconds: 0,
                        DirectPlayProfiles: [
                            {
                                Container: "mp4,m4v,mov",
                                Type: "Video",
                                VideoCodec: directVideoCodecs,
                                AudioCodec: directAudioCodecs,
                            },
                            {
                                Container: "webm",
                                Type: "Video",
                                VideoCodec: "vp8,vp9,av1",
                                AudioCodec: "vorbis,opus",
                            },
                        ],
                        TranscodingProfiles: [
                            {
                                Container: "ts",
                                Type: "Video",
                                VideoCodec: directVideoCodecs,
                                AudioCodec: "aac,mp3",
                                Protocol: "hls",
                                Context: "Streaming",
                                MaxAudioChannels: "6",
                                MinSegments: "1",
                                BreakOnNonKeyFrames: true,
                            },
                        ],
                        SubtitleProfiles: [
                            {
                                Format: "vtt",
                                Method: "External",
                            },
                        ],
                    },
                }),
            }
        );

        const mediaSource = res.MediaSources?.[0];
        const mediaSourceId = mediaSource?.Id || itemId;
        const playSessionId = res.PlaySessionId;
        const durationSeconds = mediaSource?.RunTimeTicks
            ? Math.floor(mediaSource.RunTimeTicks / 10000000)
            : 0;

        const audioStreams: AudioStreamTrack[] = [];
        const subtitleStreams: SubtitleTrack[] = [];

        (mediaSource?.MediaStreams || []).forEach((st) => {
            if (st.Type === "Audio") {
                audioStreams.push({
                    index: st.Index,
                    displayTitle:
                        st.DisplayTitle || st.Language || `Track ${st.Index}`,
                    language: st.Language,
                    codec: st.Codec,
                    isDefault: !!st.IsDefault,
                });
            } else if (st.Type === "Subtitle") {
                subtitleStreams.push({
                    index: st.Index,
                    displayTitle:
                        st.DisplayTitle ||
                        st.Language ||
                        `Subtitle ${st.Index}`,
                    language: st.Language,
                    isDefault: !!st.IsDefault,
                    isForced: !!st.IsForced,
                    deliveryUrl: st.DeliveryUrl
                        ? `${server}${st.DeliveryUrl}`
                        : undefined,
                });
            }
        });

        const defaultAudio =
            audioStreams.find((a) => a.isDefault)?.index ??
            audioStreams[0]?.index ??
            0;
        const defaultSub =
            subtitleStreams.find((s) => s.isDefault)?.index ?? -1;

        const activeAudioIndex =
            audioIndex !== undefined ? audioIndex : defaultAudio;
        const activeAudioTrack = audioStreams.find(
            (a) => a.index === activeAudioIndex
        );
        const audioCodec = activeAudioTrack?.codec?.toLowerCase() || "";
        const audioNeedsTranscode =
            audioCodec !== "" &&
            !supportedAudioList.includes(audioCodec) &&
            !supportedAudioList.includes(audioCodec.replace(".", ""));

        const videoStream = (mediaSource?.MediaStreams || []).find(
            (s) => s.Type === "Video"
        );
        const videoCodec = videoStream?.Codec?.toLowerCase() || "";
        const videoNeedsTranscode =
            videoCodec !== "" && !supportedVideoList.includes(videoCodec);

        const container = (mediaSource?.Container || "").toLowerCase();
        const directPlayContainers = ["mp4", "m4v", "mov", "webm"];
        const isContainerDirectPlayable = directPlayContainers.some(
            (c) => container === c || container.includes(c)
        );

        // Check whether direct play of the static file is possible in this browser
        const canDirectPlay =
            (!maxBitrate || maxBitrate === 0) &&
            mediaSource?.SupportsDirectPlay === true &&
            isContainerDirectPlayable &&
            !videoNeedsTranscode &&
            !audioNeedsTranscode &&
            (audioIndex === undefined || audioIndex === defaultAudio);

        const requiresTranscode = !canDirectPlay;

        let isHls = false;
        let streamUrl = `${server}/Videos/${itemId}/stream?static=true&mediaSourceId=${mediaSourceId}&deviceId=${deviceId}&ApiKey=${token}`;

        if (requiresTranscode && mediaSource?.TranscodingUrl) {
            const rawTranscode = mediaSource.TranscodingUrl;
            streamUrl = rawTranscode.startsWith("http")
                ? rawTranscode
                : `${server}${rawTranscode}`;
            if (
                !streamUrl.includes("ApiKey=") &&
                !streamUrl.includes("api_key=")
            ) {
                streamUrl += `${streamUrl.includes("?") ? "&" : "?"}ApiKey=${token}`;
            }
            isHls = true;
        }

        const selectedAudioStream = (mediaSource?.MediaStreams || []).find(
            (s) => s.Index === activeAudioIndex && s.Type === "Audio"
        );
        const activeSubtitleIndex =
            subtitleIndex !== undefined ? subtitleIndex : defaultSub;
        const selectedSubtitleStream = (mediaSource?.MediaStreams || []).find(
            (s) => s.Index === activeSubtitleIndex && s.Type === "Subtitle"
        );

        const transUrl = mediaSource?.TranscodingUrl || "";
        const transUrlLower = transUrl.toLowerCase();
        const streamUrlLower = streamUrl.toLowerCase();

        const subIndexMatch = (transUrl + " " + streamUrl).match(
            /[?&]subtitlestreamindex=(\d+)/i
        );
        const embeddedTrackIndex = subIndexMatch
            ? parseInt(subIndexMatch[1], 10)
            : undefined;

        const hasEmbeddedSubtitles =
            isHls &&
            (mediaSource?.TranscodingSubtitles === "BurnIn" ||
                mediaSource?.TranscodingSubtitles === "Encode" ||
                transUrlLower.includes("burnin") ||
                transUrlLower.includes("subtitlestreamindex") ||
                transUrlLower.includes("subtitlemethod=encode") ||
                transUrlLower.includes("subtitlemethod=burnin") ||
                streamUrlLower.includes("burnin") ||
                streamUrlLower.includes("subtitlestreamindex") ||
                streamUrlLower.includes("subtitlemethod=encode") ||
                streamUrlLower.includes("subtitlemethod=burnin") ||
                selectedSubtitleStream?.DeliveryMethod === "Encode" ||
                selectedSubtitleStream?.DeliveryMethod === "Embed" ||
                selectedSubtitleStream?.DeliveryMethod === "BurnIn");

        const transReasons = mediaSource?.TranscodingReasons || [];

        // Determine if video is copied directly (Direct Stream / Remux) vs re-encoded (Transcode)
        const isVideoDirect =
            transUrlLower.includes("videocodec=copy") ||
            (!transReasons.includes("VideoCodecNotSupported") &&
                !transReasons.includes("VideoProfileNotSupported") &&
                !transReasons.includes("SecondaryAudioNotSupported") &&
                !videoNeedsTranscode &&
                (!maxBitrate || maxBitrate === 0));

        const isAudioDirect =
            transUrlLower.includes("audiocodec=copy") ||
            (!transReasons.includes("AudioCodecNotSupported") &&
                !transReasons.includes("AudioChannelsNotSupported") &&
                !audioNeedsTranscode);

        let streamType:
            "Direct Play" | "Direct Stream" | "Remux" | "Transcoding" =
            "Direct Play";

        if (isHls) {
            if (isVideoDirect && isAudioDirect) {
                streamType = "Remux";
            } else if (isVideoDirect && !isAudioDirect) {
                streamType = "Direct Stream";
            } else {
                streamType = "Transcoding";
            }
        }

        const reasonMap: Record<string, string> = {
            ContainerNotSupported: "Container format not supported natively",
            VideoCodecNotSupported: "Video codec requires transcoding",
            AudioCodecNotSupported:
                "Audio codec converted for browser playback",
            SubtitleCodecNotSupported: "Subtitle format requires video burning",
            AudioProfileNotSupported: "Audio profile not supported",
            VideoProfileNotSupported: "Video profile not supported",
            BitrateExceedsLimit: "Bitrate exceeds configured streaming limit",
            DirectPlayError: "Direct Play unavailable",
        };

        let transcodeReasonText = "";
        if (streamType === "Direct Play") {
            transcodeReasonText = "Direct Play: Native browser playback";
        } else if (streamType === "Remux") {
            transcodeReasonText = `Remux: Container (${(container || "mkv").toUpperCase()}) repacked to HLS; Video & Audio copied without re-encoding`;
        } else if (streamType === "Direct Stream") {
            transcodeReasonText = `Direct Stream: Video copied directly; Audio (${audioCodec.toUpperCase() || "Audio"}) converted to AAC for browser`;
        } else if (maxBitrate && maxBitrate > 0) {
            transcodeReasonText = `Video transcoded: Bitrate capped to ${Math.round(maxBitrate / 1000000)} Mbps by user quality setting`;
        } else if (transReasons.length > 0) {
            transcodeReasonText = transReasons
                .map((r) => reasonMap[r] || r)
                .join(", ");
        } else if (videoNeedsTranscode) {
            transcodeReasonText = `Video transcoded: Codec ${videoCodec.toUpperCase()} not supported natively by browser`;
        } else {
            transcodeReasonText = "Video transcoded for browser playback";
        }

        let videoHdr = "SDR (8-bit)";
        if (
            videoStream?.DvVersionMajor ||
            videoStream?.VideoRange?.includes("DOVI") ||
            videoStream?.VideoRange?.includes("Dolby Vision")
        ) {
            videoHdr = "Dolby Vision (10-bit)";
        } else if (
            videoStream?.ColorTransfer === "smpte2084" ||
            videoStream?.ColorSpace === "bt2020" ||
            videoStream?.VideoRange === "HDR"
        ) {
            videoHdr = "HDR10 (10-bit)";
        } else if (
            videoStream?.ColorTransfer === "arib-std-b67" ||
            videoStream?.VideoRange === "HLG"
        ) {
            videoHdr = "HLG (10-bit)";
        } else if (videoStream?.BitDepth && videoStream.BitDepth > 8) {
            videoHdr = `${videoStream.BitDepth}-bit SDR`;
        }

        const playbackDetails = {
            streamType,
            transcodeReasons: transReasons,
            transcodeReasonText,
            videoCodec: videoStream?.Codec?.toUpperCase(),
            videoWidth: videoStream?.Width,
            videoHeight: videoStream?.Height,
            videoBitrate: videoStream?.BitRate || mediaSource?.Bitrate,
            videoFps:
                videoStream?.RealFrameRate || videoStream?.AverageFrameRate,
            videoHdr,
            soundCodec:
                selectedAudioStream?.Codec?.toUpperCase() ||
                activeAudioTrack?.codec?.toUpperCase(),
            soundChannels: selectedAudioStream?.Channels,
            soundBitrate: selectedAudioStream?.BitRate,
            soundSampleRate: selectedAudioStream?.SampleRate,
        };

        return {
            itemId,
            title,
            streamUrl,
            isHls,
            startPositionSeconds: 0,
            durationSeconds,
            mediaSourceId,
            playSessionId,
            availableAudioStreams: audioStreams,
            availableSubtitles: subtitleStreams,
            selectedAudioIndex:
                audioIndex !== undefined ? audioIndex : defaultAudio,
            selectedSubtitleIndex:
                hasEmbeddedSubtitles && embeddedTrackIndex !== undefined
                    ? embeddedTrackIndex
                    : activeSubtitleIndex,
            hasEmbeddedSubtitles,
            playbackDetails,
        };
    }

    async reportPlaybackStart(
        itemId: string,
        playSessionId: string | undefined,
        positionTicks: number,
        token: string
    ): Promise<void> {
        try {
            await this.client.request("/Sessions/Playing", {
                method: "POST",
                token,
                body: JSON.stringify({
                    ItemId: itemId,
                    PlaySessionId: playSessionId,
                    PositionTicks: positionTicks,
                    CanSeek: true,
                }),
            });
        } catch {
            // Ignore non-fatal playback ping errors
        }
    }

    async reportPlaybackProgress(
        itemId: string,
        playSessionId: string | undefined,
        positionTicks: number,
        isPaused: boolean,
        token: string
    ): Promise<void> {
        try {
            await this.client.request("/Sessions/Playing/Progress", {
                method: "POST",
                token,
                body: JSON.stringify({
                    ItemId: itemId,
                    PlaySessionId: playSessionId,
                    PositionTicks: positionTicks,
                    IsPaused: isPaused,
                    CanSeek: true,
                }),
            });
        } catch {
            // Ignore non-fatal progress errors
        }
    }

    async reportPlaybackStopped(
        itemId: string,
        playSessionId: string | undefined,
        positionTicks: number,
        token: string
    ): Promise<void> {
        try {
            await this.client.request("/Sessions/Playing/Stopped", {
                method: "POST",
                token,
                body: JSON.stringify({
                    ItemId: itemId,
                    PlaySessionId: playSessionId,
                    PositionTicks: positionTicks,
                }),
            });
        } catch {
            // Ignore non-fatal stop errors
        }
    }
}
