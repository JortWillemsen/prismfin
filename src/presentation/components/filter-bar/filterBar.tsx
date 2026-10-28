import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { GlassDropdown } from "../glass-dropdown/glassDropdown";
import "./filter-bar.scss";

interface FilterBarProps {
    showCollectionsOption?: boolean;
    isCollectionsActive?: boolean;
    onToggleCollections?: () => void;
    // Multi-select genres
    selectedGenres?: string[];
    onSelectGenres?: (genres: string[]) => void;
    genreOptions?: string[];
    // Single genre fallback
    selectedGenre?: string;
    onSelectGenre?: (genre: string) => void;
    // Multi-select studios
    selectedStudios?: string[];
    onSelectStudios?: (studios: string[]) => void;
    studioOptions?: string[];
    // Release year slider (dual handle)
    minYear?: number;
    maxYear?: number;
    onYearChange?: (minYear?: number, maxYear?: number) => void;
    // Sorting
    sortOptions?: Array<{ label: string; value: string }>;
    selectedSort?: string;
    defaultSort?: string;
    onSelectSort?: (sort: string) => void;
    sortOrder?: "Ascending" | "Descending";
    onToggleSortOrder?: () => void;
    onResetFilters?: () => void;
}

const DEFAULT_GENRES = [
    { label: "All Genres", value: "All Genres" },
    { label: "Action", value: "Action" },
    { label: "Adventure", value: "Adventure" },
    { label: "Animation", value: "Animation" },
    { label: "Comedy", value: "Comedy" },
    { label: "Crime", value: "Crime" },
    { label: "Documentary", value: "Documentary" },
    { label: "Drama", value: "Drama" },
    { label: "Family", value: "Family" },
    { label: "Fantasy", value: "Fantasy" },
    { label: "Horror", value: "Horror" },
    { label: "Mystery", value: "Mystery" },
    { label: "Romance", value: "Romance" },
    { label: "Sci-Fi", value: "Sci-Fi" },
    { label: "Thriller", value: "Thriller" },
];

const DEFAULT_STUDIOS = [
    { label: "All Studios", value: "All Studios" },
    { label: "Warner Bros.", value: "Warner Bros." },
    { label: "Universal Pictures", value: "Universal Pictures" },
    { label: "Walt Disney Pictures", value: "Walt Disney Pictures" },
    { label: "Sony Pictures", value: "Sony Pictures" },
    { label: "Paramount", value: "Paramount" },
    { label: "20th Century Studios", value: "20th Century Studios" },
    { label: "Lionsgate", value: "Lionsgate" },
    { label: "A24", value: "A24" },
    { label: "Marvel Studios", value: "Marvel Studios" },
    { label: "Pixar", value: "Pixar" },
    { label: "DreamWorks", value: "DreamWorks" },
    { label: "Metro-Goldwyn-Mayer", value: "Metro-Goldwyn-Mayer" },
    { label: "Columbia Pictures", value: "Columbia Pictures" },
    { label: "HBO", value: "HBO" },
    { label: "Netflix", value: "Netflix" },
    { label: "Amazon Studios", value: "Amazon Studios" },
    { label: "Apple TV+", value: "Apple TV+" },
];

const DEFAULT_SORT_OPTIONS = [
    { label: "Name", value: "SortName" },
    { label: "Rating", value: "CommunityRating" },
    { label: "Release Date", value: "PremiereDate" },
    { label: "Recently Added", value: "DateCreated" },
];

const MIN_ALLOWED_YEAR = 1950;
const MAX_ALLOWED_YEAR = 2026;

