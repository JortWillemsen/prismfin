import { JellyfinClient } from "@/infrastructure/jellyfin/jellyfinClient";
import { MediaApi } from "@/infrastructure/jellyfin/mediaApi";
import { MediaItem } from "@/common/types/media";
import { authService } from "./authService";

export interface MovieDetailsData {
    movie: MediaItem;
    similar: MediaItem[];
    collection?: MediaItem;
}

export interface ShowDetailsData {
    show: MediaItem;
    seasons: MediaItem[];
    similar: MediaItem[];
    nextUpEpisode?: MediaItem | null;
}

export interface SeasonDetailsData {
    season: MediaItem;
    series: MediaItem;
    episodes: MediaItem[];
}

export interface BoxsetDetailsData {
    boxset: MediaItem;
    items: MediaItem[];
}

export class DetailsService {
    private client: JellyfinClient;
    private mediaApi: MediaApi;

    constructor() {
        this.client = new JellyfinClient();
        this.mediaApi = new MediaApi(this.client);
    }

    private getSession() {
        const session = authService.getCurrentSession();
        if (!session) {
            throw new Error("User not authenticated");
        }
        return session;
    }

    async getMovieDetails(movieId: string): Promise<MovieDetailsData> {
        const { user, accessToken } = this.getSession();

        const movie = await this.mediaApi.getItem(
            user.id,
            movieId,
            accessToken
        );
        const similar = await this.mediaApi.getSimilar(
            user.id,
            movieId,
            accessToken
        );

        let collection: MediaItem | undefined;
        try {
            const collections = await this.mediaApi.getItemCollections(
                user.id,
                movieId,
                accessToken
            );
            if (collections.length > 0) {
                collection = collections[0];
            } else if (movie.collectionId) {
                collection = await this.mediaApi.getItem(
                    user.id,
                    movie.collectionId,
                    accessToken
                );
            }
        } catch {
            // Ignore collection lookup failure
        }

        return {
            movie,
            similar,
            collection,
        };
    }

    async getShowDetails(showId: string): Promise<ShowDetailsData> {
        const { user, accessToken } = this.getSession();

        const [show, seasons, similar, nextUpEpisode] = await Promise.all([
            this.mediaApi.getItem(user.id, showId, accessToken),
            this.mediaApi.getSeasons(user.id, showId, accessToken),
            this.mediaApi.getSimilar(user.id, showId, accessToken),
            this.mediaApi.getNextUpEpisode(user.id, showId, accessToken),
        ]);

        // Ensure each season card on the Show details screen inherits the series logo
        const seasonsWithLogo = seasons.map((season) => ({
            ...season,
            logoImageTag: season.logoImageTag || show.logoImageTag,
            logoItemId:
                season.logoItemId || (show.logoImageTag ? show.id : undefined),
        }));

        return {
            show,
            seasons: seasonsWithLogo,
            similar,
            nextUpEpisode,
        };
    }

    async getSeasonDetails(
        seriesId: string,
        seasonId: string
    ): Promise<SeasonDetailsData> {
        const { user, accessToken } = this.getSession();

        const [series, season, episodes] = await Promise.all([
            this.mediaApi.getItem(user.id, seriesId, accessToken),
            this.mediaApi.getItem(user.id, seasonId, accessToken),
            this.mediaApi.getEpisodes(user.id, seriesId, seasonId, accessToken),
        ]);

        return {
            series,
            season,
            episodes,
        };
    }

    async getBoxsetDetails(boxsetId: string): Promise<BoxsetDetailsData> {
        const { user, accessToken } = this.getSession();
        const boxset = await this.mediaApi.getItem(
            user.id,
            boxsetId,
            accessToken
        );
        const items = await this.mediaApi.getItems(user.id, accessToken, {
            ParentId: boxsetId,
            SortBy: "PremiereDate,ProductionYear,SortName",
            SortOrder: "Ascending",
        });

        return {
            boxset,
            items,
        };
    }

    async toggleFavorite(
        itemId: string,
        currentIsFavorite: boolean
    ): Promise<boolean> {
        const { user, accessToken } = this.getSession();
        const nextState = !currentIsFavorite;
        await this.mediaApi.setFavorite(
            user.id,
            itemId,
            nextState,
            accessToken
        );
        return nextState;
    }
}

export const detailsService = new DetailsService();
