import React, { useRef, useState, useEffect, useCallback } from "react";
import Hls from "hls.js/light";
import {
    MediaItem,
    PlaybackStreamInfo,
    SceneItem,
    SubtitleSettings,
    TrickplayManifest,
} from "@/common/types/media";
import { useApp } from "@/application/state/appContext";
import { playbackService } from "@/application/services/playbackService";
import { StorageService } from "@/infrastructure/storage/storageService";
import { formatTimeSeconds } from "@/common/utils/formatters";
import { getImageUrl } from "@/common/utils/image";
import { GlassDropdown, DropdownOption } from "../glass-dropdown/glassDropdown";
import "./play-screen.scss";

interface PlayScreenProps {
    item: MediaItem;
    onClose: () => void;
}

const QUALITY_PRESETS: DropdownOption[] = [
    { label: "Auto (Direct Play)", value: "auto" },
    { label: "100 Mbps (4K UHD)", value: "100m" },
    { label: "60 Mbps (4K)", value: "60m" },
    { label: "40 Mbps (1080p High)", value: "40m" },
    { label: "20 Mbps (1080p Med)", value: "20m" },
    { label: "10 Mbps (1080p)", value: "10m" },
    { label: "4 Mbps (720p)", value: "4m" },
    { label: "2 Mbps (480p)", value: "2m" },
    { label: "Custom Bitrate", value: "custom" },
];

