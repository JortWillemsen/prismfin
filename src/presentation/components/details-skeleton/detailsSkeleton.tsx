import React from "react";
import "./details-skeleton.scss";

export const DetailsSkeleton: React.FC = () => {
    return (
        <div className="details-skeleton">
            {/* Mobile Header: Back button circle + Title pill */}
            <div className="skeleton-mobile-header">
                <div className="skeleton-back-btn skeleton-shimmer" />
                <div className="skeleton-title-pill skeleton-shimmer" />
            </div>

            {/* Hero Section Skeleton */}
            <div className="skeleton-hero-section skeleton-shimmer">
                <div className="skeleton-hero-inner">
                    <div className="skeleton-hero-logo skeleton-shimmer" />
                    <div className="skeleton-hero-meta skeleton-shimmer" />
                    <div className="skeleton-hero-actions">
                        <div className="skeleton-hero-play-btn skeleton-shimmer" />
                        <div className="skeleton-hero-circle-btn skeleton-shimmer" />
                        <div className="skeleton-hero-circle-btn skeleton-shimmer" />
                    </div>
                </div>
            </div>

            {/* Mobile Below-Hero Content */}
            <div className="skeleton-mobile-content">
                <div className="skeleton-tech-pill skeleton-shimmer" />
                <div className="skeleton-overview-block">
                    <div className="skeleton-overview-line skeleton-shimmer" />
                    <div className="skeleton-overview-line skeleton-shimmer" />
                    <div className="skeleton-overview-line short skeleton-shimmer" />
                </div>
                <div className="skeleton-row-title skeleton-shimmer" />
                <div className="skeleton-cards-row portrait-row">
                    <div className="skeleton-portrait-card skeleton-shimmer" />
                    <div className="skeleton-portrait-card skeleton-shimmer" />
                    <div className="skeleton-portrait-card skeleton-shimmer" />
                </div>
                <div className="skeleton-row-title skeleton-shimmer" />
                <div className="skeleton-cards-row cast-row">
                    <div className="skeleton-cast-card skeleton-shimmer" />
                    <div className="skeleton-cast-card skeleton-shimmer" />
                    <div className="skeleton-cast-card skeleton-shimmer" />
                    <div className="skeleton-cast-card skeleton-shimmer" />
                </div>
            </div>

            {/* Desktop Below-Hero Content */}
            <div className="skeleton-desktop-content">
                <div className="skeleton-row-title desktop skeleton-shimmer" />
                <div className="skeleton-desktop-row">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="skeleton-desktop-card skeleton-shimmer"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
