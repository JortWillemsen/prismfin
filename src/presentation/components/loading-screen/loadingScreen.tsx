import React from "react";
import { getAppLogoUrl, getAppName } from "@/common/constants/config";
import "./loading-screen.scss";

interface LoadingScreenProps {
    progress?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    progress = 45,
}) => {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
        <div className="loading-screen" role="status" aria-label="Loading">
            <div className="loading-content">
                <img
                    src={getAppLogoUrl()}
                    alt={getAppName()}
                    className="loading-logo"
                />
                <div className="loading-bar-track">
                    <div
                        className="loading-bar-fill"
                        style={{ width: `${clampedProgress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
