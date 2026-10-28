import { JellyfinClient } from "./jellyfinClient";
import { ItemMapper, JellyfinBaseItemDto } from "../mappers/itemMapper";
import { HomeSection } from "@/common/types/media";

export interface HomeScreenSectionDescriptor {
    id: string;
    sectionKey: string;
    displayText: string;
    additionalData?: string;
    viewMode: "Portrait" | "Landscape";
}

interface HomeScreenSectionDto {
    Section: string;
    DisplayText: string;
    AdditionalData?: string;
    Limit?: number;
    ViewMode?: "Landscape" | "Portrait";
}

interface HomeScreenSectionsResponse {
    Items: HomeScreenSectionDto[];
}

interface QueryResult<T> {
    Items: T[];
    TotalRecordCount: number;
}

export class HomeSectionsApi {
    private client: JellyfinClient;

    constructor(client: JellyfinClient) {
        this.client = client;
    }

    async getSectionDescriptors(
        token: string
    ): Promise<HomeScreenSectionDescriptor[]> {
        try {
            const sectionsMeta =
                await this.client.request<HomeScreenSectionsResponse>(
                    "/HomeScreen/Sections",
                    {
                        token,
                    }
                );

            if (sectionsMeta?.Items && sectionsMeta.Items.length > 0) {
                return sectionsMeta.Items.map((item, idx) => ({
                    id: `${item.Section}_${item.AdditionalData || idx}`,
                    sectionKey: item.Section,
                    displayText: item.DisplayText || item.Section,
                    additionalData: item.AdditionalData,
                    viewMode:
                        item.ViewMode === "Portrait" ? "Portrait" : "Landscape",
                }));
            }
        } catch {
            // ignore
        }

        return [
            {
                id: "Resume_0",
                sectionKey: "Resume",
                displayText: "Continue Watching / Next Up",
                viewMode: "Landscape",
            },
            {
                id: "RecentlyAddedMovies_1",
                sectionKey: "RecentlyAddedMovies",
                displayText: "Recently Added Movies",
                viewMode: "Portrait",
            },
            {
                id: "RecentlyAddedShows_2",
                sectionKey: "RecentlyAddedShows",
                displayText: "Recently Added Shows",
                viewMode: "Portrait",
            },
        ];
    }

    private async enrichLogos(
        dtos: JellyfinBaseItemDto[],
        userId: string,
        token: string
    ): Promise<JellyfinBaseItemDto[]> {
        if (!dtos || dtos.length === 0) {
            return dtos;
        }

        const missing = dtos.filter(
            (d) =>
                !d.ImageTags?.Logo &&
                !d.ParentLogoImageTag &&
                !d.SeriesLogoImageTag
        );

        if (missing.length === 0) {
            return dtos;
        }

        try {
            const itemIds = missing.map((d) => d.Id);
            const seriesIds = missing
                .map((d) => d.SeriesId)
                .filter((id): id is string => !!id);

            const allIdsToFetch = Array.from(
                new Set([...itemIds, ...seriesIds])
            );

            const enrichedRes = await this.client.request<
                QueryResult<JellyfinBaseItemDto>
            >(`/Users/${userId}/Items`, {
                token,
                params: {
                    Ids: allIdsToFetch.join(","),
                    Fields: "ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag,SeriesId",
                    EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                },
            });

            const enrichedMap = new Map(
                (enrichedRes.Items || []).map((item) => [item.Id, item])
            );

            for (const item of dtos) {
                const match = enrichedMap.get(item.Id);
                if (match) {
                    if (match.ImageTags) {
                        item.ImageTags = {
                            ...item.ImageTags,
                            ...match.ImageTags,
                        };
                    }
                    if (match.ParentLogoItemId) {
                        item.ParentLogoItemId = match.ParentLogoItemId;
                    }
                    if (match.ParentLogoImageTag) {
                        item.ParentLogoImageTag = match.ParentLogoImageTag;
                    }
                    if (match.SeriesLogoImageTag) {
                        item.SeriesLogoImageTag = match.SeriesLogoImageTag;
                    }
                    if (match.SeriesId && !item.SeriesId) {
                        item.SeriesId = match.SeriesId;
                    }
                }

                if (
                    !item.ImageTags?.Logo &&
                    !item.ParentLogoImageTag &&
                    !item.SeriesLogoImageTag
                ) {
                    const sid = item.SeriesId || match?.SeriesId;
                    if (sid && enrichedMap.has(sid)) {
                        const seriesMatch = enrichedMap.get(sid)!;
                        if (seriesMatch.ImageTags?.Logo) {
                            item.SeriesLogoImageTag =
                                seriesMatch.ImageTags.Logo;
                            if (!item.SeriesId) item.SeriesId = sid;
                        }
                    }
                }
            }

            const unresolvedSeriesIds = Array.from(
                new Set(
                    dtos
                        .filter(
                            (d) =>
                                !d.ImageTags?.Logo &&
                                !d.ParentLogoImageTag &&
                                !d.SeriesLogoImageTag &&
                                d.SeriesId &&
                                !enrichedMap.has(d.SeriesId)
                        )
                        .map((d) => d.SeriesId!)
                )
            );

            if (unresolvedSeriesIds.length > 0) {
                const seriesRes = await this.client.request<
                    QueryResult<JellyfinBaseItemDto>
                >(`/Users/${userId}/Items`, {
                    token,
                    params: {
                        Ids: unresolvedSeriesIds.join(","),
                        Fields: "ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag",
                        EnableImageTypes: "Logo",
                    },
                });

                if (seriesRes.Items) {
                    for (const s of seriesRes.Items) {
                        enrichedMap.set(s.Id, s);
                    }
                    for (const item of dtos) {
                        if (
                            !item.ImageTags?.Logo &&
                            !item.ParentLogoImageTag &&
                            !item.SeriesLogoImageTag &&
                            item.SeriesId &&
                            enrichedMap.has(item.SeriesId)
                        ) {
                            const s = enrichedMap.get(item.SeriesId)!;
                            if (s.ImageTags?.Logo) {
                                item.SeriesLogoImageTag = s.ImageTags.Logo;
                            }
                        }
                    }
                }
            }
        } catch {
            // Keep original DTOs on network failure
        }

        return dtos;
    }

