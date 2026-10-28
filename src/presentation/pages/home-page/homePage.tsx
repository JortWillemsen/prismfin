import React, { useEffect, useState } from "react";
import { MediaItem, HomeSection } from "@/common/types/media";
import { catalogService } from "@/application/services/catalogService";
import { FeaturedBanner } from "@/presentation/components/featured-banner/featuredBanner";
import { MediaRow } from "@/presentation/components/media-row/mediaRow";
import "./home-page.scss";

export const HomePage: React.FC = () => {
    const [featuredItems, setFeaturedItems] = useState<MediaItem[]>([]);
    const [sections, setSections] = useState<HomeSection[]>([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const [pendingDescriptors, setPendingDescriptors] = useState<any[]>([]);

    useEffect(() => {
        let isMounted = true;
        setLoadingFeatured(true);

        catalogService
            .getFeaturedMovies()
            .then((featured) => {
                if (isMounted) {
                    setFeaturedItems(featured);
                    setLoadingFeatured(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoadingFeatured(false);
            });

        catalogService
            .getSectionDescriptors()
            .then(async (descriptors) => {
                if (!isMounted || !descriptors || descriptors.length === 0)
                    return;

                // Load initial batch of 2 rows immediately in parallel
                const initialBatch = descriptors.slice(0, 2);
                const restBatch = descriptors.slice(2);

                setPendingDescriptors(restBatch);

                const initialResults = await Promise.all(
                    initialBatch.map((desc) =>
                        catalogService.getSingleSection(desc)
                    )
                );
                if (isMounted) {
                    const loadedInitial = initialResults.filter(
                        (sec): sec is HomeSection => sec !== null
                    );
                    setSections(loadedInitial);
                }

                // Progressively load remaining rows concurrently
                await Promise.all(
                    restBatch.map(async (desc) => {
                        const sec = await catalogService.getSingleSection(desc);
                        if (!isMounted) return;
                        if (sec) {
                            setSections((prev) => {
                                const next = [...prev, sec];
                                const descIndex = new Map(
                                    descriptors.map((d, i) => [d.id, i])
                                );
                                return next.sort(
                                    (a, b) =>
                                        (descIndex.get(a.id) ?? 0) -
                                        (descIndex.get(b.id) ?? 0)
                                );
                            });
                        }
                        setPendingDescriptors((prev) =>
                            prev.filter((d) => d.id !== desc.id)
                        );
                    })
                );
            })
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="home-page">
            <FeaturedBanner items={featuredItems} loading={loadingFeatured} />

            {sections.length === 0 && pendingDescriptors.length === 0 && (
                <>
                    <MediaRow
                        title="Continue Watching"
                        loading
                        viewMode="Landscape"
                    />
                    <MediaRow
                        title="Latest Movies"
                        loading
                        viewMode="Portrait"
                    />
                </>
            )}

            {sections.map((sec) => (
                <MediaRow
                    key={sec.id}
                    title={sec.name}
                    items={sec.items}
                    viewMode={sec.viewMode}
                    directPlay={
                        sec.key === "Resume" ||
                        sec.name.toLowerCase().includes("continue watching") ||
                        sec.name.toLowerCase().includes("next up")
                    }
                />
            ))}

            {pendingDescriptors.map((desc) => (
                <MediaRow
                    key={desc.id}
                    title={desc.displayText}
                    loading
                    viewMode={desc.viewMode}
                />
            ))}
        </div>
    );
};
