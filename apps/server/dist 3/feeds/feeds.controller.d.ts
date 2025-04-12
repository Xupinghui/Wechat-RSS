import { FeedsService } from './feeds.service';
import { Response as Res, Request as Req } from 'express';
export declare class FeedsController {
    private readonly feedsService;
    private readonly logger;
    constructor(feedsService: FeedsService);
    getFeedList(): Promise<{
        id: string;
        name: string;
        intro: string;
        cover: string;
        syncTime: number;
        updateTime: number;
    }[]>;
    getFeeds(req: Req, res: Res, limit: number | undefined, page: number | undefined, mode: string, title_include: string, title_exclude: string): Promise<void>;
    getFeed(res: Res, feed: string, limit: number | undefined, page: number | undefined, mode: string, title_include: string, title_exclude: string, update?: boolean): Promise<void>;
}
