import React, { useRef, useState, useEffect, useCallback } from "react";
import { PersonItem } from "@/common/types/media";
import { PersonCard } from "../person-card/personCard";
import "./person-row.scss";

interface PersonRowProps {
    title?: string;
    people: PersonItem[];
}

export const PersonRow: React.FC<PersonRowProps> = ({
    title = "Cast & Crew",
    people,
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
    }, [people, updateScrollButtons]);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const scrollAmount = direction === "left" ? -450 : 450;
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        setTimeout(updateScrollButtons, 350);
    };

    if (!people || people.length === 0) {
        return null;
    }

    return (
        <section className="person-row">
            <div className="row-header">
                <h2 className="row-title">{title}</h2>
            </div>

            <div className="row-scroll-wrapper">
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
                    {people.map((person, index) => (
                        <PersonCard
                            key={`${person.id}-${person.role || ""}-${index}`}
                            person={person}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
