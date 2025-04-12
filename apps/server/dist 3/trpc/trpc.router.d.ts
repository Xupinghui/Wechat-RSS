import { INestApplication } from '@nestjs/common';
import { TrpcService } from '@server/trpc/trpc.service';
import { PrismaService } from '@server/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
interface HotSearchItem {
    rank: number;
    keyword: string;
    hotIndex: number;
}
export declare class TrpcRouter {
    private readonly trpcService;
    private readonly prismaService;
    private readonly configService;
    constructor(trpcService: TrpcService, prismaService: PrismaService, configService: ConfigService);
    private readonly logger;
    accountRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        list: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                cursor?: string | null | undefined;
                limit?: number | null | undefined;
            };
            _input_out: {
                cursor?: string | null | undefined;
                limit?: number | null | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            blocks: string[];
            items: {
                id: string;
                name: string;
                status: number;
                createdAt: Date;
                updatedAt: Date | null;
            }[];
            nextCursor: string | undefined;
        }>;
        byId: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: string;
            _input_out: string;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            token: string;
            name: string;
            status: number;
            createdAt: Date;
            updatedAt: Date | null;
        }>;
        add: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                id: string;
                token: string;
                name: string;
                status?: number | undefined;
            };
            _input_out: {
                id: string;
                token: string;
                name: string;
                status: number;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            token: string;
            name: string;
            status: number;
            createdAt: Date;
            updatedAt: Date | null;
        }>;
        edit: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                id: string;
                data: {
                    token?: string | undefined;
                    name?: string | undefined;
                    status?: number | undefined;
                };
            };
            _input_out: {
                id: string;
                data: {
                    token?: string | undefined;
                    name?: string | undefined;
                    status?: number | undefined;
                };
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            token: string;
            name: string;
            status: number;
            createdAt: Date;
            updatedAt: Date | null;
        }>;
        delete: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: string;
            _input_out: string;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, string>;
    }>;
    feedRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        list: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                cursor?: string | null | undefined;
                limit?: number | null | undefined;
            };
            _input_out: {
                cursor?: string | null | undefined;
                limit?: number | null | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            items: {
                id: string;
                mpName: string;
                mpCover: string;
                mpIntro: string;
                status: number;
                syncTime: number;
                updateTime: number;
                createdAt: Date;
                updatedAt: Date | null;
                hasHistory: number | null;
            }[];
            nextCursor: string | undefined;
        }>;
        byId: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: string;
            _input_out: string;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            mpName: string;
            mpCover: string;
            mpIntro: string;
            status: number;
            syncTime: number;
            updateTime: number;
            createdAt: Date;
            updatedAt: Date | null;
            hasHistory: number | null;
        }>;
        add: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                id: string;
                mpName: string;
                mpCover: string;
                mpIntro: string;
                updateTime: number;
                status?: number | undefined;
                syncTime?: number | undefined;
            };
            _input_out: {
                id: string;
                status: number;
                mpName: string;
                mpCover: string;
                mpIntro: string;
                syncTime: number;
                updateTime: number;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            mpName: string;
            mpCover: string;
            mpIntro: string;
            status: number;
            syncTime: number;
            updateTime: number;
            createdAt: Date;
            updatedAt: Date | null;
            hasHistory: number | null;
        }>;
        edit: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                id: string;
                data: {
                    status?: number | undefined;
                    mpName?: string | undefined;
                    mpCover?: string | undefined;
                    mpIntro?: string | undefined;
                    syncTime?: number | undefined;
                    updateTime?: number | undefined;
                };
            };
            _input_out: {
                id: string;
                data: {
                    status?: number | undefined;
                    mpName?: string | undefined;
                    mpCover?: string | undefined;
                    mpIntro?: string | undefined;
                    syncTime?: number | undefined;
                    updateTime?: number | undefined;
                };
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            mpName: string;
            mpCover: string;
            mpIntro: string;
            status: number;
            syncTime: number;
            updateTime: number;
            createdAt: Date;
            updatedAt: Date | null;
            hasHistory: number | null;
        }>;
        delete: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: string;
            _input_out: string;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, string>;
        refreshArticles: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                mpId?: string | undefined;
            };
            _input_out: {
                mpId?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, void>;
        isRefreshAllMpArticlesRunning: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, boolean>;
        getHistoryArticles: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                mpId?: string | undefined;
            };
            _input_out: {
                mpId?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, void>;
        getInProgressHistoryMp: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            page: number;
        }>;
    }>;
    articleRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        list: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                cursor?: string | null | undefined;
                mpId?: string | null | undefined;
                limit?: number | null | undefined;
                publishTimeGte?: number | null | undefined;
            };
            _input_out: {
                cursor?: string | null | undefined;
                mpId?: string | null | undefined;
                limit?: number | null | undefined;
                publishTimeGte?: number | null | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            items: {
                id: string;
                mpId: string;
                title: string;
                picUrl: string;
                publishTime: number;
                content: string | null;
                isCrawled: number;
                aiScore: number | null;
                aiReason: string | null;
                createdAt: Date;
                updatedAt: Date | null;
            }[];
            nextCursor: string | undefined;
        }>;
        byId: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: string;
            _input_out: string;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            mpId: string;
            title: string;
            picUrl: string;
            publishTime: number;
            content: string | null;
            isCrawled: number;
            aiScore: number | null;
            aiReason: string | null;
            createdAt: Date;
            updatedAt: Date | null;
        }>;
        add: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                id: string;
                publishTime: number;
                title: string;
                mpId: string;
                picUrl?: string | undefined;
            };
            _input_out: {
                id: string;
                picUrl: string;
                publishTime: number;
                title: string;
                mpId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            mpId: string;
            title: string;
            picUrl: string;
            publishTime: number;
            content: string | null;
            isCrawled: number;
            aiScore: number | null;
            aiReason: string | null;
            createdAt: Date;
            updatedAt: Date | null;
        }>;
        delete: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: string;
            _input_out: string;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, string>;
        getContent: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: string;
            _input_out: string;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            mpId: string;
            title: string;
            picUrl: string;
            publishTime: number;
            content: string | null;
            isCrawled: number;
            aiScore: number | null;
            aiReason: string | null;
            createdAt: Date;
            updatedAt: Date | null;
        }>;
        analyze: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                content: string;
                title: string;
                articleId: string;
            };
            _input_out: {
                content: string;
                title: string;
                articleId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            mpId: string;
            title: string;
            picUrl: string;
            publishTime: number;
            content: string | null;
            isCrawled: number;
            aiScore: number | null;
            aiReason: string | null;
            createdAt: Date;
            updatedAt: Date | null;
        }>;
        clearAnalysisResults: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            success: boolean;
        }>;
        clearAnalysisResultsByIds: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                articleIds: string[];
            };
            _input_out: {
                articleIds: string[];
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            success: boolean;
            count: number;
        }>;
    }>;
    platformRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        getMpArticles: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                mpId: string;
            };
            _input_out: {
                mpId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        getMpInfo: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                wxsLink: string;
            };
            _input_out: {
                wxsLink: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            cover: string;
            name: string;
            intro: string;
            updateTime: number;
        }[]>;
        createLoginUrl: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            uuid: string;
            scanUrl: string;
        }>;
        getLoginResult: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {};
            _input_in: {
                id: string;
            };
            _input_out: {
                id: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            message: string;
            vid?: number;
            token?: string;
            username?: string;
        }>;
    }>;
    hotListRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        weiboHotSearch: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: object;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            items: HotSearchItem[];
            updateTime: string;
        }>;
        weiboNews: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: object;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            items: HotSearchItem[];
            updateTime: string;
        }>;
        baiduHot: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: object;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            items: HotSearchItem[];
            updateTime: string;
        }>;
        baiduLife: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: object;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            items: HotSearchItem[];
            updateTime: string;
        }>;
        zhihuHot: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: object;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            items: HotSearchItem[];
            updateTime: string;
        }>;
        toutiaoHot: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: object;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            items: HotSearchItem[];
            updateTime: string;
        }>;
    }>;
    appRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        account: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
            ctx: object;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>, {
            list: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    cursor?: string | null | undefined;
                    limit?: number | null | undefined;
                };
                _input_out: {
                    cursor?: string | null | undefined;
                    limit?: number | null | undefined;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                blocks: string[];
                items: {
                    id: string;
                    name: string;
                    status: number;
                    createdAt: Date;
                    updatedAt: Date | null;
                }[];
                nextCursor: string | undefined;
            }>;
            byId: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: string;
                _input_out: string;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                token: string;
                name: string;
                status: number;
                createdAt: Date;
                updatedAt: Date | null;
            }>;
            add: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    id: string;
                    token: string;
                    name: string;
                    status?: number | undefined;
                };
                _input_out: {
                    id: string;
                    token: string;
                    name: string;
                    status: number;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                token: string;
                name: string;
                status: number;
                createdAt: Date;
                updatedAt: Date | null;
            }>;
            edit: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    id: string;
                    data: {
                        token?: string | undefined;
                        name?: string | undefined;
                        status?: number | undefined;
                    };
                };
                _input_out: {
                    id: string;
                    data: {
                        token?: string | undefined;
                        name?: string | undefined;
                        status?: number | undefined;
                    };
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                token: string;
                name: string;
                status: number;
                createdAt: Date;
                updatedAt: Date | null;
            }>;
            delete: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: string;
                _input_out: string;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, string>;
        }>;
        feed: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
            ctx: object;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>, {
            list: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    cursor?: string | null | undefined;
                    limit?: number | null | undefined;
                };
                _input_out: {
                    cursor?: string | null | undefined;
                    limit?: number | null | undefined;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                items: {
                    id: string;
                    mpName: string;
                    mpCover: string;
                    mpIntro: string;
                    status: number;
                    syncTime: number;
                    updateTime: number;
                    createdAt: Date;
                    updatedAt: Date | null;
                    hasHistory: number | null;
                }[];
                nextCursor: string | undefined;
            }>;
            byId: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: string;
                _input_out: string;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                mpName: string;
                mpCover: string;
                mpIntro: string;
                status: number;
                syncTime: number;
                updateTime: number;
                createdAt: Date;
                updatedAt: Date | null;
                hasHistory: number | null;
            }>;
            add: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    id: string;
                    mpName: string;
                    mpCover: string;
                    mpIntro: string;
                    updateTime: number;
                    status?: number | undefined;
                    syncTime?: number | undefined;
                };
                _input_out: {
                    id: string;
                    status: number;
                    mpName: string;
                    mpCover: string;
                    mpIntro: string;
                    syncTime: number;
                    updateTime: number;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                mpName: string;
                mpCover: string;
                mpIntro: string;
                status: number;
                syncTime: number;
                updateTime: number;
                createdAt: Date;
                updatedAt: Date | null;
                hasHistory: number | null;
            }>;
            edit: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    id: string;
                    data: {
                        status?: number | undefined;
                        mpName?: string | undefined;
                        mpCover?: string | undefined;
                        mpIntro?: string | undefined;
                        syncTime?: number | undefined;
                        updateTime?: number | undefined;
                    };
                };
                _input_out: {
                    id: string;
                    data: {
                        status?: number | undefined;
                        mpName?: string | undefined;
                        mpCover?: string | undefined;
                        mpIntro?: string | undefined;
                        syncTime?: number | undefined;
                        updateTime?: number | undefined;
                    };
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                mpName: string;
                mpCover: string;
                mpIntro: string;
                status: number;
                syncTime: number;
                updateTime: number;
                createdAt: Date;
                updatedAt: Date | null;
                hasHistory: number | null;
            }>;
            delete: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: string;
                _input_out: string;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, string>;
            refreshArticles: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    mpId?: string | undefined;
                };
                _input_out: {
                    mpId?: string | undefined;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, void>;
            isRefreshAllMpArticlesRunning: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, boolean>;
            getHistoryArticles: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    mpId?: string | undefined;
                };
                _input_out: {
                    mpId?: string | undefined;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, void>;
            getInProgressHistoryMp: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                page: number;
            }>;
        }>;
        article: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
            ctx: object;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>, {
            list: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    cursor?: string | null | undefined;
                    mpId?: string | null | undefined;
                    limit?: number | null | undefined;
                    publishTimeGte?: number | null | undefined;
                };
                _input_out: {
                    cursor?: string | null | undefined;
                    mpId?: string | null | undefined;
                    limit?: number | null | undefined;
                    publishTimeGte?: number | null | undefined;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                items: {
                    id: string;
                    mpId: string;
                    title: string;
                    picUrl: string;
                    publishTime: number;
                    content: string | null;
                    isCrawled: number;
                    aiScore: number | null;
                    aiReason: string | null;
                    createdAt: Date;
                    updatedAt: Date | null;
                }[];
                nextCursor: string | undefined;
            }>;
            byId: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: string;
                _input_out: string;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                mpId: string;
                title: string;
                picUrl: string;
                publishTime: number;
                content: string | null;
                isCrawled: number;
                aiScore: number | null;
                aiReason: string | null;
                createdAt: Date;
                updatedAt: Date | null;
            }>;
            add: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    id: string;
                    publishTime: number;
                    title: string;
                    mpId: string;
                    picUrl?: string | undefined;
                };
                _input_out: {
                    id: string;
                    picUrl: string;
                    publishTime: number;
                    title: string;
                    mpId: string;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                mpId: string;
                title: string;
                picUrl: string;
                publishTime: number;
                content: string | null;
                isCrawled: number;
                aiScore: number | null;
                aiReason: string | null;
                createdAt: Date;
                updatedAt: Date | null;
            }>;
            delete: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: string;
                _input_out: string;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, string>;
            getContent: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: string;
                _input_out: string;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                mpId: string;
                title: string;
                picUrl: string;
                publishTime: number;
                content: string | null;
                isCrawled: number;
                aiScore: number | null;
                aiReason: string | null;
                createdAt: Date;
                updatedAt: Date | null;
            }>;
            analyze: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    content: string;
                    title: string;
                    articleId: string;
                };
                _input_out: {
                    content: string;
                    title: string;
                    articleId: string;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                mpId: string;
                title: string;
                picUrl: string;
                publishTime: number;
                content: string | null;
                isCrawled: number;
                aiScore: number | null;
                aiReason: string | null;
                createdAt: Date;
                updatedAt: Date | null;
            }>;
            clearAnalysisResults: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                success: boolean;
            }>;
            clearAnalysisResultsByIds: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    articleIds: string[];
                };
                _input_out: {
                    articleIds: string[];
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                success: boolean;
                count: number;
            }>;
        }>;
        platform: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
            ctx: object;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>, {
            getMpArticles: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    mpId: string;
                };
                _input_out: {
                    mpId: string;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, any>;
            getMpInfo: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    wxsLink: string;
                };
                _input_out: {
                    wxsLink: string;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                id: string;
                cover: string;
                name: string;
                intro: string;
                updateTime: number;
            }[]>;
            createLoginUrl: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                uuid: string;
                scanUrl: string;
            }>;
            getLoginResult: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _meta: object;
                _ctx_out: {};
                _input_in: {
                    id: string;
                };
                _input_out: {
                    id: string;
                };
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
            }, {
                message: string;
                vid?: number;
                token?: string;
                username?: string;
            }>;
        }>;
        hotList: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
            ctx: object;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>, {
            weiboHotSearch: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _ctx_out: object;
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
                _meta: object;
            }, {
                items: HotSearchItem[];
                updateTime: string;
            }>;
            weiboNews: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _ctx_out: object;
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
                _meta: object;
            }, {
                items: HotSearchItem[];
                updateTime: string;
            }>;
            baiduHot: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _ctx_out: object;
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
                _meta: object;
            }, {
                items: HotSearchItem[];
                updateTime: string;
            }>;
            baiduLife: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _ctx_out: object;
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
                _meta: object;
            }, {
                items: HotSearchItem[];
                updateTime: string;
            }>;
            zhihuHot: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _ctx_out: object;
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
                _meta: object;
            }, {
                items: HotSearchItem[];
                updateTime: string;
            }>;
            toutiaoHot: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: object;
                    meta: object;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: import("@trpc/server").DefaultDataTransformer;
                }>;
                _ctx_out: object;
                _input_in: typeof import("@trpc/server").unsetMarker;
                _input_out: typeof import("@trpc/server").unsetMarker;
                _output_in: typeof import("@trpc/server").unsetMarker;
                _output_out: typeof import("@trpc/server").unsetMarker;
                _meta: object;
            }, {
                items: HotSearchItem[];
                updateTime: string;
            }>;
        }>;
    }>;
    applyMiddleware(app: INestApplication): Promise<void>;
}
export type AppRouter = TrpcRouter[`appRouter`];
export {};
