import React, { useEffect, useState } from "react";
import { MediaItem } from "@/common/types/media";
import { catalogService } from "@/application/services/catalogService";
import { MediaCard } from "@/presentation/components/media-card/mediaCard";
import "./favorites-page.scss";

export const FavoritesPage: React.FC = () => {
    const [favorites, setFavorites] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        catalogService
            .getFavorites()
            .then((res) => {
                if (isMounted) {
                    setFavorites(res);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="favorites-page">
            <h1 className="favorites-heading">
                <img src="/assets/images/heart.svg" alt="Favorites" />
                <span>Favorites</span>
            </h1>

            {loading ? (
                <div className="favorites-grid">
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
            ) : favorites.length === 0 ? (
                <div className="favorites-empty">
                    You haven't added any favorites yet
                </div>
            ) : (
                <div className="favorites-grid">
                    {favorites.map((item) => (
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
