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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AppController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let AppController = AppController_1 = class AppController {
    constructor(appService, configService) {
        this.appService = appService;
        this.configService = configService;
        this.logger = new common_1.Logger(AppController_1.name);
    }
    index() {
        const { url } = this.configService.get('platform');
        return {
            script: `<script>
      window.env = {
        website: '${url}',
      }
      </script>`,
        };
    }
    forRobot() {
        return 'User-agent:  *\nDisallow:  /';
    }
    getFavicon(res) {
        const imgContent = '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';
        const imgBuffer = Buffer.from(imgContent, 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.send(imgBuffer);
    }
    dash() {
        const { url } = this.configService.get('platform');
        return {
            script: `<script>
      window.env = {
        website: '${url}',
      }
      </script>`,
        };
    }
    async proxyImage(imageUrl, res) {
        if (!imageUrl) {
            return res.status(400).send('Missing image URL');
        }
        try {
            this.logger.debug(`代理图片请求: ${imageUrl}`);
            if (!imageUrl.startsWith('https://mmbiz.qpic.cn/') && !imageUrl.startsWith('http://mmbiz.qpic.cn/')) {
                this.logger.warn(`非微信域名图片请求: ${imageUrl}`);
                return res.status(400).send('只支持微信域名的图片');
            }
            const response = await axios_1.default.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'Referer': 'https://mp.weixin.qq.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive',
                    'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Sec-Fetch-Dest': 'image',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'cross-site',
                },
                timeout: 15000,
                maxRedirects: 5,
            });
            const contentType = response.headers['content-type'] || 'image/jpeg';
            res.set({
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=604800',
                'Content-Length': response.data.length,
                'Access-Control-Allow-Origin': '*',
            });
            return res.send(response.data);
        }
        catch (error) {
            this.logger.error(`代理图片失败: ${imageUrl}`, error);
            if (axios_1.default.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    return res.status(504).send('请求超时');
                }
                else if (error.response) {
                    this.logger.error(`微信服务器响应: ${error.response.status} - ${JSON.stringify(error.response.headers)}`);
                    return res.status(error.response.status).send(`微信服务器返回错误: ${error.response.status}`);
                }
                else if (error.request) {
                    return res.status(502).send('无法连接到微信服务器');
                }
            }
            return res.status(500).send('代理图片失败');
        }
    }
    checkImage(imagePath, res) {
        const cwd = process.cwd();
        const rootDir = path.resolve(cwd);
        const publicInRoot = path.join(rootDir, 'public', imagePath || 'images/test.svg');
        const publicInServer = path.join(rootDir, 'apps/server/public', imagePath || 'images/test.svg');
        const paths = [publicInRoot, publicInServer];
        const results = paths.map(fullPath => {
            const exists = fs.existsSync(fullPath);
            const stats = exists ? fs.statSync(fullPath) : null;
            let content = null;
            if (exists && stats && stats.isFile() && stats.size < 10000) {
                try {
                    content = fs.readFileSync(fullPath, { encoding: 'utf-8' }).toString();
                }
                catch (error) {
                    content = `Error reading file: ${error.message}`;
                }
            }
            return {
                path: fullPath,
                exists,
                stats: stats ? {
                    size: stats.size,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                } : null,
                content
            };
        });
        return res.json({
            cwd,
            results
        });
    }
    serveImage(filename, res) {
        try {
            const imagePath = path.join(process.cwd(), 'public', 'images', filename);
            if (!fs.existsSync(imagePath)) {
                this.logger.warn(`图片不存在: ${imagePath}`);
                return res.status(404).json({ error: '图片不存在' });
            }
            const ext = path.extname(filename).toLowerCase().substring(1);
            const contentTypeMap = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'svg': 'image/svg+xml',
                'webp': 'image/webp',
            };
            const contentType = contentTypeMap[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            const fileStream = fs.createReadStream(imagePath);
            fileStream.pipe(res);
        }
        catch (error) {
            this.logger.error(`提供图片失败: ${filename}`, error);
            return res.status(500).json({ error: '服务器错误' });
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Render)('index'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "index", null);
__decorate([
    (0, common_1.Get)('/robots.txt'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "forRobot", null);
__decorate([
    (0, common_1.Get)('favicon.ico'),
    __param(0, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getFavicon", null);
__decorate([
    (0, common_1.Get)('dash*'),
    (0, common_1.Render)('index'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "dash", null);
__decorate([
    (0, common_1.Get)('api/proxy/image'),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "proxyImage", null);
__decorate([
    (0, common_1.Get)('check-image'),
    __param(0, (0, common_1.Query)('path')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "checkImage", null);
__decorate([
    (0, common_1.Get)('images/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "serveImage", null);
exports.AppController = AppController = AppController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        config_1.ConfigService])
], AppController);
//# sourceMappingURL=app.controller.js.map