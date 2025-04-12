import axios from 'axios';
import { Logger } from '@nestjs/common';

class FeishuService {
  // 将应用ID和密钥改为有效值
  private readonly appId = 'cli_your_app_id'; // 请替换为有效的飞书应用ID
  private readonly appSecret = 'your_app_secret'; // 请替换为有效的飞书应用密钥
  private readonly logger = new Logger('FeishuService');
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;
  private appToken: string | null = null;
  private bitableId: string | null = null;
  private tableId: string | null = null;

  // 获取飞书访问令牌
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        {
          app_id: this.appId,
          app_secret: this.appSecret,
        }
      );

      if (response.data.code === 0) {
        this.accessToken = response.data.tenant_access_token;
        // 设置过期时间（提前5分钟过期，以保证安全）
        this.tokenExpireTime = Date.now() + (response.data.expire - 300) * 1000;
        return this.accessToken as string;
      } else {
        throw new Error(`获取飞书访问令牌失败: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      this.logger.error('获取飞书访问令牌出错:', error);
      throw new Error('获取飞书访问令牌失败');
    }
  }

  // 带重试的API调用
  private async callApiWithRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000,
    apiName: string = 'API'
  ): Promise<T> {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`${apiName} 调用尝试 ${attempt}/${maxRetries}`);
        const result = await apiCall();
        return result;
      } catch (error) {
        lastError = error;
        this.logger.error(`${apiName} 调用失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
        
        // 检查是否是404错误
        if (error.response && error.response.status === 404) {
          this.logger.error(`API端点不存在(404错误)，可能是API地址错误或API版本已更新`);
          throw new Error(`调用飞书API失败: 接口地址不存在(404错误)，请检查API地址是否正确或飞书API是否有更新`);
        }
        
        // 如果是不可重试的错误，直接抛出
        if (error.response && 
            (error.response.status === 400 || 
             error.response.status === 401 || 
             error.response.status === 403)) {
          throw error;
        }
        
        // 如果不是最后一次尝试，则等待后重试
        if (attempt < maxRetries) {
          const waitTime = retryDelay * attempt;
          this.logger.log(`等待 ${waitTime}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          this.logger.error(`${apiName} 调用在 ${maxRetries} 次尝试后失败`);
        }
      }
    }
    
    throw lastError;
  }

  // 创建多维表格应用
  private async createBitable(): Promise<{ bitableId: string; appToken: string }> {
    // 检查AppID和AppSecret是否有效
    if (!this.appId || !this.appSecret) {
      throw new Error('请确保已正确配置有效的飞书应用ID和密钥');
    }
    
    return this.callApiWithRetry(async () => {
      const accessToken = await this.getAccessToken();
      
      this.logger.log('开始创建多维表格应用');
      
      // 参考官方 Java SDK 示例，优化请求体结构
      const requestBody = {
        app: {
          name: '公众号文章分析',
          description: '自动同步最近10小时内的公众号文章',
          // 增加时区设置，提高兼容性
          time_zone: 'Asia/Shanghai'
        }
      };
      
      this.logger.log(`创建多维表格请求体: ${JSON.stringify(requestBody)}`);
      
      const appResponse = await axios.post(
        'https://open.feishu.cn/open-apis/bitable/v1/apps',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          timeout: 15000 // 增加超时时间
        }
      );

      this.logger.log(`多维表格应用创建响应状态码: ${appResponse.status}`);

      if (appResponse.data.code !== 0) {
        throw new Error(`创建多维表格应用失败: ${JSON.stringify(appResponse.data)}`);
      }

      // 标准化提取响应数据
      let appToken: string | null = null;
      let bitableId: string | null = null;
      
      if (appResponse.data.data && appResponse.data.data.app) {
        const app = appResponse.data.data.app;
        appToken = app.app_token;
        bitableId = app.app_id;
        this.logger.log(`从标准路径获取到 appToken: ${appToken}, bitableId: ${bitableId}`);
      }
      
      // 兜底措施
      if (!appToken || !bitableId) {
        appToken = this.deepSearchForKey(appResponse.data, ['app_token']);
        bitableId = this.deepSearchForKey(appResponse.data, ['app_id']);
      }

      if (!appToken || !bitableId) {
        throw new Error(`创建多维表格应用成功，但无法获取必要信息，请重试`);
      }

      this.logger.log(`多维表格应用创建成功，appToken: ${appToken}, bitableId: ${bitableId}`);
      this.appToken = appToken;
      this.bitableId = bitableId;

      return { bitableId, appToken };
    }, 3, 2000, '创建多维表格应用');
  }

  // 创建表格
  private async createTable(): Promise<string> {
    return this.callApiWithRetry(async () => {
      if (!this.appToken || !this.bitableId) {
        const { appToken, bitableId } = await this.createBitable();
        this.appToken = appToken;
        this.bitableId = bitableId;
      }

      this.logger.log(`开始在多维表格应用中创建数据表, appToken: ${this.appToken}`);

      const accessToken = await this.getAccessToken();
      
      // 参考官方Java SDK示例，使用一步到位创建表格和字段的方式
      const requestBody = {
        table: {
          name: `公众号文章 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
          default_view_name: "默认视图",
          fields: [
            {
              field_name: '公众号名称',
              type: 1, // 文本类型
              property: {}
            },
            {
              field_name: '文章名称',
              type: 1, // 文本类型
              property: {}
            },
            {
              field_name: '文章发布时间',
              type: 5, // 日期时间类型
              property: {
                date_formatter: "yyyy-MM-dd HH:mm"
              }
            },
            {
              field_name: '同步到飞书时间',
              type: 5, // 日期时间类型
              property: {
                date_formatter: "yyyy-MM-dd HH:mm"
              }
            },
            {
              field_name: '阅读状态',
              type: 3, // 单选类型
              ui_type: "SingleSelect",
              property: {
                options: [
                  {
                    name: "未读",
                    color: 0
                  },
                  {
                    name: "已读",
                    color: 1
                  },
                  {
                    name: "已归档",
                    color: 2
                  }
                ]
              }
            },
            {
              field_name: '文章内容文本详情',
              type: 1, // 文本类型
              property: {
                text_formatter: 0 // 纯文本格式
              }
            }
          ]
        }
      };
      
      this.logger.log(`创建数据表请求体: ${JSON.stringify(requestBody)}`);

      const createTableResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          timeout: 15000
        }
      );

      this.logger.log(`创建数据表响应状态码: ${createTableResponse.status}`);

      if (createTableResponse.data.code !== 0) {
        // 如果一步创建失败，回退到分步创建
        this.logger.warn(`一步创建表格和字段失败，尝试分步创建。错误: ${JSON.stringify(createTableResponse.data)}`);
        return this.createTableStepByStep();
      }

      // 标准化提取表格ID
      let tableId: string | null = null;

      if (createTableResponse.data.data && createTableResponse.data.data.table && createTableResponse.data.data.table.table_id) {
        tableId = createTableResponse.data.data.table.table_id;
        this.logger.log(`从标准路径获取到表格ID: ${tableId}`);
      } else {
        tableId = this.deepSearchForKey(createTableResponse.data, ['table_id']);
        if (tableId) {
          this.logger.log(`通过深度搜索获取到表格ID: ${tableId}`);
        }
      }

      if (!tableId) {
        throw new Error('创建数据表成功，但无法获取表格ID');
      }

      this.tableId = tableId;
      this.logger.log(`数据表创建成功，表格ID: ${tableId}`);
      
      return tableId;
    }, 3, 2000, '创建数据表');
  }

  // 分步创建表格（作为备选方案）
  private async createTableStepByStep(): Promise<string> {
    this.logger.log('开始分步创建表格...');
    const accessToken = await this.getAccessToken();
    
    // 先创建空表格
    const emptyTableReqBody = {
      table: {
        name: `公众号文章 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        default_view_name: "默认视图"
      }
    };
    
    const createTableResponse = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables`,
      emptyTableReqBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 15000
      }
    );

    if (createTableResponse.data.code !== 0) {
      throw new Error(`创建数据表失败: ${JSON.stringify(createTableResponse.data)}`);
    }

    // 提取表格ID
    let tableId: string | null = null;
    
    if (createTableResponse.data.data && createTableResponse.data.data.table) {
      tableId = createTableResponse.data.data.table.table_id;
    }
    
    if (!tableId) {
      tableId = this.deepSearchForKey(createTableResponse.data, ['table_id']);
    }

    if (!tableId) {
      throw new Error('创建数据表成功，但无法获取表格ID');
    }

    this.tableId = tableId;
    this.logger.log(`空表格创建成功，ID: ${tableId}，接下来创建字段`);

    // 然后创建字段，修复类型不兼容问题
    if (this.appToken) {
      await this.createTableFields(this.appToken, tableId);
    } else {
      this.logger.error('未找到有效的appToken，无法创建字段');
    }
    
    return tableId;
  }

  // 创建表格字段
  private async createTableFields(appToken: string, tableId: string): Promise<void> {
    return this.callApiWithRetry(async () => {
      const accessToken = await this.getAccessToken();
      
      // 优化字段定义，与Java SDK示例保持一致
      const fields = [
        {
          field_name: '公众号名称',
          type: 1, // 文本类型
          property: {}
        },
        {
          field_name: '文章名称',
          type: 1, // 文本类型
          property: {}
        },
        {
          field_name: '文章发布时间',
          type: 5, // 日期时间类型
          property: {
            date_formatter: "yyyy-MM-dd HH:mm"
          }
        },
        {
          field_name: '同步到飞书时间',
          type: 5, // 日期时间类型
          property: {
            date_formatter: "yyyy-MM-dd HH:mm"
          }
        },
        {
          field_name: '阅读状态',
          type: 3, // 单选类型
          ui_type: "SingleSelect",
          property: {
            options: [
              {
                name: "未读",
                color: 0
              },
              {
                name: "已读",
                color: 1
              },
              {
                name: "已归档",
                color: 2
              }
            ]
          }
        },
        {
          field_name: '文章内容文本详情',
          type: 1, // 文本类型
          property: {
            text_formatter: 0 // 纯文本格式
          }
        }
      ];

      this.logger.log(`开始创建字段，共${fields.length}个字段`);

      // 优化错误处理
      const createdFields: string[] = [];
      const failedFields: string[] = [];

      for (const fieldData of fields) {
        this.logger.log(`创建字段: ${fieldData.field_name}`);
        
        try {
          const response = await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
            fieldData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              timeout: 10000
            }
          );

          if (response.data.code !== 0) {
            this.logger.error(`创建字段 ${fieldData.field_name} 失败: ${JSON.stringify(response.data)}`);
            failedFields.push(fieldData.field_name);
          } else {
            this.logger.log(`创建字段 ${fieldData.field_name} 成功`);
            createdFields.push(fieldData.field_name);
          }
        } catch (error) {
          this.logger.error(`创建字段 ${fieldData.field_name} 出错:`, error);
          failedFields.push(fieldData.field_name);
          // 继续创建其他字段，不中断
        }
        
        // 添加短暂延迟，避免API限流
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.logger.log(`字段创建完成，成功: ${createdFields.length}个，失败: ${failedFields.length}个`);
      
      if (failedFields.length > 0) {
        this.logger.warn(`以下字段创建失败: ${failedFields.join(', ')}`);
      }
    }, 3, 2000, '创建表格字段');
  }

  // 从响应中查找表格 ID
  private findTableIdFromResponse(responseData: any): string | null {
    // 记录完整的响应内容用于调试
    this.logger.log(`尝试从响应中查找 table_id，响应数据: ${JSON.stringify(responseData)}`);
    
    // 列出可能的路径
    const possiblePaths = [
      ['data', 'table', 'table_id'],
      ['data', 'tableId'],
      ['data', 'table_id'],
      ['data', 'id'],
      ['data', 'table', 'id']
    ];
    
    // 尝试所有可能的路径
    for (const path of possiblePaths) {
      let current = responseData;
      let valid = true;
      
      // 遍历路径的每一部分
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          valid = false;
          break;
        }
      }
      
      // 如果路径有效且结果是字符串，则返回该值
      if (valid && typeof current === 'string') {
        this.logger.log(`找到 table_id: ${current}，匹配路径: ${path.join('.')}`);
        return current;
      }
    }
    
    // 如果找不到标准路径，尝试深度优先搜索
    const foundId = this.deepSearchForKey(responseData, ['table_id', 'tableId', 'id']);
    if (foundId) {
      this.logger.log(`通过深度搜索找到 ID: ${foundId}`);
      return foundId;
    }
    
    return null;
  }
  
  // 深度搜索对象中的键
  private deepSearchForKey(obj: any, possibleKeys: string[]): string | null {
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    
    // 遍历可能的键名
    for (const key of possibleKeys) {
      if (key in obj && typeof obj[key] === 'string') {
        return obj[key];
      }
    }
    
    // 递归搜索子对象
    for (const value of Object.values(obj)) {
      if (typeof value === 'object') {
        const result = this.deepSearchForKey(value, possibleKeys);
        if (result) {
          return result;
        }
      }
    }
    
    return null;
  }

  // 获取已存在的多维表格信息
  private async getBitableInfo(): Promise<{ appToken: string; tableId: string }> {
    try {
      const accessToken = await this.getAccessToken();
      
      this.logger.log('开始获取多维表格列表');
      
      // 获取多维表格列表
      const listResponse = await axios.get(
        'https://open.feishu.cn/open-apis/bitable/v1/apps',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (listResponse.data.code !== 0) {
        throw new Error(`获取多维表格列表失败: ${JSON.stringify(listResponse.data)}`);
      }

      this.logger.log(`获取到 ${listResponse.data.data.items.length} 个多维表格应用`);
      
      // 查找"公众号文章分析"应用
      const targetApp = listResponse.data.data.items.find(
        (app: any) => app.name === '公众号文章分析'
      );

      if (!targetApp) {
        throw new Error('未找到公众号文章分析应用');
      }

      this.logger.log(`找到目标应用: ${targetApp.name}, appToken: ${targetApp.app_token}`);
      
      const appToken = targetApp.app_token;

      this.logger.log('开始获取表格列表');
      // 获取表格列表
      const tablesResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (tablesResponse.data.code !== 0) {
        throw new Error(`获取表格列表失败: ${JSON.stringify(tablesResponse.data)}`);
      }

      this.logger.log(`获取到 ${tablesResponse.data.data.items.length} 个表格`);
      
      // 查找"公众号文章分析"表格
      const targetTable = tablesResponse.data.data.items.find(
        (table: any) => table.name === '公众号文章分析'
      );

      if (!targetTable) {
        throw new Error('未找到公众号文章分析表格');
      }

      this.logger.log(`找到目标表格: ${targetTable.name}, tableId: ${targetTable.table_id}`);
      
      return { appToken, tableId: targetTable.table_id };
    } catch (error) {
      this.logger.error('获取多维表格信息出错:', error);
      
      // 如果是网络错误或API错误，添加详细信息
      if (error.response) {
        this.logger.error(`API响应状态: ${error.response.status}`);
        this.logger.error(`API响应数据: ${JSON.stringify(error.response.data)}`);
      }
      
      throw error;
    }
  }

  // 检查飞书应用权限
  private async checkAppPermissions(): Promise<boolean> {
    return this.callApiWithRetry(async () => {
      this.logger.log('开始检查飞书应用权限');
      
      // 检查app_id和app_secret是否已正确配置
      if (!this.appId || !this.appSecret) {
        this.logger.error('应用ID或密钥未正确配置');
        return false;
      }
      
      try {
        // 验证应用凭证
        this.logger.log('尝试获取租户访问凭证以验证应用凭证');
        const tokenResponse = await axios.post(
          'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
          {
            app_id: this.appId,
            app_secret: this.appSecret
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        
        if (tokenResponse.data.code !== 0) {
          this.logger.error(`租户访问凭证获取失败: ${JSON.stringify(tokenResponse.data)}`);
          this.logger.error(`错误码 ${tokenResponse.data.code} 表示: ${this.getErrorCodeMeaning(tokenResponse.data.code)}`);
          return false;
        }
        
        this.logger.log('租户访问凭证获取成功，应用凭证有效');
        
        // 验证是否有多维表格访问权限
        try {
          const accessToken = await this.getAccessToken();
          this.logger.log('尝试访问多维表格列表以验证权限');
          
          const bitableResponse = await axios.get(
            'https://open.feishu.cn/open-apis/bitable/v1/apps',
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              },
              timeout: 10000
            }
          );
          
          if (bitableResponse.data.code === 0) {
            this.logger.log('多维表格列表访问成功，应用具有多维表格访问权限');
            return true;
          } else {
            this.logger.error(`多维表格列表访问失败: ${JSON.stringify(bitableResponse.data)}`);
            this.logger.error(`错误码 ${bitableResponse.data.code} 表示: ${this.getErrorCodeMeaning(bitableResponse.data.code)}`);
            
            if (bitableResponse.data.code === 11403) {
              this.logger.error('应用未获得"多维表格"权限，请在飞书开放平台应用管理中添加该权限并发布应用');
            }
            
            return false;
          }
        } catch (bitableError) {
          this.logger.error('访问多维表格列表出错:', bitableError);
          if (bitableError.response) {
            this.logger.error(`HTTP状态码: ${bitableError.response.status}`);
            this.logger.error(`响应数据: ${JSON.stringify(bitableError.response.data)}`);
            
            // 检查常见权限问题
            if (bitableError.response.status === 403) {
              this.logger.error('HTTP 403错误：应用缺少必要权限，请确保应用已添加"多维表格"权限并已发布');
            } else if (bitableError.response.status === 401) {
              this.logger.error('HTTP 401错误：访问令牌无效或已过期');
            }
          } else if (bitableError.code === 'ECONNABORTED') {
            this.logger.error('请求超时，请检查网络连接');
          } else {
            this.logger.error(`错误详情: ${bitableError.message}`);
          }
          
          return false;
        }
      } catch (error) {
        this.logger.error('检查应用权限过程出错:', error);
        if (error.response) {
          this.logger.error(`HTTP状态码: ${error.response.status}`);
          this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
        } else if (error.code) {
          this.logger.error(`错误代码: ${error.code}`);
        }
        
        return false;
      }
    }, 3, 2000, '检查应用权限');
  }

  // 获取错误码含义
  private getErrorCodeMeaning(code: number): string {
    const errorCodes: Record<number, string> = {
      11200: '应用未通过审核或已下架',
      11201: '用户未安装该应用',
      11403: '应用权限不足，未获得所需权限',
      11400: '参数格式错误',
      11404: '资源不存在',
      11429: '请求过于频繁，已被限流',
      11313: 'Tenant access token 不存在',
      11314: 'Tenant access token 已过期',
      11350: '多维表格相关权限不足',
      99991663: '指定的多维表格不存在，或者用户没有访问权限',
      // 增加更多错误码解释
      11304: '获取 access_token 时 app_id 或 app_secret 错误',
      11332: '应用没有被租户安装',
      63024: '多维表格操作失败',
      28000: '请求参数不合法，请检查参数格式',
      20102: '操作失败，请稍后重试'
    };
    
    return errorCodes[code] || '未知错误';
  }

  // 同步文章到飞书
  public async syncArticlesToFeishu(
    articles: any[],
    mpNameMap: Record<string, string>
  ): Promise<any> {
    try {
      this.logger.log(`开始同步文章到飞书，共 ${articles.length} 篇文章`);
      
      // 初始化服务并检查权限
      const initResult = await this.initialize();
      if (!initResult.success) {
        return {
          success: false,
          message: `无法同步到飞书：${initResult.message}`,
        };
      }
      
      let appToken = this.appToken;
      let tableId = this.tableId;

      // 获取10小时前的时间戳
      const tenHoursAgo = Math.floor(Date.now() / 1000) - 10 * 60 * 60;
      
      // 过滤10小时内的文章
      const recentArticles = articles.filter(article => article.publishTime >= tenHoursAgo);
      
      this.logger.log(`过滤后的近10小时文章数量: ${recentArticles.length}`);
      
      if (recentArticles.length === 0) {
        return {
          success: false,
          message: '没有近10小时内的文章需要同步',
        };
      }

      // 如果没有表格信息，则尝试创建新表格
      if (!appToken || !tableId) {
        this.logger.log('没有现有表格信息，准备创建新表格');
        
        try {
          // 创建多维表格应用
          this.logger.log('开始创建多维表格应用');
          const { appToken: newAppToken } = await this.createBitable();
          this.logger.log(`多维表格应用创建成功，appToken=${newAppToken}`);
          
          // 创建表格
          this.logger.log('开始创建表格');
          tableId = await this.createTable();
          this.logger.log(`表格创建成功，tableId=${tableId}`);
          
          appToken = newAppToken;
        } catch (createErr) {
          this.logger.error('创建表格失败', createErr);
          
          // 提供更友好的错误消息
          let errorMessage = `创建表格失败: ${createErr.message}`;
          
          if (createErr.response) {
            const status = createErr.response.status;
            if (status === 403) {
              errorMessage = '创建表格失败：权限不足，请确保应用已获得"多维表格"权限并已发布';
            } else if (status === 401) {
              errorMessage = '创建表格失败：身份验证错误，请检查应用凭证';
            } else if (status === 429) {
              errorMessage = '创建表格失败：请求频率超限，请稍后再试';
            }
          }
          
          return {
            success: false,
            message: errorMessage,
          };
        }
      }

      return this.callApiWithRetry(async () => {
        this.logger.log('获取字段信息');
        // 获取字段信息
        const accessToken = await this.getAccessToken();
        const fieldsResponse = await axios.get(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            timeout: 10000
          }
        );

        if (fieldsResponse.data.code !== 0) {
          throw new Error(`获取字段信息失败: ${JSON.stringify(fieldsResponse.data)}`);
        }

        const fields = fieldsResponse.data.data.items;
        this.logger.log(`获取到 ${fields.length} 个字段`);
        
        const fieldMap: Record<string, string> = {};
        
        fields.forEach((field: any) => {
          fieldMap[field.field_name] = field.field_id;
          this.logger.log(`字段映射: ${field.field_name} -> ${field.field_id}`);
        });

        // 检查是否有必要的字段
        const requiredFields = ['公众号名称', '文章名称', '文章发布时间', '同步到飞书时间', '文章内容文本详情'];
        const missingFields = requiredFields.filter(field => !fieldMap[field]);
        
        if (missingFields.length > 0) {
          this.logger.log(`缺少必要字段: ${missingFields.join(', ')}，将创建字段`);
          await this.createTableFields(appToken, tableId);
          
          // 重新获取字段信息
          const updatedFieldsResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              },
              timeout: 10000
            }
          );
          
          if (updatedFieldsResponse.data.code !== 0) {
            throw new Error(`重新获取字段信息失败: ${JSON.stringify(updatedFieldsResponse.data)}`);
          }
          
          const updatedFields = updatedFieldsResponse.data.data.items;
          
          // 更新字段映射
          updatedFields.forEach((field: any) => {
            fieldMap[field.field_name] = field.field_id;
            this.logger.log(`更新字段映射: ${field.field_name} -> ${field.field_id}`);
          });
        }

        // 准备批量添加记录，优化对应Java SDK示例
        this.logger.log('准备文章记录数据');
        const records = recentArticles.map((article) => {
          // 格式化日期为毫秒时间戳，参考 Java SDK 示例
          const publishDate = article.publishTime * 1000; // 转为毫秒时间戳
          const syncDate = Date.now(); // 当前时间的毫秒时间戳
          
          // 清理文章内容中的HTML标签
          const contentText = article.content
            ? article.content.replace(/<[^>]*>/g, '')
            : '';

          // 构建记录数据，与Java SDK格式一致
          const recordFields: Record<string, any> = {};
          
          // 按照字段ID设置值，确保字段存在
          if (fieldMap['公众号名称']) {
            recordFields[fieldMap['公众号名称']] = mpNameMap[article.mpId] || '未知公众号';
          }
          
          if (fieldMap['文章名称']) {
            recordFields[fieldMap['文章名称']] = article.title || '无标题';
          }
          
          if (fieldMap['文章发布时间']) {
            recordFields[fieldMap['文章发布时间']] = publishDate;
          }
          
          if (fieldMap['同步到飞书时间']) {
            recordFields[fieldMap['同步到飞书时间']] = syncDate;
          }
          
          if (fieldMap['文章内容文本详情']) {
            recordFields[fieldMap['文章内容文本详情']] = contentText.substring(0, 10000); // 限制长度
          }
          
          // 如果存在阅读状态字段，添加默认值"未读"
          if (fieldMap['阅读状态']) {
            recordFields[fieldMap['阅读状态']] = "未读";
          }

          return {
            fields: recordFields
          };
        });

        // 分批添加记录，每批50条
        const batchSize = 50;
        this.logger.log(`开始分批添加记录，每批 ${batchSize} 条，共 ${records.length} 条`);
        
        let successCount = 0;
        let errorMessages: string[] = [];
        
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          this.logger.log(`添加第 ${Math.floor(i/batchSize) + 1} 批，共 ${batch.length} 条`);
          
          try {
            const response = await axios.post(
              `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
              {
                records: batch
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                timeout: 30000 // 批量添加可能需要更长的超时时间
              }
            );
            
            if (response.data.code !== 0) {
              const errorMsg = `批量添加记录失败: ${JSON.stringify(response.data)}`;
              this.logger.error(errorMsg);
              errorMessages.push(errorMsg);
              
              // 如果是请求频率超限，增加延迟时间后重试
              if (response.data.code === 11429) {
                this.logger.log('遇到限流，等待3秒后重试');
                await new Promise(resolve => setTimeout(resolve, 3000));
                i -= batchSize; // 回退一个批次，重试当前批次
                continue;
              }
            } else {
              this.logger.log(`成功添加 ${batch.length} 条记录`);
              successCount += batch.length;
            }
          } catch (batchError) {
            this.logger.error(`批量添加记录出错:`, batchError);
            
            let errorDetail = '未知错误';
            let shouldRetry = false;
            
            if (batchError.response) {
              this.logger.error(`API响应状态: ${batchError.response.status}`);
              this.logger.error(`API响应数据: ${JSON.stringify(batchError.response.data)}`);
              
              if (batchError.response.data && batchError.response.data.code) {
                errorDetail = this.getErrorCodeMeaning(batchError.response.data.code);
                // 对于限流错误，应该重试
                if (batchError.response.data.code === 11429) {
                  shouldRetry = true;
                }
              } else {
                errorDetail = `HTTP错误 ${batchError.response.status}`;
              }
            } else if (batchError.code) {
              errorDetail = batchError.code;
              // 网络暂时性错误需要重试
              if (batchError.code === 'ECONNRESET' || batchError.code === 'ETIMEDOUT') {
                shouldRetry = true;
              }
            } else if (batchError.message) {
              errorDetail = batchError.message;
            }
            
            if (shouldRetry) {
              this.logger.log(`遇到错误: ${errorDetail}，等待3秒后重试`);
              await new Promise(resolve => setTimeout(resolve, 3000));
              i -= batchSize; // 回退一个批次，重试当前批次
            } else {
              errorMessages.push(`第${Math.floor(i/batchSize) + 1}批同步失败: ${errorDetail}`);
            }
          }
          
          // 批次之间添加短暂延迟，避免API限流
          if (i + batchSize < records.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // 获取应用的共享链接
        let shareLink;
        try {
          const shareResult = await this.getBitableShareLink();
          if (shareResult.success && shareResult.shareLink) {
            shareLink = shareResult.shareLink;
          }
        } catch (shareError) {
          this.logger.error('获取共享链接出错，但不影响同步过程:', shareError);
        }

        this.logger.log('同步文章到飞书完成');
        
        const resultMessage = successCount > 0 
          ? `成功同步 ${successCount} 篇文章到飞书` 
          : '同步失败，未能成功添加任何文章';
        
        return {
          success: successCount > 0,
          message: errorMessages.length > 0 
            ? `${resultMessage}。遇到以下问题: ${errorMessages.slice(0, 3).join('; ')}` 
            : resultMessage,
          data: {
            appToken,
            tableId,
            syncedCount: successCount,
            shareLink
          }
        };
      }, 3, 2000, '同步文章');
    } catch (error) {
      this.logger.error('同步文章到飞书出错:', error);
      
      // 如果是网络错误或API错误，添加详细信息
      let errorDetail = error.message;
      
      if (error.response) {
        this.logger.error(`API响应状态: ${error.response.status}`);
        this.logger.error(`API响应数据: ${JSON.stringify(error.response.data)}`);
        
        const status = error.response.status;
        if (status === 403) {
          errorDetail = '权限不足，请确保应用已获得"多维表格"权限并已发布';
        } else if (status === 401) {
          errorDetail = '身份验证错误，请检查应用凭证';
        } else if (status === 429) {
          errorDetail = '请求频率超限，请稍后再试';
        } else if (status === 404) {
          errorDetail = 'API地址不存在，飞书API可能已更新';
        }
      } else if (error.code === 'ECONNABORTED') {
        errorDetail = '请求超时，请检查网络连接';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        errorDetail = '无法连接到飞书服务器，请检查网络连接';
      }
      
      return {
        success: false,
        message: `同步文章到飞书失败: ${errorDetail}`,
      };
    }
  }

  // 删除所有多维表格
  public async deleteAllBitables(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      this.logger.log('开始删除所有多维表格');
      
      return this.callApiWithRetry(async () => {
        const accessToken = await this.getAccessToken();
        
        // 获取多维表格列表
        const listResponse = await axios.get(
          'https://open.feishu.cn/open-apis/bitable/v1/apps',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            timeout: 10000
          }
        );

        if (listResponse.data.code !== 0) {
          throw new Error(`获取多维表格列表失败: ${JSON.stringify(listResponse.data)}`);
        }

        // 查找"公众号文章分析"应用
        const targetApps = listResponse.data.data.items.filter(
          (app: any) => app.name === '公众号文章分析'
        );

        this.logger.log(`找到 ${targetApps.length} 个公众号文章分析应用`);
        
        if (targetApps.length === 0) {
          return {
            success: true,
            message: '没有找到需要删除的多维表格',
            deletedCount: 0
          };
        }

        // 删除找到的应用
        let deletedCount = 0;
        for (const app of targetApps) {
          this.logger.log(`准备删除应用: ${app.name}, appToken: ${app.app_token}`);
          
          try {
            const deleteResponse = await axios.delete(
              `https://open.feishu.cn/open-apis/bitable/v1/apps/${app.app_token}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                },
                timeout: 10000
              }
            );

            if (deleteResponse.data.code === 0) {
              deletedCount++;
              this.logger.log(`成功删除应用: ${app.name}`);
            } else {
              this.logger.error(`删除应用失败: ${JSON.stringify(deleteResponse.data)}`);
            }
          } catch (deleteError) {
            this.logger.error(`删除应用出错:`, deleteError);
            if (deleteError.response) {
              this.logger.error(`API响应状态: ${deleteError.response.status}`);
              this.logger.error(`API响应数据: ${JSON.stringify(deleteError.response.data)}`);
            }
          }
        }

        // 重置服务实例中的信息
        this.appToken = null;
        this.bitableId = null;
        this.tableId = null;

        return {
          success: true,
          message: `成功删除 ${deletedCount} 个多维表格`,
          deletedCount
        };
      }, 3, 2000, '删除多维表格');
    } catch (error) {
      this.logger.error('删除所有多维表格出错:', error);
      
      // 如果是网络错误或API错误，添加详细信息
      if (error.response) {
        this.logger.error(`API响应状态: ${error.response.status}`);
        this.logger.error(`API响应数据: ${JSON.stringify(error.response.data)}`);
      }
      
      return {
        success: false,
        message: `删除所有多维表格失败: ${error.message}`,
        deletedCount: 0
      };
    }
  }

  // 获取多维表格共享链接
  public async getBitableShareLink(): Promise<{ success: boolean; message: string; shareLink?: string }> {
    try {
      if (!this.appToken || !this.bitableId) {
        this.logger.log('未找到多维表格信息，尝试获取现有表格信息');
        try {
          const info = await this.getBitableInfo();
          this.appToken = info.appToken;
          this.tableId = info.tableId;
        } catch (error) {
          return {
            success: false,
            message: '未找到多维表格信息，请先同步数据到飞书'
          };
        }
      }
      
      return this.callApiWithRetry(async () => {
        const accessToken = await this.getAccessToken();
        
        // 创建共享链接，优化请求结构
        const response = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/share`,
          {
            share_type: "view", // 默认查看权限
            settings: {
              link_share_entity: {
                enabled: true,
                link_share_range: "tenant", // 租户内可见
                permission: "view" // 仅查看权限
              },
              // 添加分享配置
              edit_limitation: {
                disable_spread: true,  // 禁止传播
                disable_export: false  // 允许导出
              }
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            timeout: 15000  // 增加超时时间
          }
        );

        if (response.data.code !== 0) {
          throw new Error(`获取共享链接失败: ${JSON.stringify(response.data)}`);
        }

        // 标准化提取共享链接
        let shareLink: string | undefined = undefined;
        
        if (response.data.data && response.data.data.share_link) {
          shareLink = response.data.data.share_link;
          this.logger.log(`成功获取共享链接: ${shareLink}`);
        } else {
          // 尝试深度搜索，修复类型不兼容问题
          const foundLink = this.deepSearchForKey(response.data, ['share_link', 'url']);
          if (foundLink) {
            shareLink = foundLink;
            this.logger.log(`通过深度搜索获取共享链接: ${shareLink}`);
          }
        }

        if (!shareLink) {
          return {
            success: false,
            message: '创建共享链接成功，但无法获取链接地址'
          };
        }

        return {
          success: true,
          message: '获取共享链接成功',
          shareLink
        };
      }, 3, 2000, '获取共享链接');
    } catch (error) {
      this.logger.error('获取共享链接出错:', error);
      
      // 增强错误处理
      let errorDetail = error.message;
      
      if (error.response) {
        this.logger.error(`API响应状态: ${error.response.status}`);
        this.logger.error(`API响应数据: ${JSON.stringify(error.response.data)}`);
        
        if (error.response.data && error.response.data.code) {
          errorDetail = `${this.getErrorCodeMeaning(error.response.data.code)} (错误码: ${error.response.data.code})`;
        } else {
          errorDetail = `HTTP错误 ${error.response.status}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorDetail = '请求超时，请检查网络连接';
      }
      
      return {
        success: false,
        message: `获取共享链接失败: ${errorDetail}`
      };
    }
  }

  // 确保访问令牌有效
  public async ensureValidToken(): Promise<boolean> {
    try {
      // 计算剩余有效时间（毫秒）
      const remainingTime = this.tokenExpireTime - Date.now();
      
      // 如果有效期小于15分钟，则刷新令牌
      if (!this.accessToken || remainingTime < 15 * 60 * 1000) {
        this.logger.log('访问令牌即将过期或不存在，准备刷新');
        await this.getAccessToken();
        this.logger.log('访问令牌刷新成功');
        return true;
      }
      
      this.logger.log(`访问令牌仍然有效，剩余时间: ${Math.floor(remainingTime / 60000)} 分钟`);
      return true;
    } catch (error) {
      this.logger.error('确保访问令牌有效时出错:', error);
      return false;
    }
  }

  // 启动定时刷新令牌任务
  public startTokenRefreshTask(): void {
    // 每10分钟检查一次令牌状态
    setInterval(async () => {
      try {
        await this.ensureValidToken();
      } catch (error) {
        this.logger.error('定时刷新令牌出错:', error);
      }
    }, 10 * 60 * 1000); // 10分钟
    
    this.logger.log('已启动访问令牌自动刷新任务');
  }

  // 初始化服务
  public async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('开始初始化飞书服务');
      
      // 检查应用ID和密钥配置
      if (!this.appId || !this.appSecret) {
        const errorMsg = '飞书应用配置错误：应用ID或密钥未正确配置';
        this.logger.error(errorMsg);
        return { success: false, message: errorMsg };
      }
      
      // 确保访问令牌有效
      await this.ensureValidToken();
      
      // 启动令牌刷新任务
      this.startTokenRefreshTask();
      
      // 检查应用权限
      const hasPermission = await this.checkAppPermissions();
      
      if (!hasPermission) {
        const errorMsg = '飞书应用权限不足：请确保应用已获得"多维表格"权限并已发布。请前往飞书开放平台应用管理页面(https://open.feishu.cn/app)进行配置。';
        this.logger.error(errorMsg);
        return { success: false, message: errorMsg };
      }
      
      // 尝试获取或创建多维表格
      let appToken = this.appToken;
      let tableId = this.tableId;
      
      if (!appToken || !tableId) {
        try {
          this.logger.log('尝试获取现有表格信息');
          const info = await this.getBitableInfo();
          appToken = info.appToken;
          tableId = info.tableId;
          this.appToken = appToken;
          this.tableId = tableId;
          this.logger.log(`成功获取现有表格信息: appToken=${appToken}, tableId=${tableId}`);
        } catch (error) {
          this.logger.log(`未找到现有表格，这是正常情况，首次使用时需要创建表格`);
        }
      }
      
      this.logger.log('飞书服务初始化完成');
      return { 
        success: true, 
        message: '飞书服务初始化成功，已准备好进行文章同步' 
      };
    } catch (error) {
      const errorMsg = `飞书服务初始化失败: ${error.message}`;
      this.logger.error(errorMsg, error);
      
      // 提供更具体的错误信息
      let detailedMessage = errorMsg;
      
      if (error.response) {
        // API错误
        const status = error.response.status;
        const responseData = error.response.data || {};
        
        if (status === 401 || status === 403) {
          detailedMessage = '飞书服务初始化失败：身份验证错误，请检查应用凭证是否正确配置';
        } else if (status === 404) {
          detailedMessage = '飞书服务初始化失败：API地址不存在，飞书API可能已更新';
        } else if (status === 429) {
          detailedMessage = '飞书服务初始化失败：请求频率超限，请稍后再试';
        } else if (responseData.code) {
          const codeMeaning = this.getErrorCodeMeaning(responseData.code);
          detailedMessage = `飞书服务初始化失败：${codeMeaning} (错误码: ${responseData.code})`;
        }
      } else if (error.code === 'ECONNABORTED') {
        detailedMessage = '飞书服务初始化失败：连接超时，请检查网络连接';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        detailedMessage = '飞书服务初始化失败：无法连接到飞书服务器，请检查网络连接';
      }
      
      return { success: false, message: detailedMessage };
    }
  }
}

export const feishuService = new FeishuService();