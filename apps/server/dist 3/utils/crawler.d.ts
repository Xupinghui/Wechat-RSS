import { ImageService } from './image.service';
export declare class ArticleCrawler {
    private readonly imageService;
    private readonly logger;
    constructor(imageService: ImageService);
    crawlArticleContent(articleId: string): Promise<{
        content: string;
        coverImg: string;
    } | null>;
}
