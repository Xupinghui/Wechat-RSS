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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ImageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const config_1 = require("@nestjs/config");
let ImageService = ImageService_1 = class ImageService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ImageService_1.name);
        this.imageDir = path.join(process.cwd(), 'public', 'images');
        if (!fs.existsSync(this.imageDir)) {
            fs.mkdirSync(this.imageDir, { recursive: true });
            this.logger.log(`创建图片目录: ${this.imageDir}`);
        }
        const { originUrl } = this.configService.get('feed');
        const baseOriginUrl = originUrl ? (originUrl.endsWith('/') ? originUrl.slice(0, -1) : originUrl) : '';
        this.baseUrl = baseOriginUrl ?
            `${baseOriginUrl}/images` :
            '/images';
        this.logger.log(`图片服务初始化完成，图片基础URL: ${this.baseUrl}`);
    }
    generateImageFilename(url, extension = 'jpg') {
        const hash = crypto.createHash('md5').update(url).digest('hex');
        return `${hash}.${extension}`;
    }
    getImageExtension(url) {
        if (url.includes('wx_fmt=')) {
            const match = url.match(/wx_fmt=([^&]+)/);
            if (match && match[1]) {
                return match[1].toLowerCase();
            }
        }
        const urlPath = new URL(url).pathname;
        const extension = path.extname(urlPath).replace('.', '');
        return extension || 'jpg';
    }
    async batchDownloadAndSaveImages(imageUrls) {
        const results = new Map();
        const batchSize = 5;
        for (let i = 0; i < imageUrls.length; i += batchSize) {
            const batch = imageUrls.slice(i, i + batchSize);
            const batchPromises = batch.map(async (url) => {
                try {
                    const localUrl = await this.downloadAndSaveImage(url);
                    results.set(url, localUrl);
                }
                catch (error) {
                    this.logger.error(`批量下载图片失败: ${url}`, error);
                    results.set(url, url);
                }
            });
            await Promise.all(batchPromises);
            if (i + batchSize < imageUrls.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return results;
    }
    async downloadAndSaveImage(imageUrl) {
        try {
            if (!imageUrl || !imageUrl.startsWith('http')) {
                this.logger.warn(`无效的图片URL: ${imageUrl}`);
                return imageUrl;
            }
            const extension = this.getImageExtension(imageUrl);
            const filename = this.generateImageFilename(imageUrl, extension);
            const filePath = path.join(this.imageDir, filename);
            if (fs.existsSync(filePath)) {
                this.logger.debug(`图片已存在，跳过下载: ${filename}`);
                return `${this.baseUrl}/${filename}`;
            }
            this.logger.log(`开始下载图片: ${imageUrl}`);
            const response = await axios_1.default.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'Referer': 'https://mp.weixin.qq.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                timeout: 15000,
            });
            fs.writeFileSync(filePath, response.data);
            const imageSize = Math.round(response.data.length / 1024);
            this.logger.log(`图片已保存: ${filename} (${imageSize}KB)`);
            return `${this.baseUrl}/${filename}`;
        }
        catch (error) {
            this.logger.error(`下载图片失败: ${imageUrl}`, error);
            return imageUrl;
        }
    }
};
exports.ImageService = ImageService;
exports.ImageService = ImageService = ImageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ImageService);
//# sourceMappingURL=image.service.js.map