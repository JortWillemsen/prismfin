import { JellyfinClient } from "@/infrastructure/jellyfin/jellyfinClient";
import { MediaApi } from "@/infrastructure/jellyfin/mediaApi";
import { HomeSectionsApi } from "@/infrastructure/jellyfin/homeSectionsApi";
import { StorageService } from "@/infrastructure/storage/storageService";
import { MediaItem, HomeSection } from "@/common/types/media";
import { getFeaturedPlaylistName } from "@/common/constants/config";
import { authService } from "./authService";

export class CatalogService {
    private client: JellyfinClient;
    private mediaApi: MediaApi;
    private homeSectionsApi: HomeSectionsApi;

    constructor() {
        this.client = new JellyfinClient();
        this.mediaApi = new MediaApi(this.client);
        this.homeSectionsApi = new HomeSectionsApi(this.client);
    }

    private getSession() {
        const session = authService.getCurrentSession();
        if (!session) {
            throw new Error("User not authenticated");
        }
        return session;
    }

    async getHomeSections(): Promise<HomeSection[]> {
        const { user, accessToken } = this.getSession();
        return this.homeSectionsApi.getSections(user.id, accessToken);
    }

    async getSectionDescriptors() {
        const { accessToken } = this.getSession();
        return this.homeSectionsApi.getSectionDescriptors(accessToken);
    }

    async getSingleSection(descriptor: any): Promise<HomeSection | null> {
        const { user, accessToken } = this.getSession();
        return this.homeSectionsApi.getSingleSection(
            descriptor,
            user.id,
            accessToken
        );
    }

    async getFeaturedMovies(): Promise<MediaItem[]> {
        const { user, accessToken } = this.getSession();
        const configuredName = getFeaturedPlaylistName().trim();

        try {
            const playlists = await this.mediaApi.getPlaylists(
                user.id,
                accessToken
            );

            let targetPlaylist: MediaItem | undefined;
            if (configuredName) {
                targetPlaylist = playlists.find(
                    (p) => p.name.toLowerCase() === configuredName.toLowerCase()
                );
            }

            if (!targetPlaylist) {
                const cachedId = StorageService.getFeaturedPlaylistId();
                if (cachedId) {
                    targetPlaylist = playlists.find((p) => p.id === cachedId);
                }
            }

            if (!targetPlaylist) {
                const preferredNames = ["Featured"];
                targetPlaylist = playlists.find((p) =>
                    preferredNames.some(
                        (name) => name.toLowerCase() === p.name.toLowerCase()
                    )
                );
            }

            if (!targetPlaylist && playlists.length > 0) {
                targetPlaylist = playlists[0];
            }

            if (targetPlaylist) {
                StorageService.saveFeaturedPlaylistId(targetPlaylist.id);
                const items = await this.mediaApi.getPlaylistItems(
                    user.id,
                    targetPlaylist.id,
                    accessToken
                );
                if (items.length > 0) {
                    return items;
                }
            }

            return this.mediaApi.getItems(user.id, accessToken, {
                Recursive: true,
                IncludeItemTypes: "Movie",
                SortBy: "CommunityRating",
                SortOrder: "Descending",
                Limit: 5,
            });
        } catch {
            return [];
        }
    }

    async getMovies(
        options: {
            genre?: string;
            genres?: string[];
            studio?: string;
            studios?: string[];
            minYear?: number;
            maxYear?: number;
            sortBy?: string;
            sortOrder?: "Ascending" | "Descending";
            isCollection?: boolean;
            startIndex?: number;
            limit?: number;
        } = {}
    ): Promise<MediaItem[]> {
        const { user, accessToken } = this.getSession();
        const params: Record<string, string | number | boolean | undefined> = {
            IncludeItemTypes: options.isCollection ? "BoxSet" : "Movie",
            Recursive: true,
            SortBy: options.sortBy || "SortName",
            SortOrder: options.sortOrder || "Ascending",
            StartIndex: options.startIndex ?? 0,
            Limit: options.limit ?? 36,
        };

        const allGenres =
            options.genres && options.genres.length > 0
                ? options.genres
                : options.genre && options.genre !== "All Genres"
                  ? [options.genre]
                  : [];
        if (allGenres.length > 0) {
            params.Genres = allGenres.join("|");
        }

        const allStudios =
            options.studios && options.studios.length > 0
                ? options.studios
                : options.studio && options.studio !== "All Studios"
                  ? [options.studio]
                  : [];
        if (allStudios.length > 0) {
            params.Studios = allStudios.join("|");
        }

        if (options.minYear) {
            params.MinPremiereDate = `${options.minYear}-01-01`;
        }
        if (options.maxYear) {
            params.MaxPremiereDate = `${options.maxYear}-12-31`;
        }

        return this.mediaApi.getItems(user.id, accessToken, params);
    }

    async getShows(
        options: {
            genre?: string;
            genres?: string[];
            studio?: string;
            studios?: string[];
            minYear?: number;
            maxYear?: number;
            sortBy?: string;
            sortOrder?: "Ascending" | "Descending";
            startIndex?: number;
            limit?: number;
        } = {}
    ): Promise<MediaItem[]> {
        const { user, accessToken } = this.getSession();
        const params: Record<string, string | number | boolean | undefined> = {
            IncludeItemTypes: "Series",
            Recursive: true,
            SortBy: options.sortBy || "SortName",
            SortOrder: options.sortOrder || "Ascending",
            StartIndex: options.startIndex ?? 0,
            Limit: options.limit ?? 36,
        };

        const allGenres =
            options.genres && options.genres.length > 0
                ? options.genres
                : options.genre && options.genre !== "All Genres"
                  ? [options.genre]
                  : [];
        if (allGenres.length > 0) {
            params.Genres = allGenres.join("|");
        }

        const allStudios =
            options.studios && options.studios.length > 0
                ? options.studios
                : options.studio && options.studio !== "All Studios"
                  ? [options.studio]
                  : [];
        if (allStudios.length > 0) {
            params.Studios = allStudios.join("|");
        }

        if (options.minYear) {
            params.MinPremiereDate = `${options.minYear}-01-01`;
        }
        if (options.maxYear) {
            params.MaxPremiereDate = `${options.maxYear}-12-31`;
        }

        return this.mediaApi.getItems(user.id, accessToken, params);
    }

    async getGenres(): Promise<string[]> {
        const { user, accessToken } = this.getSession();
        return this.mediaApi.getGenres(user.id, accessToken);
    }

    async getStudios(): Promise<string[]> {
        const { user, accessToken } = this.getSession();
        return this.mediaApi.getStudios(user.id, accessToken);
    }

    async getFavorites(): Promise<MediaItem[]> {
        const { user, accessToken } = this.getSession();
        return this.mediaApi.getItems(user.id, accessToken, {
            Recursive: true,
            Filters: "IsFavorite",
            IncludeItemTypes: "Movie,Series,Episode",
        });
    }

    async search(query: string): Promise<MediaItem[]> {
        const { user, accessToken } = this.getSession();
        return this.mediaApi.search(user.id, query, accessToken);
    }
}

export const catalogService = new CatalogService();
