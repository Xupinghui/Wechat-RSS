import * as cheerio from 'cheerio';
import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { ImageService } from './image.service';

@Injectable()
export class ArticleCrawler {
  private readonly logger = new Logger(ArticleCrawler.name);

  constructor(private readonly imageService: ImageService) {}

  /**
   * 爬取微信公众号文章内容
   * @param articleId 文章ID
   * @returns 返回文章内容和封面图
   */
  async crawlArticleContent(articleId: string): Promise<{ content: string; coverImg: string } | null> {
    try {
      const url = `https://mp.weixin.qq.com/s/${articleId}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: 10000 // 10秒超时
      });

      if (response.status !== 200) {
        this.logger.error(`爬取文章失败：文章ID ${articleId}, 状态码 ${response.status}`);
        return null;
      }

      const html = response.data;
      const $ = cheerio.load(html);
      
      // 获取文章内容区域
      const contentElement = $('#js_content');
      
      // 处理所有图片，下载并保存到本地
      const imagePromises: Promise<void>[] = [];
      contentElement.find('img').each((_, img) => {
        const $img = $(img);
        const dataSrc = $img.attr('data-src');
        if (dataSrc) {
          // 创建图片下载任务
          const promise = this.imageService.downloadAndSaveImage(dataSrc)
            .then(localUrl => {
              $img.attr('src', localUrl);
              $img.removeAttr('data-src');
              // 确保图片显示正常
              $img.removeAttr('data-w'); // 移除微信特有的宽度属性
              $img.removeAttr('data-ratio'); // 移除比例属性
              $img.attr('style', 'max-width: 100%; height: auto; display: block;');
            });
          imagePromises.push(promise);
        }
      });
      
      // 等待所有图片下载完成
      await Promise.all(imagePromises);

      // 修复样式问题 - 注意不要移除所有样式，因为这会影响图片显示
      contentElement.find('*').each((_, el) => {
        const $el = $(el);
        // 保留图片的样式
        if ($el.prop('tagName') !== 'IMG') {
          $el.removeAttr('style');
        }
        $el.removeAttr('class');
        $el.removeAttr('id');
      });

      // 保存文章样式
      contentElement.find('p').attr('style', 'margin-bottom: 1rem; line-height: 1.6;');
      contentElement.find('h1, h2, h3, h4, h5, h6').attr('style', 'margin-top: 1.5rem; margin-bottom: 1rem; font-weight: bold;');
      contentElement.find('a').attr('style', 'color: #3182ce; text-decoration: none;');
      contentElement.find('blockquote').attr('style', 'border-left: 4px solid #e2e8f0; padding-left: 1rem; margin-left: 0; margin-right: 0; color: #4a5568;');
      
      // 获取文章封面图
      let coverImg = '';
      const ogImageMeta = $('meta[property="og:image"]');
      if (ogImageMeta.length) {
        const originalCoverImg = ogImageMeta.attr('content') || '';
        // 下载封面图到本地
        if (originalCoverImg) {
          coverImg = await this.imageService.downloadAndSaveImage(originalCoverImg);
        }
      } else {
        // 尝试获取文章中的第一张图片作为封面
        const firstImg = contentElement.find('img').first();
        if (firstImg.length) {
          const originalSrc = firstImg.attr('src') || firstImg.attr('data-src') || '';
          // 下载封面图到本地
          if (originalSrc) {
            coverImg = await this.imageService.downloadAndSaveImage(originalSrc);
          }
        }
      }

      // 处理视频标签
      contentElement.find('iframe').each((_, iframe) => {
        const $iframe = $(iframe);
        const src = $iframe.attr('data-src') || $iframe.attr('src');
        if (src) {
          $iframe.attr('src', src);
          $iframe.attr('style', 'max-width: 100%; width: 100%; height: 250px;');
          $iframe.removeAttr('data-src');
        }
      });

      // 处理可能存在的代码块
      contentElement.find('pre').attr('style', 'background-color: #f7fafc; padding: 1rem; border-radius: 0.25rem; overflow-x: auto;');
      contentElement.find('code').attr('style', 'font-family: monospace;');

      // 提取内容HTML
      const contentHtml = contentElement.html() || '';
      
      // 添加一些基本CSS样式
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
    } catch (error) {
      this.logger.error(`爬取文章异常：文章ID ${articleId}`, error);
      return null;
    }
  }
} 