import {
    MediaItem,
    PersonItem,
    SceneItem,
    MediaType,
} from "@/common/types/media";
import { formatResolution } from "@/common/utils/formatters";

export interface JellyfinBaseItemDto {
    Id: string;
    Name: string;
    OriginalTitle?: string;
    Type: string;
    Overview?: string;
    ProductionYear?: number;
    CommunityRating?: number;
    CriticRating?: number;
    OfficialRating?: string;
    RunTimeTicks?: number;
    ImageTags?: Record<string, string>;
    BackdropImageTags?: string[];
    ParentLogoItemId?: string;
    ParentLogoImageTag?: string;
    SeriesLogoImageTag?: string;
    SeriesThumbImageTag?: string;
    SeriesPrimaryImageTag?: string;
    Genres?: string[];
    Studios?: Array<{ Name: string }>;
    UserData?: {
        IsFavorite?: boolean;
        PlaybackPositionTicks?: number;
        Played?: boolean;
    };
    SeriesId?: string;
    SeriesName?: string;
    SeasonId?: string;
    SeasonName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
    Width?: number;
    Height?: number;
    MediaStreams?: Array<{
        Type: string;
        Codec?: string;
        VideoRangeType?: string;
        VideoRange?: string;
    }>;
    People?: Array<{
        Id: string;
        Name: string;
        Role?: string;
        Type?: string;
        PrimaryImageTag?: string;
    }>;
    Chapters?: Array<{
        StartPositionTicks: number;
        Name?: string;
        ImagePath?: string;
        ImageTag?: string;
    }>;
    Trickplay?: Record<string, any>;
}

