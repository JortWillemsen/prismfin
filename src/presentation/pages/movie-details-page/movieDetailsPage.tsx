import React, { useEffect, useState } from "react";
import {
    detailsService,
    MovieDetailsData,
} from "@/application/services/detailsService";
import { useApp } from "@/application/state/appContext";
import { getImageUrl } from "@/common/utils/image";
import {
    formatDurationTicks,
    formatScore,
    formatTimeSeconds,
} from "@/common/utils/formatters";
import { MediaRow } from "@/presentation/components/media-row/mediaRow";
import { PersonRow } from "@/presentation/components/person-row/personRow";
import { DetailsSkeleton } from "@/presentation/components/details-skeleton/detailsSkeleton";
import { DetailsError } from "@/presentation/components/details-error/detailsError";
import "./movie-details-page.scss";

interface MovieDetailsPageProps {
    movieId: string;
}

export const MovieDetailsPage: React.FC<MovieDetailsPageProps> = ({
    movieId,
}) => {
    const { session, startPlayback, navigate } = useApp();
    const [details, setDetails] = useState<MovieDetailsData | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setLoadError(false);

        detailsService
            .getMovieDetails(movieId)
            .then((data) => {
                if (isMounted) {
                    setDetails(data);
                    setIsFavorite(data.movie.isFavorite);
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
    }, [movieId]);

    if (loading) {
        return (
            <div className="movie-details-page">
                <DetailsSkeleton />
            </div>
        );
    }

    if (loadError || !details) {
        return <DetailsError onReturnHome={() => navigate({ name: "home" })} />;
    }

    const { movie, similar, collection } = details;
    const serverUrl = session?.serverUrl || "";

    const backdropUrl = movie.backdropImageTag
        ? getImageUrl(serverUrl, movie.id, "Backdrop", {
              tag: movie.backdropImageTag,
              maxWidth: 1920,
              quality: 90,
          })
        : "";

    const logoUrl = movie.logoImageTag
        ? getImageUrl(serverUrl, movie.id, "Logo", {
              tag: movie.logoImageTag,
              maxWidth: 500,
          })
        : "";

    const posterUrl = movie.primaryImageTag
        ? getImageUrl(serverUrl, movie.id, "Primary", {
              tag: movie.primaryImageTag,
              maxWidth: 600,
              quality: 90,
          })
        : "";

    const collectionPosterUrl = collection?.primaryImageTag
        ? getImageUrl(serverUrl, collection.id, "Primary", {
              tag: collection.primaryImageTag,
              maxWidth: 320,
              quality: 85,
          })
        : "";

    const handleToggleFavorite = async () => {
        try {
            const next = await detailsService.toggleFavorite(
                movie.id,
                isFavorite
            );
            setIsFavorite(next);
        } catch {
            // ignore
        }
    };

    const handlePlayScene = (seconds: number) => {
        startPlayback({
            ...movie,
            playbackPositionTicks: seconds * 10000000,
        });
    };

    return (
        <div className="movie-details-page">
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
                <div className="mobile-title-pill">{movie.name}</div>
            </div>

            <section className="movie-hero-section">
                {backdropUrl && (
                    <img
                        src={backdropUrl}
                        alt={movie.name}
                        className="hero-backdrop"
                    />
                )}
                <div className="hero-gradient-overlay" />

                <div className="hero-content-left">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={movie.name}
                            className="details-logo"
                        />
                    ) : null}

                    <h1 className="details-title-heading">
                        {movie.name}
                        {movie.director && (
                            <span className="details-director">
                                , {movie.director}
                            </span>
                        )}
                    </h1>

                    <div className="details-metadata-line">
                        {movie.criticRating ? (
                            <>
                                <span>
                                    Rotten Tomatoes {movie.criticRating}%
                                </span>
                                <span className="meta-separator">•</span>
                            </>
                        ) : null}

                        {movie.communityRating ? (
                            <>
                                <span className="badge-accent">
                                    IMDb {formatScore(movie.communityRating)}
                                </span>
                                <span className="meta-separator">•</span>
                            </>
                        ) : null}

                        {movie.productionYear ? (
                            <>
                                <span>{movie.productionYear}</span>
                                <span className="meta-separator desktop-only-meta">
                                    •
                                </span>
                            </>
                        ) : null}

                        {movie.runTimeTicks ? (
                            <span className="desktop-only-meta">
                                <span>
                                    {formatDurationTicks(movie.runTimeTicks)}
                                </span>
                                <span className="meta-separator">•</span>
                            </span>
                        ) : null}

                        {movie.videoResolution && (
                            <span className="badge-pill desktop-only-meta">
                                {movie.videoResolution}
                            </span>
                        )}

                        {movie.hdrType && (
                            <span className="badge-pill desktop-only-meta">
                                {movie.hdrType}
                            </span>
                        )}

                        {movie.audioCodec && (
                            <span className="badge-pill desktop-only-meta">
                                {movie.audioCodec}
                            </span>
                        )}

                        {movie.studios && movie.studios.length > 0 && (
                            <span className="desktop-only-meta">
                                <span className="meta-separator">•</span>
                                <span>{movie.studios[0]}</span>
                            </span>
                        )}
                    </div>

                    {movie.overview && (
                        <p className="details-overview">{movie.overview}</p>
                    )}

                    {/* Desktop action row */}
                    <div className="details-action-row">
                        <button
                            type="button"
                            className="btn-play-yellow"
                            onClick={() => startPlayback(movie)}
                        >
                            Play
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
                            onClick={() => startPlayback(movie)}
                        >
                            <img
                                src="/assets/images/play.svg"
                                alt="Play"
                                className="mobile-play-icon"
                            />
                            <span>Play</span>
                        </button>

                        <button
                            type="button"
                            className={`mobile-circle-hero-btn ${!collection ? "disabled" : ""}`}
                            onClick={() => {
                                if (collection) {
                                    navigate({
                                        name: "boxset",
                                        id: collection.id,
                                    });
                                }
                            }}
                            title={collection ? collection.name : "Collection"}
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
                            <img
                                src={posterUrl}
                                alt={movie.name}
                                className="main-boxart-img"
                            />
                        ) : (
                            <div style={{ padding: 20 }}>{movie.name}</div>
                        )}

                        {collection && (
                            <div
                                className="collection-overlay-card"
                                onClick={() =>
                                    navigate({
                                        name: "boxset",
                                        id: collection.id,
                                    })
                                }
                                title={`Part of ${collection.name}`}
                            >
                                {collectionPosterUrl ? (
                                    <img
                                        src={collectionPosterUrl}
                                        alt={collection.name}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "100%",
                                            background: "rgba(30,30,30,0.85)",
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Mobile Tech Metadata Line: Resolution • Film codec • Audio Codec • HDR • Runtime */}
            {(() => {
                const techItems = [
                    movie.videoResolution,
                    movie.videoCodec,
                    movie.audioCodec,
                    movie.hdrType,
                    movie.runTimeTicks
                        ? formatDurationTicks(movie.runTimeTicks)
                        : null,
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

            {/* Mobile Movie Description */}
            {movie.overview && (
                <div className="mobile-overview-container">
                    <p className="mobile-overview-text">{movie.overview}</p>
                </div>
            )}

            {similar.length > 0 && (
                <MediaRow
                    title="More like this"
                    items={similar}
                    viewMode="Portrait"
                />
            )}

            {movie.people && movie.people.length > 0 && (
                <PersonRow people={movie.people} />
            )}

            {movie.scenes && movie.scenes.length > 0 && (
                <section style={{ marginBottom: 48 }}>
                    <div style={{ marginBottom: 18 }}>
                        <h2
                            style={{
                                fontSize: 26,
                                fontFamily: "Cardo",
                                fontWeight: 700,
                            }}
                        >
                            Scenes
                        </h2>
                    </div>
                    <div className="scenes-row-container">
                        {movie.scenes.map((scene, idx) => {
                            const trickplay = movie.trickplayInfo;
                            const intervalSec = trickplay?.interval
                                ? trickplay.interval / 1000
                                : 20;
                            const tileIndex = Math.max(
                                0,
                                Math.floor(
                                    scene.startPositionSeconds / intervalSec
                                )
                            );
                            const tilesPerRow = trickplay?.tileWidth || 10;
                            const tilesPerCol = trickplay?.tileHeight || 10;
                            const tilesPerSheet = Math.max(
                                1,
                                tilesPerRow * tilesPerCol
                            );
                            const sheetIndex = Math.floor(
                                tileIndex / tilesPerSheet
                            );
                            const tileInSheet = tileIndex % tilesPerSheet;
                            const col = tileInSheet % tilesPerRow;
                            const row = Math.floor(tileInSheet / tilesPerRow);
                            const denomX = Math.max(1, tilesPerRow - 1);
                            const denomY = Math.max(1, tilesPerCol - 1);
                            const resolutionWidth = trickplay?.width || 320;
                            const trickplayUrl =
                                session?.serverUrl && session?.accessToken
                                    ? `${session.serverUrl}/Videos/${movie.id}/Trickplay/${resolutionWidth}/${sheetIndex}.jpg?api_key=${encodeURIComponent(session.accessToken)}&ApiKey=${encodeURIComponent(session.accessToken)}`
                                    : "";

                            return (
                                <div
                                    key={idx}
                                    className="scene-card-item"
                                    onClick={() =>
                                        handlePlayScene(
                                            scene.startPositionSeconds
                                        )
                                    }
                                >
                                    <div className="scene-img-wrapper">
                                        {scene.imageTag ? (
                                            <img
                                                src={getImageUrl(
                                                    serverUrl,
                                                    movie.id,
                                                    "Primary",
                                                    {
                                                        tag: scene.imageTag,
                                                        maxWidth: 400,
                                                    }
                                                )}
                                                alt={scene.name}
                                            />
                                        ) : trickplayUrl ? (
                                            <div
                                                className="scene-trickplay-tile"
                                                style={{
                                                    backgroundImage: `url(${trickplayUrl})`,
                                                    backgroundSize: `${tilesPerRow * 100}% ${tilesPerCol * 100}%`,
                                                    backgroundPosition: `${(col / denomX) * 100}% ${(row / denomY) * 100}%`,
                                                }}
                                            />
                                        ) : (
                                            <img
                                                src={backdropUrl || posterUrl}
                                                alt={scene.name}
                                            />
                                        )}
                                    </div>
                                    <div className="scene-meta-label">
                                        {scene.name} •{" "}
                                        {formatTimeSeconds(
                                            scene.startPositionSeconds
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
};
