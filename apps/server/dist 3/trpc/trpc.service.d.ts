import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@server/prisma/prisma.service';
import { AxiosInstance } from 'axios';
import { ImageService } from '@server/utils/image.service';
export declare class TrpcService {
    private readonly prismaService;
    private readonly configService;
    readonly imageService: ImageService;
    trpc: {
        _config: import("@trpc/server").RootConfig<{
            ctx: object;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        procedure: import("@trpc/server").ProcedureBuilder<{
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
        }>;
        middleware: <TNewParams extends import("@trpc/server").ProcedureParams<import("@trpc/server").AnyRootConfig, unknown, unknown, unknown, unknown, unknown, unknown>>(fn: import("@trpc/server").MiddlewareFunction<{
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: {};
            _input_out: typeof import("@trpc/server").unsetMarker;
            _input_in: unknown;
            _output_in: unknown;
            _output_out: unknown;
            _meta: object;
        }, TNewParams>) => import("@trpc/server").MiddlewareBuilder<{
            _config: import("@trpc/server").RootConfig<{
                ctx: object;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: {};
            _input_out: typeof import("@trpc/server").unsetMarker;
            _input_in: unknown;
            _output_in: unknown;
            _output_out: unknown;
            _meta: object;
        }, TNewParams>;
        router: <TProcRouterRecord extends import("@trpc/server").ProcedureRouterRecord>(procedures: TProcRouterRecord) => import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
            ctx: object;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>, TProcRouterRecord>;
        mergeRouters: typeof import("@trpc/server").mergeRouters;
        createCallerFactory: <TRouter extends import("@trpc/server").Router<import("@trpc/server").AnyRouterDef<import("@trpc/server").RootConfig<{
            ctx: object;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>, any>>>(router: TRouter) => import("@trpc/server").RouterCaller<TRouter["_def"]>;
    };
    publicProcedure: import("@trpc/server").ProcedureBuilder<{
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
    }>;
    protectedProcedure: import("@trpc/server").ProcedureBuilder<{
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
    }>;
    router: <TProcRouterRecord extends import("@trpc/server").ProcedureRouterRecord>(procedures: TProcRouterRecord) => import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, TProcRouterRecord>;
    mergeRouters: typeof import("@trpc/server").mergeRouters;
    request: AxiosInstance;
    updateDelayTime: number;
    private readonly logger;
    private readonly articleCrawler;
    constructor(prismaService: PrismaService, configService: ConfigService, imageService: ImageService);
    removeBlockedAccount: (vid: string) => void;
    private getTodayDate;
    getBlockedAccountIds(): string[];
    private getAvailableAccount;
    getMpArticles(mpId: string, page?: number, retryCount?: number): any;
    refreshMpArticlesAndUpdateFeed(mpId: string, page?: number): Promise<{
        hasHistory: number;
    }>;
    inProgressHistoryMp: {
        id: string;
        page: number;
    };
    getHistoryMpArticles(mpId: string): Promise<void>;
    isRefreshAllMpArticlesRunning: boolean;
    refreshAllMpArticlesAndUpdateFeed(): Promise<void>;
    getMpInfo(url: string): Promise<{
        id: string;
        cover: string;
        name: string;
        intro: string;
        updateTime: number;
    }[]>;
    createLoginUrl(): Promise<{
        uuid: string;
        scanUrl: string;
    }>;
    getLoginResult(id: string): Promise<{
        message: string;
        vid?: number;
        token?: string;
        username?: string;
    }>;
    getArticleContent(articleId: string): Promise<{
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
    private extractTextFromHtml;
    analyzeArticle(title: string, content: string): Promise<{
        score: number;
        reason: string;
    }>;
}
