import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@server/configuration';
import { defaultCount, statusMap } from '@server/constants';
import { PrismaService } from '@server/prisma/prisma.service';
import { TRPCError, initTRPC } from '@trpc/server';
import Axios, { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { ArticleCrawler } from '@server/utils/crawler';
import { ImageService } from '@server/utils/image.service';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 读书账号每日小黑屋
 */
const blockedAccountsMap = new Map<string, string[]>();

@Injectable()
export class TrpcService {
  trpc = initTRPC.create();
  publicProcedure = this.trpc.procedure;
  protectedProcedure = this.trpc.procedure.use(({ ctx, next }) => {
    const errorMsg = (ctx as any).errorMsg;
    if (errorMsg) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: errorMsg });
    }
    return next({ ctx });
  });
  router = this.trpc.router;
  mergeRouters = this.trpc.mergeRouters;
  request: AxiosInstance;
  updateDelayTime = 60;

  private readonly logger = new Logger(this.constructor.name);
  private readonly articleCrawler: ArticleCrawler;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    public readonly imageService: ImageService,
  ) {
    const { url } =
      this.configService.get<ConfigurationType['platform']>('platform')!;
    this.updateDelayTime =
      this.configService.get<ConfigurationType['feed']>(
        'feed',
      )!.updateDelayTime;

    this.request = Axios.create({ baseURL: url, timeout: 15 * 1e3 });
    this.articleCrawler = new ArticleCrawler(this.imageService);

    this.request.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        this.logger.log('error: ', error);
        const errMsg = error.response?.data?.message || '';

        const id = (error.config.headers as any).xid;
        if (errMsg.includes('WeReadError401')) {
          // 账号失效
          await this.prismaService.account.update({
            where: { id },
            data: { status: statusMap.INVALID },
          });
          this.logger.error(`账号（${id}）登录失效，已禁用`);
        } else if (errMsg.includes('WeReadError429')) {
          //TODO 处理请求频繁
          this.logger.error(`账号（${id}）请求频繁，打入小黑屋`);
        }

        const today = this.getTodayDate();

        const blockedAccounts = blockedAccountsMap.get(today);

        if (Array.isArray(blockedAccounts)) {
          if (id) {
            blockedAccounts.push(id);
          }
          blockedAccountsMap.set(today, blockedAccounts);
        } else if (errMsg.includes('WeReadError400')) {
          this.logger.error(`账号（${id}）处理请求参数出错`);
          this.logger.error('WeReadError400: ', errMsg);
          // 10s 后重试
          await new Promise((resolve) => setTimeout(resolve, 10 * 1e3));
        } else {
          this.logger.error("Can't handle this error: ", errMsg);
        }

        return Promise.reject(error);
      },
    );
  }

  removeBlockedAccount = (vid: string) => {
    const today = this.getTodayDate();

    const blockedAccounts = blockedAccountsMap.get(today);
    if (Array.isArray(blockedAccounts)) {
      const newBlockedAccounts = blockedAccounts.filter((id) => id !== vid);
      blockedAccountsMap.set(today, newBlockedAccounts);
    }
  };

  private getTodayDate() {
    return dayjs.tz(new Date(), 'Asia/Shanghai').format('YYYY-MM-DD');
  }

  getBlockedAccountIds() {
    const today = this.getTodayDate();
    const disabledAccounts = blockedAccountsMap.get(today) || [];
    this.logger.debug('disabledAccounts: ', disabledAccounts);
    return disabledAccounts.filter(Boolean);
  }

  private async getAvailableAccount() {
    const disabledAccounts = this.getBlockedAccountIds();
    const account = await this.prismaService.account.findMany({
      where: {
        status: statusMap.ENABLE,
        NOT: {
          id: { in: disabledAccounts },
        },
      },
      take: 10,
    });

    if (!account || account.length === 0) {
      throw new Error('暂无可用读书账号!');
    }

    return account[Math.floor(Math.random() * account.length)];
  }

  async getMpArticles(mpId: string, page = 1, retryCount = 3) {
    const account = await this.getAvailableAccount();

    try {
      const res = await this.request
        .get<
          {
            id: string;
            title: string;
            picUrl: string;
            publishTime: number;
          }[]
        >(`/api/v2/platform/mps/${mpId}/articles`, {
          headers: {
            xid: account.id,
            Authorization: `Bearer ${account.token}`,
          },
          params: {
            page,
          },
        })
        .then((res) => res.data)
        .then((res) => {
          this.logger.log(
            `getMpArticles(${mpId}) page: ${page} articles: ${res.length}`,
          );
          return res;
        });
      return res;
    } catch (err) {
      this.logger.error(`retry(${4 - retryCount}) getMpArticles  error: `, err);
      if (retryCount > 0) {
        return this.getMpArticles(mpId, page, retryCount - 1);
      } else {
        throw err;
      }
    }
  }

  async refreshMpArticlesAndUpdateFeed(mpId: string, page = 1) {
    const articles = await this.getMpArticles(mpId, page);

    if (articles.length > 0) {
      let results;
      const { type } =
        this.configService.get<ConfigurationType['database']>('database')!;
      if (type === 'sqlite') {
        // sqlite3 不支持 createMany
        const inserts = articles.map(({ id, picUrl, publishTime, title }) =>
          this.prismaService.article.upsert({
            create: { id, mpId, picUrl, publishTime, title },
            update: {
              publishTime,
              title,
            },
            where: { id },
          }),
        );
        results = await this.prismaService.$transaction(inserts);
      } else {
        // SQLite 不支持 createMany 操作，所以我们使用事务和循环来替代
     const createQueries = articles.map(({ id, picUrl, publishTime, title }) => 
      this.prismaService.article.upsert({
        where: { id },
        create: {
          id,
          mpId,
          picUrl,
          publishTime,
          title,
        },
        update: {} // 如果存在则不更新
      })
    );
    
    results = await this.prismaService.$transaction(createQueries);
  }

      this.logger.debug(
        `refreshMpArticlesAndUpdateFeed create results: ${JSON.stringify(results)}`,
      );
    }

    // 如果文章数量小于 defaultCount，则认为没有更多历史文章
    const hasHistory = articles.length < defaultCount ? 0 : 1;

    await this.prismaService.feed.update({
      where: { id: mpId },
      data: {
        syncTime: Math.floor(Date.now() / 1e3),
        hasHistory,
      },
    });

    return { hasHistory };
  }

  inProgressHistoryMp = {
    id: '',
    page: 1,
  };

  async getHistoryMpArticles(mpId: string) {
    if (this.inProgressHistoryMp.id === mpId) {
      this.logger.log(`getHistoryMpArticles(${mpId}) is running`);
      return;
    }

    this.inProgressHistoryMp = {
      id: mpId,
      page: 1,
    };

    if (!this.inProgressHistoryMp.id) {
      return;
    }

    try {
      const feed = await this.prismaService.feed.findFirstOrThrow({
        where: {
          id: mpId,
        },
      });

      // 如果完整同步过历史文章，则直接返回
      if (feed.hasHistory === 0) {
        this.logger.log(`getHistoryMpArticles(${mpId}) has no history`);
        return;
      }

      const total = await this.prismaService.article.count({
        where: {
          mpId,
        },
      });
      this.inProgressHistoryMp.page = Math.ceil(total / defaultCount);

      // 最多尝试一千次
      let i = 1e3;
      while (i-- > 0) {
        if (this.inProgressHistoryMp.id !== mpId) {
          this.logger.log(
            `getHistoryMpArticles(${mpId}) is not running, break`,
          );
          break;
        }
        const { hasHistory } = await this.refreshMpArticlesAndUpdateFeed(
          mpId,
          this.inProgressHistoryMp.page,
        );
        if (hasHistory < 1) {
          this.logger.log(
            `getHistoryMpArticles(${mpId}) has no history, break`,
          );
          break;
        }
        this.inProgressHistoryMp.page++;

        await new Promise((resolve) =>
          setTimeout(resolve, this.updateDelayTime * 1e3),
        );
      }
    } finally {
      this.inProgressHistoryMp = {
        id: '',
        page: 1,
      };
    }
  }

  isRefreshAllMpArticlesRunning = false;

  async refreshAllMpArticlesAndUpdateFeed() {
    if (this.isRefreshAllMpArticlesRunning) {
      this.logger.log('refreshAllMpArticlesAndUpdateFeed is running');
      return;
    }
    const mps = await this.prismaService.feed.findMany();
    this.isRefreshAllMpArticlesRunning = true;
    try {
      for (const { id } of mps) {
        await this.refreshMpArticlesAndUpdateFeed(id);

        await new Promise((resolve) =>
          setTimeout(resolve, this.updateDelayTime * 1e3),
        );
      }
    } finally {
      this.isRefreshAllMpArticlesRunning = false;
    }
  }

  async getMpInfo(url: string) {
    url = url.trim();
    const account = await this.getAvailableAccount();

    return this.request
      .post<
        {
          id: string;
          cover: string;
          name: string;
          intro: string;
          updateTime: number;
        }[]
      >(
        `/api/v2/platform/wxs2mp`,
        { url },
        {
          headers: {
            xid: account.id,
            Authorization: `Bearer ${account.token}`,
          },
        },
      )
      .then((res) => res.data);
  }

  async createLoginUrl() {
    return this.request
      .get<{
        uuid: string;
        scanUrl: string;
      }>(`/api/v2/login/platform`)
      .then((res) => res.data);
  }

  async getLoginResult(id: string) {
    return this.request
      .get<{
        message: string;
        vid?: number;
        token?: string;
        username?: string;
      }>(`/api/v2/login/platform/${id}`, { timeout: 120 * 1e3 })
      .then((res) => res.data);
  }

  /**
   * 爬取文章内容
   * @param articleId 文章ID
   * @returns 文章内容信息
   */
  async getArticleContent(articleId: string) {
    // 查找文章是否存在
    const article = await this.prismaService.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `未找到文章: ${articleId}`,
      });
    }

    // 如果文章已经爬取过内容，直接返回
    if (article.isCrawled === 1 && article.content) {
      return {
        ...article,
        content: article.content,
      };
    }

    // 爬取文章内容
    const result = await this.articleCrawler.crawlArticleContent(articleId);

    if (!result) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: '爬取文章内容失败',
      });
    }

    // 更新文章内容和爬取状态
    const updatedArticle = await this.prismaService.article.update({
      where: { id: articleId },
      data: {
        content: result.content,
        isCrawled: 1,
        // 如果原文没有封面图或封面图是占位图，则使用爬取的封面图
        picUrl: article.picUrl.includes('placeholder') ? result.coverImg : article.picUrl,
      },
    });

    return updatedArticle;
  }

  /**
   * 提取HTML内容中的纯文本
   * @param htmlContent HTML内容
   * @returns 提取后的纯文本
   */
  private extractTextFromHtml(htmlContent: string): string {
    // 1. 移除所有CSS样式块
    let text = htmlContent.replace(/<style[\s\S]*?<\/style>/gi, '');
    
    // 2. 移除所有HTML标签及其属性
    text = text.replace(/<[^>]*>/g, ' ');
    
    // 3. 移除所有HTML实体
    text = text.replace(/&[a-zA-Z]+;/g, ' ')
               .replace(/&[#][0-9]+;/g, ' ')
               .replace(/&quot;/g, '"')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&nbsp;/g, ' ');
    
    // 4. 移除所有CSS样式内容（包括内联样式）
    text = text.replace(/style="[^"]*"/gi, '')
               .replace(/style='[^']*'/gi, '')
               .replace(/style=[^>]*/gi, '')
               .replace(/class="[^"]*"/gi, '')
               .replace(/class='[^']*'/gi, '')
               .replace(/class=[^>]*/gi, '')
               .replace(/id="[^"]*"/gi, '')
               .replace(/id='[^']*'/gi, '')
               .replace(/id=[^>]*/gi, '');
    
    // 5. 移除所有JavaScript代码
    text = text.replace(/javascript:[^"']*["']/gi, '')
               .replace(/on\w+="[^"]*"/gi, '')
               .replace(/on\w+='[^']*'/gi, '');
    
    // 6. 移除所有注释
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    
    // 7. 移除所有CSS属性值
    text = text.replace(/[a-zA-Z-]+:\s*[^;]+;/g, '');
    
    // 8. 移除所有空白字符（包括空格、制表符、换行符等）
    text = text.replace(/\s+/g, ' ')
               .replace(/\n+/g, ' ')
               .replace(/\r+/g, ' ')
               .replace(/\t+/g, ' ');
    
    // 9. 移除所有特殊字符，只保留中文、英文、数字和基本标点符号
    text = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?，。！？]/g, '');
    
    // 10. 移除多余空格并修剪
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  /**
   * 调用大模型API分析文章
   * @param title 文章标题
   * @param content 文章内容
   * @returns 分析结果，包含评分和理由
   */
  async analyzeArticle(title: string, content: string): Promise<{ score: number, reason: string }> {
    try {
      // 检查文章是否已有分析结果
      const existingArticle = await this.prismaService.article.findFirst({
        where: {
          title: title,
          content: content,
          AND: [
            { aiScore: { not: null } },
            { aiReason: { not: null } }
          ]
        }
      });

      if (existingArticle) {
        this.logger.log(`文章已有分析结果，直接返回: ${title}`);
        return {
          score: existingArticle.aiScore || 0,
          reason: existingArticle.aiReason || ''
        };
      }

      // 大模型API配置
      const apiUrl = 'https://api.coze.cn/v3/chat';
      const token = 'pat_8rJhqLAHFCVf2SiBDYZ78jaohmjwU4nZedwndJvXhazt9zllzU4kqdikZ3LLni1U';
      const botId = '7487231867155529769';
      
      // 提取纯文本内容，并清理格式
      const plainTextContent = this.extractTextFromHtml(content);
      
      // 不再限制内容长度，直接使用提取后的纯文本
      this.logger.log(`开始分析文章: ${title.substring(0, 30)}...`);
      this.logger.debug(`提取后的纯文本内容长度: ${plainTextContent.length}`);
      
      // 检查内容是否为空
      if (!plainTextContent || plainTextContent.length === 0) {
        this.logger.warn(`文章内容为空，无法进行分析: ${title}`);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '文章内容为空，无法进行分析',
        });
      }
      
      // 构建请求体 - 直接使用非流式模式
      const requestBody = {
        bot_id: botId,
        user_id: `wewe-rss-user-${Date.now()}`,
        stream: true,  // 必须设置为true，因为auto_save_history为false时需要流式输出
        auto_save_history: false, // 不保存历史记录
        additional_messages: [
          {
            role: 'user',
            content: `标题：${title}
内容：${plainTextContent}`,
            content_type: 'text'
          }
        ]
      };
      
      // 发送请求
      this.logger.log(`准备调用大模型API，Bot ID: ${botId}, 文章: ${title}`);
      
      // 最大重试次数
      const maxRetries = 3;
      let retryCount = 0;
      let response;
      
      // 使用重试逻辑，但直接用非流式API
      while (retryCount < maxRetries) {
        try {
          response = await Axios.post(apiUrl, requestBody, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream'
            },
            timeout: 60000, // 增加超时时间到60秒
            responseType: 'text' // 必须设置为text以正确处理流式响应
          });
          
          // 解析流式响应结果
          if (response.status === 200 && response.data) {
            // 如果是流式响应，需要解析事件流
            const responseData = response.data;
            this.logger.debug(`收到流式响应，长度：${responseData.length}`);
            
            let fullMessage = '';
            const lines = responseData.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const eventData = line.substring(5).trim();
                
                // 结束标记
                if (eventData === '[DONE]') continue;
                
                try {
                  const parsedData = JSON.parse(eventData);
                  if (parsedData.type === 'answer' && parsedData.content) {
                    fullMessage = parsedData.content;
                    this.logger.debug(`获取到完整消息，长度: ${fullMessage.length}`);
                  }
                } catch (e) {
                  const err = e as Error;
                  this.logger.debug(`解析事件数据失败: ${err.message}`);
                }
              }
            }
            
            if (fullMessage) {
              // 将解析出的完整消息重组为正常响应格式
              response = { 
                status: 200,
                data: {
                  data: {
                    messages: [{ content: fullMessage }]
                  }
                }
              };
              break;
            } else {
              this.logger.warn('未能从流式响应中提取完整消息，重试');
              throw new Error('未能从流式响应中提取完整消息');
            }
          } else {
            // 检查响应状态码
            if (response.status !== 200) {
              this.logger.error(`API返回非200状态码: ${response.status}`);
              throw new Error(`API调用失败，状态码: ${response.status}`);
            }
            
            // 验证响应数据结构
            if (!response.data || typeof response.data !== 'string' && !response.data.data) {
              this.logger.error(`API返回数据结构异常: ${JSON.stringify(response.data)}`);
              throw new Error('API返回数据结构异常');
            }
            
            break;
          }
        } catch (error) {
          retryCount++;
          const err = error as any;
          
          this.logger.warn(`API调用失败，正在进行第${retryCount}次重试... 错误: ${err.message}`);
          
          // 如果已经达到最大重试次数，则抛出异常
          if (retryCount >= maxRetries) {
            throw error;
          }
          
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }
      
      // 验证消息内容
      if (!response.data.data.messages || !response.data.data.messages.length) {
        this.logger.error(`API返回消息为空: ${JSON.stringify(response.data)}`);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'API返回消息为空',
        });
      }
      
      // 从响应中提取消息内容
      const message = response.data?.data?.messages?.[0]?.content || '';
      this.logger.debug(`收到API返回: ${message}`);
      
      if (!message || message.length === 0) {
        this.logger.error(`API返回内容为空`);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'API返回内容为空',
        });
      }
      
      // JSON提取方法
      let result: { score?: number, reason?: string } = {};
      
      // 记录详细的解析过程以便调试
      this.logger.debug(`开始解析API返回的JSON数据，原始内容长度: ${message.length}`);
      
      // 方法1: 直接尝试解析整个消息
      try {
        // 首先尝试直接将整个消息解析为JSON
        const parsedJson = JSON.parse(message);
        if (parsedJson && 'score' in parsedJson && 'reason' in parsedJson) {
          this.logger.log(`方法1成功: 直接将整个消息解析为JSON`);
          result = parsedJson;
        }
      } catch (error) {
        // 捕获类型化的异常
        const e = error as Error;
        this.logger.debug(`方法1失败: 直接解析JSON失败: ${e.message}`);
      }
      
      // 方法2: 使用正则表达式查找JSON对象
      if (!('score' in result) && message) {
        try {
          // 使用非贪婪模式匹配，确保只提取一个完整的JSON对象
          const jsonRegex = /(\{[\s\S]*?"score"[\s\S]*?"reason"[\s\S]*?\})/;
          const match = message.match(jsonRegex);
          
          if (match && match[1]) {
            const jsonStr = match[1];
            this.logger.debug(`方法2: 找到JSON字符串: ${jsonStr.substring(0, 50)}...`);
            
            const parsedJson = JSON.parse(jsonStr);
            if (parsedJson && 'score' in parsedJson && 'reason' in parsedJson) {
              this.logger.log(`方法2成功: 使用正则表达式提取并解析JSON`);
              result = parsedJson;
            }
          } else {
            this.logger.debug(`方法2失败: 未找到匹配的JSON对象`);
          }
        } catch (error) {
          const e = error as Error;
          this.logger.debug(`方法2失败: 解析提取的JSON失败: ${e.message}`);
        }
      }
      
      // 方法3: 尝试查找数字分数和原因文本
      if (!('score' in result) && message) {
        try {
          // 匹配分数
          const scoreRegex = /得分[：:]\s*(\d+)/i;
          const scoreMatch = message.match(scoreRegex);
          
          // 匹配评分理由
          const reasonRegex = /(?:评分理由|理由)[：:]\s*(.+?)(?:\n|$)/i;
          const reasonMatch = message.match(reasonRegex);
          
          if (scoreMatch && reasonMatch) {
            const score = parseInt(scoreMatch[1], 10);
            const reason = reasonMatch[1].trim();
            
            this.logger.log(`方法3成功: 使用自定义正则表达式提取分数(${score})和理由`);
            result = { score, reason };
          } else {
            this.logger.debug(`方法3失败: 未找到匹配的分数和理由`);
          }
        } catch (error) {
          const e = error as Error;
          this.logger.debug(`方法3失败: ${e.message}`);
        }
      }
      
      // 检查是否成功提取评分信息
      if (!('score' in result) || !('reason' in result)) {
        this.logger.error(`无法从API响应中提取评分信息: ${message.substring(0, 200)}`);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '无法从API响应中提取评分信息',
        });
      }
      
      // 确保评分在0-100之间
      const score = Math.max(0, Math.min(100, result.score || 0));
      const reason = result.reason || '';
      
      this.logger.log(`API调用完成，得分: ${score}`);
      
      return { score, reason };
    } catch (error) {
      // 使用类型断言处理未知错误类型
      const err = error as any;
      this.logger.error(`调用大模型API失败: ${err.message || '未知错误'}`);
      
      // 如果错误对象有response属性，记录更多信息
      if (err.response) {
        this.logger.error(`API返回状态码: ${err.response.status}`);
        this.logger.error(`API返回数据: ${JSON.stringify(err.response.data)}`);
      }
      
      // 不再返回默认评分，而是抛出错误
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: '调用大模型API失败',
        cause: err,
      });
    }
  }
}
