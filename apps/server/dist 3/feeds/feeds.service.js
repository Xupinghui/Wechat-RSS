"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
const trpc_service_1 = require("../trpc/trpc.service");
const constants_1 = require("../constants");
const config_1 = require("@nestjs/config");
const feed_1 = require("feed");
const got_1 = __importDefault(require("got"));
const cheerio_1 = require("cheerio");
const html_minifier_1 = require("html-minifier");
const lru_cache_1 = require("lru-cache");
const p_map_1 = __importDefault(require("@cjs-exporter/p-map"));
console.log('CRON_EXPRESSION: ', process.env.CRON_EXPRESSION);
const mpCache = new lru_cache_1.LRUCache({
    max: 5000,
});
let FeedsService = class FeedsService {
    constructor(prismaService, trpcService, configService) {
        this.prismaService = prismaService;
        this.trpcService = trpcService;
        this.configService = configService;
        this.logger = new common_1.Logger(this.constructor.name);
        this.request = got_1.default.extend({
            retry: {
                limit: 3,
                methods: ['GET'],
            },
            timeout: 8 * 1e3,
            headers: {
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
                'cache-control': 'max-age=0',
                'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="101", "Google Chrome";v="101"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
            },
            hooks: {
                beforeRetry: [
                    async (options, error, retryCount) => {
                        this.logger.warn(`retrying ${options.url}...`);
                        return new Promise((resolve) => setTimeout(resolve, 2e3 * (retryCount || 1)));
                    },
                ],
            },
        });
    }
    async handleUpdateFeedsCron() {
        this.logger.debug('Called handleUpdateFeedsCron');
        const feeds = await this.prismaService.feed.findMany({
            where: { status: 1 },
        });
        this.logger.debug('feeds length:' + feeds.length);
        const updateDelayTime = this.configService.get('feed').updateDelayTime;
        for (const feed of feeds) {
            this.logger.debug('feed', feed.id);
            try {
                await this.trpcService.refreshMpArticlesAndUpdateFeed(feed.id);
                await new Promise((resolve) => setTimeout(resolve, updateDelayTime * 1e3));
            }
            catch (err) {
                this.logger.error('handleUpdateFeedsCron error', err);
            }
            finally {
                await new Promise((resolve) => setTimeout(resolve, 30 * 1e3));
            }
        }
    }
    async cleanHtml(source) {
        const $ = (0, cheerio_1.load)(source, { decodeEntities: false });
        const dirtyHtml = $.html($('.rich_media_content'));
        const html = dirtyHtml
            .replace(/data-src=/g, 'src=')
            .replace(/opacity: 0( !important)?;/g, '')
            .replace(/visibility: hidden;/g, '');
        const content = '<style> .rich_media_content {overflow: hidden;color: #222;font-size: 17px;word-wrap: break-word;-webkit-hyphens: auto;-ms-hyphens: auto;hyphens: auto;text-align: justify;position: relative;z-index: 0;}.rich_media_content {font-size: 18px;}</style>' +
            html;
        const result = (0, html_minifier_1.minify)(content, {
            removeAttributeQuotes: true,
            collapseWhitespace: true,
        });
        return result;
    }
    async getHtmlByUrl(url) {
        const html = await this.request(url, { responseType: 'text' }).text();
        if (this.configService.get('feed').enableCleanHtml) {
            const result = await this.cleanHtml(html);
            return result;
        }
        return html;
    }
    async tryGetContent(id) {
        let content = mpCache.get(id);
        if (content) {
            return content;
        }
        const url = `https://mp.weixin.qq.com/s/${id}`;
        content = await this.getHtmlByUrl(url).catch((e) => {
            this.logger.error(`getHtmlByUrl(${url}) error: ${e.message}`);
            return '获取全文失败，请重试~';
        });
        mpCache.set(id, content);
        return content;
    }
    async renderFeed({ type, feedInfo, articles, mode, }) {
        const { originUrl, mode: globalMode } = this.configService.get('feed');
        const link = `${originUrl}/feeds/${feedInfo.id}.${type}`;
        const feed = new feed_1.Feed({
            title: feedInfo.mpName,
            description: feedInfo.mpIntro,
            id: link,
            link: link,
            language: 'zh-cn',
            image: feedInfo.mpCover,
            favicon: feedInfo.mpCover,
            copyright: '',
            updated: new Date(feedInfo.updateTime * 1e3),
            generator: 'WeWe-RSS',
            author: { name: feedInfo.mpName },
        });
        feed.addExtension({
            name: 'generator',
            objects: `WeWe-RSS`,
        });
        const feeds = await this.prismaService.feed.findMany({
            select: { id: true, mpName: true },
        });
        const enableFullText = typeof mode === 'string'
            ? mode === 'fulltext'
            : globalMode === 'fulltext';
        const showAuthor = feedInfo.id === 'all';
        const mapper = async (item) => {
            const { title, id, publishTime, picUrl, mpId } = item;
            const link = `https://mp.weixin.qq.com/s/${id}`;
            const mpName = feeds.find((item) => item.id === mpId)?.mpName || '-';
            const published = new Date(publishTime * 1e3);
            let content = '';
            if (enableFullText) {
                content = await this.tryGetContent(id);
            }
            feed.addItem({
                id,
                title,
                link: link,
                guid: link,
                content,
                date: published,
                image: picUrl,
                author: showAuthor ? [{ name: mpName }] : undefined,
            });
        };
        await (0, p_map_1.default)(articles, mapper, { concurrency: 2, stopOnError: false });
        return feed;
    }
    async handleGenerateFeed({ id, type, limit, page, mode, title_include, title_exclude, }) {
        if (!constants_1.feedTypes.includes(type)) {
            type = 'atom';
        }
        let articles;
        let feedInfo;
        if (id) {
            feedInfo = (await this.prismaService.feed.findFirst({
                where: { id },
            }));
            if (!feedInfo) {
                throw new common_1.HttpException('不存在该feed！', common_1.HttpStatus.BAD_REQUEST);
            }
            articles = await this.prismaService.article.findMany({
                where: { mpId: id },
                orderBy: { publishTime: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            });
        }
        else {
            articles = await this.prismaService.article.findMany({
                orderBy: { publishTime: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            });
            const { originUrl } = this.configService.get('feed');
            feedInfo = {
                id: 'all',
                mpName: 'WeWe-RSS All',
                mpIntro: 'WeWe-RSS 全部文章',
                mpCover: originUrl
                    ? `${originUrl}/favicon.ico`
                    : 'https://r2-assets.111965.xyz/wewe-rss.png',
                status: 1,
                syncTime: 0,
                updateTime: Math.floor(Date.now() / 1e3),
                hasHistory: -1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }
        this.logger.log('handleGenerateFeed articles: ' + articles.length);
        const feed = await this.renderFeed({ feedInfo, articles, type, mode });
        if (title_include) {
            const includes = title_include.split('|');
            feed.items = feed.items.filter((i) => includes.some((k) => i.title.includes(k)));
        }
        if (title_exclude) {
            const excludes = title_exclude.split('|');
            feed.items = feed.items.filter((i) => !excludes.some((k) => i.title.includes(k)));
        }
        switch (type) {
            case 'rss':
                return { content: feed.rss2(), mimeType: constants_1.feedMimeTypeMap[type] };
            case 'json':
                return { content: feed.json1(), mimeType: constants_1.feedMimeTypeMap[type] };
            case 'atom':
            default:
                return { content: feed.atom1(), mimeType: constants_1.feedMimeTypeMap[type] };
        }
    }
    async getFeedList() {
        const data = await this.prismaService.feed.findMany();
        return data.map((item) => {
            return {
                id: item.id,
                name: item.mpName,
                intro: item.mpIntro,
                cover: item.mpCover,
                syncTime: item.syncTime,
                updateTime: item.updateTime,
            };
        });
    }
    async updateFeed(id) {
        try {
            await this.trpcService.refreshMpArticlesAndUpdateFeed(id);
        }
        catch (err) {
            this.logger.error('updateFeed error', err);
        }
        finally {
            await new Promise((resolve) => setTimeout(resolve, 30 * 1e3));
        }
    }
};
exports.FeedsService = FeedsService;
__decorate([
    (0, schedule_1.Cron)(process.env.CRON_EXPRESSION || '35 5,17 * * *', {
        name: 'updateFeeds',
        timeZone: 'Asia/Shanghai',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FeedsService.prototype, "handleUpdateFeedsCron", null);
exports.FeedsService = FeedsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        trpc_service_1.TrpcService,
        config_1.ConfigService])
], FeedsService);
//# sourceMappingURL=feeds.service.js.map