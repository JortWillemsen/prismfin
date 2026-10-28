import React, { useRef, useEffect, useState } from "react";
import { useApp } from "@/application/state/appContext";
import "./account-popup.scss";

export const AccountPopup: React.FC = () => {
    const {
        session,
        logout,
        navigate,
        isAccountPopupOpen,
        setIsAccountPopupOpen,
        setIsQuickConnectModalOpen,
    } = useApp();

    const [isRendered, setIsRendered] = useState(isAccountPopupOpen);
    const [isClosing, setIsClosing] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isAccountPopupOpen) {
            setIsRendered(true);
            setIsClosing(false);
        } else if (isRendered) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setIsRendered(false);
                setIsClosing(false);
            }, 190);
            return () => clearTimeout(timer);
        }
    }, [isAccountPopupOpen, isRendered]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isAccountPopupOpen &&
                popupRef.current &&
                !popupRef.current.contains(event.target as Node)
            ) {
                const target = event.target as HTMLElement;
                if (!target.closest(".profile-button")) {
                    setIsAccountPopupOpen(false);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isAccountPopupOpen, setIsAccountPopupOpen]);

    if (!isRendered || !session) {
        return null;
    }

    const handleFavoritesClick = () => {
        setIsAccountPopupOpen(false);
        navigate({ name: "favorites" });
    };

    const handleQuickConnectClick = () => {
        setIsAccountPopupOpen(false);
        setIsQuickConnectModalOpen(true);
    };

    const handleLogoutClick = () => {
        logout();
    };

    return (
        <div
            className={`account-popup ${isClosing ? "closing" : ""}`}
            ref={popupRef}
        >
            <div className="account-row">
                <div className="user-pill">{session.user.name}</div>
                <button
                    type="button"
                    className="action-circle-btn"
                    onClick={handleLogoutClick}
                    title="Logout"
                    aria-label="Logout"
                >
                    <img src="/assets/images/logout.svg" alt="Logout" />
                </button>
            </div>

            <div className="account-row">
                <button
                    type="button"
                    className="action-circle-btn"
                    onClick={handleFavoritesClick}
                    title="Favorites"
                    aria-label="View Favorites"
                >
                    <img src="/assets/images/heart.svg" alt="Favorites" />
                </button>
            </div>

            <div className="account-row">
                <button
                    type="button"
                    className="action-circle-btn"
                    onClick={handleQuickConnectClick}
                    title="Jellyfin QuickConnect"
                    aria-label="Jellyfin QuickConnect"
                >
                    <img src="/assets/images/key.svg" alt="QuickConnect" />
                </button>
            </div>
        </div>
    );
};
