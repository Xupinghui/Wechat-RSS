import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { Response as ExpressResponse } from 'express';
export declare class AppController {
    private readonly appService;
    private readonly configService;
    private readonly logger;
    constructor(appService: AppService, configService: ConfigService);
    index(): {
        script: string;
    };
    forRobot(): string;
    getFavicon(res: ExpressResponse): void;
    dash(): {
        script: string;
    };
    proxyImage(imageUrl: string, res: ExpressResponse): Promise<ExpressResponse<any, Record<string, any>>>;
    checkImage(imagePath: string, res: ExpressResponse): ExpressResponse<any, Record<string, any>>;
    serveImage(filename: string, res: ExpressResponse): ExpressResponse<any, Record<string, any>> | undefined;
}
