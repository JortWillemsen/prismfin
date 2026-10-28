import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { AuthSession } from "@/common/types/user";
import { MediaItem } from "@/common/types/media";
import { authService } from "../services/authService";

export type AppRoute =
    | { name: "home" }
    | {
          name: "movies";
          genre?: string;
          sortBy?: string;
          isCollection?: boolean;
      }
    | { name: "shows"; genre?: string; sortBy?: string }
    | { name: "search"; query?: string }
    | { name: "movie-details"; id: string }
    | { name: "show-details"; id: string }
    | { name: "season-details"; seriesId: string; seasonId: string }
    | { name: "boxset"; id: string }
    | { name: "favorites" };

function routeToHash(route: AppRoute): string {
    switch (route.name) {
        case "home":
            return "#/";
        case "movies": {
            const params = new URLSearchParams();
            if (route.genre) params.set("genre", route.genre);
            if (route.sortBy) params.set("sort", route.sortBy);
            if (route.isCollection) params.set("collections", "1");
            const q = params.toString();
            return `#/movies${q ? `?${q}` : ""}`;
        }
        case "shows": {
            const params = new URLSearchParams();
            if (route.genre) params.set("genre", route.genre);
            if (route.sortBy) params.set("sort", route.sortBy);
            const q = params.toString();
            return `#/shows${q ? `?${q}` : ""}`;
        }
        case "search":
            return `#/search?q=${encodeURIComponent(route.query || "")}`;
        case "movie-details":
            return `#/movie/${route.id}`;
        case "show-details":
            return `#/show/${route.id}`;
        case "season-details":
            return `#/show/${route.seriesId}/season/${route.seasonId}`;
        case "boxset":
            return `#/boxset/${route.id}`;
        case "favorites":
            return "#/favorites";
        default:
            return "#/";
    }
}

