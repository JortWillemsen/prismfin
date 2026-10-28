import React, { useEffect, useState } from "react";
import {
    detailsService,
    SeasonDetailsData,
} from "@/application/services/detailsService";
import { useApp } from "@/application/state/appContext";
import { getImageUrl } from "@/common/utils/image";
import { formatDurationTicks, formatScore } from "@/common/utils/formatters";
import { PersonRow } from "@/presentation/components/person-row/personRow";
import { DetailsSkeleton } from "@/presentation/components/details-skeleton/detailsSkeleton";
import "./season-details-page.scss";

interface SeasonDetailsPageProps {
    seriesId: string;
    seasonId: string;
}

export const SeasonDetailsPage: React.FC<SeasonDetailsPageProps> = ({
    seriesId,
    seasonId,
}) => {
    const { session, startPlayback, navigate } = useApp();
    const [details, setDetails] = useState<SeasonDetailsData | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        detailsService
            .getSeasonDetails(seriesId, seasonId)
            .then((data) => {
                if (isMounted) {
                    setDetails(data);
                    setIsFavorite(data.series.isFavorite);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [seriesId, seasonId]);

    const handleToggleFavorite = async () => {
        if (!details) return;
        try {
            const next = await detailsService.toggleFavorite(
                details.series.id,
                isFavorite
            );
            setIsFavorite(next);
        } catch {
            // ignore
        }
    };

    if (loading || !details) {
        return (
            <div className="season-details-page">
                <DetailsSkeleton />
            </div>
        );
    }

    const { series, season, episodes } = details;
    const serverUrl = session?.serverUrl || "";

    const backdropUrl = series.backdropImageTag
        ? getImageUrl(serverUrl, series.id, "Backdrop", {
              tag: series.backdropImageTag,
              maxWidth: 1920,
              quality: 90,
          })
        : "";

    const logoUrl = series.logoImageTag
        ? getImageUrl(serverUrl, series.id, "Logo", {
              tag: series.logoImageTag,
              maxWidth: 500,
          })
        : "";

    const posterUrl = season.primaryImageTag
        ? getImageUrl(serverUrl, season.id, "Primary", {
              tag: season.primaryImageTag,
              maxWidth: 600,
              quality: 90,
          })
        : series.primaryImageTag
          ? getImageUrl(serverUrl, series.id, "Primary", {
                tag: series.primaryImageTag,
                maxWidth: 600,
            })
          : "";

    // Determine target episode based on playback progress
    const inProgressEp = episodes.find(
        (e) => (e.playbackPositionTicks || 0) > 0 && !e.played
    );
    const targetEpisode =
        inProgressEp || episodes.find((e) => !e.played) || episodes[0];
    const seasonNum = targetEpisode?.seasonNumber ?? season.seasonNumber ?? 1;
    const epNum = targetEpisode?.episodeNumber ?? 1;
    const playButtonLabel = `Play S${seasonNum}, E${epNum}`;

    const handlePlayProgress = () => {
        if (targetEpisode) {
            startPlayback(targetEpisode);
        } else if (episodes.length > 0) {
            startPlayback(episodes[0]);
        }
    };

    return (
        <div className="season-details-page">
            {/* Mobile Header: Back button + Title pill */}
            <div className="mobile-details-header">
                <button
                    type="button"
                    className="mobile-back-btn"
                    onClick={() => window.history.back()}
                    aria-label="Back"
                >
                    <img src="/assets/images/arrow-back.svg" alt="Back" />
                </button>
                <div className="mobile-title-pill">
                    {series.name}, {season.name}
                </div>
            </div>

            <section className="season-hero-section">
                {backdropUrl && (
                    <img
                        src={backdropUrl}
                        alt={series.name}
                        className="hero-backdrop"
                    />
                )}
                <div className="hero-gradient-overlay" />

                <div className="hero-content-left">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={series.name}
                            className="details-logo"
                        />
                    ) : null}

                    <h1 className="details-title-heading">
                        {series.name}, {season.name}
                    </h1>

                    <div className="details-metadata-line">
                        {series.criticRating ? (
                            <>
                                <span>
                                    Rotten Tomatoes {series.criticRating}%
                                </span>
                                <span className="meta-separator">•</span>
                            </>
                        ) : null}
                        {series.communityRating ? (
                            <>
                                <span className="badge-accent">
                                    IMDb {formatScore(series.communityRating)}
                                </span>
                                <span className="meta-separator">•</span>
                            </>
                        ) : null}
                        {series.productionYear ? (
                            <span>{series.productionYear}</span>
                        ) : null}
                    </div>

                    {season.overview || series.overview ? (
                        <p className="details-overview">
                            {season.overview || series.overview}
                        </p>
                    ) : null}

                    <div
                        style={{ marginTop: 8 }}
                        className="details-action-row"
                    >
                        <button
                            type="button"
                            className="btn-play-yellow"
                            onClick={handlePlayProgress}
                        >
                            {playButtonLabel}
                        </button>
                    </div>

                    {/* Mobile 3-Button Action Row */}
                    <div className="mobile-hero-actions">
                        <button
                            type="button"
                            className="mobile-play-btn"
                            onClick={handlePlayProgress}
                        >
                            <img
                                src="/assets/images/play.svg"
                                alt="Play"
                                className="mobile-play-icon"
                            />
                            <span>{playButtonLabel}</span>
                        </button>

                        <button
                            type="button"
                            className={`mobile-circle-hero-btn ${!series.collectionId ? "disabled" : ""}`}
                            onClick={() => {
                                if (series.collectionId) {
                                    navigate({
                                        name: "boxset",
                                        id: series.collectionId,
                                    });
                                }
                            }}
                            title="Boxset"
                            aria-label="View Boxset"
                        >
                            <img
                                src="/assets/images/collection.svg"
                                alt="Boxset"
                            />
                        </button>

                        <button
                            type="button"
                            className={`mobile-circle-hero-btn ${isFavorite ? "favorited" : ""}`}
                            onClick={handleToggleFavorite}
                            title={
                                isFavorite
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                            }
                            aria-label="Toggle favorite"
                        >
                            <img
                                src={
                                    isFavorite
                                        ? "/assets/images/heart-check.svg"
                                        : "/assets/images/heart.svg"
                                }
                                alt="Favorite"
                            />
                        </button>
                    </div>
                </div>

                <div className="hero-poster-right">
                    <div className="poster-boxart-card">
                        {posterUrl && <img src={posterUrl} alt={season.name} />}
                    </div>
                </div>
            </section>

            {/* Mobile Tech Metadata Line: Episodes count • Resolution • Film codec • Audio Codec • HDR */}
            {(() => {
                const techItems = [
                    episodes.length > 0
                        ? `${episodes.length} Episode${episodes.length > 1 ? "s" : ""}`
                        : null,
                    series.videoResolution,
                    series.videoCodec,
                    series.audioCodec,
                    series.hdrType,
                ].filter(Boolean);

                if (techItems.length === 0) return null;

                return (
                    <div className="mobile-tech-metadata">
                        {techItems.map((item, idx) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && (
                                    <span className="tech-separator">•</span>
                                )}
                                <span className="tech-item">{item}</span>
                            </React.Fragment>
                        ))}
                    </div>
                );
            })()}

            {/* Mobile Season Overview */}
            {(season.overview || series.overview) && (
                <div className="mobile-overview-container">
                    <p className="mobile-overview-text">
                        {season.overview || series.overview}
                    </p>
                </div>
            )}

            <section className="episodes-section">
                <h2 className="episodes-heading">Episodes</h2>
                <div className="episodes-list">
                    {episodes.map((ep) => {
                        const epThumb = ep.primaryImageTag
                            ? getImageUrl(serverUrl, ep.id, "Primary", {
                                  tag: ep.primaryImageTag,
                                  maxWidth: 500,
                              })
                            : "";

                        const epProgress =
                            ep.playbackPositionTicks &&
                            ep.runTimeTicks &&
                            ep.runTimeTicks > 0
                                ? Math.min(
                                      100,
                                      (ep.playbackPositionTicks /
                                          ep.runTimeTicks) *
                                          100
                                  )
                                : ep.played
                                  ? 100
                                  : 0;

                        return (
                            <div
                                key={ep.id}
                                className="episode-card-row"
                                onClick={() => startPlayback(ep)}
                            >
                                <div className="episode-thumb-wrapper">
                                    {epThumb ? (
                                        <img src={epThumb} alt={ep.name} />
                                    ) : (
                                        <div
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                background: "#1a1a1a",
                                            }}
                                        />
                                    )}
                                    <div className="thumb-play-overlay">
                                        <img
                                            src="/assets/images/play_circle.svg"
                                            alt="Play"
                                        />
                                    </div>
                                    {epProgress > 0 && (
                                        <div className="playback-progress-track">
                                            <div
                                                className="playback-progress-fill"
                                                style={{
                                                    width: `${epProgress}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="episode-info">
                                    <div className="episode-title">
                                        {ep.episodeNumber
                                            ? `${ep.episodeNumber}. `
                                            : ""}
                                        {ep.name}
                                    </div>

                                    <div className="episode-meta-line">
                                        {ep.criticRating ? (
                                            <>
                                                <span>
                                                    Rotten Tomatoes{" "}
                                                    {ep.criticRating}%
                                                </span>
                                                <span className="meta-dot">
                                                    •
                                                </span>
                                            </>
                                        ) : null}

                                        {ep.communityRating ? (
                                            <>
                                                <span className="score-accent">
                                                    IMDb{" "}
                                                    {formatScore(
                                                        ep.communityRating
                                                    )}
                                                </span>
                                                <span className="meta-dot">
                                                    •
                                                </span>
                                            </>
                                        ) : null}

                                        {ep.runTimeTicks ? (
                                            <span>
                                                {formatDurationTicks(
                                                    ep.runTimeTicks
                                                )}
                                            </span>
                                        ) : null}
                                    </div>

                                    {ep.overview && (
                                        <div className="episode-description">
                                            {ep.overview}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {series.people && series.people.length > 0 && (
                <PersonRow people={series.people} />
            )}
        </div>
    );
};
