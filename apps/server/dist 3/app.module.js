"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const trpc_module_1 = require("./trpc/trpc.module");
const config_1 = require("@nestjs/config");
const configuration_1 = __importDefault(require("./configuration"));
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const feeds_module_1 = require("./feeds/feeds.module");
const image_service_1 = require("./utils/image.service");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            trpc_module_1.TrpcModule,
            feeds_module_1.FeedsModule,
            schedule_1.ScheduleModule.forRoot(),
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
                load: [configuration_1.default],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory(config) {
                    const throttler = config.get('throttler');
                    return [
                        {
                            ttl: 60,
                            limit: throttler?.maxRequestPerMinute || 60,
                        },
                    ];
                },
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'public'),
                serveRoot: '/',
            }),
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, image_service_1.ImageService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map