    async getSingleSection(
        descriptor: HomeScreenSectionDescriptor,
        userId: string,
        token: string
    ): Promise<HomeSection | null> {
        if (descriptor.sectionKey === "Resume") {
            try {
                const resume = await this.client.request<
                    QueryResult<JellyfinBaseItemDto>
                >(`/Users/${userId}/Items/Resume`, {
                    token,
                    params: {
                        Limit: 14,
                        Fields: "Overview,RunTimeTicks,SeriesId,SeriesName,BackdropImageTags,Chapters,Trickplay,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                        EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                    },
                });
                if (resume.Items && resume.Items.length > 0) {
                    const enriched = await this.enrichLogos(
                        resume.Items,
                        userId,
                        token
                    );
                    return {
                        id: descriptor.id,
                        key: descriptor.sectionKey,
                        name: descriptor.displayText,
                        viewMode: descriptor.viewMode,
                        items: enriched.map(ItemMapper.toMediaItem),
                    };
                }
            } catch {
                return null;
            }
        }

        try {
            const queryParams: Record<
                string,
                string | number | boolean | undefined
            > = {
                userId,
                EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                Fields: "Overview,Genres,Studios,Width,Height,ParentIndexNumber,IndexNumber,SeriesId,SeriesName,SeasonId,SeasonName,BackdropImageTags,Chapters,Trickplay,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
            };
            if (descriptor.additionalData) {
                queryParams.additionalData = descriptor.additionalData;
            }

            const sectionRes = await this.client.request<
                QueryResult<JellyfinBaseItemDto>
            >(`/HomeScreen/Section/${descriptor.sectionKey}`, {
                token,
                params: queryParams,
            });

            const dtos = sectionRes.Items || [];
            if (dtos.length > 0) {
                const enriched = await this.enrichLogos(dtos, userId, token);
                const mediaItems = enriched.map(ItemMapper.toMediaItem);
                return {
                    id: descriptor.id,
                    key: descriptor.sectionKey,
                    name: descriptor.displayText,
                    viewMode: descriptor.viewMode,
                    items: mediaItems,
                };
            }
        } catch {
            // Fallback for standard sections if home-screen plugin fails
            if (descriptor.sectionKey === "RecentlyAddedMovies") {
                try {
                    const latest = await this.client.request<
                        QueryResult<JellyfinBaseItemDto>
                    >(`/Users/${userId}/Items`, {
                        token,
                        params: {
                            IncludeItemTypes: "Movie",
                            Recursive: true,
                            SortBy: "DateCreated",
                            SortOrder: "Descending",
                            Limit: 14,
                            Fields: "Overview,Genres,BackdropImageTags,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                            EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                        },
                    });
                    if (latest.Items && latest.Items.length > 0) {
                        const enriched = await this.enrichLogos(
                            latest.Items,
                            userId,
                            token
                        );
                        return {
                            id: descriptor.id,
                            key: "RecentlyAddedMovies",
                            name: descriptor.displayText,
                            viewMode: "Portrait",
                            items: enriched.map(ItemMapper.toMediaItem),
                        };
                    }
                } catch {
                    return null;
                }
            }

            if (descriptor.sectionKey === "RecentlyAddedShows") {
                try {
                    const latest = await this.client.request<
                        QueryResult<JellyfinBaseItemDto>
                    >(`/Users/${userId}/Items`, {
                        token,
                        params: {
                            IncludeItemTypes: "Series",
                            Recursive: true,
                            SortBy: "DateCreated",
                            SortOrder: "Descending",
                            Limit: 14,
                            Fields: "Overview,Genres,BackdropImageTags,ParentLogoItemId,ParentLogoImageTag,SeriesLogoImageTag,SeriesThumbImageTag,SeriesPrimaryImageTag",
                            EnableImageTypes: "Primary,Backdrop,Logo,Thumb",
                        },
                    });
                    if (latest.Items && latest.Items.length > 0) {
                        const enriched = await this.enrichLogos(
                            latest.Items,
                            userId,
                            token
                        );
                        return {
                            id: descriptor.id,
                            key: "RecentlyAddedShows",
                            name: descriptor.displayText,
                            viewMode: "Portrait",
                            items: enriched.map(ItemMapper.toMediaItem),
                        };
                    }
                } catch {
                    return null;
                }
            }
        }

        return null;
    }

    async getSections(userId: string, token: string): Promise<HomeSection[]> {
        const descriptors = await this.getSectionDescriptors(token);
        const sectionPromises = descriptors.map((desc) =>
            this.getSingleSection(desc, userId, token)
        );
        const results = await Promise.all(sectionPromises);
        return results.filter((sec): sec is HomeSection => sec !== null);
    }
}
