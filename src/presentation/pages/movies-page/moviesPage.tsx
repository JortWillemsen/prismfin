import React, { useEffect, useState, useCallback, useRef } from "react";
import { MediaItem } from "@/common/types/media";
import { catalogService } from "@/application/services/catalogService";
import { MediaCard } from "@/presentation/components/media-card/mediaCard";
import { FilterBar } from "@/presentation/components/filter-bar/filterBar";
import "./movies-page.scss";

export const MoviesPage: React.FC = () => {
    const [movies, setMovies] = useState<MediaItem[]>([]);
    const [isCollection, setIsCollection] = useState(false);
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

    const loadMovies = useCallback(
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
                setMovies([]);
                startIndexRef.current = 0;
            } else {
                loadingMoreRef.current = true;
                setLoadingMore(true);
                setLoadError(false);
            }

            try {
                const batch = await catalogService.getMovies({
                    isCollection,
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
                    setMovies(batch);
                } else {
                    setMovies((prev) => [...prev, ...batch]);
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
            isCollection,
            selectedGenres,
            selectedStudios,
            minYear,
            maxYear,
            selectedSort,
            sortOrder,
        ]
    );

    useEffect(() => {
        loadMovies(true);
    }, [loadMovies]);

    // Infinite scroll observer
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (observerRef.current) observerRef.current.disconnect();
            if (!node || loading || loadingMore || loadError || !hasMore)
                return;

            observerRef.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    loadMovies(false);
                }
            });

            observerRef.current.observe(node);
        },
        [loading, loadingMore, loadError, hasMore, loadMovies]
    );

    const handleResetFilters = () => {
        setIsCollection(false);
        setSelectedGenres([]);
        setSelectedStudios([]);
        setMinYear(undefined);
        setMaxYear(undefined);
        setSelectedSort("SortName");
        setSortOrder("Ascending");
    };

    return (
        <div className="movies-page">
            <FilterBar
                showCollectionsOption
                isCollectionsActive={isCollection}
                onToggleCollections={() => setIsCollection(!isCollection)}
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
                <div className="movies-grid">
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
            ) : loadError && movies.length === 0 ? (
                <div className="movies-empty" role="alert">
                    Could not load movies.{" "}
                    <button type="button" onClick={() => loadMovies(true)}>
                        Retry
                    </button>
                </div>
            ) : movies.length === 0 ? (
                <div className="movies-empty">No movies found</div>
            ) : (
                <>
                    <div className="movies-grid">
                        {movies.map((m) => (
                            <MediaCard
                                key={m.id}
                                item={m}
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
                                onClick={() => loadMovies(false)}
                            >
                                Retry loading movies
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
