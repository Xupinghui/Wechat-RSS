import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@server/configuration';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ImageService implements OnModuleInit {
  private readonly logger = new Logger(ImageService.name);
  private readonly imageDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // 创建图片存储目录
    this.imageDir = path.join(process.cwd(), 'public', 'images');
    
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
      this.logger.log(`创建图片目录: ${this.imageDir}`);
    }
    
    // 设置图片访问的基础URL
    const { originUrl } = 
      this.configService.get<ConfigurationType['feed']>('feed')!;
    
    // 确保originUrl没有结尾的斜杠
    const baseOriginUrl = originUrl ? (originUrl.endsWith('/') ? originUrl.slice(0, -1) : originUrl) : '';
    
    this.baseUrl = baseOriginUrl ? 
      `${baseOriginUrl}/images` : 
      '/images';
    
    this.logger.log(`图片服务初始化完成，图片基础URL: ${this.baseUrl}`);
  }

  /**
   * 模块初始化时运行一次清理，清除一周以上的图片
   */
  onModuleInit() {
    // 启动时清理7天以上的图片
    this.clearDownloadedImages(24 * 7).then(result => {
      this.logger.log(`启动时清理完成: 删除了${result.count}个图片文件，释放了${result.freedSpace}KB空间`);
    }).catch(error => {
      this.logger.error('启动时清理图片失败', error);
    });
  }

  /**
   * 每天凌晨3点自动清理3天以上的图片
   */
  @Cron('0 0 3 * * *', {
    name: 'cleanImages',
    timeZone: 'Asia/Shanghai',
  })
  async handleImageCleanupCron() {
    this.logger.log('开始执行定时图片清理任务');
    
    try {
      // 清理3天以上的图片
      const result = await this.clearDownloadedImages(24 * 3);
      this.logger.log(`定时清理完成: 删除了${result.count}个图片文件，释放了${result.freedSpace}KB空间`);
    } catch (error) {
      this.logger.error('定时清理图片失败', error);
    }
  }

  /**
   * 生成图片文件名（使用MD5哈希确保唯一性）
   */
  private generateImageFilename(url: string, extension: string = 'jpg'): string {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return `${hash}.${extension}`;
  }

  /**
   * 从URL中提取图片扩展名
   */
  private getImageExtension(url: string): string {
    // 检查URL中是否有wx_fmt参数
    if (url.includes('wx_fmt=')) {
      const match = url.match(/wx_fmt=([^&]+)/);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }

    // 从URL路径中提取扩展名
    const urlPath = new URL(url).pathname;
    const extension = path.extname(urlPath).replace('.', '');
    
    // 如果没有找到扩展名，返回默认的jpg
    return extension || 'jpg';
  }

  /**
   * 批量下载图片并保存到本地
   * @param imageUrls 图片URL数组
   * @returns 本地图片访问路径映射
   */
  async batchDownloadAndSaveImages(imageUrls: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // 使用Promise.all并发处理，但限制并发数量为5
    const batchSize = 5;
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(async (url) => {
        try {
          const localUrl = await this.downloadAndSaveImage(url);
          results.set(url, localUrl);
        } catch (error) {
          this.logger.error(`批量下载图片失败: ${url}`, error);
          results.set(url, url); // 失败时使用原始URL
        }
      });
      
      await Promise.all(batchPromises);
      
      // 防止请求过于频繁
      if (i + batchSize < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * 下载图片并保存到本地
   * @param imageUrl 图片URL
   * @returns 本地图片访问路径
   */
  async downloadAndSaveImage(imageUrl: string): Promise<string> {
    try {
      // 检查图片URL是否有效
      if (!imageUrl || !imageUrl.startsWith('http')) {
        this.logger.warn(`无效的图片URL: ${imageUrl}`);
        return imageUrl;
      }

      // 获取图片扩展名
      const extension = this.getImageExtension(imageUrl);
      
      // 生成文件名
      const filename = this.generateImageFilename(imageUrl, extension);
      const filePath = path.join(this.imageDir, filename);
      
      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        this.logger.debug(`图片已存在，跳过下载: ${filename}`);
        return `${this.baseUrl}/${filename}`;
      }
      
      this.logger.log(`开始下载图片: ${imageUrl}`);
      
      // 下载图片
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Referer': 'https://mp.weixin.qq.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 15000, // 15秒超时
      });
      
      // 保存图片
      fs.writeFileSync(filePath, response.data);
      const imageSize = Math.round(response.data.length / 1024); // KB
      this.logger.log(`图片已保存: ${filename} (${imageSize}KB)`);
      
      // 返回图片访问路径
      return `${this.baseUrl}/${filename}`;
    } catch (error) {
      this.logger.error(`下载图片失败: ${imageUrl}`, error);
      // 下载失败时返回原始URL
      return imageUrl;
    }
  }

  /**
   * 清理已下载的图片文件
   * @param exceptRecentHours 保留最近几小时内下载的图片，默认为0（全部清理）
   * @returns 清理的图片数量和释放的空间大小（KB）
   */
  async clearDownloadedImages(exceptRecentHours: number = 0): Promise<{ count: number; freedSpace: number }> {
    try {
      if (!fs.existsSync(this.imageDir)) {
        return { count: 0, freedSpace: 0 };
      }

      // 获取图片目录中的所有文件
      const files = fs.readdirSync(this.imageDir);
      let deletedCount = 0;
      let freedSpace = 0;

      // 当前时间
      const now = new Date().getTime();
      // 计算需要保留的时间阈值（毫秒）
      const exceptTime = exceptRecentHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.imageDir, file);
        
        // 确保是文件而不是目录
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;
        
        // 如果指定了保留时间，检查文件的修改时间
        if (exceptRecentHours > 0) {
          const fileTime = stat.mtimeMs;
          // 如果文件在保留时间范围内，则跳过
          if (now - fileTime < exceptTime) {
            continue;
          }
        }

        // 计算文件大小（KB）
        const fileSizeInKB = Math.round(stat.size / 1024);
        
        // 删除文件
        fs.unlinkSync(filePath);
        
        deletedCount++;
        freedSpace += fileSizeInKB;
        
        this.logger.log(`已删除图片: ${file} (${fileSizeInKB}KB)`);
      }

      this.logger.log(`清理完成，共删除 ${deletedCount} 个图片文件，释放 ${freedSpace}KB 空间`);
      return { count: deletedCount, freedSpace };
    } catch (error) {
      this.logger.error('清理图片文件失败', error);
      throw error;
    }
  }
} 