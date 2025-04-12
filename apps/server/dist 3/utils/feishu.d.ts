declare class FeishuService {
    private readonly appId;
    private readonly appSecret;
    private readonly logger;
    private accessToken;
    private tokenExpireTime;
    private appToken;
    private bitableId;
    private tableId;
    private getAccessToken;
    private callApiWithRetry;
    private createBitable;
    private createTable;
    private createTableStepByStep;
    private createTableFields;
    private findTableIdFromResponse;
    private deepSearchForKey;
    private getBitableInfo;
    private checkAppPermissions;
    private getErrorCodeMeaning;
    syncArticlesToFeishu(articles: any[], mpNameMap: Record<string, string>): Promise<any>;
    deleteAllBitables(): Promise<{
        success: boolean;
        message: string;
        deletedCount: number;
    }>;
    getBitableShareLink(): Promise<{
        success: boolean;
        message: string;
        shareLink?: string;
    }>;
    ensureValidToken(): Promise<boolean>;
    startTokenRefreshTask(): void;
    initialize(): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const feishuService: FeishuService;
export {};
