import React, { useState, useEffect } from "react";
import { MediaItem } from "@/common/types/media";
import { useApp } from "@/application/state/appContext";
import { getImageUrl } from "@/common/utils/image";
import "./media-card.scss";

interface MediaCardProps {
    item: MediaItem;
    viewMode?: "Portrait" | "Landscape";
    onClick?: () => void;
    showSubtitle?: boolean;
    directPlay?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({
    item,
    viewMode = "Portrait",
    onClick,
    showSubtitle = false,
    directPlay = false,
}) => {
    const { session, navigate, startPlayback } = useApp();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const serverUrl = session?.serverUrl || "";

    useEffect(() => {
        setLogoError(false);
    }, [item.id, item.logoImageTag]);

    const isLandscape = viewMode === "Landscape";

    const imageType = isLandscape
        ? item.thumbImageTag
            ? "Thumb"
            : item.backdropImageTag
              ? "Backdrop"
              : "Primary"
        : item.primaryImageTag
          ? "Primary"
          : "Backdrop";

    const imageTag = isLandscape
        ? item.thumbImageTag || item.backdropImageTag || item.primaryImageTag
        : item.primaryImageTag || item.backdropImageTag;

    const imageUrl = imageTag
        ? getImageUrl(serverUrl, item.id, imageType, {
              tag: imageTag,
              maxWidth: isLandscape ? 600 : 400,
              quality: 85,
          })
        : "";

    const logoUrl =
        !logoError && serverUrl && item.logoImageTag
            ? getImageUrl(serverUrl, item.logoItemId || item.id, "Logo", {
                  tag: item.logoImageTag,
                  maxWidth: 320,
              })
            : "";

    const progressPercentage =
        item.playbackPositionTicks && item.runTimeTicks && item.runTimeTicks > 0
            ? Math.min(
                  100,
                  (item.playbackPositionTicks / item.runTimeTicks) * 100
              )
            : item.played
              ? 100
              : 0;

    const showProgressBar =
        isLandscape &&
        !item.played &&
        progressPercentage > 0 &&
        progressPercentage < 100;

    const isDirectPlay = directPlay || item.type === "Episode";

    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }

        if (isDirectPlay) {
            startPlayback(item);
            return;
        }

        if (item.type === "Movie") {
            navigate({ name: "movie-details", id: item.id });
        } else if (item.type === "Series") {
            navigate({ name: "show-details", id: item.id });
        } else if (item.type === "BoxSet") {
            navigate({ name: "boxset", id: item.id });
        } else {
            navigate({ name: "movie-details", id: item.id });
        }
    };

    const displayTitle =
        item.seriesName && item.seriesName !== item.name
            ? `${item.seriesName} - ${item.name}`
            : item.name;

    return (
        <div
            className={`media-card ${isLandscape ? "landscape" : "portrait"}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label={displayTitle}
        >
            <div
                className={`card-poster-wrapper ${isLandscape ? "landscape" : "portrait"}`}
            >
                {!imageLoaded && (
                    <div className="card-skeleton-placeholder skeleton-shimmer" />
                )}

                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={displayTitle}
                        loading="lazy"
                        className={imageLoaded ? "loaded" : ""}
                        onLoad={() => setImageLoaded(true)}
                    />
                ) : (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255,255,255,0.35)",
                            fontSize: "14px",
                            padding: 12,
                            textAlign: "center",
                        }}
                    >
                        {displayTitle}
                    </div>
                )}

                {isDirectPlay && (
                    <div className="card-play-overlay">
                        <img src="/assets/images/play_circle.svg" alt="Play" />
                    </div>
                )}

                <div className="card-hover-overlay">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={item.name}
                            className="card-hover-logo"
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        <span className="card-hover-title">{item.name}</span>
                    )}
                    {isDirectPlay && (
                        <div className="hover-play-badge">
                            <img
                                src="/assets/images/play_circle.svg"
                                alt="Play"
                            />
                        </div>
                    )}
                </div>

                {showProgressBar && (
                    <div className="playback-progress-track">
                        <div
                            className="playback-progress-fill"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}
            </div>

            <div className="card-title">{displayTitle}</div>
            {showSubtitle && item.productionYear ? (
                <div className="card-subtitle">{item.productionYear}</div>
            ) : null}
        </div>
    );
};
