import React, { useRef, useState, useEffect, useCallback } from "react";
import { MediaItem } from "@/common/types/media";
import { MediaCard } from "../media-card/mediaCard";
import "./media-row.scss";

interface MediaRowProps {
    title: string;
    items?: MediaItem[];
    viewMode?: "Portrait" | "Landscape";
    loading?: boolean;
    directPlay?: boolean;
    onItemClick?: (item: MediaItem) => void;
}

export const MediaRow: React.FC<MediaRowProps> = ({
    title,
    items = [],
    viewMode = "Portrait",
    loading = false,
    directPlay = false,
    onItemClick,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollButtons = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
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
    }, [items, updateScrollButtons]);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const scrollAmount = direction === "left" ? -550 : 550;
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        setTimeout(updateScrollButtons, 350);
    };

    if (loading) {
        return (
            <section className="media-row">
                <div className="row-header">
                    <h2 className="row-title">{title}</h2>
                </div>
                <div className="row-scroll-container">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <div
                            key={idx}
                            className={`media-card ${viewMode === "Landscape" ? "landscape" : "portrait"}`}
                        >
                            <div
                                className={`card-poster-wrapper skeleton-shimmer ${viewMode === "Landscape" ? "landscape" : "portrait"}`}
                            />
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
            </section>
        );
    }

    if (!items || items.length === 0) {
        return null;
    }

    return (
        <section className="media-row">
            <div className="row-header">
                <h2 className="row-title">{title}</h2>
            </div>

            <div className={`row-scroll-wrapper ${viewMode.toLowerCase()}`}>
                <div
                    className={`row-edge-fade left ${canScrollLeft ? "visible" : ""}`}
                />
                <div
                    className={`row-edge-fade right ${canScrollRight ? "visible" : ""}`}
                />

                {canScrollLeft && (
                    <button
                        type="button"
                        className="row-nav-btn prev"
                        onClick={() => scroll("left")}
                        aria-label={`Scroll ${title} left`}
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
                        className="row-nav-btn next"
                        onClick={() => scroll("right")}
                        aria-label={`Scroll ${title} right`}
                    >
                        <img
                            src="/assets/images/arrow-front.svg"
                            alt="Scroll right"
                        />
                    </button>
                )}

                <div className="row-scroll-container" ref={scrollRef}>
                    {items.map((item) => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            viewMode={viewMode}
                            directPlay={directPlay}
                            onClick={
                                onItemClick
                                    ? () => onItemClick(item)
                                    : undefined
                            }
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