export const FilterBar: React.FC<FilterBarProps> = ({
    showCollectionsOption = true,
    isCollectionsActive = false,
    onToggleCollections,
    selectedGenres,
    onSelectGenres,
    genreOptions,
    selectedGenre = "All Genres",
    onSelectGenre,
    selectedStudios,
    onSelectStudios,
    studioOptions,
    minYear,
    maxYear,
    onYearChange,
    sortOptions,
    selectedSort = "SortName",
    defaultSort = "SortName",
    onSelectSort,
    sortOrder = "Ascending",
    onToggleSortOrder,
    onResetFilters,
}) => {
    const [isYearPopoverOpen, setIsYearPopoverOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

    const yearPopoverRef = useRef<HTMLDivElement>(null);
    const mobileFilterRef = useRef<HTMLDivElement>(null);
    const mobileSortRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (
                yearPopoverRef.current &&
                !yearPopoverRef.current.contains(target)
            ) {
                setIsYearPopoverOpen(false);
            }
            if (
                mobileFilterRef.current &&
                !mobileFilterRef.current.contains(target)
            ) {
                setIsMobileFilterOpen(false);
            }
            if (
                mobileSortRef.current &&
                !mobileSortRef.current.contains(target)
            ) {
                setIsMobileSortOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, {
            passive: true,
        });
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    const genresList = genreOptions
        ? [
              { label: "All Genres", value: "All Genres" },
              ...genreOptions.map((g) => ({ label: g, value: g })),
          ]
        : DEFAULT_GENRES;

    const studiosList = studioOptions
        ? [
              { label: "All Studios", value: "All Studios" },
              ...studioOptions.map((s) => ({ label: s, value: s })),
          ]
        : DEFAULT_STUDIOS;

    const currentMin = minYear ?? MIN_ALLOWED_YEAR;
    const currentMax = maxYear ?? MAX_ALLOWED_YEAR;

    const hasYearFilter =
        (minYear !== undefined && minYear > MIN_ALLOWED_YEAR) ||
        (maxYear !== undefined && maxYear < MAX_ALLOWED_YEAR);

    const yearLabel = hasYearFilter
        ? `${currentMin} - ${currentMax}`
        : "Release Year";

    const isFilterApplied =
        isCollectionsActive ||
        (selectedGenres && selectedGenres.length > 0) ||
        (selectedGenre && selectedGenre !== "All Genres") ||
        (selectedStudios && selectedStudios.length > 0) ||
        hasYearFilter ||
        (selectedSort && selectedSort !== defaultSort) ||
        sortOrder !== "Ascending";

    const effectiveSortOptions = sortOptions || DEFAULT_SORT_OPTIONS;

    const minPercent =
        ((currentMin - MIN_ALLOWED_YEAR) /
            (MAX_ALLOWED_YEAR - MIN_ALLOWED_YEAR)) *
        100;
    const maxPercent =
        ((currentMax - MIN_ALLOWED_YEAR) /
            (MAX_ALLOWED_YEAR - MIN_ALLOWED_YEAR)) *
        100;

    return (
        <>
            {/* Desktop Filter Bar (visible on >= 769px) */}
            <div className="filter-bar filter-bar-desktop">
                {/* Filter Group */}
                <div className="filter-section">
                    <span className="filter-section-label">Filter:</span>

                    {showCollectionsOption && onToggleCollections && (
                        <button
                            type="button"
                            className={`filter-pill ${isCollectionsActive ? "active" : ""}`}
                            onClick={onToggleCollections}
                        >
                            Collections
                        </button>
                    )}

                    {/* Multi-select or single genre dropdown */}
                    {(onSelectGenres || onSelectGenre) && (
                        <GlassDropdown
                            options={genresList}
                            isMultiSelect={!!onSelectGenres}
                            values={selectedGenres}
                            value={selectedGenre}
                            onChange={(val) => {
                                if (onSelectGenres && Array.isArray(val)) {
                                    onSelectGenres(val);
                                } else if (onSelectGenre) {
                                    onSelectGenre(String(val));
                                }
                            }}
                            placeholder="All Genres"
                            ariaLabel="Filter by genre"
                            showChevron={false}
                        />
                    )}

                    {/* Multi-select studio dropdown */}
                    {onSelectStudios && (
                        <GlassDropdown
                            options={studiosList}
                            isMultiSelect
                            values={selectedStudios}
                            onChange={(val) => onSelectStudios(val)}
                            placeholder="All Studios"
                            ariaLabel="Filter by studio"
                            showChevron={false}
                        />
                    )}

                    {/* Release year dual-handle slider popover */}
                    {onYearChange && (
                        <div
                            className="year-popover-anchor"
                            ref={yearPopoverRef}
                        >
                            <button
                                type="button"
                                className={`filter-pill ${hasYearFilter ? "active" : ""}`}
                                onClick={() =>
                                    setIsYearPopoverOpen(!isYearPopoverOpen)
                                }
                                aria-label="Filter by release year"
                            >
                                <span>{yearLabel}</span>
                            </button>

                            {isYearPopoverOpen && (
                                <div className="year-popover">
                                    <div className="year-header">
                                        <span>Release Year:</span>
                                        <span className="year-val">
                                            {hasYearFilter
                                                ? `${currentMin} - ${currentMax}`
                                                : "All Years"}
                                        </span>
                                    </div>

                                    <div className="dual-range-wrapper">
                                        <div className="dual-range-track-bg" />
                                        <div
                                            className="dual-range-highlight"
                                            style={{
                                                left: `${minPercent}%`,
                                                width: `${Math.max(0, maxPercent - minPercent)}%`,
                                            }}
                                        />
                                        <input
                                            type="range"
                                            min={MIN_ALLOWED_YEAR}
                                            max={MAX_ALLOWED_YEAR}
                                            step={1}
                                            value={currentMin}
                                            onChange={(e) => {
                                                const val = parseInt(
                                                    e.target.value,
                                                    10
                                                );
                                                const clamped = Math.min(
                                                    val,
                                                    currentMax
                                                );
                                                onYearChange(
                                                    clamped <= MIN_ALLOWED_YEAR
                                                        ? undefined
                                                        : clamped,
                                                    maxYear
                                                );
                                            }}
                                            className="range-slider range-slider-min"
                                            aria-label="Minimum release year"
                                        />
                                        <input
                                            type="range"
                                            min={MIN_ALLOWED_YEAR}
                                            max={MAX_ALLOWED_YEAR}
                                            step={1}
                                            value={currentMax}
                                            onChange={(e) => {
                                                const val = parseInt(
                                                    e.target.value,
                                                    10
                                                );
                                                const clamped = Math.max(
                                                    val,
                                                    currentMin
                                                );
                                                onYearChange(
                                                    minYear,
                                                    clamped >= MAX_ALLOWED_YEAR
                                                        ? undefined
                                                        : clamped
                                                );
                                            }}
                                            className="range-slider range-slider-max"
                                            aria-label="Maximum release year"
                                        />
                                    </div>

                                    <div className="year-range-labels">
                                        <span>{MIN_ALLOWED_YEAR}</span>
                                        <span>{MAX_ALLOWED_YEAR}</span>
                                    </div>

                                    {hasYearFilter && (
                                        <span
                                            className="year-reset-link"
                                            onClick={() =>
                                                onYearChange(
                                                    undefined,
                                                    undefined
                                                )
                                            }
                                        >
                                            Reset Year Range
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Visual Divider between Filters and Sorting */}
                <div className="filter-divider" />

                {/* Sort Group */}
                <div className="sort-section">
                    <span className="filter-section-label">Sort:</span>

                    {onSelectSort && (
                        <GlassDropdown
                            options={effectiveSortOptions}
                            value={selectedSort}
                            onChange={onSelectSort}
                            ariaLabel="Sort by"
                            showChevron={false}
                        />
                    )}

                    {onToggleSortOrder && (
                        <button
                            type="button"
                            className="icon-action-pill"
                            onClick={onToggleSortOrder}
                            title={
                                sortOrder === "Ascending"
                                    ? "Sort Ascending"
                                    : "Sort Descending"
                            }
                            aria-label="Toggle sort order"
                        >
                            <img
                                src={
                                    (
                                        selectedSort === "SortName"
                                            ? sortOrder === "Descending"
                                            : sortOrder === "Ascending"
                                    )
                                        ? "/assets/images/arrow-up.svg"
                                        : "/assets/images/arrow-down.svg"
                                }
                                alt={sortOrder}
                            />
                        </button>
                    )}
                </div>

                {/* Clear filters button with animated spring entrance */}
                {onResetFilters && (
                    <button
                        type="button"
                        className={`icon-action-pill reset-btn ${isFilterApplied ? "visible" : ""}`}
                        onClick={onResetFilters}
                        title="Reset all filters and sort"
                        aria-label="Reset all filters and sort"
                    >
                        <img
                            src="/assets/images/filter-off.svg"
                            alt="Reset filters"
                        />
                    </button>
                )}
            </div>

            {/* Mobile Floating Action Buttons & Flyouts (visible on <= 768px) */}
            {typeof document !== "undefined" &&
                createPortal(
                    <div className="filter-bar-mobile-floating">
                        {/* Filter Button & Flyout (stacked closest to bottom) */}
                        <div
                            className="mobile-float-item"
                            ref={mobileFilterRef}
                        >
                            {isMobileFilterOpen && (
                                <div className="mobile-glass-flyout filter-flyout">
                                    <div className="flyout-header">
                                        <span className="flyout-title">
                                            Filters
                                        </span>
                                        {onResetFilters && isFilterApplied && (
                                            <button
                                                type="button"
                                                className="flyout-reset-btn"
                                                onClick={() => {
                                                    onResetFilters();
                                                    setIsMobileFilterOpen(
                                                        false
                                                    );
                                                }}
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>

                                    <div className="flyout-content-scroll">
                                        {showCollectionsOption &&
                                            onToggleCollections && (
                                                <div className="flyout-section">
                                                    <span className="flyout-section-label">
                                                        View
                                                    </span>
                                                    <div className="flyout-chips-wrap">
                                                        <button
                                                            type="button"
                                                            className={`flyout-chip ${isCollectionsActive ? "active" : ""}`}
                                                            onClick={
                                                                onToggleCollections
                                                            }
                                                        >
                                                            Collections
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                        {(onSelectGenres || onSelectGenre) && (
                                            <div className="flyout-section">
                                                <span className="flyout-section-label">
                                                    Genres
                                                </span>
                                                <div className="flyout-chips-wrap">
                                                    {genresList.map((g) => {
                                                        const isAll =
                                                            g.value ===
                                                                "All Genres" ||
                                                            g.value === "";
                                                        const isSelected = isAll
                                                            ? (!selectedGenres ||
                                                                  selectedGenres.length ===
                                                                      0) &&
                                                              (!selectedGenre ||
                                                                  selectedGenre ===
                                                                      "All Genres")
                                                            : selectedGenres?.includes(
                                                                  String(
                                                                      g.value
                                                                  )
                                                              ) ||
                                                              selectedGenre ===
                                                                  g.value;
                                                        return (
                                                            <button
                                                                key={String(
                                                                    g.value
                                                                )}
                                                                type="button"
                                                                className={`flyout-chip ${isSelected ? "active" : ""}`}
                                                                onClick={() => {
                                                                    if (isAll) {
                                                                        if (
                                                                            onSelectGenres
                                                                        )
                                                                            onSelectGenres(
                                                                                []
                                                                            );
                                                                        if (
                                                                            onSelectGenre
                                                                        )
                                                                            onSelectGenre(
                                                                                "All Genres"
                                                                            );
                                                                    } else if (
                                                                        onSelectGenres
                                                                    ) {
                                                                        const current =
                                                                            selectedGenres ||
                                                                            [];
                                                                        const next =
                                                                            current.includes(
                                                                                String(
                                                                                    g.value
                                                                                )
                                                                            )
                                                                                ? current.filter(
                                                                                      (
                                                                                          v
                                                                                      ) =>
                                                                                          v !==
                                                                                          g.value
                                                                                  )
                                                                                : [
                                                                                      ...current,
                                                                                      String(
                                                                                          g.value
                                                                                      ),
                                                                                  ];
                                                                        onSelectGenres(
                                                                            next
                                                                        );
                                                                    } else if (
                                                                        onSelectGenre
                                                                    ) {
                                                                        onSelectGenre(
                                                                            String(
                                                                                g.value
                                                                            )
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {g.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {onSelectStudios && (
                                            <div className="flyout-section">
                                                <span className="flyout-section-label">
                                                    Studios
                                                </span>
                                                <div className="flyout-chips-wrap">
                                                    {studiosList.map((s) => {
                                                        const isAll =
                                                            s.value ===
                                                                "All Studios" ||
                                                            s.value === "";
                                                        const isSelected = isAll
                                                            ? !selectedStudios ||
                                                              selectedStudios.length ===
                                                                  0
                                                            : selectedStudios?.includes(
                                                                  String(
                                                                      s.value
                                                                  )
                                                              );
                                                        return (
                                                            <button
                                                                key={String(
                                                                    s.value
                                                                )}
                                                                type="button"
                                                                className={`flyout-chip ${isSelected ? "active" : ""}`}
                                                                onClick={() => {
                                                                    if (isAll) {
                                                                        onSelectStudios(
                                                                            []
                                                                        );
                                                                    } else {
                                                                        const current =
                                                                            selectedStudios ||
                                                                            [];
                                                                        const next =
                                                                            current.includes(
                                                                                String(
                                                                                    s.value
                                                                                )
                                                                            )
                                                                                ? current.filter(
                                                                                      (
                                                                                          v
                                                                                      ) =>
                                                                                          v !==
                                                                                          s.value
                                                                                  )
                                                                                : [
                                                                                      ...current,
                                                                                      String(
                                                                                          s.value
                                                                                      ),
                                                                                  ];
                                                                        onSelectStudios(
                                                                            next
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {s.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {onYearChange && (
                                            <div className="flyout-section">
                                                <div className="year-header">
                                                    <span className="flyout-section-label">
                                                        Release Year
                                                    </span>
                                                    <span className="year-val">
                                                        {hasYearFilter
                                                            ? `${currentMin} - ${currentMax}`
                                                            : "All"}
                                                    </span>
                                                </div>
                                                <div className="dual-range-wrapper">
                                                    <div className="dual-range-track-bg" />
                                                    <div
                                                        className="dual-range-highlight"
                                                        style={{
                                                            left: `${minPercent}%`,
                                                            width: `${Math.max(0, maxPercent - minPercent)}%`,
                                                        }}
                                                    />
                                                    <input
                                                        type="range"
                                                        min={MIN_ALLOWED_YEAR}
                                                        max={MAX_ALLOWED_YEAR}
                                                        step={1}
                                                        value={currentMin}
                                                        onChange={(e) => {
                                                            const val =
                                                                parseInt(
                                                                    e.target
                                                                        .value,
                                                                    10
                                                                );
                                                            const clamped =
                                                                Math.min(
                                                                    val,
                                                                    currentMax
                                                                );
                                                            onYearChange(
                                                                clamped <=
                                                                    MIN_ALLOWED_YEAR
                                                                    ? undefined
                                                                    : clamped,
                                                                maxYear
                                                            );
                                                        }}
                                                        className="range-slider range-slider-min"
                                                    />
                                                    <input
                                                        type="range"
                                                        min={MIN_ALLOWED_YEAR}
                                                        max={MAX_ALLOWED_YEAR}
                                                        step={1}
                                                        value={currentMax}
                                                        onChange={(e) => {
                                                            const val =
                                                                parseInt(
                                                                    e.target
                                                                        .value,
                                                                    10
                                                                );
                                                            const clamped =
                                                                Math.max(
                                                                    val,
                                                                    currentMin
                                                                );
                                                            onYearChange(
                                                                minYear,
                                                                clamped >=
                                                                    MAX_ALLOWED_YEAR
                                                                    ? undefined
                                                                    : clamped
                                                            );
                                                        }}
                                                        className="range-slider range-slider-max"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                className={`mobile-floating-btn ${isMobileFilterOpen || isFilterApplied ? "active" : ""}`}
                                onClick={() => {
                                    setIsMobileFilterOpen(!isMobileFilterOpen);
                                    setIsMobileSortOpen(false);
                                }}
                                title="Filters"
                                aria-label="Filters"
                            >
                                <img
                                    src="/assets/images/filter.svg"
                                    alt="Filter"
                                />
                            </button>
                        </div>

                        {/* Sort Button & Flyout (stacked above Filter) */}
                        {onSelectSort && (
                            <div
                                className="mobile-float-item"
                                ref={mobileSortRef}
                            >
                                {isMobileSortOpen && (
                                    <div className="mobile-glass-flyout sort-flyout">
                                        <div className="flyout-header">
                                            <span className="flyout-title">
                                                Sort By
                                            </span>
                                            {onToggleSortOrder && (
                                                <button
                                                    type="button"
                                                    className="flyout-order-btn"
                                                    onClick={onToggleSortOrder}
                                                    title={sortOrder}
                                                >
                                                    <img
                                                        src={
                                                            (
                                                                selectedSort ===
                                                                "SortName"
                                                                    ? sortOrder ===
                                                                      "Descending"
                                                                    : sortOrder ===
                                                                      "Ascending"
                                                            )
                                                                ? "/assets/images/arrow-up.svg"
                                                                : "/assets/images/arrow-down.svg"
                                                        }
                                                        alt={sortOrder}
                                                    />
                                                    <span>{sortOrder}</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="flyout-options-list">
                                            {effectiveSortOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    className={`flyout-option-pill ${selectedSort === opt.value ? "active" : ""}`}
                                                    onClick={() => {
                                                        onSelectSort(opt.value);
                                                        setIsMobileSortOpen(
                                                            false
                                                        );
                                                    }}
                                                >
                                                    <span>{opt.label}</span>
                                                    {selectedSort ===
                                                        opt.value && (
                                                        <span className="active-dot">
                                                            •
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className={`mobile-floating-btn ${
                                        isMobileSortOpen ||
                                        selectedSort !== defaultSort ||
                                        sortOrder !== "Ascending"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => {
                                        setIsMobileSortOpen(!isMobileSortOpen);
                                        setIsMobileFilterOpen(false);
                                    }}
                                    title="Sorting"
                                    aria-label="Sorting"
                                >
                                    <img
                                        src="/assets/images/sort.svg"
                                        alt="Sort"
                                    />
                                </button>
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </>
    );
};
