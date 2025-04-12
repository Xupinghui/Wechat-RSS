import { PrismaService } from '@server/prisma/prisma.service';
import { TrpcService } from '@server/trpc/trpc.service';
import { ConfigService } from '@nestjs/config';
import { Article, Feed as FeedInfo } from '@prisma/client';
import { Feed } from 'feed';
export declare class FeedsService {
    private readonly prismaService;
    private readonly trpcService;
    private readonly configService;
    private readonly logger;
    private request;
    constructor(prismaService: PrismaService, trpcService: TrpcService, configService: ConfigService);
    handleUpdateFeedsCron(): Promise<void>;
    cleanHtml(source: string): Promise<string>;
    getHtmlByUrl(url: string): Promise<string>;
    tryGetContent(id: string): Promise<string>;
    renderFeed({ type, feedInfo, articles, mode, }: {
        type: string;
        feedInfo: FeedInfo;
        articles: Article[];
        mode?: string;
    }): Promise<Feed>;
    handleGenerateFeed({ id, type, limit, page, mode, title_include, title_exclude, }: {
        id?: string;
        type: string;
        limit: number;
        page: number;
        mode?: string;
        title_include?: string;
        title_exclude?: string;
    }): Promise<{
        content: string;
        mimeType: any;
    }>;
    getFeedList(): Promise<{
        id: string;
        name: string;
        intro: string;
        cover: string;
        syncTime: number;
        updateTime: number;
    }[]>;
    updateFeed(id: string): Promise<void>;
}
