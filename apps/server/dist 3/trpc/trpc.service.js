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
exports.TrpcService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const constants_1 = require("../constants");
const prisma_service_1 = require("../prisma/prisma.service");
const server_1 = require("@trpc/server");
const axios_1 = __importDefault(require("axios"));
const dayjs_1 = __importDefault(require("dayjs"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const crawler_1 = require("../utils/crawler");
const image_service_1 = require("../utils/image.service");
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
const blockedAccountsMap = new Map();
let TrpcService = class TrpcService {
    constructor(prismaService, configService, imageService) {
        this.prismaService = prismaService;
        this.configService = configService;
        this.imageService = imageService;
        this.trpc = server_1.initTRPC.create();
        this.publicProcedure = this.trpc.procedure;
        this.protectedProcedure = this.trpc.procedure.use(({ ctx, next }) => {
            const errorMsg = ctx.errorMsg;
            if (errorMsg) {
                throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: errorMsg });
            }
            return next({ ctx });
        });
        this.router = this.trpc.router;
        this.mergeRouters = this.trpc.mergeRouters;
        this.updateDelayTime = 60;
        this.logger = new common_1.Logger(this.constructor.name);
        this.removeBlockedAccount = (vid) => {
            const today = this.getTodayDate();
            const blockedAccounts = blockedAccountsMap.get(today);
            if (Array.isArray(blockedAccounts)) {
                const newBlockedAccounts = blockedAccounts.filter((id) => id !== vid);
                blockedAccountsMap.set(today, newBlockedAccounts);
            }
        };
        this.inProgressHistoryMp = {
            id: '',
            page: 1,
        };
        this.isRefreshAllMpArticlesRunning = false;
        const { url } = this.configService.get('platform');
        this.updateDelayTime =
            this.configService.get('feed').updateDelayTime;
        this.request = axios_1.default.create({ baseURL: url, timeout: 15 * 1e3 });
        this.articleCrawler = new crawler_1.ArticleCrawler(this.imageService);
        this.request.interceptors.response.use((response) => {
            return response;
        }, async (error) => {
            this.logger.log('error: ', error);
            const errMsg = error.response?.data?.message || '';
            const id = error.config.headers.xid;
            if (errMsg.includes('WeReadError401')) {
                await this.prismaService.account.update({
                    where: { id },
                    data: { status: constants_1.statusMap.INVALID },
                });
                this.logger.error(`账号（${id}）登录失效，已禁用`);
            }
            else if (errMsg.includes('WeReadError429')) {
                this.logger.error(`账号（${id}）请求频繁，打入小黑屋`);
            }
            const today = this.getTodayDate();
            const blockedAccounts = blockedAccountsMap.get(today);
            if (Array.isArray(blockedAccounts)) {
                if (id) {
                    blockedAccounts.push(id);
                }
                blockedAccountsMap.set(today, blockedAccounts);
            }
            else if (errMsg.includes('WeReadError400')) {
                this.logger.error(`账号（${id}）处理请求参数出错`);
                this.logger.error('WeReadError400: ', errMsg);
                await new Promise((resolve) => setTimeout(resolve, 10 * 1e3));
            }
            else {
                this.logger.error("Can't handle this error: ", errMsg);
            }
            return Promise.reject(error);
        });
    }
    getTodayDate() {
        return dayjs_1.default.tz(new Date(), 'Asia/Shanghai').format('YYYY-MM-DD');
    }
    getBlockedAccountIds() {
        const today = this.getTodayDate();
        const disabledAccounts = blockedAccountsMap.get(today) || [];
        this.logger.debug('disabledAccounts: ', disabledAccounts);
        return disabledAccounts.filter(Boolean);
    }
    async getAvailableAccount() {
        const disabledAccounts = this.getBlockedAccountIds();
        const account = await this.prismaService.account.findMany({
            where: {
                status: constants_1.statusMap.ENABLE,
                NOT: {
                    id: { in: disabledAccounts },
                },
            },
            take: 10,
        });
        if (!account || account.length === 0) {
            throw new Error('暂无可用读书账号!');
        }
        return account[Math.floor(Math.random() * account.length)];
    }
    async getMpArticles(mpId, page = 1, retryCount = 3) {
        const account = await this.getAvailableAccount();
        try {
            const res = await this.request
                .get(`/api/v2/platform/mps/${mpId}/articles`, {
                headers: {
                    xid: account.id,
                    Authorization: `Bearer ${account.token}`,
                },
                params: {
                    page,
                },
            })
                .then((res) => res.data)
                .then((res) => {
                this.logger.log(`getMpArticles(${mpId}) page: ${page} articles: ${res.length}`);
                return res;
            });
            return res;
        }
        catch (err) {
            this.logger.error(`retry(${4 - retryCount}) getMpArticles  error: `, err);
            if (retryCount > 0) {
                return this.getMpArticles(mpId, page, retryCount - 1);
            }
            else {
                throw err;
            }
        }
    }
    async refreshMpArticlesAndUpdateFeed(mpId, page = 1) {
        const articles = await this.getMpArticles(mpId, page);
        if (articles.length > 0) {
            let results;
            const { type } = this.configService.get('database');
            if (type === 'sqlite') {
                const inserts = articles.map(({ id, picUrl, publishTime, title }) => this.prismaService.article.upsert({
                    create: { id, mpId, picUrl, publishTime, title },
                    update: {
                        publishTime,
                        title,
                    },
                    where: { id },
                }));
                results = await this.prismaService.$transaction(inserts);
            }
            else {
                const createQueries = articles.map(({ id, picUrl, publishTime, title }) => this.prismaService.article.upsert({
                    where: { id },
                    create: {
                        id,
                        mpId,
                        picUrl,
                        publishTime,
                        title,
                    },
                    update: {}
                }));
                results = await this.prismaService.$transaction(createQueries);
            }
            this.logger.debug(`refreshMpArticlesAndUpdateFeed create results: ${JSON.stringify(results)}`);
        }
        const hasHistory = articles.length < constants_1.defaultCount ? 0 : 1;
        await this.prismaService.feed.update({
            where: { id: mpId },
            data: {
                syncTime: Math.floor(Date.now() / 1e3),
                hasHistory,
            },
        });
        return { hasHistory };
    }
    async getHistoryMpArticles(mpId) {
        if (this.inProgressHistoryMp.id === mpId) {
            this.logger.log(`getHistoryMpArticles(${mpId}) is running`);
            return;
        }
        this.inProgressHistoryMp = {
            id: mpId,
            page: 1,
        };
        if (!this.inProgressHistoryMp.id) {
            return;
        }
        try {
            const feed = await this.prismaService.feed.findFirstOrThrow({
                where: {
                    id: mpId,
                },
            });
            if (feed.hasHistory === 0) {
                this.logger.log(`getHistoryMpArticles(${mpId}) has no history`);
                return;
            }
            const total = await this.prismaService.article.count({
                where: {
                    mpId,
                },
            });
            this.inProgressHistoryMp.page = Math.ceil(total / constants_1.defaultCount);
            let i = 1e3;
            while (i-- > 0) {
                if (this.inProgressHistoryMp.id !== mpId) {
                    this.logger.log(`getHistoryMpArticles(${mpId}) is not running, break`);
                    break;
                }
                const { hasHistory } = await this.refreshMpArticlesAndUpdateFeed(mpId, this.inProgressHistoryMp.page);
                if (hasHistory < 1) {
                    this.logger.log(`getHistoryMpArticles(${mpId}) has no history, break`);
                    break;
                }
                this.inProgressHistoryMp.page++;
                await new Promise((resolve) => setTimeout(resolve, this.updateDelayTime * 1e3));
            }
        }
        finally {
            this.inProgressHistoryMp = {
                id: '',
                page: 1,
            };
        }
    }
    async refreshAllMpArticlesAndUpdateFeed() {
        if (this.isRefreshAllMpArticlesRunning) {
            this.logger.log('refreshAllMpArticlesAndUpdateFeed is running');
            return;
        }
        const mps = await this.prismaService.feed.findMany();
        this.isRefreshAllMpArticlesRunning = true;
        try {
            for (const { id } of mps) {
                await this.refreshMpArticlesAndUpdateFeed(id);
                await new Promise((resolve) => setTimeout(resolve, this.updateDelayTime * 1e3));
            }
        }
        finally {
            this.isRefreshAllMpArticlesRunning = false;
        }
    }
    async getMpInfo(url) {
        url = url.trim();
        const account = await this.getAvailableAccount();
        return this.request
            .post(`/api/v2/platform/wxs2mp`, { url }, {
            headers: {
                xid: account.id,
                Authorization: `Bearer ${account.token}`,
            },
        })
            .then((res) => res.data);
    }
    async createLoginUrl() {
        return this.request
            .get(`/api/v2/login/platform`)
            .then((res) => res.data);
    }
    async getLoginResult(id) {
        return this.request
            .get(`/api/v2/login/platform/${id}`, { timeout: 120 * 1e3 })
            .then((res) => res.data);
    }
    async getArticleContent(articleId) {
        const article = await this.prismaService.article.findUnique({
            where: { id: articleId },
        });
        if (!article) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: `未找到文章: ${articleId}`,
            });
        }
        if (article.isCrawled === 1 && article.content) {
            return {
                ...article,
                content: article.content,
            };
        }
        const result = await this.articleCrawler.crawlArticleContent(articleId);
        if (!result) {
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: '爬取文章内容失败',
            });
        }
        const updatedArticle = await this.prismaService.article.update({
            where: { id: articleId },
            data: {
                content: result.content,
                isCrawled: 1,
                picUrl: article.picUrl.includes('placeholder') ? result.coverImg : article.picUrl,
            },
        });
        return updatedArticle;
    }
    extractTextFromHtml(htmlContent) {
        let text = htmlContent.replace(/<[^>]*>/g, ' ');
        text = text.replace(/&[a-zA-Z]+;/g, ' ')
            .replace(/&[#][0-9]+;/g, ' ');
        text = text.replace(/\s+/g, ' ').trim();
        text = text.replace(/javascript:.*/gi, '');
        text = text.replace(/style=".*?"/gi, '');
        return text;
    }
    async analyzeArticle(title, content) {
        try {
            const apiUrl = 'https://api.coze.cn/v3/chat';
            const token = 'pat_8rJhqLAHFCVf2SiBDYZ78jaohmjwU4nZedwndJvXhazt9zllzU4kqdikZ3LLni1U';
            const botId = '7487231867155529769';
            const plainTextContent = this.extractTextFromHtml(content);
            this.logger.log(`开始分析文章: ${title.substring(0, 30)}...`);
            this.logger.debug(`提取后的纯文本内容长度: ${plainTextContent.length}`);
            if (!plainTextContent || plainTextContent.length === 0) {
                this.logger.warn(`文章内容为空，无法进行分析: ${title}`);
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: '文章内容为空，无法进行分析',
                });
            }
            const requestBody = {
                bot_id: botId,
                user_id: `wewe-rss-user-${Date.now()}`,
                stream: false,
                auto_save_history: true,
                additional_messages: [
                    {
                        role: 'user',
                        content: `请分析以下文章，并给出评分（0-100分）和评分理由，必须以JSON格式返回，包含score和reason字段。
            
标题：${title}
内容：${plainTextContent}

请确保返回格式为：
{ 
  "score": 评分数字, 
  "reason": "评分理由" 
}`,
                        content_type: 'text'
                    }
                ]
            };
            this.logger.log(`准备调用大模型API，Bot ID: ${botId}, 文章: ${title}`);
            const maxRetries = 3;
            let retryCount = 0;
            let response;
            while (retryCount < maxRetries) {
                try {
                    response = await axios_1.default.post(apiUrl, requestBody, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000,
                    });
                    break;
                }
                catch (error) {
                    retryCount++;
                    const err = error;
                    this.logger.warn(`API调用失败，正在进行第${retryCount}次重试... 错误: ${err.message}`);
                    if (retryCount >= maxRetries) {
                        throw error;
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
                }
            }
            if (response.status !== 200) {
                this.logger.error(`API返回非200状态码: ${response.status}`);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `API调用失败，状态码: ${response.status}`,
                });
            }
            if (!response.data || !response.data.data) {
                this.logger.error(`API返回数据结构异常: ${JSON.stringify(response.data)}`);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'API返回数据结构异常',
                });
            }
            if (!response.data.data.messages || !response.data.data.messages.length) {
                this.logger.error(`API返回消息为空: ${JSON.stringify(response.data)}`);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'API返回消息为空',
                });
            }
            const message = response.data?.data?.messages?.[0]?.content || '';
            this.logger.debug(`收到API返回: ${message}`);
            if (!message || message.length === 0) {
                this.logger.error(`API返回内容为空`);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'API返回内容为空',
                });
            }
            let result = {};
            this.logger.debug(`开始解析API返回的JSON数据，原始内容长度: ${message.length}`);
            try {
                const parsedJson = JSON.parse(message);
                if (parsedJson && 'score' in parsedJson && 'reason' in parsedJson) {
                    this.logger.log(`方法1成功: 直接将整个消息解析为JSON`);
                    result = parsedJson;
                }
            }
            catch (error) {
                const e = error;
                this.logger.debug(`方法1失败: 直接解析JSON失败: ${e.message}`);
            }
            if (!('score' in result) && message) {
                try {
                    const jsonRegex = /(\{[\s\S]*?"score"[\s\S]*?"reason"[\s\S]*?\})/;
                    const match = message.match(jsonRegex);
                    if (match && match[1]) {
                        const jsonStr = match[1];
                        this.logger.debug(`提取到的JSON字符串: ${jsonStr}`);
                        const parsedJson = JSON.parse(jsonStr);
                        if (parsedJson && 'score' in parsedJson && 'reason' in parsedJson) {
                            result = parsedJson;
                            this.logger.log(`方法2成功: 通过正则表达式提取JSON`);
                        }
                    }
                }
                catch (error) {
                    const e = error;
                    this.logger.debug(`方法2失败: 正则表达式提取JSON失败: ${e.message}`);
                }
            }
            if (!('score' in result) && message) {
                try {
                    const scoreRegex = /"score"\s*:\s*(\d+)/;
                    const reasonRegex = /"reason"\s*:\s*"([^"]*)"/;
                    const scoreMatch = message.match(scoreRegex);
                    const reasonMatch = message.match(reasonRegex);
                    this.logger.debug(`Score匹配结果: ${JSON.stringify(scoreMatch)}`);
                    this.logger.debug(`Reason匹配结果: ${JSON.stringify(reasonMatch)}`);
                    if (scoreMatch && reasonMatch) {
                        result = {
                            score: parseInt(scoreMatch[1], 10),
                            reason: reasonMatch[1]
                        };
                        this.logger.log(`方法3成功: 通过单独提取score和reason字段`);
                    }
                }
                catch (error) {
                    const e = error;
                    this.logger.debug(`方法3失败: 提取字段失败: ${e.message}`);
                }
            }
            if (!('score' in result) && message) {
                try {
                    const bracketRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
                    const matches = message.match(bracketRegex);
                    if (matches) {
                        for (const jsonCandidate of matches) {
                            try {
                                const parsed = JSON.parse(jsonCandidate);
                                if ('score' in parsed && 'reason' in parsed) {
                                    result = parsed;
                                    this.logger.log(`方法4成功: 从多个JSON候选项中找到匹配的JSON对象`);
                                    break;
                                }
                            }
                            catch (error) {
                                continue;
                            }
                        }
                    }
                }
                catch (error) {
                    const e = error;
                    this.logger.debug(`方法4失败: 提取多个JSON候选项失败: ${e.message}`);
                }
            }
            if ('score' in result && result.score !== undefined && result.reason) {
                this.logger.log(`API调用完成，状态码: ${response.status}, 得分: ${result.score}`);
                return {
                    score: result.score,
                    reason: result.reason
                };
            }
            else {
                this.logger.warn(`无法从API响应中解析评分数据，原始响应: ${message.substring(0, 200)}...`);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: '无法从API响应中解析评分数据',
                });
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`调用大模型API失败: ${err.message || '未知错误'}`);
            if (err.response) {
                this.logger.error(`API返回状态码: ${err.response.status}`);
                this.logger.error(`API返回数据: ${JSON.stringify(err.response.data)}`);
            }
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: '调用大模型API失败',
                cause: err,
            });
        }
    }
};
exports.TrpcService = TrpcService;
exports.TrpcService = TrpcService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        image_service_1.ImageService])
], TrpcService);
//# sourceMappingURL=trpc.service.js.map