const SPEED_OPTIONS: DropdownOption[] = [
    { label: "0.5x", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1.0x (Normal)", value: 1.0 },
    { label: "1.25x", value: 1.25 },
    { label: "1.5x", value: 1.5 },
    { label: "2.0x", value: 2.0 },
];

const TEXT_COLORS = [
    { label: "White", value: "#ffffff" },
    { label: "Yellow", value: "#ffe600" },
    { label: "Cyan", value: "#00ffff" },
    { label: "Magenta", value: "#ff00ff" },
];

const BG_COLORS = [
    { label: "Black", value: "0,0,0", swatchColor: "#000000" },
    { label: "Dark Grey", value: "34,34,34", swatchColor: "#222222" },
    { label: "Navy", value: "11,19,43", swatchColor: "#0b132b" },
    { label: "Transparent", value: "transparent", isTransparent: true },
];

export const PlayScreen: React.FC<PlayScreenProps> = ({ item, onClose }) => {
    const { session } = useApp();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const currentTimeRef = useRef<number>(0);

    // Audio Boost via Web Audio API
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

    const [streamInfo, setStreamInfo] = useState<PlaybackStreamInfo | null>(
        null
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [audioBoost, setAudioBoost] = useState<number>(1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosPercent, setHoverPosPercent] = useState<number>(0);
    const [isFullscreen, setIsFullscreen] = useState(
        () => !!document.fullscreenElement
    );
    const [activePopover, setActivePopover] = useState<
        "audio" | "subtitles" | "video" | null
    >(null);
    const [trickplayData, setTrickplayData] = useState<
        TrickplayManifest | undefined
    >(item.trickplayInfo);

    useEffect(() => {
        if (item.trickplayInfo) {
            setTrickplayData(item.trickplayInfo);
        } else if (streamInfo?.trickplayInfo) {
            setTrickplayData(streamInfo.trickplayInfo);
        } else if (session?.serverUrl && item.id) {
            playbackService.fetchTrickplay(item.id).then((tp) => {
                if (tp) setTrickplayData(tp);
            });
        }
    }, [
        item.id,
        item.trickplayInfo,
        streamInfo?.trickplayInfo,
        session?.serverUrl,
    ]);

    // Lock document scroll while playback screen is open
    useEffect(() => {
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";

        return () => {
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.body.style.overflow = originalBodyOverflow;
        };
    }, []);

    const handleBack = async () => {
        const finalPos =
            videoRef.current?.currentTime ?? currentTimeRef.current;
        try {
            playbackService.reportProgress(finalPos, true);
            await playbackService.stopPlayback(finalPos);
        } catch {
            // Ignore error
        } finally {
            onClose();
        }
    };

    // Subtitles & Audio Stream state
    const [selectedSubIndex, setSelectedSubIndex] = useState<number>(-1);
    const [selectedAudioIndex, setSelectedAudioIndex] = useState<number>(0);
    const [subSettings, setSubSettings] = useState<SubtitleSettings>(() =>
        StorageService.getSubtitleSettings()
    );
    const [activeCueText, setActiveCueText] = useState<string>("");

    const updateSubSettings = (partial: Partial<SubtitleSettings>) => {
        setSubSettings((prev) => {
            const next = { ...prev, ...partial };
            StorageService.saveSubtitleSettings(next);
            return next;
        });
    };

    const handleSubtitleTrackChange = (newIndex: number) => {
        setSelectedSubIndex(newIndex);
        if (newIndex >= 0) {
            StorageService.savePreferredSubtitleEnabled(true);
            const track = streamInfo?.availableSubtitles.find(
                (s) => s.index === newIndex
            );
            if (track?.language) {
                StorageService.savePreferredSubtitleLanguage(track.language);
            }
        } else {
            StorageService.savePreferredSubtitleEnabled(false);
        }
    };

    // Video Quality & Bitrate
    const [qualityPreset, setQualityPreset] = useState<string>("auto");
    const [customBitrateMbps, setCustomBitrateMbps] = useState<number>(20);
    const [showPlaybackInfo, setShowPlaybackInfo] = useState<boolean>(false);
    const [realTimeStats, setRealTimeStats] = useState({
        fps: 0,
        bitrateMbps: 0,
        width: 0,
        height: 0,
    });

    const hideTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!showPlaybackInfo) return;
        let lastTime = performance.now();
        let lastFrames = 0;

        const interval = window.setInterval(() => {
            const video = videoRef.current;
            if (!video) return;

            const now = performance.now();
            const deltaSec = (now - lastTime) / 1000;
            lastTime = now;

            let currentFps = streamInfo?.playbackDetails?.videoFps || 0;
            if (
                typeof (
                    video as unknown as {
                        getVideoPlaybackQuality?: () => {
                            totalVideoFrames: number;
                        };
                    }
                ).getVideoPlaybackQuality === "function"
            ) {
                const quality = (
                    video as unknown as {
                        getVideoPlaybackQuality: () => {
                            totalVideoFrames: number;
                        };
                    }
                ).getVideoPlaybackQuality();
                const totalFrames = quality.totalVideoFrames;
                if (
                    deltaSec > 0 &&
                    lastFrames > 0 &&
                    totalFrames >= lastFrames
                ) {
                    currentFps = Math.round(
                        (totalFrames - lastFrames) / deltaSec
                    );
                }
                lastFrames = totalFrames;
            }

            let liveBitrate = streamInfo?.playbackDetails?.videoBitrate || 0;
            if (
                hlsRef.current &&
                hlsRef.current.levels &&
                hlsRef.current.currentLevel >= 0
            ) {
                const lvl = hlsRef.current.levels[hlsRef.current.currentLevel];
                if (lvl && lvl.bitrate) {
                    liveBitrate = lvl.bitrate;
                }
            }

            setRealTimeStats({
                fps: currentFps || streamInfo?.playbackDetails?.videoFps || 24,
                bitrateMbps: liveBitrate
                    ? Number((liveBitrate / 1000000).toFixed(2))
                    : 0,
                width:
                    video.videoWidth ||
                    streamInfo?.playbackDetails?.videoWidth ||
                    0,
                height:
                    video.videoHeight ||
                    streamInfo?.playbackDetails?.videoHeight ||
                    0,
            });
        }, 1000);

        return () => window.clearInterval(interval);
    }, [showPlaybackInfo, streamInfo]);

    const resetInactivityTimer = useCallback(() => {
        setShowControls(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => {
            if (isPlaying && !activePopover) {
                setShowControls(false);
            }
        }, 3500);
    }, [isPlaying, activePopover]);

    // Apply Web Audio gain node
    const applyAudioBoost = useCallback((boostVal: number) => {
        setAudioBoost(boostVal);
        const video = videoRef.current;
        if (!video) return;

        try {
            if (!audioContextRef.current) {
                const AudioCtx =
                    window.AudioContext ||
                    (
                        window as unknown as {
                            webkitAudioContext: typeof AudioContext;
                        }
                    ).webkitAudioContext;
                const ctx = new AudioCtx();
                const source = ctx.createMediaElementSource(video);
                const gain = ctx.createGain();
                gain.gain.value = boostVal;
                source.connect(gain);
                gain.connect(ctx.destination);
                audioContextRef.current = ctx;
                gainNodeRef.current = gain;
                sourceNodeRef.current = source;
            } else {
                if (audioContextRef.current.state === "suspended") {
                    audioContextRef.current.resume().catch(() => {});
                }
                if (gainNodeRef.current) {
                    gainNodeRef.current.gain.value = boostVal;
                }
            }
        } catch (e) {
            console.warn("AudioContext setup notice:", e);
        }
    }, []);

    // Stream loader using HLS or Direct Play
    const loadStream = useCallback(
        (info: PlaybackStreamInfo, startPos: number) => {
            const video = videoRef.current;
            if (!video) return;

            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }

            if (info.isHls && Hls.isSupported()) {
                const hls = new Hls({
                    startPosition: startPos,
                    enableWorker: true,
                });
                hls.loadSource(info.streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(() => {});
                });
                hlsRef.current = hls;
            } else {
                video.src = info.streamUrl;
                if (startPos > 0) {
                    if (video.readyState >= 1) {
                        video.currentTime = startPos;
                    } else {
                        video.onloadedmetadata = () => {
                            video.currentTime = startPos;
                        };
                    }
                }
                video.play().catch(() => {});
            }
        },
        []
    );

    // Initial stream preparation
    useEffect(() => {
        let isMounted = true;
        playbackService
            .preparePlayback(item)
            .then((info) => {
                if (!isMounted) return;
                setStreamInfo(info);

                const preferredEnabled =
                    StorageService.getPreferredSubtitleEnabled();
                const preferredLang =
                    StorageService.getPreferredSubtitleLanguage();

                let subIdx = info.selectedSubtitleIndex ?? -1;
                if (preferredEnabled === false) {
                    subIdx = -1;
                } else if (
                    preferredLang &&
                    info.availableSubtitles.length > 0
                ) {
                    const match = info.availableSubtitles.find(
                        (s) =>
                            s.language?.toLowerCase() ===
                            preferredLang.toLowerCase()
                    );
                    if (match) {
                        subIdx = match.index;
                    }
                }

                setSelectedSubIndex(subIdx);
                setSelectedAudioIndex(info.selectedAudioIndex ?? 0);
                loadStream(info, info.startPositionSeconds);
            })
            .catch(() => {});

        return () => {
            isMounted = false;
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (
                audioContextRef.current &&
                audioContextRef.current.state !== "closed"
            ) {
                audioContextRef.current.close().catch(() => {});
            }
            const finalPos =
                currentTimeRef.current ||
                (videoRef.current ? videoRef.current.currentTime : 0);
            playbackService.stopPlayback(finalPos);
        };
    }, [item, loadStream]);

    // Track mode synchronization for WebVTT subtitle stream
    useEffect(() => {
        if (!videoRef.current) return;
        const tracks = videoRef.current.textTracks;
        const shouldParse =
            !streamInfo?.hasEmbeddedSubtitles && selectedSubIndex >= 0;
        const isMobileDevice =
            typeof navigator !== "undefined" &&
            (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                (typeof window !== "undefined" && window.innerWidth <= 768));
        const useNativeSubtitles =
            isMobileDevice ||
            !!(videoRef.current as any)?.webkitDisplayingFullscreen;
        const targetMode = shouldParse
            ? useNativeSubtitles
                ? "showing"
                : "hidden"
            : "disabled";

        for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = targetMode;
        }
        if (!shouldParse) {
            setActiveCueText("");
        }
    }, [selectedSubIndex, streamInfo?.hasEmbeddedSubtitles, isFullscreen]);

    const isFullscreenActive = useCallback(() => {
        const doc = document as any;
        const video = videoRef.current as any;
        return !!(
            doc.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement ||
            (video && video.webkitDisplayingFullscreen)
        );
    }, []);

    // Fullscreen event listener (cross-browser and iOS WebKit)
    useEffect(() => {
        const handleFullscreenChange = () => {
            const active = isFullscreenActive();
            setIsFullscreen(active);
            if (active && videoRef.current) {
                const tracks = videoRef.current.textTracks;
                const isMobile =
                    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                    window.innerWidth <= 768;
                if (isMobile || active) {
                    for (let i = 0; i < tracks.length; i++) {
                        if (selectedSubIndex >= 0) {
                            tracks[i].mode = "showing";
                        }
                    }
                }
            }
        };

        const video = videoRef.current;

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener(
            "webkitfullscreenchange",
            handleFullscreenChange
        );
        document.addEventListener(
            "mozfullscreenchange",
            handleFullscreenChange
        );
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);

        if (video) {
            video.addEventListener(
                "webkitbeginfullscreen",
                handleFullscreenChange
            );
            video.addEventListener(
                "webkitendfullscreen",
                handleFullscreenChange
            );
        }

        return () => {
            document.removeEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );
            document.removeEventListener(
                "webkitfullscreenchange",
                handleFullscreenChange
            );
            document.removeEventListener(
                "mozfullscreenchange",
                handleFullscreenChange
            );
            document.removeEventListener(
                "MSFullscreenChange",
                handleFullscreenChange
            );
            if (video) {
                video.removeEventListener(
                    "webkitbeginfullscreen",
                    handleFullscreenChange
                );
                video.removeEventListener(
                    "webkitendfullscreen",
                    handleFullscreenChange
                );
            }
        };
    }, [isFullscreenActive, selectedSubIndex]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            resetInactivityTimer();
            if (e.key === " " || e.key === "k") {
                e.preventDefault();
                togglePlay();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                seekRelative(-10);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                seekRelative(10);
            } else if (e.key === "f") {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === "m") {
                e.preventDefault();
                toggleMute();
            } else if (e.key === "Escape") {
                if (activePopover) {
                    setActivePopover(null);
                } else {
                    handleBack();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, activePopover, resetInactivityTimer]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            // Resume AudioContext if suspended
            if (
                audioContextRef.current &&
                audioContextRef.current.state === "suspended"
            ) {
                audioContextRef.current.resume().catch(() => {});
            }
            videoRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {});
        } else {
            videoRef.current.pause();
        }
        resetInactivityTimer();
    };

    const handlePlayerClick = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        if (activePopover) {
            setActivePopover(null);
            return;
        }
        togglePlay();
    };

    const seekRelative = (deltaSeconds: number) => {
        if (!videoRef.current) return;
        const target = Math.min(
            duration,
            Math.max(0, videoRef.current.currentTime + deltaSeconds)
        );
        videoRef.current.currentTime = target;
        setCurrentTime(target);
        playbackService.reportProgress(target, !isPlaying);
        resetInactivityTimer();
    };

    const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current || duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.min(1, Math.max(0, clickX / rect.width));
        const newTime = percent * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        playbackService.reportProgress(newTime, !isPlaying);
        resetInactivityTimer();
    };

    const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const percent = Math.min(1, Math.max(0, mouseX / rect.width));
        setHoverTime(percent * duration);
        setHoverPosPercent(percent * 100);
    };

    const handleScrubberMouseLeave = () => {
        setHoverTime(null);
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const next = !isMuted;
        videoRef.current.muted = next;
        setIsMuted(next);
        resetInactivityTimer();
    };

    const handleVolumeChange = (newVol: number) => {
        if (!videoRef.current) return;
        videoRef.current.volume = newVol;
        videoRef.current.muted = newVol === 0;
        setVolume(newVol);
        setIsMuted(newVol === 0);
        resetInactivityTimer();
    };

    const toggleFullscreen = async () => {
        const container = containerRef.current as any;
        const video = videoRef.current as any;
        const doc = document as any;
        if (!isFullscreenActive()) {
            try {
                if (container?.requestFullscreen) {
                    await container.requestFullscreen();
                } else if (container?.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                } else if (video?.webkitEnterFullscreen) {
                    video.webkitEnterFullscreen();
                } else if (video?.requestFullscreen) {
                    await video.requestFullscreen();
                }
            } catch {
                if (video?.webkitEnterFullscreen) {
                    video.webkitEnterFullscreen();
                }
            }
        } else {
            try {
                if (doc.exitFullscreen) {
                    await doc.exitFullscreen();
                } else if (doc.webkitExitFullscreen) {
                    doc.webkitExitFullscreen();
                } else if (video?.webkitExitFullscreen) {
                    video.webkitExitFullscreen();
                }
            } catch {
                if (video?.webkitExitFullscreen) {
                    video.webkitExitFullscreen();
                }
            }
        }
        resetInactivityTimer();
    };

    const handleRateChange = (rate: number) => {
        if (!videoRef.current) return;
        videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
    };

    // Calculate bitrate in bps
    const calculateBitrateBps = (
        preset: string,
        customMbps: number
    ): number => {
        switch (preset) {
            case "100m":
                return 100000000;
            case "60m":
                return 60000000;
            case "40m":
                return 40000000;
            case "20m":
                return 20000000;
            case "10m":
                return 10000000;
            case "4m":
                return 4000000;
            case "2m":
                return 2000000;
            case "custom":
                return customMbps * 1000000;
            default:
                return 0; // Direct Play
        }
    };

    // Switch bitrate or quality preset seamlessly without losing position
    const handleQualityChange = async (
        newPreset: string,
        newCustomMbps?: number
    ) => {
        setQualityPreset(newPreset);
        const customVal = newCustomMbps ?? customBitrateMbps;
        if (newCustomMbps !== undefined) {
            setCustomBitrateMbps(newCustomMbps);
        }

        const bitrateBps = calculateBitrateBps(newPreset, customVal);
        const currentPos = videoRef.current
            ? videoRef.current.currentTime
            : currentTime;

        try {
            const nextInfo = await playbackService.preparePlayback(
                item,
                bitrateBps,
                selectedAudioIndex,
                selectedSubIndex
            );
            setStreamInfo(nextInfo);
            loadStream(nextInfo, currentPos);
        } catch {
            // Keep existing stream on failure
        }
    };

    // Switch audio track
    const handleAudioTrackChange = async (newAudioIndex: number) => {
        setSelectedAudioIndex(newAudioIndex);
        const bitrateBps = calculateBitrateBps(
            qualityPreset,
            customBitrateMbps
        );
        const currentPos = videoRef.current
            ? videoRef.current.currentTime
            : currentTime;

        try {
            const nextInfo = await playbackService.preparePlayback(
                item,
                bitrateBps,
                newAudioIndex,
                selectedSubIndex
            );
            setStreamInfo(nextInfo);
            loadStream(nextInfo, currentPos);
        } catch {
            // Keep existing stream on failure
        }
    };

    const remainingTime = Math.max(0, duration - currentTime);
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Fallback backdrop thumbnail
    const thumbnailPreviewUrl =
        item.backdropImageTag && session?.serverUrl
            ? getImageUrl(session.serverUrl, item.id, "Backdrop", {
                  tag: item.backdropImageTag,
                  maxWidth: 640,
              })
            : "";

    // Trickplay calculations
    const trickplay =
        trickplayData || item.trickplayInfo || streamInfo?.trickplayInfo;
    let trickplayPreviewNode: React.ReactNode = null;

    const displayWidth = 320;
    const rawHeight = trickplay?.height || 180;
    const rawWidth = trickplay?.width || 320;
    const displayHeight = Math.round(displayWidth * (rawHeight / rawWidth));
    const previewHalfWidth = Math.round(displayWidth / 2) + 12;

    const activeScene =
        hoverTime !== null
            ? item.scenes?.reduce<SceneItem | null>((acc, s) => {
                  if (s.startPositionSeconds <= hoverTime) {
                      if (
                          !acc ||
                          s.startPositionSeconds > acc.startPositionSeconds
                      ) {
                          return s;
                      }
                  }
                  return acc;
              }, null)
            : null;

    if (hoverTime !== null) {
        if (session?.serverUrl && trickplay) {
            const intervalSec = trickplay.interval
                ? trickplay.interval / 1000
                : 10;
            const tileIndex = Math.max(0, Math.floor(hoverTime / intervalSec));
            const tilesPerRow = trickplay.tileWidth || 10;
            const tilesPerCol = trickplay.tileHeight || 10;
            const tilesPerSheet = Math.max(1, tilesPerRow * tilesPerCol);
            const sheetIndex = Math.floor(tileIndex / tilesPerSheet);
            const tileInSheet = tileIndex % tilesPerSheet;
            const col = tileInSheet % tilesPerRow;
            const row = Math.floor(tileInSheet / tilesPerRow);

            const denomX = Math.max(1, tilesPerRow - 1);
            const denomY = Math.max(1, tilesPerCol - 1);
            const bgPosX = (col / denomX) * 100;
            const bgPosY = (row / denomY) * 100;

            const resolutionWidth = trickplay.width || 320;
            const mediaSourceParam = streamInfo?.mediaSourceId
                ? `&mediaSourceId=${encodeURIComponent(streamInfo.mediaSourceId)}`
                : "";
            const sheetUrl = `${session.serverUrl}/Videos/${item.id}/Trickplay/${resolutionWidth}/${sheetIndex}.jpg?api_key=${encodeURIComponent(session.accessToken)}&ApiKey=${encodeURIComponent(session.accessToken)}${mediaSourceParam}`;

            trickplayPreviewNode = (
                <div
                    className="preview-tile-box"
                    style={{
                        width: displayWidth,
                        height: displayHeight,
                        backgroundImage: thumbnailPreviewUrl
                            ? `url("${sheetUrl}"), url("${thumbnailPreviewUrl}")`
                            : `url("${sheetUrl}")`,
                        backgroundSize: thumbnailPreviewUrl
                            ? `${tilesPerRow * 100}% ${tilesPerCol * 100}%, cover`
                            : `${tilesPerRow * 100}% ${tilesPerCol * 100}%`,
                        backgroundPosition: thumbnailPreviewUrl
                            ? `${bgPosX}% ${bgPosY}%, center`
                            : `${bgPosX}% ${bgPosY}%`,
                        backgroundRepeat: "no-repeat",
                    }}
                />
            );
        } else if (thumbnailPreviewUrl) {
            trickplayPreviewNode = (
                <img
                    src={thumbnailPreviewUrl}
                    alt="Preview"
                    className="preview-img"
                    style={{
                        width: displayWidth,
                        height: displayHeight,
                    }}
                />
            );
        }
    }

    // Subtitle options
    const subtitleOptions: DropdownOption[] = [
        { label: "Off", value: -1 },
        ...(streamInfo?.availableSubtitles || []).map((s) => ({
            label: s.displayTitle,
            value: s.index,
        })),
    ];

    // Audio options
    const audioOptions: DropdownOption[] = (
        streamInfo?.availableAudioStreams || []
    ).map((a) => ({
        label: a.displayTitle,
        value: a.index,
    }));

    // Subtitle track URL (only if external subtitles are allowed and not embedded)
    const activeSubtitleUrl =
        !streamInfo?.hasEmbeddedSubtitles &&
        selectedSubIndex >= 0 &&
        session?.serverUrl &&
        streamInfo
            ? `${session.serverUrl}/Videos/${item.id}/${streamInfo.mediaSourceId}/Subtitles/${selectedSubIndex}/Stream.vtt?ApiKey=${session.accessToken}`
            : "";

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (streamInfo?.hasEmbeddedSubtitles || selectedSubIndex < 0) {
            setActiveCueText("");
            return;
        }

        const updateCues = () => {
            const track = video.textTracks[0];
            if (track) {
                const isMobileDevice =
                    typeof navigator !== "undefined" &&
                    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                        (typeof window !== "undefined" &&
                            window.innerWidth <= 768));
                const useNativeSubtitles =
                    isMobileDevice ||
                    !!(video as any)?.webkitDisplayingFullscreen;
                track.mode = useNativeSubtitles ? "showing" : "hidden";
                track.oncuechange = () => {
                    const cues = track.activeCues;
                    if (cues && cues.length > 0) {
                        const text = Array.from(cues)
                            .map((c) =>
                                (c as VTTCue).text.replace(/<[^>]*>/g, "")
                            )
                            .join("\n");
                        setActiveCueText(text);
                    } else {
                        setActiveCueText("");
                    }
                };
            }
        };

        const timer = setTimeout(updateCues, 200);
        return () => clearTimeout(timer);
    }, [activeSubtitleUrl, selectedSubIndex, streamInfo?.hasEmbeddedSubtitles]);

    const isPreviewingSubs =
        activePopover === "subtitles" && !streamInfo?.hasEmbeddedSubtitles;
    const cueToShow =
        !streamInfo?.hasEmbeddedSubtitles &&
        (activeCueText ||
            (isPreviewingSubs
                ? "The quick brown fox jumps over the lazy dog."
                : ""));

    const isTransparentBg =
        subSettings.bgColor === "transparent" || subSettings.bgOpacity === 0;

    return (
        <div
            className={`play-screen ${!showControls ? "hide-cursor" : ""}`}
            ref={containerRef}
            onMouseMove={resetInactivityTimer}
        >
            <video
                ref={videoRef}
                crossOrigin="anonymous"
                playsInline
                {...({ "webkit-playsinline": "true" } as any)}
                onClick={handlePlayerClick}
                onPlay={() => {
                    setIsPlaying(true);
                    playbackService.startReporting(
                        videoRef.current?.currentTime ?? 0
                    );
                }}
                onPause={() => {
                    setIsPlaying(false);
                    if (videoRef.current) {
                        playbackService.reportProgress(
                            videoRef.current.currentTime,
                            true
                        );
                    }
                }}
                onTimeUpdate={() => {
                    if (videoRef.current) {
                        const time = videoRef.current.currentTime;
                        setCurrentTime(time);
                        currentTimeRef.current = time;
                        playbackService.updatePosition(time);
                    }
                }}
                onLoadedMetadata={() => {
                    if (videoRef.current) {
                        setDuration(videoRef.current.duration || 0);
                    }
                }}
                onEnded={handleBack}
            >
                {!streamInfo?.hasEmbeddedSubtitles && activeSubtitleUrl && (
                    <track
                        key={selectedSubIndex}
                        kind="subtitles"
                        label={
                            streamInfo?.availableSubtitles.find(
                                (s) => s.index === selectedSubIndex
                            )?.displayTitle || "Subtitles"
                        }
                        srcLang={
                            streamInfo?.availableSubtitles.find(
                                (s) => s.index === selectedSubIndex
                            )?.language || "en"
                        }
                        src={activeSubtitleUrl}
                        default
                    />
                )}
            </video>

            {cueToShow &&
                !streamInfo?.hasEmbeddedSubtitles &&
                (selectedSubIndex >= 0 || isPreviewingSubs) && (
                    <div
                        className="custom-subtitle-overlay"
                        style={{
                            bottom: `${subSettings.margin + (showControls ? 120 : 0)}px`,
                            justifyContent:
                                subSettings.alignment === "left"
                                    ? "flex-start"
                                    : subSettings.alignment === "right"
                                      ? "flex-end"
                                      : "center",
                        }}
                    >
                        <span
                            className={`custom-subtitle-text ${isTransparentBg ? "is-transparent" : ""}`}
                            style={{
                                color: subSettings.color,
                                backgroundColor: isTransparentBg
                                    ? "transparent"
                                    : `rgba(${subSettings.bgColor}, ${subSettings.bgOpacity})`,
                                fontSize: `${subSettings.fontSize}px`,
                                textAlign: subSettings.alignment,
                                boxShadow: isTransparentBg
                                    ? "none"
                                    : "0 4px 16px rgba(0, 0, 0, 0.6)",
                                border: "none",
                                outline: "none",
                                textShadow: isTransparentBg
                                    ? "0 2px 4px rgba(0, 0, 0, 0.95), 0 0 2px #000000, 0 1px 2px #000000"
                                    : "none",
                            }}
                        >
                            {cueToShow}
                        </span>
                    </div>
                )}

            <div
                className={`player-controls-overlay ${!showControls ? "hidden" : ""}`}
                onClick={handlePlayerClick}
            >
                <div
                    className="player-top-bar"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className="back-circle-btn"
                        onClick={handleBack}
                        title="Back"
                        aria-label="Exit playback"
                    >
                        <img src="/assets/images/arrow-back.svg" alt="Back" />
                    </button>
                    <div className="player-title">{item.name}</div>
                </div>

                <div
                    className="player-bottom-section"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="scrubber-container">
                        <span className="time-label">
                            {formatTimeSeconds(currentTime)}
                        </span>

                        <div
                            className="scrubber-track-wrapper"
                            onClick={handleScrubberClick}
                            onMouseMove={handleScrubberMouseMove}
                            onMouseLeave={handleScrubberMouseLeave}
                        >
                            <div className="scrubber-track">
                                {hoverTime !== null && (
                                    <div
                                        className="scrubber-hover-ghost"
                                        style={{ width: `${hoverPosPercent}%` }}
                                    />
                                )}
                                <div
                                    className="scrubber-fill"
                                    style={{ width: `${progressPercent}%` }}
                                />
                                <div
                                    className="scrubber-thumb"
                                    style={{ left: `${progressPercent}%` }}
                                />
                            </div>

                            {hoverTime !== null && (
                                <div
                                    className="scrubber-preview-thumbnail"
                                    style={
                                        {
                                            "--hover-percent": `${hoverPosPercent}%`,
                                            left: `clamp(${previewHalfWidth}px, ${hoverPosPercent}%, calc(100% - ${previewHalfWidth}px))`,
                                        } as React.CSSProperties
                                    }
                                >
                                    {trickplayPreviewNode}
                                    <div className="preview-meta">
                                        {activeScene?.name && (
                                            <span className="preview-scene">
                                                {activeScene.name}
                                            </span>
                                        )}
                                        <span className="preview-time">
                                            {formatTimeSeconds(hoverTime)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <span className="time-label">
                            {formatTimeSeconds(remainingTime)}
                        </span>
                    </div>

                    <div className="player-action-bar">
                        <div className="action-group-left">
                            <button
                                type="button"
                                className="player-btn-circle"
                                onClick={() => seekRelative(-10)}
                                title="Rewind 10 seconds"
                                aria-label="Rewind 10 seconds"
                            >
                                <img
                                    src="/assets/images/fast-rwd.svg"
                                    alt="Rewind"
                                />
                            </button>

                            <button
                                type="button"
                                className="player-btn-circle"
                                onClick={togglePlay}
                                title={isPlaying ? "Pause" : "Play"}
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                <img
                                    src={
                                        isPlaying
                                            ? "/assets/images/pause.svg"
                                            : "/assets/images/play.svg"
                                    }
                                    alt={isPlaying ? "Pause" : "Play"}
                                />
                            </button>

                            <button
                                type="button"
                                className="player-btn-circle"
                                onClick={() => seekRelative(30)}
                                title="Forward 30 seconds"
                                aria-label="Forward 30 seconds"
                            >
                                <img
                                    src="/assets/images/fast-fwd.svg"
                                    alt="Fast Forward"
                                />
                            </button>
                        </div>

                        <div className="action-group-right">
                            <button
                                type="button"
                                className={`player-btn-circle ${activePopover === "subtitles" ? "active" : ""}`}
                                onClick={() =>
                                    setActivePopover(
                                        activePopover === "subtitles"
                                            ? null
                                            : "subtitles"
                                    )
                                }
                                title="Subtitles"
                                aria-label="Subtitle settings"
                            >
                                <img
                                    src="/assets/images/subtitles.svg"
                                    alt="Subtitles"
                                />
                            </button>

                            <button
                                type="button"
                                className={`player-btn-circle ${activePopover === "audio" ? "active" : ""}`}
                                onClick={() =>
                                    setActivePopover(
                                        activePopover === "audio"
                                            ? null
                                            : "audio"
                                    )
                                }
                                title="Audio"
                                aria-label="Audio settings"
                            >
                                <img
                                    src={
                                        isMuted
                                            ? "/assets/images/volume-off.svg"
                                            : "/assets/images/volume.svg"
                                    }
                                    alt="Audio"
                                />
                            </button>

                            <button
                                type="button"
                                className={`player-btn-circle ${activePopover === "video" ? "active" : ""}`}
                                onClick={() =>
                                    setActivePopover(
                                        activePopover === "video"
                                            ? null
                                            : "video"
                                    )
                                }
                                title="Video Settings"
                                aria-label="Video settings"
                            >
                                <img
                                    src="/assets/images/video-settings.svg"
                                    alt="Settings"
                                />
                            </button>

                            <button
                                type="button"
                                className="player-btn-circle"
                                onClick={toggleFullscreen}
                                title={
                                    isFullscreen
                                        ? "Exit Fullscreen"
                                        : "Fullscreen"
                                }
                                aria-label={
                                    isFullscreen
                                        ? "Exit Fullscreen"
                                        : "Fullscreen"
                                }
                            >
                                <img
                                    src={
                                        isFullscreen
                                            ? "/assets/images/exit-fullscreen.svg"
                                            : "/assets/images/fullscreen.svg"
                                    }
                                    alt={
                                        isFullscreen
                                            ? "Exit Fullscreen"
                                            : "Fullscreen"
                                    }
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {activePopover === "audio" && (
                    <div
                        className="settings-popover"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Audio Settings</h3>
                        <div className="volume-slider-row">
                            <button
                                type="button"
                                onClick={toggleMute}
                                aria-label="Mute toggle"
                            >
                                <img
                                    src={
                                        isMuted
                                            ? "/assets/images/volume-off.svg"
                                            : "/assets/images/volume.svg"
                                    }
                                    alt="Mute"
                                    style={{ width: 18 }}
                                />
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={isMuted ? 0 : volume}
                                onChange={(e) =>
                                    handleVolumeChange(
                                        parseFloat(e.target.value)
                                    )
                                }
                            />
                        </div>

                        <div className="settings-item">
                            <label>
                                Audio Boost (Night Mode)
                                <span className="value-badge">
                                    {audioBoost === 1
                                        ? "Normal"
                                        : `${Math.round(audioBoost * 100)}%`}
                                </span>
                            </label>
                            <div className="boost-pills">
                                {[1, 1.5, 2, 2.5].map((b) => (
                                    <button
                                        key={b}
                                        type="button"
                                        className={`boost-pill ${audioBoost === b ? "active" : ""}`}
                                        onClick={() => applyAudioBoost(b)}
                                    >
                                        {b === 1
                                            ? "100%"
                                            : `${Math.round(b * 100)}%`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {audioOptions.length > 0 && (
                            <div className="settings-item">
                                <label>Audio Track</label>
                                <GlassDropdown
                                    direction="up"
                                    options={audioOptions}
                                    value={selectedAudioIndex}
                                    onChange={(val) =>
                                        handleAudioTrackChange(Number(val))
                                    }
                                    ariaLabel="Select audio track"
                                />
                            </div>
                        )}
                    </div>
                )}

                {activePopover === "subtitles" && (
                    <div
                        className="settings-popover subtitles-popover"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Subtitle Settings</h3>

                        {streamInfo?.hasEmbeddedSubtitles && (
                            <div className="embedded-subtitles-banner">
                                <div className="embedded-badge">
                                    <span className="live-dot" />
                                    Embedded Subtitles Active
                                </div>
                                <p>
                                    Subtitles are burned directly into the
                                    transcoded video stream by the server.
                                    Custom player subtitles cannot be overlaid.
                                </p>
                            </div>
                        )}

                        <div className="settings-item">
                            <label>Subtitle Track</label>
                            <GlassDropdown
                                options={subtitleOptions}
                                value={selectedSubIndex}
                                onChange={(val) =>
                                    handleSubtitleTrackChange(Number(val))
                                }
                                ariaLabel="Select subtitle track"
                                showChevron
                                disabled={streamInfo?.hasEmbeddedSubtitles}
                            />
                        </div>

                        {!streamInfo?.hasEmbeddedSubtitles &&
                            selectedSubIndex >= 0 && (
                                <>
                                    <div className="settings-item">
                                        <label>Alignment</label>
                                        <div className="alignment-button-row">
                                            {(
                                                [
                                                    "left",
                                                    "center",
                                                    "right",
                                                ] as const
                                            ).map((align) => (
                                                <button
                                                    key={align}
                                                    type="button"
                                                    className={`alignment-choice-btn ${
                                                        subSettings.alignment ===
                                                        align
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        updateSubSettings({
                                                            alignment: align,
                                                        })
                                                    }
                                                    title={
                                                        align
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                        align.slice(1)
                                                    }
                                                    aria-label={`Subtitle alignment ${align}`}
                                                >
                                                    {align
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        align.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="settings-item">
                                        <label>Text Color</label>
                                        <div className="color-button-row">
                                            {TEXT_COLORS.map((c) => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    className={`color-choice-btn ${
                                                        subSettings.color.toLowerCase() ===
                                                        c.value.toLowerCase()
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        updateSubSettings({
                                                            color: c.value,
                                                        })
                                                    }
                                                    title={c.label}
                                                    aria-label={`Text color ${c.label}`}
                                                >
                                                    <span
                                                        className="swatch-circle"
                                                        style={{
                                                            backgroundColor:
                                                                c.value,
                                                        }}
                                                    />
                                                    <span className="choice-name">
                                                        {c.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="settings-item">
                                        <label>Background Color</label>
                                        <div className="color-button-row">
                                            {BG_COLORS.map((c) => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    className={`color-choice-btn ${
                                                        subSettings.bgColor ===
                                                        c.value
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        updateSubSettings({
                                                            bgColor: c.value,
                                                        })
                                                    }
                                                    title={c.label}
                                                    aria-label={`Background color ${c.label}`}
                                                >
                                                    <span
                                                        className={`swatch-circle ${
                                                            c.isTransparent
                                                                ? "transparent-swatch"
                                                                : ""
                                                        }`}
                                                        style={
                                                            !c.isTransparent
                                                                ? {
                                                                      backgroundColor:
                                                                          c.swatchColor,
                                                                  }
                                                                : undefined
                                                        }
                                                    />
                                                    <span className="choice-name">
                                                        {c.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="settings-item">
                                        <label>
                                            Background Opacity
                                            <span className="value-badge">
                                                {Math.round(
                                                    subSettings.bgOpacity * 100
                                                )}
                                                %
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            value={subSettings.bgOpacity}
                                            onChange={(e) =>
                                                updateSubSettings({
                                                    bgOpacity: parseFloat(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="settings-item">
                                        <label>
                                            Font Size
                                            <span className="value-badge">
                                                {subSettings.fontSize}px
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={14}
                                            max={48}
                                            step={1}
                                            value={subSettings.fontSize}
                                            onChange={(e) =>
                                                updateSubSettings({
                                                    fontSize: parseInt(
                                                        e.target.value,
                                                        10
                                                    ),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="settings-item">
                                        <label>
                                            Margin from Bottom
                                            <span className="value-badge">
                                                {subSettings.margin}px
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={10}
                                            max={140}
                                            step={2}
                                            value={subSettings.margin}
                                            onChange={(e) =>
                                                updateSubSettings({
                                                    margin: parseInt(
                                                        e.target.value,
                                                        10
                                                    ),
                                                })
                                            }
                                        />
                                    </div>
                                </>
                            )}
                    </div>
                )}

                {activePopover === "video" && (
                    <div
                        className="settings-popover"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="popover-header-row">
                            <h3>Playback Settings</h3>
                            <button
                                type="button"
                                className="popover-info-btn"
                                onClick={() => {
                                    setShowPlaybackInfo(true);
                                    setActivePopover(null);
                                }}
                                title="Playback Information"
                                aria-label="Playback Information"
                            >
                                <img
                                    src="/assets/images/info.svg"
                                    alt="Playback info"
                                />
                            </button>
                        </div>
                        <div className="settings-item">
                            <label>Playback Speed</label>
                            <GlassDropdown
                                direction="up"
                                options={SPEED_OPTIONS}
                                value={playbackRate}
                                onChange={(val) =>
                                    handleRateChange(Number(val))
                                }
                                ariaLabel="Playback speed"
                            />
                        </div>

                        <div className="settings-item">
                            <label>Quality & Bitrate</label>
                            <GlassDropdown
                                direction="up"
                                options={QUALITY_PRESETS}
                                value={qualityPreset}
                                onChange={(val) =>
                                    handleQualityChange(String(val))
                                }
                                ariaLabel="Quality & Bitrate"
                            />
                        </div>

                        {qualityPreset === "custom" && (
                            <div className="settings-item">
                                <label>
                                    Custom Bitrate
                                    <span className="value-badge">
                                        {customBitrateMbps} Mbps
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={120}
                                    step={1}
                                    value={customBitrateMbps}
                                    onChange={(e) =>
                                        handleQualityChange(
                                            "custom",
                                            parseInt(e.target.value, 10)
                                        )
                                    }
                                />
                            </div>
                        )}

                        <div className="settings-item info-action-item">
                            <button
                                type="button"
                                className="playback-info-trigger-btn"
                                onClick={() => {
                                    setShowPlaybackInfo(true);
                                    setActivePopover(null);
                                }}
                            >
                                <img src="/assets/images/info.svg" alt="Info" />
                                <span>Playback Information</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showPlaybackInfo && (
                <div
                    className="playback-info-modal-backdrop"
                    onClick={() => setShowPlaybackInfo(false)}
                >
                    <div
                        className="playback-info-modal glass-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div className="modal-title-wrap">
                                <img
                                    src="/assets/images/info.svg"
                                    alt="Info"
                                    className="modal-title-icon"
                                />
                                <h2>Playback Information</h2>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setShowPlaybackInfo(false)}
                                aria-label="Close playback information"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="info-group">
                                <div className="info-group-title">
                                    Stream Telemetry
                                </div>
                                <div className="info-grid">
                                    <div className="info-row">
                                        <span className="info-label">
                                            Stream Type
                                        </span>
                                        <span
                                            className={`stream-type-badge ${
                                                streamInfo?.playbackDetails
                                                    ?.streamType ===
                                                "Direct Play"
                                                    ? "direct"
                                                    : "transcode"
                                            }`}
                                        >
                                            {streamInfo?.playbackDetails
                                                ?.streamType || "Direct Play"}
                                        </span>
                                    </div>

                                    <div className="info-row full-width">
                                        <span className="info-label">
                                            Reason
                                        </span>
                                        <span className="info-value reason-text">
                                            {streamInfo?.playbackDetails
                                                ?.transcodeReasonText ||
                                                "Direct Play supported by client"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-group">
                                <div className="info-group-title">
                                    Video Stream
                                </div>
                                <div className="info-grid">
                                    <div className="info-row">
                                        <span className="info-label">
                                            Video Codec
                                        </span>
                                        <span className="info-value">
                                            {streamInfo?.playbackDetails
                                                ?.videoCodec || "Unknown"}
                                        </span>
                                    </div>

                                    <div className="info-row">
                                        <span className="info-label">
                                            Video Size
                                        </span>
                                        <span className="info-value">
                                            {realTimeStats.width &&
                                            realTimeStats.height
                                                ? `${realTimeStats.width} × ${realTimeStats.height}`
                                                : streamInfo?.playbackDetails
                                                        ?.videoWidth &&
                                                    streamInfo?.playbackDetails
                                                        ?.videoHeight
                                                  ? `${streamInfo.playbackDetails.videoWidth} × ${streamInfo.playbackDetails.videoHeight}`
                                                  : "Unknown"}
                                        </span>
                                    </div>

                                    <div className="info-row">
                                        <span className="info-label">
                                            Video Bitrate
                                        </span>
                                        <span className="info-value">
                                            {realTimeStats.bitrateMbps > 0
                                                ? `${realTimeStats.bitrateMbps} Mbps`
                                                : streamInfo?.playbackDetails
                                                        ?.videoBitrate
                                                  ? `${(
                                                        streamInfo
                                                            .playbackDetails
                                                            .videoBitrate /
                                                        1000000
                                                    ).toFixed(2)} Mbps`
                                                  : "Direct"}
                                        </span>
                                    </div>

                                    <div className="info-row">
                                        <span className="info-label">
                                            Video FPS
                                        </span>
                                        <span className="info-value">
                                            {realTimeStats.fps > 0
                                                ? `${realTimeStats.fps} fps`
                                                : streamInfo?.playbackDetails
                                                        ?.videoFps
                                                  ? `${streamInfo.playbackDetails.videoFps} fps`
                                                  : "24 fps"}
                                        </span>
                                    </div>

                                    <div className="info-row full-width">
                                        <span className="info-label">
                                            Video HDR / Color Depth
                                        </span>
                                        <span className="info-value">
                                            {streamInfo?.playbackDetails
                                                ?.videoHdr || "SDR (8-bit)"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-group">
                                <div className="info-group-title">
                                    Sound Stream
                                </div>
                                <div className="info-grid">
                                    <div className="info-row">
                                        <span className="info-label">
                                            Sound Codec
                                        </span>
                                        <span className="info-value">
                                            {streamInfo?.playbackDetails
                                                ?.soundCodec || "Unknown"}
                                        </span>
                                    </div>

                                    <div className="info-row">
                                        <span className="info-label">
                                            Sound Channels
                                        </span>
                                        <span className="info-value">
                                            {streamInfo?.playbackDetails
                                                ?.soundChannels
                                                ? streamInfo.playbackDetails
                                                      .soundChannels === 6
                                                    ? "6 channels (5.1 Surround)"
                                                    : streamInfo.playbackDetails
                                                            .soundChannels === 8
                                                      ? "8 channels (7.1 Surround)"
                                                      : `${streamInfo.playbackDetails.soundChannels} channels`
                                                : "2 channels (Stereo)"}
                                        </span>
                                    </div>

                                    <div className="info-row">
                                        <span className="info-label">
                                            Sound kbps
                                        </span>
                                        <span className="info-value">
                                            {streamInfo?.playbackDetails
                                                ?.soundBitrate
                                                ? `${Math.round(
                                                      streamInfo.playbackDetails
                                                          .soundBitrate / 1000
                                                  )} kbps`
                                                : "Auto"}
                                        </span>
                                    </div>

                                    <div className="info-row">
                                        <span className="info-label">
                                            Sound Hertz
                                        </span>
                                        <span className="info-value">
                                            {streamInfo?.playbackDetails
                                                ?.soundSampleRate
                                                ? `${streamInfo.playbackDetails.soundSampleRate.toLocaleString()} Hz`
                                                : "48,000 Hz"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="live-status-footer">
                                <span className="live-dot pulse" />
                                <span>Real-time telemetry stream active</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
