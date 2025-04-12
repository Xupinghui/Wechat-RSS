export declare const statusMap: {
    INVALID: number;
    ENABLE: number;
    DISABLE: number;
};
export declare const feedTypes: readonly ["rss", "atom", "json"];
export declare const feedMimeTypeMap: {
    readonly rss: "application/rss+xml; charset=utf-8";
    readonly atom: "application/atom+xml; charset=utf-8";
    readonly json: "application/feed+json; charset=utf-8";
};
export declare const defaultCount = 20;
