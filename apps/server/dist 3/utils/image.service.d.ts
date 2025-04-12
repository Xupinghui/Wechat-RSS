import { ConfigService } from '@nestjs/config';
export declare class ImageService {
    private readonly configService;
    private readonly logger;
    private readonly imageDir;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    private generateImageFilename;
    private getImageExtension;
    batchDownloadAndSaveImages(imageUrls: string[]): Promise<Map<string, string>>;
    downloadAndSaveImage(imageUrl: string): Promise<string>;
}
