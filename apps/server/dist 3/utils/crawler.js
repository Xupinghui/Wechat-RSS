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
var ArticleCrawler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticleCrawler = void 0;
const cheerio = __importStar(require("cheerio"));
const axios_1 = __importDefault(require("axios"));
const common_1 = require("@nestjs/common");
const image_service_1 = require("./image.service");
let ArticleCrawler = ArticleCrawler_1 = class ArticleCrawler {
    constructor(imageService) {
        this.imageService = imageService;
        this.logger = new common_1.Logger(ArticleCrawler_1.name);
    }
    async crawlArticleContent(articleId) {
        try {
            const url = `https://mp.weixin.qq.com/s/${articleId}`;
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                },
                timeout: 10000
            });
            if (response.status !== 200) {
                this.logger.error(`爬取文章失败：文章ID ${articleId}, 状态码 ${response.status}`);
                return null;
            }
            const html = response.data;
            const $ = cheerio.load(html);
            const contentElement = $('#js_content');
            const imagePromises = [];
            contentElement.find('img').each((_, img) => {
                const $img = $(img);
                const dataSrc = $img.attr('data-src');
                if (dataSrc) {
                    const promise = this.imageService.downloadAndSaveImage(dataSrc)
                        .then(localUrl => {
                        $img.attr('src', localUrl);
                        $img.removeAttr('data-src');
                        $img.removeAttr('data-w');
                        $img.removeAttr('data-ratio');
                        $img.attr('style', 'max-width: 100%; height: auto; display: block;');
                    });
                    imagePromises.push(promise);
                }
            });
            await Promise.all(imagePromises);
            contentElement.find('*').each((_, el) => {
                const $el = $(el);
                if ($el.prop('tagName') !== 'IMG') {
                    $el.removeAttr('style');
                }
                $el.removeAttr('class');
                $el.removeAttr('id');
            });
            contentElement.find('p').attr('style', 'margin-bottom: 1rem; line-height: 1.6;');
            contentElement.find('h1, h2, h3, h4, h5, h6').attr('style', 'margin-top: 1.5rem; margin-bottom: 1rem; font-weight: bold;');
            contentElement.find('a').attr('style', 'color: #3182ce; text-decoration: none;');
            contentElement.find('blockquote').attr('style', 'border-left: 4px solid #e2e8f0; padding-left: 1rem; margin-left: 0; margin-right: 0; color: #4a5568;');
            let coverImg = '';
            const ogImageMeta = $('meta[property="og:image"]');
            if (ogImageMeta.length) {
                const originalCoverImg = ogImageMeta.attr('content') || '';
                if (originalCoverImg) {
                    coverImg = await this.imageService.downloadAndSaveImage(originalCoverImg);
                }
            }
            else {
                const firstImg = contentElement.find('img').first();
                if (firstImg.length) {
                    const originalSrc = firstImg.attr('src') || firstImg.attr('data-src') || '';
                    if (originalSrc) {
                        coverImg = await this.imageService.downloadAndSaveImage(originalSrc);
                    }
                }
            }
            contentElement.find('iframe').each((_, iframe) => {
                const $iframe = $(iframe);
                const src = $iframe.attr('data-src') || $iframe.attr('src');
                if (src) {
                    $iframe.attr('src', src);
                    $iframe.attr('style', 'max-width: 100%; width: 100%; height: 250px;');
                    $iframe.removeAttr('data-src');
                }
            });
            contentElement.find('pre').attr('style', 'background-color: #f7fafc; padding: 1rem; border-radius: 0.25rem; overflow-x: auto;');
            contentElement.find('code').attr('style', 'font-family: monospace;');
            const contentHtml = contentElement.html() || '';
            const styledContent = `
        <style>
          .wx-article {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            padding: 16px;
            width: 100%;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-word;
          }
          .wx-article img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 16px auto;
            border-radius: 4px;
          }
          .wx-article p {
            margin-bottom: 16px;
          }
          .wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4, .wx-article h5, .wx-article h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
          }
          .wx-article a {
            color: #3182ce;
            text-decoration: none;
          }
          .wx-article blockquote {
            border-left: 4px solid #e2e8f0;
            padding-left: 16px;
            margin: 16px 0;
            color: #4a5568;
          }
          .wx-article pre {
            background-color: #f7fafc;
            padding: 16px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 16px 0;
          }
          .wx-article code {
            font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 14px;
          }
          .wx-article table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            overflow-x: auto;
            display: block;
          }
          .wx-article td, .wx-article th {
            border: 1px solid #e2e8f0;
            padding: 8px;
          }
          .wx-article iframe {
            max-width: 100%;
            margin: 16px 0;
          }
        </style>
        <div class="wx-article">
          ${contentHtml}
        </div>
      `;
            return {
                content: styledContent,
                coverImg
            };
        }
        catch (error) {
            this.logger.error(`爬取文章异常：文章ID ${articleId}`, error);
            return null;
        }
    }
};
exports.ArticleCrawler = ArticleCrawler;
exports.ArticleCrawler = ArticleCrawler = ArticleCrawler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [image_service_1.ImageService])
], ArticleCrawler);
//# sourceMappingURL=crawler.js.map