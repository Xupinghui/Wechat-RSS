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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedsController = void 0;
const common_1 = require("@nestjs/common");
const feeds_service_1 = require("./feeds.service");
let FeedsController = class FeedsController {
    constructor(feedsService) {
        this.feedsService = feedsService;
        this.logger = new common_1.Logger(this.constructor.name);
    }
    async getFeedList() {
        return this.feedsService.getFeedList();
    }
    async getFeeds(req, res, limit = 30, page = 1, mode, title_include, title_exclude) {
        const path = req.path;
        const type = path.split('.').pop() || '';
        const { content, mimeType } = await this.feedsService.handleGenerateFeed({
            type,
            limit,
            page,
            mode,
            title_include,
            title_exclude,
        });
        res.setHeader('Content-Type', mimeType);
        res.send(content);
    }
    async getFeed(res, feed, limit = 10, page = 1, mode, title_include, title_exclude, update = false) {
        const [id, type] = feed.split('.');
        this.logger.log('getFeed: ', id);
        if (update) {
            this.feedsService.updateFeed(id);
        }
        const { content, mimeType } = await this.feedsService.handleGenerateFeed({
            id,
            type,
            limit,
            page,
            mode,
            title_include,
            title_exclude,
        });
        res.setHeader('Content-Type', mimeType);
        res.send(content);
    }
};
exports.FeedsController = FeedsController;
__decorate([
    (0, common_1.Get)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FeedsController.prototype, "getFeedList", null);
__decorate([
    (0, common_1.Get)('/all.(json|rss|atom)'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(30), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('mode')),
    __param(5, (0, common_1.Query)('title_include')),
    __param(6, (0, common_1.Query)('title_exclude')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], FeedsController.prototype, "getFeeds", null);
__decorate([
    (0, common_1.Get)('/:feed'),
    __param(0, (0, common_1.Response)()),
    __param(1, (0, common_1.Param)('feed')),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('mode')),
    __param(5, (0, common_1.Query)('title_include')),
    __param(6, (0, common_1.Query)('title_exclude')),
    __param(7, (0, common_1.Query)('update')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String, Boolean]),
    __metadata("design:returntype", Promise)
], FeedsController.prototype, "getFeed", null);
exports.FeedsController = FeedsController = __decorate([
    (0, common_1.Controller)('feeds'),
    __metadata("design:paramtypes", [feeds_service_1.FeedsService])
], FeedsController);
//# sourceMappingURL=feeds.controller.js.map