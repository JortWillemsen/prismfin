import React, { useEffect, useState } from "react";
import { useApp } from "@/application/state/appContext";
import { authService } from "@/application/services/authService";
import { QuickConnectState } from "@/common/types/user";
import "./quick-connect-modal.scss";

export const QuickConnectModal: React.FC = () => {
    const { isQuickConnectModalOpen, setIsQuickConnectModalOpen } = useApp();
    const [qcState, setQcState] = useState<QuickConnectState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isRendered, setIsRendered] = useState(isQuickConnectModalOpen);
    const [isClosing, setIsClosing] = useState(false);

    const closeModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsQuickConnectModalOpen(false);
            setIsClosing(false);
            setIsRendered(false);
        }, 190);
    };

    useEffect(() => {
        if (isQuickConnectModalOpen) {
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
    }, [isQuickConnectModalOpen, isRendered]);

    useEffect(() => {
        let isMounted = true;
        let pollTimer: number | null = null;

        if (isQuickConnectModalOpen) {
            setLoading(true);
            setError("");

            authService
                .initiateQuickConnect()
                .then((state) => {
                    if (!isMounted) return;
                    setQcState(state);
                    setLoading(false);

                    pollTimer = window.setInterval(async () => {
                        try {
                            const session = await authService.pollQuickConnect(
                                state.secret
                            );
                            if (session && isMounted) {
                                if (pollTimer) clearInterval(pollTimer);
                                window.location.reload();
                            }
                        } catch {
                            // continue polling
                        }
                    }, 3000);
                })
                .catch((err: unknown) => {
                    if (!isMounted) return;
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to initiate QuickConnect"
                    );
                    setLoading(false);
                });
        }

        return () => {
            isMounted = false;
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [isQuickConnectModalOpen]);

    if (!isRendered) {
        return null;
    }

    return (
        <div
            className={`quick-connect-backdrop ${isClosing ? "closing" : ""}`}
            onClick={closeModal}
        >
            <div
                className="quick-connect-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="qc-icon-circle">
                    <img src="/assets/images/key.svg" alt="QuickConnect" />
                </div>

                <h2>QuickConnect</h2>
                <p>
                    Enter this code on your approved Jellyfin client to sign in
                    to this device instantly:
                </p>

                {loading ? (
                    <div className="qc-status">
                        <div className="qc-spinner" />
                        <span>Generating code...</span>
                    </div>
                ) : error ? (
                    <p style={{ color: "#ff6b6b" }}>{error}</p>
                ) : qcState ? (
                    <>
                        <div className="qc-code-container">{qcState.code}</div>
                        <div className="qc-status">
                            <div className="qc-spinner" />
                            <span>Waiting for approval on your device...</span>
                        </div>
                    </>
                ) : null}

                <button
                    type="button"
                    className="qc-close-btn"
                    onClick={closeModal}
                >
                    Done
                </button>
            </div>
        </div>
    );
};
