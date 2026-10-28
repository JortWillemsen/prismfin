import { JellyfinClient } from "./jellyfinClient";
import { ItemMapper, JellyfinBaseItemDto } from "../mappers/itemMapper";
import { MediaItem } from "@/common/types/media";

interface QueryResult<T> {
    Items: T[];
    TotalRecordCount: number;
}

export class MediaApi {
    private client: JellyfinClient;

    constructor(client: JellyfinClient) {
        this.client = client;
    }

    async getUserViews(userId: string, token: string): Promise<MediaItem[]> {
        const res = await this.client.request<QueryResult<JellyfinBaseItemDto>>(
            `/Users/${userId}/Views`,
            {
                token,
            }
        );
        return (res.Items || []).map(ItemMapper.toMediaItem);
    }

    async getItem(
        userId: string,
        itemId: string,
        token: string
    ): Promise<MediaItem> {
        const res = await this.client.request<JellyfinBaseItemDto>(
            `/Users/${userId}/Items/${itemId}`,
            {
                token,
                params: {
                    Fields: "Overview,Genres,Studios,People,Chapters,MediaStreams,Width,Height,ParentIndexNumber,IndexNumber,SeriesId,SeriesName,SeasonId,SeasonName,BackdropImageTags,Trickplay,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            }
        );
        return ItemMapper.toMediaItem(res);
    }

    async getItemCollections(
        userId: string,
        itemId: string,
        token: string
    ): Promise<MediaItem[]> {
        try {
            const res = await this.client.request<
                QueryResult<JellyfinBaseItemDto>
            >(`/Items/${itemId}/Collections`, {
                token,
                params: {
                    userId,
                    Fields: "Overview,BackdropImageTags,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            });
            return (res.Items || []).map(ItemMapper.toMediaItem);
        } catch {
            return [];
        }
    }

    async getItems(
        userId: string,
        token: string,
        params: Record<string, string | number | boolean | undefined> = {}
    ): Promise<MediaItem[]> {
        const res = await this.client.request<QueryResult<JellyfinBaseItemDto>>(
            `/Users/${userId}/Items`,
            {
                token,
                params: {
                    Fields: "Overview,Genres,Studios,Width,Height,ParentIndexNumber,IndexNumber,SeriesId,SeriesName,SeasonId,SeasonName,BackdropImageTags,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                    ...params,
                },
            }
        );
        return (res.Items || []).map(ItemMapper.toMediaItem);
    }

    async getSimilar(
        userId: string,
        itemId: string,
        token: string,
        limit: number = 12
    ): Promise<MediaItem[]> {
        const res = await this.client.request<QueryResult<JellyfinBaseItemDto>>(
            `/Items/${itemId}/Similar`,
            {
                token,
                params: {
                    userId,
                    limit,
                    Fields: "Overview,Genres,Studios,Width,Height,BackdropImageTags,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            }
        );
        return (res.Items || []).map(ItemMapper.toMediaItem);
    }

    async getSeasons(
        userId: string,
        seriesId: string,
        token: string
    ): Promise<MediaItem[]> {
        const res = await this.client.request<QueryResult<JellyfinBaseItemDto>>(
            `/Shows/${seriesId}/Seasons`,
            {
                token,
                params: {
                    userId,
                    Fields: "Overview,IndexNumber,BackdropImageTags,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            }
        );
        return (res.Items || []).map(ItemMapper.toMediaItem);
    }

    async getEpisodes(
        userId: string,
        seriesId: string,
        seasonId: string,
        token: string
    ): Promise<MediaItem[]> {
        const res = await this.client.request<QueryResult<JellyfinBaseItemDto>>(
            `/Shows/${seriesId}/Episodes`,
            {
                token,
                params: {
                    userId,
                    seasonId,
                    Fields: "Overview,IndexNumber,ParentIndexNumber,RunTimeTicks,MediaStreams,Width,Height,Chapters,Trickplay,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            }
        );
        return (res.Items || []).map(ItemMapper.toMediaItem);
    }

    async getNextUpEpisode(
        userId: string,
        seriesId: string,
        token: string
    ): Promise<MediaItem | null> {
        try {
            const res = await this.client.request<
                QueryResult<JellyfinBaseItemDto>
            >("/Shows/NextUp", {
                token,
                params: {
                    SeriesId: seriesId,
                    UserId: userId,
                    Limit: 1,
                    Fields: "Overview,IndexNumber,ParentIndexNumber,RunTimeTicks,MediaStreams,Width,Height,BackdropImageTags,Chapters,Trickplay,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            });
            if (res.Items && res.Items.length > 0) {
                return ItemMapper.toMediaItem(res.Items[0]);
            }
        } catch {
            // ignore
        }
        return null;
    }

    async getResumeItems(
        userId: string,
        token: string,
        limit: number = 16
    ): Promise<MediaItem[]> {
        const res = await this.client.request<QueryResult<JellyfinBaseItemDto>>(
            `/Users/${userId}/Items/Resume`,
            {
                token,
                params: {
                    limit,
                    Fields: "Overview,RunTimeTicks,SeriesId,SeriesName,IndexNumber,ParentIndexNumber,BackdropImageTags,Chapters,Trickplay,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            }
        );
        return (res.Items || []).map(ItemMapper.toMediaItem);
    }

    async getPlaylists(userId: string, token: string): Promise<MediaItem[]> {
        return this.getItems(userId, token, {
            IncludeItemTypes: "Playlist",
            Recursive: true,
        });
    }

    async getPlaylistItems(
        userId: string,
        playlistId: string,
        token: string
    ): Promise<MediaItem[]> {
        const res = await this.client.request<QueryResult<JellyfinBaseItemDto>>(
            `/Playlists/${playlistId}/Items`,
            {
                token,
                params: {
                    userId,
                    Fields: "Overview,Genres,Studios,People,Chapters,MediaStreams,Width,Height,BackdropImageTags,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            }
        );
        return (res.Items || []).map(ItemMapper.toMediaItem);
    }

    async search(
        userId: string,
        term: string,
        token: string
    ): Promise<MediaItem[]> {
        const trimmed = term.trim();
        if (!trimmed) {
            return [];
        }

        // Search by title (including Movie, Series, BoxSet)
        const titleSearchPromise = this.getItems(userId, token, {
            SearchTerm: trimmed,
            IncludeItemTypes: "Movie,Series,BoxSet",
            Recursive: true,
            Limit: 40,
        });

        // Search by Cast & Crew (find persons matching term, then get their movies/shows)
        const personSearchPromise = (async (): Promise<MediaItem[]> => {
            try {
                const personRes = await this.client.request<
                    QueryResult<{ Id: string; Name: string }>
                >("/Persons", {
                    token,
                    params: {
                        searchTerm: trimmed,
                        userId,
                        Limit: 6,
                    },
                });

                if (personRes?.Items && personRes.Items.length > 0) {
                    const personIds = personRes.Items.map((p) => p.Id).join(
                        ","
                    );
                    return await this.getItems(userId, token, {
                        PersonIds: personIds,
                        IncludeItemTypes: "Movie,Series",
                        Recursive: true,
                        Limit: 40,
                    });
                }
            } catch {
                // Fallback to Person param
                try {
                    return await this.getItems(userId, token, {
                        Person: trimmed,
                        IncludeItemTypes: "Movie,Series",
                        Recursive: true,
                        Limit: 40,
                    });
                } catch {
                    return [];
                }
            }
            return [];
        })();

        const [titleResults, personResults] = await Promise.all([
            titleSearchPromise.catch(() => [] as MediaItem[]),
            personSearchPromise.catch(() => [] as MediaItem[]),
        ]);

        // Rank title results by direct name closeness to the query
        const scoreItem = (name: string): number => {
            const n = name.toLowerCase().trim();
            const q = trimmed.toLowerCase();
            if (n === q) return 0; // Exact match
            if (n.startsWith(q)) return 10 + Math.min(n.length - q.length, 100);
            const wordRegex = new RegExp(
                `\\b${q.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`,
                "i"
            );
            if (wordRegex.test(n))
                return 100 + Math.min(n.length - q.length, 100);
            if (n.includes(q))
                return 300 + n.indexOf(q) + Math.min(n.length - q.length, 100);
            return 900;
        };

        titleResults.sort(
            (a, b) => scoreItem(a.name || "") - scoreItem(b.name || "")
        );

        // Merge and deduplicate by item ID: direct title matches first, cast/crew after
        const seen = new Set<string>();
        const merged: MediaItem[] = [];

        for (const item of titleResults) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
            }
        }

        for (const item of personResults) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
            }
        }

        return merged;
    }

    async getGenres(userId: string, token: string): Promise<string[]> {
        try {
            const res = await this.client.request<
                QueryResult<{ Name: string }>
            >("/Genres", {
                token,
                params: { userId },
            });
            return (res.Items || []).map((g) => g.Name).filter(Boolean);
        } catch {
            return [];
        }
    }

    async getStudios(userId: string, token: string): Promise<string[]> {
        try {
            const res = await this.client.request<
                QueryResult<{ Name: string }>
            >("/Studios", {
                token,
                params: { userId },
            });
            return (res.Items || []).map((s) => s.Name).filter(Boolean);
        } catch {
            return [];
        }
    }

    async setFavorite(
        userId: string,
        itemId: string,
        isFavorite: boolean,
        token: string
    ): Promise<void> {
        const endpoint = `/Users/${userId}/FavoriteItems/${itemId}`;
        await this.client.request(endpoint, {
            method: isFavorite ? "POST" : "DELETE",
            token,
        });
    }
}
