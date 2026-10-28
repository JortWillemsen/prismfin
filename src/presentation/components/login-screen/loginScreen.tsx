import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/application/state/appContext";
import { authService } from "@/application/services/authService";
import { getAppLogoUrl, getAppName } from "@/common/constants/config";
import "./login-screen.scss";

export const LoginScreen: React.FC = () => {
    const { loginWithCredentials, setIsQuickConnectModalOpen } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSsoProcessing, setIsSsoProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const hasExecutedRef = useRef(false);

    const appName = getAppName();

    useEffect(() => {
        const pathname = window.location.pathname;
        const search = window.location.search;
        const params = new URLSearchParams(search);

        const isSsoCallback =
            pathname.includes("/sso/OID/redirect") ||
            (params.has("code") && params.has("state"));

        if (isSsoCallback) {
            // Guard against React StrictMode double execution since state is single-use
            if (hasExecutedRef.current) return;
            hasExecutedRef.current = true;

            const match = pathname.match(/\/sso\/OID\/redirect\/([^/?#]+)/);
            const provider = match ? decodeURIComponent(match[1]) : "keycloak";

            setIsSubmitting(true);
            setIsSsoProcessing(true);
            setErrorMessage("");

            authService
                .completeSsoCallback(provider, search)
                .then(() => {
                    // Replace URL history so single-use code/state is removed from the address bar
                    window.history.replaceState(
                        {},
                        document.title,
                        window.location.origin + "/#/"
                    );
                    window.location.reload();
                })
                .catch((err: unknown) => {
                    window.history.replaceState(
                        {},
                        document.title,
                        window.location.origin + "/#/"
                    );
                    setErrorMessage(
                        err instanceof Error
                            ? err.message
                            : "SSO authentication failed"
                    );
                })
                .finally(() => {
                    setIsSubmitting(false);
                    setIsSsoProcessing(false);
                });
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);
        try {
            await loginWithCredentials(username, password);
        } catch (err: unknown) {
            setErrorMessage(
                err instanceof Error ? err.message : "Failed to sign in"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSsoClick = () => {
        setErrorMessage("");
        setIsSubmitting(true);
        try {
            authService.startSsoLogin();
        } catch (err: unknown) {
            setErrorMessage(
                err instanceof Error
                    ? err.message
                    : "Failed to initiate SSO login"
            );
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-container">
                <img
                    src={getAppLogoUrl()}
                    alt={appName}
                    className="login-logo"
                />

                {!showForm ? (
                    <>
                        <button
                            type="button"
                            className="login-btn-primary"
                            onClick={handleSsoClick}
                            disabled={isSubmitting}
                        >
                            {isSsoProcessing
                                ? "Signing in with SSO..."
                                : isSubmitting
                                  ? "Redirecting to SSO..."
                                  : `Login with ${appName}`}
                        </button>

                        {errorMessage && (
                            <div className="login-error">{errorMessage}</div>
                        )}

                        <div className="login-secondary-links">
                            <button
                                type="button"
                                className="login-text-link"
                                onClick={() => {
                                    setErrorMessage("");
                                    setShowForm(true);
                                }}
                            >
                                Standard Jellyfin login
                            </button>

                            <button
                                type="button"
                                className="login-quick-connect-link"
                                onClick={() => setIsQuickConnectModalOpen(true)}
                            >
                                <img
                                    src="/assets/images/key.svg"
                                    alt=""
                                    aria-hidden="true"
                                />
                                <span>QuickConnect</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <form className="login-form-glass" onSubmit={handleSubmit}>
                        <div className="login-input-group">
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                autoFocus
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="login-input-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {errorMessage && (
                            <div className="login-error">{errorMessage}</div>
                        )}

                        <button
                            type="submit"
                            className="login-btn-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Signing in..." : "Sign In"}
                        </button>

                        <div className="login-form-secondary-actions">
                            <button
                                type="button"
                                className="login-text-link"
                                onClick={() => {
                                    setErrorMessage("");
                                    setShowForm(false);
                                }}
                            >
                                Login with {appName}
                            </button>
                            <button
                                type="button"
                                className="login-quick-connect-link"
                                onClick={() => setIsQuickConnectModalOpen(true)}
                            >
                                <img
                                    src="/assets/images/key.svg"
                                    alt=""
                                    aria-hidden="true"
                                />
                                <span>QuickConnect</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