function hashToRoute(hash: string): AppRoute {
    const raw = hash.replace(/^#\/?/, "");
    if (!raw) return { name: "home" };

    const [pathPart, queryPart] = raw.split("?");
    const params = new URLSearchParams(queryPart || "");

    if (pathPart === "movies") {
        return {
            name: "movies",
            genre: params.get("genre") || undefined,
            sortBy: params.get("sort") || undefined,
            isCollection: params.get("collections") === "1",
        };
    }

    if (pathPart === "shows") {
        return {
            name: "shows",
            genre: params.get("genre") || undefined,
            sortBy: params.get("sort") || undefined,
        };
    }

    if (pathPart === "search") {
        return {
            name: "search",
            query: params.get("q") || "",
        };
    }

    if (pathPart.startsWith("movie/")) {
        const id = pathPart.replace("movie/", "");
        return { name: "movie-details", id };
    }

    if (pathPart.startsWith("show/") && pathPart.includes("/season/")) {
        const parts = pathPart.split("/");
        // show / [seriesId] / season / [seasonId]
        const seriesId = parts[1];
        const seasonId = parts[3];
        return { name: "season-details", seriesId, seasonId };
    }

    if (pathPart.startsWith("show/")) {
        const id = pathPart.replace("show/", "");
        return { name: "show-details", id };
    }

    if (pathPart.startsWith("boxset/")) {
        const id = pathPart.replace("boxset/", "");
        return { name: "boxset", id };
    }

    if (pathPart === "favorites") {
        return { name: "favorites" };
    }

    return { name: "home" };
}

interface AppContextValue {
    session: AuthSession | null;
    isLoading: boolean;
    loadingProgress: number;
    currentRoute: AppRoute;
    searchQuery: string;
    isAccountPopupOpen: boolean;
    isQuickConnectModalOpen: boolean;
    activePlaybackItem: MediaItem | null;
    navigate: (route: AppRoute) => void;
    goBack: () => void;
    setSearchQuery: (query: string) => void;
    setIsAccountPopupOpen: (open: boolean) => void;
    setIsQuickConnectModalOpen: (open: boolean) => void;
    startPlayback: (item: MediaItem) => void;
    closePlayback: () => void;
    loginWithCredentials: (u: string, p: string) => Promise<void>;
    logout: () => void;
    setLoading: (loading: boolean, progress?: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const initialSession = authService.getCurrentSession();
    const [session, setSession] = useState<AuthSession | null>(initialSession);
    const [isLoading, setIsLoading] = useState<boolean>(!!initialSession);
    const [loadingProgress, setLoadingProgress] = useState<number>(
        initialSession ? 30 : 0
    );
    const [currentRoute, setCurrentRoute] = useState<AppRoute>(() =>
        hashToRoute(window.location.hash)
    );
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isAccountPopupOpen, setIsAccountPopupOpen] =
        useState<boolean>(false);
    const [isQuickConnectModalOpen, setIsQuickConnectModalOpen] =
        useState<boolean>(false);
    const [activePlaybackItem, setActivePlaybackItem] =
        useState<MediaItem | null>(null);

    useEffect(() => {
        const handleUnauthorized = () => {
            setSession(null);
            setIsLoading(false);
            setActivePlaybackItem(null);
            setIsAccountPopupOpen(false);
        };
        window.addEventListener("prismfin:unauthorized", handleUnauthorized);
        return () =>
            window.removeEventListener(
                "prismfin:unauthorized",
                handleUnauthorized
            );
    }, []);

    useEffect(() => {
        let isMounted = true;
        if (initialSession) {
            setLoadingProgress(45);
            authService
                .validateCurrentSession()
                .then((isValid) => {
                    if (!isMounted) return;
                    if (!isValid) {
                        setSession(null);
                        setIsLoading(false);
                    } else {
                        setLoadingProgress(85);
                        setTimeout(() => {
                            if (!isMounted) return;
                            setLoadingProgress(100);
                            setTimeout(() => {
                                if (isMounted) setIsLoading(false);
                            }, 160);
                        }, 120);
                    }
                })
                .catch(() => {
                    if (!isMounted) return;
                    setSession(null);
                    setIsLoading(false);
                });
        }
        return () => {
            isMounted = false;
        };
    }, []);

    const navigate = useCallback((newRoute: AppRoute) => {
        setIsAccountPopupOpen(false);
        const hash = routeToHash(newRoute);
        window.history.pushState(newRoute, "", hash);
        setCurrentRoute(newRoute);
        window.scrollTo(0, 0);
    }, []);

    const goBack = useCallback(() => {
        setIsAccountPopupOpen(false);
        if (activePlaybackItem) {
            setActivePlaybackItem(null);
            return;
        }
        window.history.back();
    }, [activePlaybackItem]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            setIsAccountPopupOpen(false);
            if (activePlaybackItem) {
                setActivePlaybackItem(null);
                return;
            }
            if (event.state) {
                setCurrentRoute(event.state as AppRoute);
            } else {
                setCurrentRoute(hashToRoute(window.location.hash));
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [activePlaybackItem]);

    const setLoading = (loading: boolean, progress: number = 0) => {
        setIsLoading(loading);
        setLoadingProgress(progress);
    };

    const startPlayback = (item: MediaItem) => {
        setActivePlaybackItem(item);
    };

    const closePlayback = () => {
        setActivePlaybackItem(null);
    };

    const loginWithCredentials = async (u: string, p: string) => {
        setLoading(true, 30);
        try {
            const newSession = await authService.loginWithCredentials(u, p);
            setLoading(true, 85);
            setSession(newSession);
        } finally {
            setTimeout(() => {
                setLoading(false, 100);
            }, 300);
        }
    };

    const logout = () => {
        authService.logout();
        setSession(null);
        navigate({ name: "home" });
        setIsAccountPopupOpen(false);
    };

    return (
        <AppContext.Provider
            value={{
                session,
                isLoading,
                loadingProgress,
                currentRoute,
                searchQuery,
                isAccountPopupOpen,
                isQuickConnectModalOpen,
                activePlaybackItem,
                navigate,
                goBack,
                setSearchQuery,
                setIsAccountPopupOpen,
                setIsQuickConnectModalOpen,
                startPlayback,
                closePlayback,
                loginWithCredentials,
                logout,
                setLoading,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export function useApp(): AppContextValue {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useApp must be used within an AppProvider");
    }
    return context;
}