export class ItemMapper {
    static toMediaItem(dto: JellyfinBaseItemDto): MediaItem {
        const videoStream = dto.MediaStreams?.find((s) => s.Type === "Video");
        const audioStream = dto.MediaStreams?.find((s) => s.Type === "Audio");

        let hdr = "";
        if (
            videoStream?.VideoRangeType &&
            videoStream.VideoRangeType !== "SDR"
        ) {
            hdr = videoStream.VideoRangeType;
        } else if (
            videoStream?.VideoRange &&
            videoStream.VideoRange.includes("HDR")
        ) {
            hdr = "HDR";
        }

        const director = dto.People?.find((p) => p.Type === "Director")?.Name;

        const people: PersonItem[] = (dto.People || []).map((p) => ({
            id: p.Id,
            name: p.Name,
            role: p.Role || p.Type || "",
            type: p.Type || "Actor",
            primaryImageTag: p.PrimaryImageTag,
        }));

        const scenes: SceneItem[] = (dto.Chapters || []).map((ch, index) => ({
            name: ch.Name || `Scene ${index + 1}`,
            startPositionTicks: ch.StartPositionTicks,
            startPositionSeconds: Math.floor(ch.StartPositionTicks / 10000000),
            imageTag: ch.ImageTag,
        }));

        let trickplayInfo = undefined;
        if (dto.Trickplay && typeof dto.Trickplay === "object") {
            const isTrickplayEntry = (obj: any): boolean => {
                if (!obj || typeof obj !== "object") return false;
                const w = obj.Width ?? obj.width;
                const h = obj.Height ?? obj.height;
                const interval = obj.Interval ?? obj.interval;
                return (
                    typeof w === "number" ||
                    typeof interval === "number" ||
                    typeof h === "number"
                );
            };

            let raw: any = undefined;

            if (isTrickplayEntry(dto.Trickplay)) {
                raw = dto.Trickplay;
            } else {
                const tpAny = dto.Trickplay as Record<string, any>;
                if (isTrickplayEntry(tpAny["320"])) {
                    raw = tpAny["320"];
                } else if (dto.Id && isTrickplayEntry(tpAny[dto.Id])) {
                    raw = tpAny[dto.Id];
                } else {
                    for (const topVal of Object.values(tpAny)) {
                        if (!topVal || typeof topVal !== "object") continue;

                        if (isTrickplayEntry(topVal)) {
                            raw = topVal;
                            break;
                        }

                        const nestedAny = topVal as Record<string, any>;
                        if (isTrickplayEntry(nestedAny["320"])) {
                            raw = nestedAny["320"];
                            break;
                        }

                        for (const subVal of Object.values(nestedAny)) {
                            if (isTrickplayEntry(subVal)) {
                                raw = subVal;
                                break;
                            }
                        }

                        if (raw) break;
                    }
                }
            }

            if (raw) {
                const width = Number(raw.Width ?? raw.width ?? 320) || 320;
                const height =
                    Number(raw.Height ?? raw.height) ||
                    Math.round(width * (9 / 16)) ||
                    180;
                const tileWidth =
                    Number(raw.TileWidth ?? raw.tileWidth ?? 10) || 10;
                const tileHeight =
                    Number(raw.TileHeight ?? raw.tileHeight ?? 10) || 10;
                const thumbnailCount =
                    Number(raw.ThumbnailCount ?? raw.thumbnailCount ?? 0) || 0;
                const interval =
                    Number(raw.Interval ?? raw.interval ?? 10000) || 10000;
                const bandwidth = raw.Bandwidth
                    ? Number(raw.Bandwidth)
                    : raw.bandwidth
                      ? Number(raw.bandwidth)
                      : undefined;

                trickplayInfo = {
                    width,
                    height,
                    tileWidth,
                    tileHeight,
                    thumbnailCount,
                    interval,
                    bandwidth,
                };
            }
        }

        let logoImageTag: string | undefined = undefined;
        let logoItemId: string = dto.Id;

        if (dto.ImageTags?.Logo) {
            logoImageTag = dto.ImageTags.Logo;
            logoItemId = dto.Id;
        } else if (dto.SeriesLogoImageTag && dto.SeriesId) {
            logoImageTag = dto.SeriesLogoImageTag;
            logoItemId = dto.SeriesId;
        } else if (dto.ParentLogoImageTag && dto.ParentLogoItemId) {
            logoImageTag = dto.ParentLogoImageTag;
            logoItemId = dto.ParentLogoItemId;
        } else if (dto.ParentLogoImageTag) {
            logoImageTag = dto.ParentLogoImageTag;
            logoItemId = dto.ParentLogoItemId || dto.SeriesId || dto.Id;
        } else if (dto.SeriesLogoImageTag) {
            logoImageTag = dto.SeriesLogoImageTag;
            logoItemId = dto.SeriesId || dto.Id;
        }

        const thumbImageTag = dto.ImageTags?.Thumb || dto.SeriesThumbImageTag;

        return {
            id: dto.Id,
            name: dto.Name,
            originalTitle: dto.OriginalTitle,
            type: dto.Type as MediaType,
            overview: dto.Overview,
            productionYear: dto.ProductionYear,
            communityRating: dto.CommunityRating,
            criticRating: dto.CriticRating,
            officialRating: dto.OfficialRating,
            runTimeTicks: dto.RunTimeTicks,
            runTimeMinutes: dto.RunTimeTicks
                ? Math.round(dto.RunTimeTicks / (10000000 * 60))
                : undefined,
            primaryImageTag:
                dto.ImageTags?.Primary || dto.SeriesPrimaryImageTag,
            backdropImageTag: dto.BackdropImageTags?.[0],
            logoImageTag,
            thumbImageTag,
            logoItemId,
            genres: dto.Genres,
            studios: dto.Studios?.map((s) => s.Name),
            director,
            isFavorite: !!dto.UserData?.IsFavorite,
            playbackPositionTicks: dto.UserData?.PlaybackPositionTicks,
            played: !!dto.UserData?.Played,
            seriesId: dto.SeriesId,
            seriesName: dto.SeriesName,
            seasonId: dto.SeasonId,
            seasonName: dto.SeasonName,
            episodeNumber: dto.IndexNumber,
            seasonNumber: dto.ParentIndexNumber,
            videoResolution: formatResolution(dto.Width, dto.Height),
            videoCodec: videoStream?.Codec?.toUpperCase(),
            audioCodec: audioStream?.Codec?.toUpperCase(),
            hdrType: hdr,
            people,
            scenes,
            trickplayInfo,
        };
    }
}
