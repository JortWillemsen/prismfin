import React, { useEffect, useState, useMemo } from "react";
import { MediaItem } from "@/common/types/media";
import { catalogService } from "@/application/services/catalogService";
import { MediaCard } from "@/presentation/components/media-card/mediaCard";
import { FilterBar } from "@/presentation/components/filter-bar/filterBar";
import "./search-page.scss";

interface SearchPageProps {
    query: string;
}

const SEARCH_SORT_OPTIONS = [
    { label: "Best Match", value: "Relevance" },
    { label: "Name", value: "SortName" },
    { label: "Rating", value: "CommunityRating" },
    { label: "Release Date", value: "PremiereDate" },
];

export const SearchPage: React.FC<SearchPageProps> = ({ query }) => {
    const [results, setResults] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
    const [minYear, setMinYear] = useState<number | undefined>(undefined);
    const [maxYear, setMaxYear] = useState<number | undefined>(undefined);
    const [selectedSort, setSelectedSort] = useState("Relevance");
    const [sortOrder, setSortOrder] = useState<"Ascending" | "Descending">(
        "Ascending"
    );

    useEffect(() => {
        let isMounted = true;
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        catalogService
            .search(query)
            .then((res) => {
                if (isMounted) {
                    setResults(res);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [query]);

    const filteredResults = useMemo(() => {
        const scoreItem = (name: string, q: string): number => {
            const n = name.toLowerCase().trim();
            const queryNorm = q.toLowerCase().trim();
            if (n === queryNorm) return 0;
            if (n.startsWith(queryNorm))
                return 10 + Math.min(n.length - queryNorm.length, 100);
            const wordRegex = new RegExp(
                `\\b${queryNorm.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`,
                "i"
            );
            if (wordRegex.test(n))
                return 100 + Math.min(n.length - queryNorm.length, 100);
            if (n.includes(queryNorm))
                return (
                    300 +
                    n.indexOf(queryNorm) +
                    Math.min(n.length - queryNorm.length, 100)
                );
            return 900;
        };

        return results
            .filter((item) => {
                if (selectedGenres.length > 0) {
                    const hasAnyGenre = selectedGenres.some((g) =>
                        item.genres?.includes(g)
                    );
                    if (!hasAnyGenre) return false;
                }
                if (selectedStudios.length > 0) {
                    const hasAnyStudio = selectedStudios.some((s) =>
                        item.studios?.includes(s)
                    );
                    if (!hasAnyStudio) return false;
                }
                if (
                    minYear &&
                    item.productionYear &&
                    item.productionYear < minYear
                ) {
                    return false;
                }
                if (
                    maxYear &&
                    item.productionYear &&
                    item.productionYear > maxYear
                ) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => {
                let cmp = 0;
                if (selectedSort === "Relevance") {
                    const scoreA = scoreItem(a.name || "", query);
                    const scoreB = scoreItem(b.name || "", query);
                    cmp = scoreA - scoreB;
                    if (cmp === 0) {
                        cmp = (a.name || "").localeCompare(b.name || "");
                    }
                } else if (selectedSort === "CommunityRating") {
                    cmp = (a.communityRating || 0) - (b.communityRating || 0);
                } else if (selectedSort === "PremiereDate") {
                    cmp = (a.productionYear || 0) - (b.productionYear || 0);
                } else {
                    cmp = (a.name || "").localeCompare(b.name || "");
                }
                return sortOrder === "Ascending" ? cmp : -cmp;
            });
    }, [
        results,
        selectedGenres,
        selectedStudios,
        minYear,
        maxYear,
        selectedSort,
        sortOrder,
        query,
    ]);

    const handleResetFilters = () => {
        setSelectedGenres([]);
        setSelectedStudios([]);
        setMinYear(undefined);
        setMaxYear(undefined);
        setSelectedSort("Relevance");
        setSortOrder("Ascending");
    };

    return (
        <div className="search-page">
            <h2 className="search-heading">
                Results for <span>"{query}"</span>
            </h2>

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
                sortOptions={SEARCH_SORT_OPTIONS}
                selectedSort={selectedSort}
                defaultSort="Relevance"
                onSelectSort={(sort) => {
                    setSelectedSort(sort);
                    if (sort === "CommunityRating") {
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
                <div className="search-grid">
                    {Array.from({ length: 12 }).map((_, idx) => (
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
            ) : filteredResults.length === 0 ? (
                <div className="search-empty">
                    No results found for "{query}"
                </div>
            ) : (
                <div className="search-grid">
                    {filteredResults.map((item) => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            viewMode="Portrait"
                            showSubtitle
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
