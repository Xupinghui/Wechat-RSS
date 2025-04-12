"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCount = exports.feedMimeTypeMap = exports.feedTypes = exports.statusMap = void 0;
exports.statusMap = {
    INVALID: 0,
    ENABLE: 1,
    DISABLE: 2,
};
exports.feedTypes = ['rss', 'atom', 'json'];
exports.feedMimeTypeMap = {
    rss: 'application/rss+xml; charset=utf-8',
    atom: 'application/atom+xml; charset=utf-8',
    json: 'application/feed+json; charset=utf-8',
};
exports.defaultCount = 20;
//# sourceMappingURL=constants.js.map