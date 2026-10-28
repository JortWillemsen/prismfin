import React from "react";
import { AppProvider, useApp } from "./application/state/appContext";
import { LoadingScreen } from "./presentation/components/loading-screen/loadingScreen";
import { LoginScreen } from "./presentation/components/login-screen/loginScreen";
import { TopBar } from "./presentation/components/top-bar/topBar";
import { QuickConnectModal } from "./presentation/components/quick-connect-modal/quickConnectModal";

const PlayScreen = React.lazy(() =>
    import("./presentation/components/play-screen/playScreen").then((m) => ({
        default: m.PlayScreen,
    }))
);
const HomePage = React.lazy(() =>
    import("./presentation/pages/home-page/homePage").then((m) => ({
        default: m.HomePage,
    }))
);
const MoviesPage = React.lazy(() =>
    import("./presentation/pages/movies-page/moviesPage").then((m) => ({
        default: m.MoviesPage,
    }))
);
const ShowsPage = React.lazy(() =>
    import("./presentation/pages/shows-page/showsPage").then((m) => ({
        default: m.ShowsPage,
    }))
);
const SearchPage = React.lazy(() =>
    import("./presentation/pages/search-page/searchPage").then((m) => ({
        default: m.SearchPage,
    }))
);
const MovieDetailsPage = React.lazy(() =>
    import("./presentation/pages/movie-details-page/movieDetailsPage").then(
        (m) => ({ default: m.MovieDetailsPage })
    )
);
const ShowDetailsPage = React.lazy(() =>
    import("./presentation/pages/show-details-page/showDetailsPage").then(
        (m) => ({ default: m.ShowDetailsPage })
    )
);
const SeasonDetailsPage = React.lazy(() =>
    import("./presentation/pages/season-details-page/seasonDetailsPage").then(
        (m) => ({ default: m.SeasonDetailsPage })
    )
);
const BoxsetPage = React.lazy(() =>
    import("./presentation/pages/boxset-page/boxsetPage").then((m) => ({
        default: m.BoxsetPage,
    }))
);
const FavoritesPage = React.lazy(() =>
    import("./presentation/pages/favorites-page/favoritesPage").then((m) => ({
        default: m.FavoritesPage,
    }))
);

const MainContent: React.FC = () => {
    const {
        session,
        isLoading,
        loadingProgress,
        currentRoute,
        activePlaybackItem,
        closePlayback,
    } = useApp();

    if (isLoading) {
        return <LoadingScreen progress={loadingProgress} />;
    }

    if (!session) {
        return (
            <>
                <LoginScreen />
                <QuickConnectModal />
            </>
        );
    }

    const renderPage = () => {
        switch (currentRoute.name) {
            case "home":
                return <HomePage />;
            case "movies":
                return <MoviesPage />;
            case "shows":
                return <ShowsPage />;
            case "search":
                return <SearchPage query={currentRoute.query || ""} />;
            case "movie-details":
                return <MovieDetailsPage movieId={currentRoute.id} />;
            case "show-details":
                return <ShowDetailsPage showId={currentRoute.id} />;
            case "season-details":
                return (
                    <SeasonDetailsPage
                        seriesId={currentRoute.seriesId}
                        seasonId={currentRoute.seasonId}
                    />
                );
            case "boxset":
                return <BoxsetPage boxsetId={currentRoute.id} />;
            case "favorites":
                return <FavoritesPage />;
            default:
                return <HomePage />;
        }
    };

    const routeKey =
        currentRoute.name +
        ("id" in currentRoute ? `-${currentRoute.id}` : "") +
        ("seriesId" in currentRoute
            ? `-${currentRoute.seriesId}-${currentRoute.seasonId}`
            : "") +
        ("query" in currentRoute ? `-${currentRoute.query}` : "");

    return (
        <>
            <TopBar />
            <QuickConnectModal />
            <main>
                <div key={routeKey} className="page-enter">
                    <React.Suspense fallback={null}>
                        {renderPage()}
                    </React.Suspense>
                </div>
            </main>
            {activePlaybackItem && (
                <React.Suspense fallback={null}>
                    <PlayScreen
                        item={activePlaybackItem}
                        onClose={closePlayback}
                    />
                </React.Suspense>
            )}
        </>
    );
};

export const App: React.FC = () => {
    return (
        <AppProvider>
            <MainContent />
        </AppProvider>
    );
};

export default App;
