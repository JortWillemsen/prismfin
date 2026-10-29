import React, { useEffect, useState, useCallback, useRef } from "react";
import { MediaItem } from "@/common/types/media";
import { catalogService } from "@/application/services/catalogService";
import { MediaCard } from "@/presentation/components/media-card/mediaCard";
import { FilterBar } from "@/presentation/components/filter-bar/filterBar";
import "./shows-page.scss";

export const ShowsPage: React.FC = () => {
    const [shows, setShows] = useState<MediaItem[]>([]);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
    const [minYear, setMinYear] = useState<number | undefined>(undefined);
    const [maxYear, setMaxYear] = useState<number | undefined>(undefined);
    const [selectedSort, setSelectedSort] = useState("SortName");
    const [sortOrder, setSortOrder] = useState<"Ascending" | "Descending">(
        "Ascending"
    );
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const startIndexRef = useRef(0);
    const requestIdRef = useRef(0);
    const loadingMoreRef = useRef(false);
    const PAGE_SIZE = 36;

    const loadShows = useCallback(
        async (reset: boolean = false) => {
            if (!reset && loadingMoreRef.current) return;
            const requestId = reset
                ? ++requestIdRef.current
                : requestIdRef.current;
            const nextIndex = reset ? 0 : startIndexRef.current;
            if (reset) {
                loadingMoreRef.current = false;
                setLoading(true);
                setLoadError(false);
                setShows([]);
                startIndexRef.current = 0;
            } else {
                loadingMoreRef.current = true;
                setLoadingMore(true);
                setLoadError(false);
            }

            try {
                const batch = await catalogService.getShows({
                    genres: selectedGenres,
                    studios: selectedStudios,
                    minYear,
                    maxYear,
                    sortBy: selectedSort,
                    sortOrder,
                    startIndex: nextIndex,
                    limit: PAGE_SIZE,
                });

                if (requestId !== requestIdRef.current) return;

                if (reset) {
                    setShows(batch);
                } else {
                    setShows((prev) => [...prev, ...batch]);
                }

                startIndexRef.current = nextIndex + batch.length;
                setHasMore(batch.length === PAGE_SIZE);
            } catch {
                if (requestId === requestIdRef.current) setLoadError(true);
            } finally {
                if (requestId === requestIdRef.current) {
                    loadingMoreRef.current = false;
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [
            selectedGenres,
            selectedStudios,
            minYear,
            maxYear,
            selectedSort,
            sortOrder,
        ]
    );

    useEffect(() => {
        loadShows(true);
    }, [loadShows]);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (observerRef.current) observerRef.current.disconnect();
            if (!node || loading || loadingMore || loadError || !hasMore)
                return;

            observerRef.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    loadShows(false);
                }
            });

            observerRef.current.observe(node);
        },
        [loading, loadingMore, loadError, hasMore, loadShows]
    );

    const handleResetFilters = () => {
        setSelectedGenres([]);
        setSelectedStudios([]);
        setMinYear(undefined);
        setMaxYear(undefined);
        setSelectedSort("SortName");
        setSortOrder("Ascending");
    };

    return (
        <div className="shows-page">
            <FilterBar
                showCollectionsOption={false}
                selectedGenres={selectedGenres}
                onSelectGenres={setSelectedGenres}
                selectedStudios={selectedStudios}
                onSelectStudios={setSelectedStudios}
                minYear={minYear}
                maxYear={maxYear}
                onYearChange={(min, max) => {
                    setMinYear(min);
                    setMaxYear(max);
                }}
                selectedSort={selectedSort}
                onSelectSort={(sort) => {
                    setSelectedSort(sort);
                    if (sort === "CommunityRating" || sort === "DateCreated") {
                        setSortOrder("Descending");
                    } else {
                        setSortOrder("Ascending");
                    }
                }}
                sortOrder={sortOrder}
                onToggleSortOrder={() =>
                    setSortOrder(
                        sortOrder === "Ascending" ? "Descending" : "Ascending"
                    )
                }
                onResetFilters={handleResetFilters}
            />

            {loading ? (
                <div className="shows-grid">
                    {Array.from({ length: 18 }).map((_, idx) => (
                        <div key={idx} className="media-card portrait">
                            <div className="card-poster-wrapper portrait skeleton-shimmer" />
                            <div
                                style={{
                                    height: 16,
                                    width: "70%",
                                    margin: "10px auto 0 auto",
                                    borderRadius: 4,
                                    background: "rgba(255,255,255,0.06)",
                                }}
                            />
                        </div>
                    ))}
                </div>
            ) : loadError && shows.length === 0 ? (
                <div className="shows-empty" role="alert">
                    Could not load shows.{" "}
                    <button type="button" onClick={() => loadShows(true)}>
                        Retry
                    </button>
                </div>
            ) : shows.length === 0 ? (
                <div className="shows-empty">No shows found</div>
            ) : (
                <>
                    <div className="shows-grid">
                        {shows.map((s) => (
                            <MediaCard
                                key={s.id}
                                item={s}
                                viewMode="Portrait"
                                showSubtitle
                            />
                        ))}
                    </div>

                    <div ref={sentinelRef} className="scroll-loader-status">
                        {loadingMore && (
                            <div
                                className="skeleton-shimmer"
                                style={{
                                    width: 120,
                                    height: 6,
                                    borderRadius: 3,
                                    margin: "24px auto",
                                }}
                            />
                        )}
                        {loadError && (
                            <button
                                type="button"
                                onClick={() => loadShows(false)}
                            >
                                Retry loading shows
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
