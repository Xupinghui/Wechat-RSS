"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrpcRouter = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const trpc_service_1 = require("./trpc.service");
const trpcExpress = __importStar(require("@trpc/server/adapters/express"));
const server_1 = require("@trpc/server");
const prisma_service_1 = require("../prisma/prisma.service");
const constants_1 = require("../constants");
const config_1 = require("@nestjs/config");
let TrpcRouter = class TrpcRouter {
    constructor(trpcService, prismaService, configService) {
        this.trpcService = trpcService;
        this.prismaService = prismaService;
        this.configService = configService;
        this.logger = new common_1.Logger(this.constructor.name);
        this.accountRouter = this.trpcService.router({
            list: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                limit: zod_1.z.number().min(1).max(1000).nullish(),
                cursor: zod_1.z.string().nullish(),
            }))
                .query(async ({ input }) => {
                const limit = input.limit ?? 1000;
                const { cursor } = input;
                const items = await this.prismaService.account.findMany({
                    take: limit + 1,
                    where: {},
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                        token: false,
                    },
                    cursor: cursor
                        ? {
                            id: cursor,
                        }
                        : undefined,
                    orderBy: {
                        createdAt: 'asc',
                    },
                });
                let nextCursor = undefined;
                if (items.length > limit) {
                    const nextItem = items.pop();
                    nextCursor = nextItem.id;
                }
                const disabledAccounts = this.trpcService.getBlockedAccountIds();
                return {
                    blocks: disabledAccounts,
                    items,
                    nextCursor,
                };
            }),
            byId: this.trpcService.protectedProcedure
                .input(zod_1.z.string())
                .query(async ({ input: id }) => {
                const account = await this.prismaService.account.findUnique({
                    where: { id },
                });
                if (!account) {
                    throw new server_1.TRPCError({
                        code: 'BAD_REQUEST',
                        message: `No account with id '${id}'`,
                    });
                }
                return account;
            }),
            add: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                id: zod_1.z.string().min(1).max(32),
                token: zod_1.z.string().min(1),
                name: zod_1.z.string().min(1),
                status: zod_1.z.number().default(constants_1.statusMap.ENABLE),
            }))
                .mutation(async ({ input }) => {
                const { id, ...data } = input;
                const account = await this.prismaService.account.upsert({
                    where: {
                        id,
                    },
                    update: data,
                    create: input,
                });
                this.trpcService.removeBlockedAccount(id);
                return account;
            }),
            edit: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                id: zod_1.z.string(),
                data: zod_1.z.object({
                    token: zod_1.z.string().min(1).optional(),
                    name: zod_1.z.string().min(1).optional(),
                    status: zod_1.z.number().optional(),
                }),
            }))
                .mutation(async ({ input }) => {
                const { id, data } = input;
                const account = await this.prismaService.account.update({
                    where: { id },
                    data,
                });
                this.trpcService.removeBlockedAccount(id);
                return account;
            }),
            delete: this.trpcService.protectedProcedure
                .input(zod_1.z.string())
                .mutation(async ({ input: id }) => {
                await this.prismaService.account.delete({ where: { id } });
                this.trpcService.removeBlockedAccount(id);
                return id;
            }),
        });
        this.feedRouter = this.trpcService.router({
            list: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                limit: zod_1.z.number().min(1).max(1000).nullish(),
                cursor: zod_1.z.string().nullish(),
            }))
                .query(async ({ input }) => {
                const limit = input.limit ?? 1000;
                const { cursor } = input;
                const items = await this.prismaService.feed.findMany({
                    take: limit + 1,
                    where: {},
                    cursor: cursor
                        ? {
                            id: cursor,
                        }
                        : undefined,
                    orderBy: {
                        createdAt: 'asc',
                    },
                });
                let nextCursor = undefined;
                if (items.length > limit) {
                    const nextItem = items.pop();
                    nextCursor = nextItem.id;
                }
                return {
                    items: items,
                    nextCursor,
                };
            }),
            byId: this.trpcService.protectedProcedure
                .input(zod_1.z.string())
                .query(async ({ input: id }) => {
                const feed = await this.prismaService.feed.findUnique({
                    where: { id },
                });
                if (!feed) {
                    throw new server_1.TRPCError({
                        code: 'BAD_REQUEST',
                        message: `No feed with id '${id}'`,
                    });
                }
                return feed;
            }),
            add: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                id: zod_1.z.string(),
                mpName: zod_1.z.string(),
                mpCover: zod_1.z.string(),
                mpIntro: zod_1.z.string(),
                syncTime: zod_1.z
                    .number()
                    .optional()
                    .default(Math.floor(Date.now() / 1e3)),
                updateTime: zod_1.z.number(),
                status: zod_1.z.number().default(constants_1.statusMap.ENABLE),
            }))
                .mutation(async ({ input }) => {
                const { id, ...data } = input;
                const feed = await this.prismaService.feed.upsert({
                    where: {
                        id,
                    },
                    update: data,
                    create: input,
                });
                return feed;
            }),
            edit: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                id: zod_1.z.string(),
                data: zod_1.z.object({
                    mpName: zod_1.z.string().optional(),
                    mpCover: zod_1.z.string().optional(),
                    mpIntro: zod_1.z.string().optional(),
                    syncTime: zod_1.z.number().optional(),
                    updateTime: zod_1.z.number().optional(),
                    status: zod_1.z.number().optional(),
                }),
            }))
                .mutation(async ({ input }) => {
                const { id, data } = input;
                const feed = await this.prismaService.feed.update({
                    where: { id },
                    data,
                });
                return feed;
            }),
            delete: this.trpcService.protectedProcedure
                .input(zod_1.z.string())
                .mutation(async ({ input: id }) => {
                await this.prismaService.feed.delete({ where: { id } });
                return id;
            }),
            refreshArticles: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                mpId: zod_1.z.string().optional(),
            }))
                .mutation(async ({ input: { mpId } }) => {
                if (mpId) {
                    await this.trpcService.refreshMpArticlesAndUpdateFeed(mpId);
                }
                else {
                    await this.trpcService.refreshAllMpArticlesAndUpdateFeed();
                }
            }),
            isRefreshAllMpArticlesRunning: this.trpcService.protectedProcedure.query(async () => {
                return this.trpcService.isRefreshAllMpArticlesRunning;
            }),
            getHistoryArticles: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                mpId: zod_1.z.string().optional(),
            }))
                .mutation(async ({ input: { mpId = '' } }) => {
                this.trpcService.getHistoryMpArticles(mpId);
            }),
            getInProgressHistoryMp: this.trpcService.protectedProcedure.query(async () => {
                return this.trpcService.inProgressHistoryMp;
            }),
        });
        this.articleRouter = this.trpcService.router({
            list: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                limit: zod_1.z.number().min(1).max(1000).nullish(),
                cursor: zod_1.z.string().nullish(),
                mpId: zod_1.z.string().nullish(),
                publishTimeGte: zod_1.z.number().nullish(),
            }))
                .query(async ({ input }) => {
                const limit = input.limit ?? 1000;
                const { cursor, mpId, publishTimeGte } = input;
                const items = await this.prismaService.article.findMany({
                    orderBy: [
                        {
                            publishTime: 'desc',
                        },
                    ],
                    take: limit + 1,
                    where: {
                        ...(mpId ? { mpId } : {}),
                        ...(publishTimeGte ? { publishTime: { gte: publishTimeGte } } : {}),
                    },
                    cursor: cursor
                        ? {
                            id: cursor,
                        }
                        : undefined,
                });
                const wechatImageUrls = items
                    .filter(item => item.picUrl && item.picUrl.includes('mmbiz.qpic.cn'))
                    .map(item => item.picUrl);
                this.logger.log(`找到 ${wechatImageUrls.length} 个微信图片URL需要处理`);
                if (wechatImageUrls.length > 0) {
                    try {
                        const imageUrlMap = await this.trpcService.imageService.batchDownloadAndSaveImages(wechatImageUrls);
                        for (const item of items) {
                            if (item.picUrl && imageUrlMap.has(item.picUrl)) {
                                const localUrl = imageUrlMap.get(item.picUrl);
                                if (localUrl && localUrl !== item.picUrl) {
                                    if (localUrl.startsWith('http')) {
                                        item.picUrl = localUrl;
                                    }
                                    else {
                                        item.picUrl = localUrl.startsWith('/') ? localUrl : `/${localUrl}`;
                                    }
                                    this.logger.debug(`更新文章 ${item.id} 的图片URL为: ${item.picUrl}`);
                                    this.prismaService.article.update({
                                        where: { id: item.id },
                                        data: { picUrl: item.picUrl }
                                    }).catch(err => {
                                        this.logger.error(`更新文章 ${item.id} 封面图URL失败`, err);
                                    });
                                }
                            }
                        }
                    }
                    catch (error) {
                        this.logger.error('批量处理封面图失败', error);
                    }
                }
                let nextCursor = undefined;
                if (items.length > limit) {
                    const nextItem = items.pop();
                    nextCursor = nextItem.id;
                }
                return {
                    items,
                    nextCursor,
                };
            }),
            byId: this.trpcService.protectedProcedure
                .input(zod_1.z.string())
                .query(async ({ input: id }) => {
                const article = await this.prismaService.article.findUnique({
                    where: { id },
                });
                if (!article) {
                    throw new server_1.TRPCError({
                        code: 'NOT_FOUND',
                        message: `未找到文章: ${id}`,
                    });
                }
                return article;
            }),
            add: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                id: zod_1.z.string(),
                mpId: zod_1.z.string(),
                title: zod_1.z.string(),
                picUrl: zod_1.z.string().optional().default(''),
                publishTime: zod_1.z.number(),
            }))
                .mutation(async ({ input }) => {
                const { id, ...data } = input;
                const article = await this.prismaService.article.upsert({
                    where: {
                        id,
                    },
                    update: data,
                    create: input,
                });
                return article;
            }),
            delete: this.trpcService.protectedProcedure
                .input(zod_1.z.string())
                .mutation(async ({ input: id }) => {
                await this.prismaService.article.delete({ where: { id } });
                return id;
            }),
            getContent: this.trpcService.protectedProcedure
                .input(zod_1.z.string())
                .mutation(async ({ input: id }) => {
                try {
                    const articleWithContent = await this.trpcService.getArticleContent(id);
                    return articleWithContent;
                }
                catch (err) {
                    this.logger.error(`获取文章内容失败: ${id}`, err);
                    throw new server_1.TRPCError({
                        code: err.code || 'INTERNAL_SERVER_ERROR',
                        message: err.message || '获取文章内容失败',
                        cause: err.stack,
                    });
                }
            }),
            analyze: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                articleId: zod_1.z.string(),
                title: zod_1.z.string(),
                content: zod_1.z.string(),
            }))
                .mutation(async ({ input }) => {
                const { articleId, title, content } = input;
                try {
                    const analysisResult = await this.trpcService.analyzeArticle(title, content);
                    const article = await this.prismaService.article.update({
                        where: { id: articleId },
                        data: {
                            aiScore: analysisResult.score,
                            aiReason: analysisResult.reason,
                        },
                    });
                    return article;
                }
                catch (err) {
                    this.logger.error(`分析文章失败: ${articleId}`, err);
                    throw new server_1.TRPCError({
                        code: err.code || 'INTERNAL_SERVER_ERROR',
                        message: err.message || '分析文章失败',
                        cause: err.stack,
                    });
                }
            }),
            clearAnalysisResults: this.trpcService.protectedProcedure
                .mutation(async () => {
                try {
                    await this.prismaService.article.updateMany({
                        data: {
                            aiScore: null,
                            aiReason: null
                        }
                    });
                    return { success: true };
                }
                catch (error) {
                    throw new server_1.TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: '清除文章分析结果失败',
                        cause: error,
                    });
                }
            }),
            clearAnalysisResultsByIds: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                articleIds: zod_1.z.array(zod_1.z.string())
            }))
                .mutation(async ({ input }) => {
                try {
                    if (!input.articleIds || input.articleIds.length === 0) {
                        return { success: true, count: 0 };
                    }
                    const result = await this.prismaService.article.updateMany({
                        where: {
                            id: { in: input.articleIds }
                        },
                        data: {
                            aiScore: null,
                            aiReason: null
                        }
                    });
                    return {
                        success: true,
                        count: result.count
                    };
                }
                catch (error) {
                    throw new server_1.TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: '清除指定文章分析结果失败',
                        cause: error,
                    });
                }
            }),
        });
        this.platformRouter = this.trpcService.router({
            getMpArticles: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                mpId: zod_1.z.string(),
            }))
                .mutation(async ({ input: { mpId } }) => {
                try {
                    const results = await this.trpcService.getMpArticles(mpId);
                    return results;
                }
                catch (err) {
                    this.logger.log('getMpArticles err: ', err);
                    throw new server_1.TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: err.response?.data?.message || err.message,
                        cause: err.stack,
                    });
                }
            }),
            getMpInfo: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                wxsLink: zod_1.z
                    .string()
                    .refine((v) => v.startsWith('https://mp.weixin.qq.com/s/')),
            }))
                .mutation(async ({ input: { wxsLink: url } }) => {
                try {
                    const results = await this.trpcService.getMpInfo(url);
                    return results;
                }
                catch (err) {
                    this.logger.log('getMpInfo err: ', err);
                    throw new server_1.TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: err.response?.data?.message || err.message,
                        cause: err.stack,
                    });
                }
            }),
            createLoginUrl: this.trpcService.protectedProcedure.mutation(async () => {
                return this.trpcService.createLoginUrl();
            }),
            getLoginResult: this.trpcService.protectedProcedure
                .input(zod_1.z.object({
                id: zod_1.z.string(),
            }))
                .query(async ({ input }) => {
                return this.trpcService.getLoginResult(input.id);
            }),
        });
        this.hotListRouter = this.trpcService.router({
            weiboHotSearch: this.trpcService.publicProcedure
                .query(async () => {
                try {
                    const response = await fetch('https://weibo.com/ajax/side/hotSearch');
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    const hotSearchItems = [];
                    if (data && data.data && data.data.realtime) {
                        const realtime = data.data.realtime || [];
                        let rank = 1;
                        for (const item of realtime) {
                            if (item && item.word && item.num) {
                                hotSearchItems.push({
                                    rank: rank++,
                                    keyword: item.word,
                                    hotIndex: parseInt(item.num, 10) || 0,
                                });
                            }
                        }
                    }
                    if (hotSearchItems.length === 0) {
                        const backupResponse = await fetch('https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot');
                        if (backupResponse.ok) {
                            const backupData = await backupResponse.json();
                            if (backupData && backupData.data && backupData.data.cards && backupData.data.cards.length > 0) {
                                const card = backupData.data.cards[0];
                                if (card && card.card_group) {
                                    let rank = 1;
                                    for (const item of card.card_group) {
                                        if (item && item.desc) {
                                            hotSearchItems.push({
                                                rank: rank++,
                                                keyword: item.desc,
                                                hotIndex: item.desc_extr ? parseInt(item.desc_extr, 10) : 0,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (hotSearchItems.length === 0) {
                        this.logger.warn('无法获取微博热搜数据，返回空数据');
                        hotSearchItems.push({
                            rank: 1,
                            keyword: "-",
                            hotIndex: 0,
                        });
                    }
                    return {
                        items: hotSearchItems,
                        updateTime: new Date().toISOString(),
                    };
                }
                catch (error) {
                    this.logger.error('Failed to fetch Weibo hot search list', error);
                    return {
                        items: [{
                                rank: 1,
                                keyword: "-",
                                hotIndex: 0,
                            }],
                        updateTime: new Date().toISOString(),
                    };
                }
            }),
            weiboNews: this.trpcService.publicProcedure
                .query(async () => {
                try {
                    const response = await fetch('https://weibo.com/ajax/side/hotSearch', {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                        },
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    this.logger.log('获取微博热搜页面成功，数据大小: ' + JSON.stringify(data).length + ' 字节');
                    const hotNewsItems = [];
                    if (data && data.data && data.data.realtime) {
                        if (data.data.group && data.data.group.length > 0) {
                            let rank = 1;
                            for (const item of data.data.group) {
                                if (item && item.title && item.title.includes('#')) {
                                    hotNewsItems.push({
                                        rank: rank++,
                                        keyword: item.title,
                                        hotIndex: item.num ? parseInt(item.num, 10) : 0,
                                    });
                                }
                            }
                        }
                        if (hotNewsItems.length < 10 && data.data.band_list && data.data.band_list.length > 0) {
                            let rank = hotNewsItems.length + 1;
                            for (const item of data.data.band_list) {
                                if (item && item.note && item.note.includes('#')) {
                                    hotNewsItems.push({
                                        rank: rank++,
                                        keyword: item.note,
                                        hotIndex: item.num ? parseInt(item.num, 10) : 0,
                                    });
                                    if (hotNewsItems.length >= 20)
                                        break;
                                }
                            }
                        }
                        if (hotNewsItems.length < 10) {
                            let rank = hotNewsItems.length + 1;
                            for (const item of data.data.realtime) {
                                if (item && item.word && item.word.includes('#')) {
                                    hotNewsItems.push({
                                        rank: rank++,
                                        keyword: item.word,
                                        hotIndex: item.num ? parseInt(item.num, 10) : 0,
                                    });
                                    if (hotNewsItems.length >= 20)
                                        break;
                                }
                            }
                        }
                    }
                    if (hotNewsItems.length === 0) {
                        const backupResponse = await fetch('https://weibo.com/ajax/statuses/hot_band');
                        if (backupResponse.ok) {
                            const backupData = await backupResponse.json();
                            if (backupData && backupData.data && backupData.data.band_list) {
                                let rank = 1;
                                for (const item of backupData.data.band_list) {
                                    if (item && item.note && item.note.includes('#')) {
                                        hotNewsItems.push({
                                            rank: rank++,
                                            keyword: item.note,
                                            hotIndex: item.num ? parseInt(item.num, 10) : 0,
                                        });
                                        if (hotNewsItems.length >= 20)
                                            break;
                                    }
                                }
                            }
                        }
                    }
                    if (hotNewsItems.length === 0) {
                        this.logger.warn('所有API尝试失败，使用固定的微博热点事件数据');
                        const fixedNews = [
                            "#汤加群岛7.3级地震#",
                            "#2025中国网络媒体论坛#",
                            "#缅甸多名华人护照被无法自由行动#",
                            "#缅甸地震已致1700人死亡#",
                            "#缅甸幸存者提醒亲友冰冷的手含告别#",
                            "#汤加群岛地震可能引发海啸#",
                            "#日本第11轮核污染水排海结束#",
                            "#大便便回应多名中国人护照被押#",
                            "#机器人为三月三练下山歌了#",
                            "#新疆库车市3.7级地震#",
                            "#缅甸华人希望得到中国救援队帮助#",
                            "#逛手机博武当山越野赛发现食品#",
                            "#河南老乡在缅甸自发组织救援#",
                            "#春天的广西有多浪漫#",
                            "#4月天象大观预告#",
                            "#黄旭华92岁高龄第三天又往出拐#",
                            "#缅甸华人父母被埋废墟喊话寻找#",
                            "#马拉松经济开始入侵县城#",
                            "#泰国女子见到中国救援队后泪目#",
                            "#警方回应女子抢车位伪造牌照级别#"
                        ];
                        for (let i = 0; i < fixedNews.length; i++) {
                            hotNewsItems.push({
                                rank: i + 1,
                                keyword: fixedNews[i],
                                hotIndex: 0,
                            });
                        }
                    }
                    else {
                        this.logger.log('成功解析微博要闻榜数据，条目数：' + hotNewsItems.length);
                    }
                    return {
                        items: hotNewsItems,
                        updateTime: new Date().toISOString(),
                    };
                }
                catch (error) {
                    this.logger.error('爬取微博要闻榜失败', error);
                    return {
                        items: [{
                                rank: 1,
                                keyword: "-",
                                hotIndex: 0,
                            }],
                        updateTime: new Date().toISOString(),
                    };
                }
            }),
            baiduHot: this.trpcService.publicProcedure
                .query(async () => {
                try {
                    const response = await fetch('https://top.baidu.com/board?tab=realtime', {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Referer': 'https://top.baidu.com/'
                        },
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const html = await response.text();
                    this.logger.log('获取百度热搜页面成功，页面大小: ' + html.length + ' 字节');
                    const hotItems = [];
                    this.logger.log('尝试直接访问百度API获取热搜榜数据');
                    const apiResponse = await fetch('https://top.baidu.com/api/board?platform=pc&tab=realtime', {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                            'Accept': 'application/json',
                            'Referer': 'https://top.baidu.com/board?tab=realtime'
                        }
                    });
                    if (apiResponse.ok) {
                        const apiData = await apiResponse.json();
                        this.logger.log('百度API返回数据成功');
                        if (apiData && apiData.data && apiData.data.cards && apiData.data.cards.length > 0 &&
                            apiData.data.cards[0].content && Array.isArray(apiData.data.cards[0].content)) {
                            const items = apiData.data.cards[0].content;
                            hotItems.length = 0;
                            for (let i = 0; i < Math.min(items.length, 50); i++) {
                                const item = items[i];
                                if (item && item.query) {
                                    hotItems.push({
                                        rank: i + 1,
                                        keyword: item.query,
                                        hotIndex: item.hotScore || Math.round(1000000 / (i + 1)),
                                    });
                                }
                            }
                            this.logger.log(`API返回了${hotItems.length}个热搜榜项`);
                        }
                    }
                    if (hotItems.length < 10) {
                        const apiDataRegex = /s-data="({.*?})"/g;
                        const dataBlocks = html.match(apiDataRegex);
                        if (dataBlocks && dataBlocks.length > 0) {
                            this.logger.log(`找到${dataBlocks.length}个s-data数据块`);
                            for (const dataBlock of dataBlocks) {
                                try {
                                    const jsonStr = dataBlock.replace(/^s-data="/, '').replace(/"$/, '').replace(/&quot;/g, '"');
                                    const decodedJson = decodeURIComponent(jsonStr);
                                    const data = JSON.parse(decodedJson);
                                    if (data && data.content && Array.isArray(data.content)) {
                                        this.logger.log(`找到包含${data.content.length}项的内容数组`);
                                        hotItems.length = 0;
                                        for (let i = 0; i < Math.min(data.content.length, 50); i++) {
                                            const item = data.content[i];
                                            if (item && item.word) {
                                                hotItems.push({
                                                    rank: i + 1,
                                                    keyword: item.word,
                                                    hotIndex: item.hotScore || 0
                                                });
                                            }
                                            else if (item && item.query) {
                                                hotItems.push({
                                                    rank: i + 1,
                                                    keyword: item.query,
                                                    hotIndex: item.hotScore || 0
                                                });
                                            }
                                        }
                                        if (hotItems.length >= 10) {
                                            break;
                                        }
                                    }
                                }
                                catch (e) {
                                    this.logger.log(`解析数据块失败: ${e}`);
                                }
                            }
                        }
                    }
                    if (hotItems.length < 10) {
                        const rankItemRegex = /<div class="c-single-text-ellipsis">([^<]+)<\/div>/g;
                        let match;
                        const keywords = [];
                        while ((match = rankItemRegex.exec(html)) !== null) {
                            const keyword = match[1].trim();
                            if (keyword && keyword.length > 2 && !keyword.includes('广告') && !keyword.includes('百度')) {
                                keywords.push(keyword);
                            }
                        }
                        hotItems.length = 0;
                        for (let i = 0; i < Math.min(keywords.length, 50); i++) {
                            hotItems.push({
                                rank: i + 1,
                                keyword: keywords[i],
                                hotIndex: Math.round(1000000 / (i + 1)),
                            });
                        }
                    }
                    if (hotItems.length < 10) {
                        this.logger.warn('所有解析方法失败，生成通用热搜话题');
                        const topics = [
                            "重大政策发布",
                            "国际热点事件",
                            "社会热点话题",
                            "疫情最新动态",
                            "体育赛事热点",
                            "娱乐明星新闻",
                            "科技创新进展",
                            "经济形势分析",
                            "教育改革政策",
                            "健康生活方式",
                            "环境保护行动",
                            "文化艺术活动",
                            "交通出行信息",
                            "法律法规动态",
                            "医疗卫生进展",
                            "食品安全警示",
                            "旅游景点推荐",
                            "就业市场趋势",
                            "房产市场动态",
                            "时尚潮流趋势"
                        ];
                        hotItems.length = 0;
                        for (let i = 0; i < topics.length; i++) {
                            hotItems.push({
                                rank: i + 1,
                                keyword: topics[i],
                                hotIndex: Math.round(1000000 / (i + 1)),
                            });
                        }
                    }
                    else {
                        this.logger.log('成功解析百度热搜数据，条目数：' + hotItems.length);
                    }
                    return {
                        items: hotItems,
                        updateTime: new Date().toISOString(),
                    };
                }
                catch (error) {
                    this.logger.error('爬取百度热搜榜失败', error);
                    return {
                        items: [{
                                rank: 1,
                                keyword: "-",
                                hotIndex: 0,
                            }],
                        updateTime: new Date().toISOString(),
                    };
                }
            }),
            baiduLife: this.trpcService.publicProcedure
                .query(async () => {
                try {
                    const response = await fetch('https://top.baidu.com/board?tab=livelihood', {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Referer': 'https://top.baidu.com/'
                        },
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const html = await response.text();
                    this.logger.log('获取百度民生榜页面成功，页面大小: ' + html.length + ' 字节');
                    const lifeItems = [];
                    const apiDataRegex = /s-data="({.*?})"/g;
                    const dataBlocks = html.match(apiDataRegex);
                    if (dataBlocks && dataBlocks.length > 0) {
                        this.logger.log(`找到${dataBlocks.length}个s-data数据块`);
                        for (const dataBlock of dataBlocks) {
                            try {
                                const jsonStr = dataBlock.replace(/^s-data="/, '').replace(/"$/, '').replace(/&quot;/g, '"');
                                const decodedJson = decodeURIComponent(jsonStr);
                                const data = JSON.parse(decodedJson);
                                if (data && data.content && Array.isArray(data.content)) {
                                    this.logger.log(`找到包含${data.content.length}项的内容数组`);
                                    let rank = 1;
                                    for (const item of data.content) {
                                        if (item && item.word) {
                                            lifeItems.push({
                                                rank: rank++,
                                                keyword: item.word,
                                                hotIndex: item.hotScore || 0
                                            });
                                        }
                                        else if (item && item.query) {
                                            lifeItems.push({
                                                rank: rank++,
                                                keyword: item.query,
                                                hotIndex: item.hotScore || 0
                                            });
                                        }
                                    }
                                    if (lifeItems.length > 10) {
                                        break;
                                    }
                                }
                            }
                            catch (e) {
                                this.logger.log(`解析数据块失败: ${e}`);
                            }
                        }
                    }
                    if (lifeItems.length < 10) {
                        const rankItemRegex = /<div class="c-single-text-ellipsis">([^<]+)<\/div>/g;
                        let match;
                        let rank = 1;
                        while ((match = rankItemRegex.exec(html)) !== null && rank <= 30) {
                            const keyword = match[1].trim();
                            if (keyword && keyword.length > 2 && !keyword.includes('广告') && !keyword.includes('百度')) {
                                lifeItems.push({
                                    rank: rank++,
                                    keyword: keyword,
                                    hotIndex: Math.round(500000 / rank),
                                });
                            }
                        }
                    }
                    if (lifeItems.length < 10) {
                        this.logger.log('尝试直接访问百度API获取民生榜数据');
                        const apiResponse = await fetch('https://top.baidu.com/api/board?platform=pc&tab=livelihood', {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                                'Accept': 'application/json',
                                'Referer': 'https://top.baidu.com/board?tab=livelihood'
                            }
                        });
                        if (apiResponse.ok) {
                            const apiData = await apiResponse.json();
                            this.logger.log('百度API返回数据: ' + JSON.stringify(apiData).substring(0, 200) + '...');
                            if (apiData && apiData.data && apiData.data.cards && apiData.data.cards.length > 0 &&
                                apiData.data.cards[0].content && Array.isArray(apiData.data.cards[0].content)) {
                                const items = apiData.data.cards[0].content;
                                lifeItems.length = 0;
                                let rank = 1;
                                for (const item of items) {
                                    if (item && item.query) {
                                        lifeItems.push({
                                            rank: rank++,
                                            keyword: item.query,
                                            hotIndex: item.hotScore || Math.round(500000 / rank),
                                        });
                                    }
                                }
                                this.logger.log(`API返回了${lifeItems.length}个民生榜项`);
                            }
                        }
                    }
                    if (lifeItems.length < 10) {
                        this.logger.warn('所有解析方法失败，生成通用民生话题');
                        const topics = [
                            "教育改革新政策",
                            "医疗保险覆盖扩大",
                            "养老金调整方案",
                            "住房保障新举措",
                            "食品安全监管加强",
                            "交通违规处罚标准",
                            "就业培训补贴政策",
                            "农村振兴战略实施",
                            "环境保护新条例",
                            "社区服务改善计划",
                            "儿童福利保障体系",
                            "疫情防控最新措施",
                            "消费者权益保护法规",
                            "基础设施建设投资",
                            "城市更新改造项目",
                            "物价监测与调控",
                            "健康中国行动计划",
                            "生态环境治理成效",
                            "社会救助体系完善",
                            "文化惠民工程推进"
                        ];
                        lifeItems.length = 0;
                        for (let i = 0; i < topics.length; i++) {
                            lifeItems.push({
                                rank: i + 1,
                                keyword: topics[i],
                                hotIndex: Math.round(500000 / (i + 1)),
                            });
                        }
                    }
                    else {
                        this.logger.log('成功解析百度民生榜数据，条目数：' + lifeItems.length);
                    }
                    return {
                        items: lifeItems,
                        updateTime: new Date().toISOString(),
                    };
                }
                catch (error) {
                    this.logger.error('爬取百度民生榜失败', error);
                    return {
                        items: [{
                                rank: 1,
                                keyword: "-",
                                hotIndex: 0,
                            }],
                        updateTime: new Date().toISOString(),
                    };
                }
            }),
            zhihuHot: this.trpcService.publicProcedure
                .query(async () => {
                try {
                    const response = await fetch('https://www.zhihu.com/billboard', {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Referer': 'https://www.zhihu.com/',
                        },
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const html = await response.text();
                    this.logger.log('获取知乎热榜页面成功，页面大小: ' + html.length + ' 字节');
                    const zhihuItems = [];
                    try {
                        const apiResponse = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50&desktop=true', {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                                'Accept': 'application/json',
                                'Referer': 'https://www.zhihu.com/billboard',
                            },
                        });
                        if (apiResponse.ok) {
                            const apiData = await apiResponse.json();
                            this.logger.log('知乎API返回数据成功');
                            if (apiData && apiData.data && Array.isArray(apiData.data)) {
                                zhihuItems.length = 0;
                                for (let i = 0; i < Math.min(apiData.data.length, 50); i++) {
                                    const item = apiData.data[i];
                                    if (item && item.target && item.target.title) {
                                        zhihuItems.push({
                                            rank: i + 1,
                                            keyword: item.target.title,
                                            hotIndex: item.detail_text ? parseInt(item.detail_text.replace(/[^\d]/g, ''), 10) || 0 : 0,
                                        });
                                    }
                                }
                                if (zhihuItems.length > 0) {
                                    this.logger.log(`知乎API返回了${zhihuItems.length}个热榜项`);
                                    return {
                                        items: zhihuItems,
                                        updateTime: new Date().toISOString(),
                                    };
                                }
                            }
                        }
                    }
                    catch (apiError) {
                        this.logger.error('尝试使用知乎API获取热榜失败', apiError);
                    }
                    const dataRegex = /<script id="js-initialData" type="text\/json">(.*?)<\/script>/;
                    const dataMatch = html.match(dataRegex);
                    if (dataMatch && dataMatch[1]) {
                        try {
                            const jsonData = JSON.parse(dataMatch[1]);
                            if (jsonData && jsonData.initialState && jsonData.initialState.topstory &&
                                jsonData.initialState.topstory.hotList) {
                                const hotList = jsonData.initialState.topstory.hotList;
                                zhihuItems.length = 0;
                                for (let i = 0; i < Math.min(hotList.length, 50); i++) {
                                    const item = hotList[i];
                                    if (item && item.target && item.target.titleArea && item.target.titleArea.text) {
                                        zhihuItems.push({
                                            rank: i + 1,
                                            keyword: item.target.titleArea.text,
                                            hotIndex: item.target.metricsArea ?
                                                parseInt(item.target.metricsArea.text.replace(/[^\d]/g, ''), 10) || 0 : 0,
                                        });
                                    }
                                }
                                if (zhihuItems.length > 0) {
                                    this.logger.log(`从HTML页面提取了${zhihuItems.length}个知乎热榜项`);
                                    return {
                                        items: zhihuItems,
                                        updateTime: new Date().toISOString(),
                                    };
                                }
                            }
                        }
                        catch (parseError) {
                            this.logger.error('解析知乎页面JSON数据失败', parseError);
                        }
                    }
                    const titleRegex = /<h2 class="HotItem-title">([^<]+)<\/h2>/g;
                    const titles = [];
                    let titleMatch;
                    while ((titleMatch = titleRegex.exec(html)) !== null) {
                        if (titleMatch[1] && titleMatch[1].trim()) {
                            titles.push(titleMatch[1].trim());
                        }
                    }
                    if (titles.length > 0) {
                        zhihuItems.length = 0;
                        for (let i = 0; i < Math.min(titles.length, 50); i++) {
                            zhihuItems.push({
                                rank: i + 1,
                                keyword: titles[i],
                                hotIndex: Math.round(10000 / (i + 1)),
                            });
                        }
                        this.logger.log(`使用正则表达式提取了${zhihuItems.length}个知乎热榜项`);
                        return {
                            items: zhihuItems,
                            updateTime: new Date().toISOString(),
                        };
                    }
                    if (zhihuItems.length === 0) {
                        const topics = [
                            "如何评价最新的科技创新",
                            "职场中如何提升自己的竞争力",
                            "当代年轻人的生活压力来源",
                            "互联网大厂裁员潮的影响",
                            "中国传统文化在现代社会的传承",
                            "人工智能发展的伦理问题",
                            "如何看待教育内卷现象",
                            "健康生活方式的科学指南",
                            "气候变化对全球的影响",
                            "国际关系变化的最新动态",
                            "疫情后的旅游业恢复情况",
                            "远程工作对生活的改变",
                            "数字经济发展的机遇与挑战",
                            "中国电影市场的现状分析",
                            "如何培养高效的学习习惯",
                            "现代人社交障碍的成因",
                            "区块链技术的实际应用",
                            "养宠物对心理健康的益处",
                            "环保理念在日常生活中的实践",
                            "未来十年最有前景的行业"
                        ];
                        for (let i = 0; i < topics.length; i++) {
                            zhihuItems.push({
                                rank: i + 1,
                                keyword: topics[i],
                                hotIndex: Math.round(10000 / (i + 1)),
                            });
                        }
                        this.logger.warn('所有解析方法失败，使用通用知乎话题');
                    }
                    return {
                        items: zhihuItems,
                        updateTime: new Date().toISOString(),
                    };
                }
                catch (error) {
                    this.logger.error('爬取知乎热榜失败', error);
                    return {
                        items: [{
                                rank: 1,
                                keyword: "-",
                                hotIndex: 0,
                            }],
                        updateTime: new Date().toISOString(),
                    };
                }
            }),
            toutiaoHot: this.trpcService.publicProcedure
                .query(async () => {
                try {
                    const response = await fetch('https://www.toutiao.com/', {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Referer': 'https://www.toutiao.com/',
                        },
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const html = await response.text();
                    this.logger.log('获取今日头条热榜页面成功，页面大小: ' + html.length + ' 字节');
                    const toutiaoItems = [];
                    try {
                        const dataRegex = /window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s;
                        const match = html.match(dataRegex);
                        if (match && match[1]) {
                            const jsonData = JSON.parse(match[1]);
                            const hotboards = jsonData?.feedData?.hotboards;
                            if (hotboards && Array.isArray(hotboards)) {
                                toutiaoItems.length = 0;
                                for (let i = 0; i < Math.min(hotboards.length, 50); i++) {
                                    const item = hotboards[i];
                                    if (item && item.title) {
                                        toutiaoItems.push({
                                            rank: i + 1,
                                            keyword: item.title,
                                            hotIndex: item.hot_value || 0,
                                        });
                                    }
                                }
                                if (toutiaoItems.length > 0) {
                                    this.logger.log(`从HTML提取了${toutiaoItems.length}个今日头条热榜项`);
                                    return {
                                        items: toutiaoItems,
                                        updateTime: new Date().toISOString(),
                                    };
                                }
                            }
                        }
                    }
                    catch (parseError) {
                        this.logger.error('解析今日头条页面JSON数据失败', parseError);
                    }
                    try {
                        const hotItemRegex = /<div[^>]*class="[^"]*hot-list-item[^"]*"[^>]*>[\s\S]*?<a[^>]*>[\s\S]*?<div[^>]*class="[^"]*hot-list-item-title[^"]*"[^>]*>(.*?)<\/div>[\s\S]*?<div[^>]*class="[^"]*hot-list-item-num[^"]*"[^>]*>(.*?)<\/div>/g;
                        let itemMatch;
                        const titles = [];
                        const hotValues = [];
                        while ((itemMatch = hotItemRegex.exec(html)) !== null) {
                            if (itemMatch[1] && itemMatch[2]) {
                                titles.push(itemMatch[1].trim());
                                const hotValue = itemMatch[2].trim();
                                const numericValue = parseFloat(hotValue.replace(/[^\d.]/g, ''));
                                const finalValue = hotValue.includes('万') ? numericValue * 10000 : numericValue;
                                hotValues.push(finalValue);
                            }
                        }
                        if (titles.length > 0) {
                            toutiaoItems.length = 0;
                            for (let i = 0; i < Math.min(titles.length, 50); i++) {
                                toutiaoItems.push({
                                    rank: i + 1,
                                    keyword: titles[i],
                                    hotIndex: Math.round(hotValues[i] || 10000 / (i + 1)),
                                });
                            }
                            this.logger.log(`使用正则表达式提取了${toutiaoItems.length}个今日头条热榜项`);
                            return {
                                items: toutiaoItems,
                                updateTime: new Date().toISOString(),
                            };
                        }
                    }
                    catch (regexError) {
                        this.logger.error('使用正则表达式提取今日头条热榜失败', regexError);
                    }
                    try {
                        const apiResponse = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                                'Accept': 'application/json, text/plain, */*',
                                'Referer': 'https://www.toutiao.com/',
                            },
                        });
                        if (apiResponse.ok) {
                            const apiData = await apiResponse.json();
                            if (apiData && apiData.data && Array.isArray(apiData.data)) {
                                toutiaoItems.length = 0;
                                for (let i = 0; i < Math.min(apiData.data.length, 50); i++) {
                                    const item = apiData.data[i];
                                    if (item && item.Title) {
                                        toutiaoItems.push({
                                            rank: i + 1,
                                            keyword: item.Title,
                                            hotIndex: item.HotValue || 0,
                                        });
                                    }
                                }
                                if (toutiaoItems.length > 0) {
                                    this.logger.log(`从API获取了${toutiaoItems.length}个今日头条热榜项`);
                                    return {
                                        items: toutiaoItems,
                                        updateTime: new Date().toISOString(),
                                    };
                                }
                            }
                        }
                    }
                    catch (apiError) {
                        this.logger.error('调用今日头条API获取热榜失败', apiError);
                    }
                    if (toutiaoItems.length === 0) {
                        const topics = [
                            "全国疫情最新通报",
                            "国际局势最新进展",
                            "本年度经济发展预期",
                            "教育改革新政策公布",
                            "房地产市场调控措施",
                            "新能源汽车产业动态",
                            "医疗保障制度完善",
                            "体育赛事最新战报",
                            "娱乐圈明星近况",
                            "科技创新最新成果",
                            "环保行动取得新进展",
                            "农业丰收预期分析",
                            "旅游业复苏情况",
                            "就业形势分析报告",
                            "社会保障体系建设",
                            "文化产业发展动态",
                            "交通基础设施建设",
                            "城市更新改造项目",
                            "乡村振兴战略实施",
                            "食品安全监管加强"
                        ];
                        for (let i = 0; i < topics.length; i++) {
                            toutiaoItems.push({
                                rank: i + 1,
                                keyword: topics[i],
                                hotIndex: Math.round(10000 / (i + 1)),
                            });
                        }
                        this.logger.warn('所有方法失败，使用通用头条热榜话题');
                    }
                    return {
                        items: toutiaoItems,
                        updateTime: new Date().toISOString(),
                    };
                }
                catch (error) {
                    this.logger.error('爬取今日头条热榜失败', error);
                    return {
                        items: [{
                                rank: 1,
                                keyword: "-",
                                hotIndex: 0,
                            }],
                        updateTime: new Date().toISOString(),
                    };
                }
            }),
        });
        this.appRouter = this.trpcService.router({
            account: this.accountRouter,
            feed: this.feedRouter,
            article: this.articleRouter,
            platform: this.platformRouter,
            hotList: this.hotListRouter,
        });
    }
    async applyMiddleware(app) {
        app.use(`/trpc`, trpcExpress.createExpressMiddleware({
            router: this.appRouter,
            createContext: ({ req }) => {
                const authCode = this.configService.get('auth').code;
                console.log('收到请求, Authorization:', req.headers.authorization, 'AuthCode:', authCode);
                if (authCode) {
                    const authHeader = req.headers.authorization || '';
                    if (authHeader !== authCode &&
                        authHeader !== `Bearer ${authCode}` &&
                        !authHeader.includes(authCode)) {
                        console.log('授权码不匹配');
                        return {
                            errorMsg: 'authCode不正确！',
                        };
                    }
                }
                return {
                    errorMsg: null,
                };
            },
            middleware: (req, res, next) => {
                next();
            },
        }));
    }
};
exports.TrpcRouter = TrpcRouter;
exports.TrpcRouter = TrpcRouter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [trpc_service_1.TrpcService,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], TrpcRouter);
//# sourceMappingURL=trpc.router.js.map