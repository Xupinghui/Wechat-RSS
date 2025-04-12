declare const configuration: () => {
    server: {
        isProd: boolean;
        port: string | number;
        host: string;
    };
    throttler: {
        maxRequestPerMinute: number;
    };
    auth: {
        code: string | undefined;
    };
    platform: {
        url: string;
    };
    feed: {
        originUrl: string;
        mode: "" | "fulltext";
        updateDelayTime: number;
        enableCleanHtml: boolean;
    };
    database: {
        type: string;
    };
};
export default configuration;
export type ConfigurationType = ReturnType<typeof configuration>;
