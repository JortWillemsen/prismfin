import React from "react";
import "./details-error.scss";

interface DetailsErrorProps {
    onReturnHome: () => void;
}

export const DetailsError: React.FC<DetailsErrorProps> = ({ onReturnHome }) => (
    <div className="details-error" role="alert">
        <p>This page could not load from your Jellyfin server.</p>
        <button type="button" onClick={onReturnHome}>
            Return home
        </button>
    </div>
);
