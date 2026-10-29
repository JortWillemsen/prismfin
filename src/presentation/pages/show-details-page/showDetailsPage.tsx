import React, { useEffect, useState } from "react";
import {
    detailsService,
    ShowDetailsData,
} from "@/application/services/detailsService";
import { useApp } from "@/application/state/appContext";
import { getImageUrl } from "@/common/utils/image";
import { formatScore } from "@/common/utils/formatters";
import { MediaRow } from "@/presentation/components/media-row/mediaRow";
import { PersonRow } from "@/presentation/components/person-row/personRow";
import { DetailsSkeleton } from "@/presentation/components/details-skeleton/detailsSkeleton";
import { DetailsError } from "@/presentation/components/details-error/detailsError";
import "./show-details-page.scss";

interface ShowDetailsPageProps {
    showId: string;
}

export const ShowDetailsPage: React.FC<ShowDetailsPageProps> = ({ showId }) => {
    const { session, startPlayback, navigate } = useApp();
    const [details, setDetails] = useState<ShowDetailsData | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setLoadError(false);

        detailsService
            .getShowDetails(showId)
            .then((data) => {
                if (isMounted) {
                    setDetails(data);
                    setIsFavorite(data.show.isFavorite);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setLoading(false);
                    setLoadError(true);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [showId]);

    if (loading) {
        return (
            <div className="show-details-page">
                <DetailsSkeleton />
            </div>
        );
    }

    if (loadError || !details) {
        return <DetailsError onReturnHome={() => navigate({ name: "home" })} />;
    }

    const { show, seasons, similar } = details;
    const serverUrl = session?.serverUrl || "";

    const backdropUrl = show.backdropImageTag
        ? getImageUrl(serverUrl, show.id, "Backdrop", {
              tag: show.backdropImageTag,
              maxWidth: 1920,
              quality: 90,
          })
        : "";

    const logoUrl = show.logoImageTag
        ? getImageUrl(serverUrl, show.id, "Logo", {
              tag: show.logoImageTag,
              maxWidth: 500,
          })
        : "";

    const posterUrl = show.primaryImageTag
        ? getImageUrl(serverUrl, show.id, "Primary", {
              tag: show.primaryImageTag,
              maxWidth: 600,
              quality: 90,
          })
        : "";

    const handleToggleFavorite = async () => {
        try {
            const next = await detailsService.toggleFavorite(
                show.id,
                isFavorite
            );
            setIsFavorite(next);
        } catch {
            // ignore
        }
    };

    const nextUp = details.nextUpEpisode;
    const seasonNum = nextUp?.seasonNumber ?? 1;
    const epNum = nextUp?.episodeNumber ?? 1;
    const playButtonLabel = `Play S${seasonNum}, E${epNum}`;

    const handlePlayShow = async () => {
        if (nextUp) {
            startPlayback(nextUp);
            return;
        }
        if (seasons.length > 0) {
            const firstSeason = seasons[0];
            try {
                const seasonData = await detailsService.getSeasonDetails(
                    show.id,
                    firstSeason.id
                );
                if (seasonData.episodes.length > 0) {
                    const unplayed =
                        seasonData.episodes.find((e) => !e.played) ||
                        seasonData.episodes[0];
                    startPlayback(unplayed);
                    return;
                }
            } catch {
                // ignore
            }
        }
        startPlayback(show);
    };

    return (
        <div className="show-details-page">
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
                <div className="mobile-title-pill">{show.name}</div>
            </div>

            <section className="show-hero-section">
                {backdropUrl && (
                    <img
                        src={backdropUrl}
                        alt={show.name}
                        className="hero-backdrop"
                    />
                )}
                <div className="hero-gradient-overlay" />

                <div className="hero-content-left">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={show.name}
                            className="details-logo"
                        />
                    ) : null}

                    <h1 className="details-title-heading">{show.name}</h1>

                    <div className="details-metadata-line">
                        {show.criticRating ? (
                            <>
                                <span>
                                    Rotten Tomatoes {show.criticRating}%
                                </span>
                                <span className="meta-separator">•</span>
                            </>
                        ) : null}

                        {show.communityRating ? (
                            <>
                                <span className="badge-accent">
                                    IMDb {formatScore(show.communityRating)}
                                </span>
                                <span className="meta-separator">•</span>
                            </>
                        ) : null}

                        {show.productionYear ? (
                            <>
                                <span>{show.productionYear}</span>
                                <span className="meta-separator desktop-only-meta">
                                    •
                                </span>
                            </>
                        ) : null}

                        {show.videoResolution && (
                            <span className="badge-pill desktop-only-meta">
                                {show.videoResolution}
                            </span>
                        )}

                        {show.hdrType && (
                            <span className="badge-pill desktop-only-meta">
                                {show.hdrType}
                            </span>
                        )}

                        {show.audioCodec && (
                            <span className="badge-pill desktop-only-meta">
                                {show.audioCodec}
                            </span>
                        )}

                        {show.studios && show.studios.length > 0 && (
                            <span className="desktop-only-meta">
                                <span className="meta-separator">•</span>
                                <span>{show.studios[0]}</span>
                            </span>
                        )}
                    </div>

                    {show.overview && (
                        <p className="details-overview">{show.overview}</p>
                    )}

                    <div className="details-action-row">
                        <button
                            type="button"
                            className="btn-play-yellow"
                            onClick={handlePlayShow}
                        >
                            {playButtonLabel}
                        </button>

                        <button
                            type="button"
                            className={`btn-favorite-circle ${isFavorite ? "favorited" : ""}`}
                            onClick={handleToggleFavorite}
                            title={
                                isFavorite
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                            }
                            aria-label="Toggle Favorite"
                        >
                            <img
                                src={
                                    isFavorite
                                        ? "/assets/images/heart-check.svg"
                                        : "/assets/images/heart-plus.svg"
                                }
                                alt="Favorite"
                            />
                        </button>
                    </div>

                    {/* Mobile 3-Button Action Row */}
                    <div className="mobile-hero-actions">
                        <button
                            type="button"
                            className="mobile-play-btn"
                            onClick={handlePlayShow}
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
                            className={`mobile-circle-hero-btn ${!show.collectionId ? "disabled" : ""}`}
                            onClick={() => {
                                if (show.collectionId) {
                                    navigate({
                                        name: "boxset",
                                        id: show.collectionId,
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
                        {posterUrl ? (
                            <img src={posterUrl} alt={show.name} />
                        ) : (
                            <div style={{ padding: 20 }}>{show.name}</div>
                        )}
                    </div>
                </div>
            </section>

            {/* Mobile Tech Metadata Line: Resolution • Film codec • Audio Codec • HDR • Seasons • Rating */}
            {(() => {
                const techItems = [
                    show.videoResolution,
                    show.videoCodec,
                    show.audioCodec,
                    show.hdrType,
                    seasons.length > 0
                        ? `${seasons.length} Season${seasons.length > 1 ? "s" : ""}`
                        : null,
                    show.officialRating,
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

            {/* Mobile Show Description */}
            {show.overview && (
                <div className="mobile-overview-container">
                    <p className="mobile-overview-text">{show.overview}</p>
                </div>
            )}

            {seasons.length > 0 && (
                <MediaRow
                    title="Seasons"
                    items={seasons}
                    viewMode="Landscape"
                    onItemClick={(seasonItem) =>
                        navigate({
                            name: "season-details",
                            seriesId: show.id,
                            seasonId: seasonItem.id,
                        })
                    }
                />
            )}

            {similar.length > 0 && (
                <MediaRow
                    title="More like this"
                    items={similar}
                    viewMode="Portrait"
                />
            )}

            {show.people && show.people.length > 0 && (
                <PersonRow people={show.people} />
            )}
        </div>
    );
};
