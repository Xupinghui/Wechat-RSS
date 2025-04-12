const axios = require('axios');

// Feishu API配置 (从feishu.ts复制过来)
const APP_ID = 'cli_a76fe95bac65100e';
const APP_SECRET = 'aOpYpDAa84DtYS5XUwlOXfcOVmgOCQil';

// 获取访问令牌
async function getAccessToken() {
  try {
    console.log('正在获取飞书访问令牌...');
    
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });

    if (response.data.code === 0) {
      const accessToken = response.data.tenant_access_token;
      console.log(`成功获取访问令牌: ${accessToken}`);
      return accessToken;
    } else {
      console.error('获取访问令牌失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('获取访问令牌出错:', error.message);
    if (error.response) {
      console.error('API响应错误:', {
        status: error.response.status,
        data: JSON.stringify(error.response.data)
      });
    }
    return null;
  }
}

// 创建多维表格
async function createBitable(accessToken) {
  try {
    console.log('尝试创建多维表格...');
    
    // 表格名称
    const tableName = '公众号文章分析-' + new Date().toISOString().slice(0, 16).replace('T', ' ');
    
    // 创建多维表
    const createResponse = await axios.post(
      'https://open.feishu.cn/open-apis/bitable/v1/apps',
      {
        name: tableName,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    console.log('创建多维表格响应:', JSON.stringify(createResponse.data, null, 2));
    
    if (createResponse.data.code === 0) {
      let appToken = '';
      
      // 从响应中获取应用ID，兼容不同版本的响应格式
      if (createResponse.data.data.app?.app_token) {
        appToken = createResponse.data.data.app.app_token;
      } else if (createResponse.data.data.app_token) {
        appToken = createResponse.data.data.app_token;
      } else if (createResponse.data.data.app?.app_id) {
        appToken = createResponse.data.data.app.app_id;
      }
      
      console.log('成功创建多维表格，ID:', appToken);
      console.log('多维表格URL:', `https://feishu.cn/base/${appToken}`);
      
      // 创建数据表
      try {
        console.log('正在创建数据表...');
        const tableResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
          {
            name: '文章列表',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        console.log('创建数据表响应:', JSON.stringify(tableResponse.data, null, 2));
        
        if (tableResponse.data.code === 0) {
          const tableId = tableResponse.data.data.table.table_id;
          console.log('成功创建数据表，ID:', tableId);
          
          return {
            appToken,
            tableId,
            tableName
          };
        }
      } catch (tableError) {
        console.error('创建数据表失败:', tableError.message);
      }
      
      return { appToken, tableName };
    } else {
      console.error('创建多维表格失败:', createResponse.data);
      if (createResponse.data.code === 1254702) {
        console.error('错误原因: 指定的文件夹不存在。请尝试不指定文件夹创建。');
      }
    }
  } catch (error) {
    console.error('创建多维表格失败:', error.message);
    if (error.response) {
      console.error('API响应错误:', {
        status: error.response.status,
        data: JSON.stringify(error.response.data)
      });
      
      // 检查权限错误
      if (error.response.status === 403) {
        console.error('\n权限不足问题，请检查:');
        console.error('1. 在飞书开发者后台，已正确设置以下权限:');
        console.error('   - bitable:app:view - 读取多维表格');
        console.error('   - bitable:app:manage - 管理多维表格');
        console.error('   - drive:file:view - 查看云空间中所有文件');
        console.error('   - drive:file:manage - 管理云空间中所有文件');
        console.error('2. 已发布应用版本');
        console.error('3. 用户已授权该应用');
      }
    }
    return null;
  }
}

// 主函数
async function main() {
  try {
    console.log('===== 飞书多维表测试工具 =====');
    console.log('此工具用于测试创建飞书多维表并检查权限配置\n');
    
    // 获取访问令牌
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('获取访问令牌失败，请检查APP_ID和APP_SECRET是否正确');
    }
    
    // 创建多维表格
    const bitableResult = await createBitable(accessToken);
    
    if (bitableResult) {
      console.log('\n===== 操作成功 =====');
      console.log('多维表格名称:', bitableResult.tableName);
      console.log('多维表格ID:', bitableResult.appToken);
      console.log('多维表格URL:', `https://feishu.cn/base/${bitableResult.appToken}`);
      
      if (bitableResult.tableId) {
        console.log('数据表ID:', bitableResult.tableId);
      }
      
      console.log('\n请将此ID添加到feishu.ts中用于同步文章');
    } else {
      console.error('\n创建失败。请检查权限配置并确保应用已发布版本。');
      console.error('参考 https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/create');
    }
  } catch (error) {
    console.error('执行失败:', error.message);
  }
}

main(); 