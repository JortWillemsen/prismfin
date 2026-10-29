import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    detailsService,
    BoxsetDetailsData,
} from "@/application/services/detailsService";
import { MediaItem } from "@/common/types/media";
import { useApp } from "@/application/state/appContext";
import { getImageUrl } from "@/common/utils/image";
import { MediaCard } from "@/presentation/components/media-card/mediaCard";
import { DetailsError } from "@/presentation/components/details-error/detailsError";
import "./boxset-page.scss";

interface BoxsetPageProps {
    boxsetId: string;
}

export const BoxsetPage: React.FC<BoxsetPageProps> = ({ boxsetId }) => {
    const { session, navigate } = useApp();
    const [details, setDetails] = useState<BoxsetDetailsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [hoveredMovie, setHoveredMovie] = useState<MediaItem | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const serverUrl = session?.serverUrl || "";

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setLoadError(false);
        setHoveredMovie(null);

        detailsService
            .getBoxsetDetails(boxsetId)
            .then((data) => {
                if (isMounted) {
                    setDetails(data);
                    setIsOverflowing(data.items.length > 5);
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
    }, [boxsetId]);

    const updateScrollButtons = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const overflowing = el.scrollWidth > el.clientWidth + 4;
        setIsOverflowing(overflowing);
        setCanScrollLeft(el.scrollLeft > 6);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateScrollButtons();
        el.addEventListener("scroll", updateScrollButtons, { passive: true });
        window.addEventListener("resize", updateScrollButtons);
        return () => {
            el.removeEventListener("scroll", updateScrollButtons);
            window.removeEventListener("resize", updateScrollButtons);
        };
    }, [details, updateScrollButtons]);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const scrollAmount = direction === "left" ? -500 : 500;
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        setTimeout(updateScrollButtons, 350);
    };

    if (loading) {
        return (
            <div className="boxset-page">
                <div className="boxset-backdrop-container skeleton-shimmer" />
                <div className="boxset-content">
                    <div
                        className="skeleton-shimmer"
                        style={{
                            width: 320,
                            height: 48,
                            borderRadius: 12,
                            margin: "40px auto",
                        }}
                    />
                    <div className="boxset-row-wrapper">
                        <div className="boxset-movies-row">
                            {[1, 2, 3, 4].map((idx) => (
                                <div
                                    key={idx}
                                    className="boxset-movie-card skeleton-shimmer"
                                    style={{
                                        width: 220,
                                        aspectRatio: "2/3",
                                        borderRadius: 18,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loadError || !details) {
        return <DetailsError onReturnHome={() => navigate({ name: "home" })} />;
    }

    const { boxset, items } = details;
    const activeMovie = hoveredMovie || items[0];

    const backdropUrl = activeMovie?.backdropImageTag
        ? getImageUrl(serverUrl, activeMovie.id, "Backdrop", {
              tag: activeMovie.backdropImageTag,
              maxWidth: 1920,
              quality: 90,
          })
        : activeMovie?.primaryImageTag
          ? getImageUrl(serverUrl, activeMovie.id, "Primary", {
                tag: activeMovie.primaryImageTag,
                maxWidth: 1920,
                quality: 85,
            })
          : boxset.backdropImageTag
            ? getImageUrl(serverUrl, boxset.id, "Backdrop", {
                  tag: boxset.backdropImageTag,
                  maxWidth: 1920,
                  quality: 90,
              })
            : "";

    return (
        <div className="boxset-page">
            <div className="boxset-backdrop-container">
                {backdropUrl && (
                    <img
                        key={activeMovie?.id || "backdrop"}
                        src={backdropUrl}
                        alt={activeMovie?.name || boxset.name}
                        className="boxset-backdrop-img"
                    />
                )}
                <div className="boxset-gradient-overlay" />
            </div>

            <div className="boxset-content">
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
                    <div className="mobile-title-pill">{boxset.name}</div>
                </div>

                <h1 className="boxset-title">{boxset.name}</h1>

                {/* Mobile 2-column Grid */}
                <div className="boxset-grid-mobile">
                    {items.map((movie) => (
                        <MediaCard
                            key={movie.id}
                            item={movie}
                            onClick={() =>
                                navigate({
                                    name: "movie-details",
                                    id: movie.id,
                                })
                            }
                        />
                    ))}
                </div>

                <div className="boxset-row-wrapper">
                    <div
                        className={`row-edge-fade left ${canScrollLeft ? "visible" : ""}`}
                    />
                    <div
                        className={`row-edge-fade right ${canScrollRight ? "visible" : ""}`}
                    />

                    {canScrollLeft && (
                        <button
                            type="button"
                            className="boxset-nav-btn prev"
                            onClick={() => scroll("left")}
                            aria-label="Scroll left"
                        >
                            <img
                                src="/assets/images/arrow-back.svg"
                                alt="Scroll left"
                            />
                        </button>
                    )}

                    {canScrollRight && (
                        <button
                            type="button"
                            className="boxset-nav-btn next"
                            onClick={() => scroll("right")}
                            aria-label="Scroll right"
                        >
                            <img
                                src="/assets/images/arrow-front.svg"
                                alt="Scroll right"
                            />
                        </button>
                    )}

                    <div
                        className={`boxset-movies-row ${isOverflowing ? "is-overflowing" : "is-centered"}`}
                        ref={scrollRef}
                    >
                        {items.map((movie) => {
                            const posterUrl = movie.primaryImageTag
                                ? getImageUrl(serverUrl, movie.id, "Primary", {
                                      tag: movie.primaryImageTag,
                                      maxWidth: 500,
                                      quality: 90,
                                  })
                                : "";

                            return (
                                <div
                                    key={movie.id}
                                    className="boxset-movie-card"
                                    onMouseEnter={() => setHoveredMovie(movie)}
                                    onClick={() =>
                                        navigate({
                                            name: "movie-details",
                                            id: movie.id,
                                        })
                                    }
                                >
                                    <div className="card-poster-inner">
                                        {posterUrl ? (
                                            <img
                                                src={posterUrl}
                                                alt={movie.name}
                                                loading="eager"
                                            />
                                        ) : (
                                            <div className="poster-placeholder">
                                                {movie.name}
                                            </div>
                                        )}

                                        <div className="card-hover-blur-overlay">
                                            {movie.logoImageTag ? (
                                                <img
                                                    src={getImageUrl(
                                                        serverUrl,
                                                        movie.id,
                                                        "Logo",
                                                        {
                                                            tag: movie.logoImageTag,
                                                            maxWidth: 280,
                                                        }
                                                    )}
                                                    alt={movie.name}
                                                    className="hover-card-logo"
                                                />
                                            ) : (
                                                <span className="hover-card-title">
                                                    {movie.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="movie-card-label">
                                        <div className="label-name">
                                            {movie.name}
                                        </div>
                                        {movie.productionYear ? (
                                            <div className="label-year">
                                                {movie.productionYear}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
