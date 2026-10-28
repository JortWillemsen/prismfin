import React, { useState, useEffect, useRef } from "react";
import { MediaItem } from "@/common/types/media";
import { useApp } from "@/application/state/appContext";
import { detailsService } from "@/application/services/detailsService";
import { getImageUrl } from "@/common/utils/image";
import { formatScore } from "@/common/utils/formatters";
import "./featured-banner.scss";

interface FeaturedBannerProps {
    items: MediaItem[];
    loading?: boolean;
}

export const FeaturedBanner: React.FC<FeaturedBannerProps> = ({
    items,
    loading = false,
}) => {
    const { session, navigate, startPlayback } = useApp();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [favoritesMap, setFavoritesMap] = useState<Record<string, boolean>>(
        {}
    );

    const touchStartXRef = useRef<number | null>(null);

    const nextSlide = () => {
        if (!items || items.length === 0) return;
        setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    const prevSlide = () => {
        if (!items || items.length === 0) return;
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    useEffect(() => {
        if (!items || items.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, 8500);
        return () => clearInterval(interval);
    }, [currentIndex, items]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartXRef.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
        touchStartXRef.current = null;
        if (deltaX > 45) {
            prevSlide();
        } else if (deltaX < -45) {
            nextSlide();
        }
    };

    const handleToggleFavorite = async (
        e: React.MouseEvent,
        item: MediaItem
    ) => {
        e.stopPropagation();
        const currentIsFav = favoritesMap[item.id] ?? item.isFavorite;
        try {
            const nextFav = await detailsService.toggleFavorite(
                item.id,
                currentIsFav
            );
            setFavoritesMap((prev) => ({ ...prev, [item.id]: nextFav }));
        } catch {
            // ignore
        }
    };

    if (loading || !items || items.length === 0) {
        return (
            <div className="featured-banner skeleton-shimmer">
                <div className="banner-content">
                    <div
                        style={{
                            width: 180,
                            height: 40,
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.08)",
                            marginBottom: 16,
                        }}
                    />
                    <div
                        style={{
                            width: 340,
                            height: 44,
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.08)",
                            marginBottom: 12,
                        }}
                    />
                    <div
                        style={{
                            width: 220,
                            height: 20,
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.08)",
                            marginBottom: 16,
                        }}
                    />
                    <div
                        style={{
                            width: "80%",
                            height: 60,
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.05)",
                        }}
                    />
                </div>
            </div>
        );
    }

    const serverUrl = session?.serverUrl || "";

    return (
        <section
            className="featured-banner"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Mobile Top Progression Indicators */}
            {items.length > 1 && (
                <div className="mobile-progression-indicators">
                    {items.map((it, idx) => (
                        <div
                            key={it.id}
                            className={`mobile-progression-dot ${idx === currentIndex ? "active" : ""}`}
                            onClick={() => setCurrentIndex(idx)}
                        />
                    ))}
                </div>
            )}

            <div className="banner-slider">
                {items.map((item, idx) => {
                    const isActive = idx === currentIndex;
                    const isPrev =
                        idx ===
                        (currentIndex - 1 + items.length) % items.length;

                    const backdropUrl = item.backdropImageTag
                        ? getImageUrl(serverUrl, item.id, "Backdrop", {
                              tag: item.backdropImageTag,
                              maxWidth: 1920,
                              quality: 90,
                          })
                        : item.primaryImageTag
                          ? getImageUrl(serverUrl, item.id, "Primary", {
                                tag: item.primaryImageTag,
                                maxWidth: 1920,
                                quality: 85,
                            })
                          : "";

                    const logoUrl = item.logoImageTag
                        ? getImageUrl(
                              serverUrl,
                              item.logoItemId || item.id,
                              "Logo",
                              {
                                  tag: item.logoImageTag,
                                  maxWidth: 500,
                              }
                          )
                        : "";

                    const handlePlay = () => startPlayback(item);
                    const handleMoreInfo = () => {
                        if (item.type === "Series") {
                            navigate({ name: "show-details", id: item.id });
                        } else {
                            navigate({ name: "movie-details", id: item.id });
                        }
                    };

                    const isFav = favoritesMap[item.id] ?? item.isFavorite;

                    return (
                        <div
                            key={item.id}
                            className={`banner-slide ${isActive ? "active" : isPrev ? "prev" : ""}`}
                        >
                            {backdropUrl && (
                                <img
                                    src={backdropUrl}
                                    alt={item.name}
                                    className="banner-backdrop"
                                    loading={idx === 0 ? "eager" : "lazy"}
                                />
                            )}
                            <div className="banner-gradient-overlay" />

                            <div className="banner-content">
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt={item.name}
                                        className="banner-logo"
                                    />
                                ) : (
                                    <h1 className="banner-title">
                                        {item.name}
                                    </h1>
                                )}

                                <div className="banner-meta">
                                    {item.criticRating ? (
                                        <>
                                            <span>
                                                Rotten Tomatoes{" "}
                                                {item.criticRating}%
                                            </span>
                                            <span className="meta-dot">•</span>
                                        </>
                                    ) : null}

                                    {item.communityRating ? (
                                        <>
                                            <span className="rating-badge">
                                                IMDb{" "}
                                                {formatScore(
                                                    item.communityRating
                                                )}
                                            </span>
                                            <span className="meta-dot">•</span>
                                        </>
                                    ) : null}

                                    {item.productionYear ? (
                                        <span>{item.productionYear}</span>
                                    ) : null}
                                </div>

                                {item.overview && (
                                    <p className="banner-description">
                                        {item.overview}
                                    </p>
                                )}

                                {/* Desktop action row */}
                                <div className="banner-actions">
                                    <button
                                        type="button"
                                        className="btn-play-yellow"
                                        onClick={handlePlay}
                                    >
                                        Play
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-more-info"
                                        onClick={handleMoreInfo}
                                    >
                                        More Information
                                    </button>
                                </div>

                                {/* Mobile 3-Button Action Row */}
                                <div className="mobile-banner-actions">
                                    <button
                                        type="button"
                                        className="mobile-play-btn"
                                        onClick={handlePlay}
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
                                        className="mobile-circle-action-btn"
                                        onClick={handleMoreInfo}
                                        title="More information"
                                        aria-label="More information"
                                    >
                                        <img
                                            src="/assets/images/info.svg"
                                            alt="More information"
                                        />
                                    </button>

                                    <button
                                        type="button"
                                        className={`mobile-circle-action-btn ${isFav ? "favorited" : ""}`}
                                        onClick={(e) =>
                                            handleToggleFavorite(e, item)
                                        }
                                        title={
                                            isFav
                                                ? "Remove from favorites"
                                                : "Add to favorites"
                                        }
                                        aria-label="Toggle favorite"
                                    >
                                        <img
                                            src={
                                                isFav
                                                    ? "/assets/images/heart-check.svg"
                                                    : "/assets/images/heart.svg"
                                            }
                                            alt="Favorite"
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {items.length > 1 && (
                <>
                    <button
                        type="button"
                        className="banner-arrow-btn prev"
                        onClick={prevSlide}
                        aria-label="Previous featured title"
                    >
                        <img
                            src="/assets/images/arrow-back.svg"
                            alt="Previous"
                        />
                    </button>
                    <button
                        type="button"
                        className="banner-arrow-btn next"
                        onClick={nextSlide}
                        aria-label="Next featured title"
                    >
                        <img src="/assets/images/arrow-front.svg" alt="Next" />
                    </button>

                    <div className="banner-indicators">
                        {items.map((it, idx) => (
                            <div
                                key={it.id}
                                className={`indicator-dot ${idx === currentIndex ? "active" : ""}`}
                                onClick={() => setCurrentIndex(idx)}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
};
