import React, { useState, useRef, useEffect } from "react";
import { useApp } from "@/application/state/appContext";
import {
    getAppLogoUrl,
    getAppIconUrl,
    getAppName,
} from "@/common/constants/config";
import { AccountPopup } from "../account-popup/accountPopup";
import "./top-bar.scss";

export const TopBar: React.FC = () => {
    const {
        currentRoute,
        navigate,
        searchQuery,
        setSearchQuery,
        isAccountPopupOpen,
        setIsAccountPopupOpen,
    } = useApp();

    const [isMobileSearchActive, setIsMobileSearchActive] = useState(
        currentRoute.name === "search"
    );
    const [dragOffset, setDragOffset] = useState<number | null>(null);
    const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

    // Track active nav tab explicitly so it doesn't switch to 'home' when selecting a show or movie details
    const [selectedNavTab, setSelectedNavTab] = useState<
        "home" | "movies" | "shows"
    >(() => {
        if (
            currentRoute.name === "movies" ||
            currentRoute.name === "movie-details" ||
            currentRoute.name === "boxset"
        )
            return "movies";
        if (
            currentRoute.name === "shows" ||
            currentRoute.name === "show-details" ||
            currentRoute.name === "season-details"
        )
            return "shows";
        return "home";
    });

    const islandRef = useRef<HTMLDivElement>(null);
    const isPointerDownRef = useRef(false);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const startIndexRef = useRef(0);
    const mobileSearchInputRef = useRef<HTMLInputElement>(null);

    // Track visual viewport only when mobile search is active, so search bar floats directly above the virtual keyboard
    useEffect(() => {
        if (!isMobileSearchActive) {
            setKeyboardOffset(0);
            return;
        }

        if (typeof window === "undefined" || !window.visualViewport) return;

        const updateViewport = () => {
            const vv = window.visualViewport;
            if (!vv) return;

            // When virtual keyboard opens on mobile devices:
            // window.innerHeight is layout viewport height,
            // vv.height is visible viewport height,
            // vv.offsetTop is any scroll offset of the visual viewport.
            const offset = Math.max(
                0,
                window.innerHeight - (vv.height + vv.offsetTop)
            );

            // Keyboards are >= 200px (standard is ~280-400px).
            // A threshold of 160px avoids any false triggers from Safari's dynamic toolbar (~104px).
            setKeyboardOffset(offset > 160 ? Math.round(offset) : 0);
        };

        const vv = window.visualViewport;
        vv.addEventListener("resize", updateViewport);
        vv.addEventListener("scroll", updateViewport);
        updateViewport();

        return () => {
            vv.removeEventListener("resize", updateViewport);
            vv.removeEventListener("scroll", updateViewport);
        };
    }, [isMobileSearchActive]);

    useEffect(() => {
        if (currentRoute.name === "home") {
            setSelectedNavTab("home");
            setIsMobileSearchActive(false);
        } else if (currentRoute.name === "movies") {
            setSelectedNavTab("movies");
            setIsMobileSearchActive(false);
        } else if (currentRoute.name === "shows") {
            setSelectedNavTab("shows");
            setIsMobileSearchActive(false);
        } else if (currentRoute.name === "search") {
            setIsMobileSearchActive(true);
        } else {
            setIsMobileSearchActive(false);
        }
    }, [currentRoute.name]);

    useEffect(() => {
        if (isMobileSearchActive && mobileSearchInputRef.current) {
            mobileSearchInputRef.current.focus();
        }
    }, [isMobileSearchActive]);

    const handleHomeClick = () => {
        setSelectedNavTab("home");
        if (currentRoute.name === "home") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            navigate({ name: "home" });
        }
    };

    const handleMoviesClick = () => {
        setSelectedNavTab("movies");
        if (currentRoute.name === "movies") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            navigate({ name: "movies" });
        }
    };

    const handleShowsClick = () => {
        setSelectedNavTab("shows");
        if (currentRoute.name === "shows") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            navigate({ name: "shows" });
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val.trim()) {
            navigate({ name: "search", query: val });
        } else if (currentRoute.name === "search") {
            navigate({ name: "home" });
        }
    };

    const handleClearSearch = () => {
        setSearchQuery("");
        if (currentRoute.name === "search") {
            navigate({ name: "home" });
        }
    };

    const handleCloseMobileSearch = () => {
        setIsMobileSearchActive(false);
        setKeyboardOffset(0);
        setSearchQuery("");
        if (currentRoute.name === "search") {
            navigate({ name: "home" });
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate({ name: "search", query: searchQuery });
        }
    };

    const activeNavIndex =
        selectedNavTab === "movies" ? 1 : selectedNavTab === "shows" ? 2 : 0;

    // Pointer events for dragging navigation pill on mobile
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        isPointerDownRef.current = true;
        isDraggingRef.current = false;
        startXRef.current = e.clientX;
        startIndexRef.current = activeNavIndex;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPointerDownRef.current || !islandRef.current) return;
        const deltaX = e.clientX - startXRef.current;

        // Only enter drag mode if horizontal displacement exceeds 8px
        if (!isDraggingRef.current && Math.abs(deltaX) > 8) {
            isDraggingRef.current = true;
            try {
                islandRef.current.setPointerCapture(e.pointerId);
            } catch {
                // ignore
            }
        }

        if (isDraggingRef.current) {
            const islandWidth = islandRef.current.offsetWidth;
            const tabWidth = islandWidth / 3;
            const minOffset = -startIndexRef.current * tabWidth;
            const maxOffset = (2 - startIndexRef.current) * tabWidth;
            const clampedDelta = Math.max(
                minOffset,
                Math.min(maxOffset, deltaX)
            );
            setDragOffset(clampedDelta);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPointerDownRef.current) return;
        isPointerDownRef.current = false;

        const wasDragging = isDraggingRef.current;
        isDraggingRef.current = false;

        try {
            islandRef.current?.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }

        const delta = dragOffset ?? 0;
        setDragOffset(null);

        if (wasDragging && Math.abs(delta) > 15) {
            const islandWidth = islandRef.current?.offsetWidth || 240;
            const tabWidth = islandWidth / 3;
            const steps = Math.round(delta / tabWidth);
            const targetIndex = Math.max(
                0,
                Math.min(2, startIndexRef.current + steps)
            );
            if (targetIndex !== activeNavIndex) {
                if (targetIndex === 0) handleHomeClick();
                else if (targetIndex === 1) handleMoviesClick();
                else if (targetIndex === 2) handleShowsClick();
            }
        }
    };

    const handlePointerCancel = () => {
        isPointerDownRef.current = false;
        isDraggingRef.current = false;
        setDragOffset(null);
    };

    return (
        <header
            className={`top-bar ${keyboardOffset > 0 ? "keyboard-open" : ""}`}
            style={
                keyboardOffset > 0
                    ? {
                          bottom: `${keyboardOffset + 12}px`,
                      }
                    : undefined
            }
        >
            {/* Desktop Top Bar (strictly visible on >= 769px) */}
            <div className="top-bar-inner top-bar-desktop">
                <div className="top-bar-nav-pill">
                    <img
                        src={getAppLogoUrl()}
                        alt={getAppName()}
                        className="top-bar-logo"
                        onClick={handleHomeClick}
                    />
                    <nav className="top-bar-nav">
                        <button
                            type="button"
                            className={`nav-link ${selectedNavTab === "movies" ? "active" : ""}`}
                            onClick={handleMoviesClick}
                        >
                            Movies
                        </button>
                        <button
                            type="button"
                            className={`nav-link ${selectedNavTab === "shows" ? "active" : ""}`}
                            onClick={handleShowsClick}
                        >
                            Shows
                        </button>
                    </nav>
                </div>

                <div className="top-bar-right">
                    <div className="search-wrapper">
                        <form
                            className="search-box-pill"
                            onSubmit={handleSearchSubmit}
                        >
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                aria-label="Search movies or shows"
                            />
                            <img
                                src="/assets/images/search.svg"
                                alt="Search"
                                className="search-icon"
                            />
                        </form>
                        <button
                            type="button"
                            className={`search-clear-btn ${searchQuery.length > 0 ? "visible" : ""}`}
                            onClick={handleClearSearch}
                            title="Clear search"
                            aria-label="Clear search"
                        >
                            <img src="/assets/images/cross.svg" alt="Clear" />
                        </button>
                    </div>

                    <div className="profile-container">
                        <button
                            type="button"
                            className={`profile-button ${isAccountPopupOpen ? "active" : ""}`}
                            onClick={() =>
                                setIsAccountPopupOpen(!isAccountPopupOpen)
                            }
                            aria-label="Account options"
                        >
                            <img
                                src="/assets/images/person.svg"
                                alt="Profile"
                            />
                        </button>
                        <AccountPopup />
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation Bar (strictly visible on <= 768px) */}
            <div className="top-bar-mobile">
                {isMobileSearchActive ? (
                    <div className="mobile-search-active-bar">
                        <form
                            className="mobile-search-expanded"
                            onSubmit={handleSearchSubmit}
                        >
                            <input
                                ref={mobileSearchInputRef}
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={() => {
                                    requestAnimationFrame(() => {
                                        if (window.visualViewport) {
                                            const vv = window.visualViewport;
                                            const offset = Math.max(
                                                0,
                                                window.innerHeight -
                                                    (vv.height + vv.offsetTop)
                                            );
                                            if (offset > 100)
                                                setKeyboardOffset(
                                                    Math.round(offset)
                                                );
                                        }
                                    });
                                }}
                                aria-label="Search movies or shows"
                            />
                            <img
                                src="/assets/images/search.svg"
                                alt="Search"
                                className="search-icon"
                            />
                        </form>
                        <button
                            type="button"
                            className="mobile-circle-btn close-search-btn"
                            onClick={handleCloseMobileSearch}
                            title="Close search"
                            aria-label="Close search"
                        >
                            <img src="/assets/images/cross.svg" alt="Close" />
                        </button>
                    </div>
                ) : (
                    <div className="mobile-nav-bar-container">
                        {/* Main Navigation Island */}
                        <div
                            className="mobile-nav-island"
                            ref={islandRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                        >
                            {/* Sliding / Draggable Glass Pill Indicator */}
                            <div
                                className="mobile-active-pill"
                                style={{
                                    transform:
                                        dragOffset !== null
                                            ? `translateX(calc(${startIndexRef.current * 100}% + ${dragOffset}px))`
                                            : `translateX(${activeNavIndex * 100}%)`,
                                    transition:
                                        dragOffset !== null
                                            ? "none"
                                            : "transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)",
                                }}
                            />

                            <button
                                type="button"
                                className={`mobile-nav-item ${activeNavIndex === 0 ? "active" : ""}`}
                                onClick={handleHomeClick}
                                aria-label="Home"
                            >
                                <img
                                    src={getAppIconUrl()}
                                    alt="Home"
                                    className="tab-icon tab-app-icon"
                                />
                            </button>

                            <button
                                type="button"
                                className={`mobile-nav-item ${activeNavIndex === 1 ? "active" : ""}`}
                                onClick={handleMoviesClick}
                                aria-label="Movies"
                            >
                                <img
                                    src="/assets/images/movie.svg"
                                    alt="Movies"
                                    className="tab-icon"
                                />
                            </button>

                            <button
                                type="button"
                                className={`mobile-nav-item ${activeNavIndex === 2 ? "active" : ""}`}
                                onClick={handleShowsClick}
                                aria-label="Shows"
                            >
                                <img
                                    src="/assets/images/tv.svg"
                                    alt="Shows"
                                    className="tab-icon"
                                />
                            </button>
                        </div>

                        {/* Search Button */}
                        <button
                            type="button"
                            className="mobile-circle-btn mobile-search-btn"
                            onClick={() => setIsMobileSearchActive(true)}
                            aria-label="Search"
                        >
                            <img src="/assets/images/search.svg" alt="Search" />
                        </button>

                        {/* Profile Button & Upward Account Popup */}
                        <div className="profile-container mobile-profile-wrapper">
                            <button
                                type="button"
                                className={`profile-button mobile-circle-btn ${isAccountPopupOpen ? "active" : ""}`}
                                onClick={() =>
                                    setIsAccountPopupOpen(!isAccountPopupOpen)
                                }
                                aria-label="Account options"
                            >
                                <img
                                    src="/assets/images/person.svg"
                                    alt="Profile"
                                />
                            </button>
                            <AccountPopup />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
