import { FC, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Spinner,
  Button,
  Breadcrumbs,
  BreadcrumbItem,
  Divider,
  Chip,
  Tooltip,
} from '@nextui-org/react';
import { trpc } from '@web/utils/trpc';
import dayjs from 'dayjs';
import { Article } from '@web/types';

// AI请求和响应类型定义
interface AIModelRequest {
  title: string;
  content: string;
}

interface AIModelResponse {
  score: number;
  reason: string;
  raw?: string;
}

// AI分析详情组件
const AnalysisDetail: FC = () => {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // 模拟AI请求和响应数据
  const [aiModelData, setAiModelData] = useState<{
    request: AIModelRequest | null;
    response: AIModelResponse | null;
  }>({
    request: null,
    response: null
  });

  // 获取文章详情
  const { data: article } = trpc.article.byId.useQuery(
    articleId as string,
    {
      enabled: !!articleId,
      retry: false,
      onError: (error) => {
        console.error('获取文章失败:', error);
        setIsLoading(false);
      },
    }
  );

  // 获取文章内容
  const { mutateAsync: getArticleContent } = trpc.article.getContent.useMutation();

  // 将返回的文章数据转换为我们定义的Article类型
  const typedArticle = article as Article | undefined;

  // 如果文章没有内容，则请求获取内容
  useEffect(() => {
    const fetchArticleContent = async () => {
      try {
        setIsLoading(true);
        
        if (typedArticle) {
          if (!typedArticle.content) {
            // 获取文章内容
            await getArticleContent(articleId as string);
          }
          
          // 模拟AI请求和响应数据
          if (typedArticle.aiScore !== undefined && typedArticle.aiScore !== null) {
            // 构建模拟的AI请求和响应数据
            setAiModelData({
              request: {
                title: typedArticle.title,
                content: typedArticle.content || "文章内容未获取"
              },
              response: {
                score: typedArticle.aiScore,
                reason: typedArticle.aiReason || "无评分原因",
                raw: `{
  "score": ${typedArticle.aiScore},
  "reason": "${typedArticle.aiReason || '无评分原因'}"
}`
              }
            });
          } else {
            // 构建模拟的AI请求数据，但响应为失败状态
            setAiModelData({
              request: {
                title: typedArticle.title,
                content: typedArticle.content || "文章内容未获取"
              },
              response: {
                score: -1,
                reason: "AI评分失败或解析响应失败",
                raw: `{
  "error": "无法获取或解析大模型返回的评分结果"
}`
              }
            });
          }
        }
      } catch (error) {
        console.error('获取文章内容失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticleContent();
  }, [article, articleId, getArticleContent, typedArticle]);

  if (!articleId) {
    return (
      <div className="p-4">
        <Card className="p-4 text-center">
          <p>文章ID无效</p>
          <Button
            color="primary"
            variant="light"
            className="mt-4"
            onPress={() => navigate('/analysis')}
          >
            返回
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto">
      <Breadcrumbs className="mb-4">
        <BreadcrumbItem onClick={() => navigate('/analysis')}>分析列表</BreadcrumbItem>
        <BreadcrumbItem>AI分析详情</BreadcrumbItem>
      </Breadcrumbs>

      <Card className="p-6 shadow-md mb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <Spinner color="primary" size="lg" />
            <p className="text-gray-500 mt-4">加载文章内容中...</p>
          </div>
        ) : typedArticle ? (
          <div>
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold">{typedArticle.title}</h1>
              {typedArticle.aiScore !== undefined && typedArticle.aiScore !== null ? (
                <Tooltip content="AI评分" placement="left">
                  <Chip
                    color={typedArticle.aiScore > 80 ? "danger" : typedArticle.aiScore > 60 ? "warning" : "default"}
                    variant="shadow"
                    size="lg"
                    className="ml-2"
                  >
                    {typedArticle.aiScore}分
                  </Chip>
                </Tooltip>
              ) : (
                <Tooltip content="AI评分失败" placement="left">
                  <Chip
                    color="default"
                    variant="shadow"
                    size="lg"
                    className="ml-2"
                  >
                    -
                  </Chip>
                </Tooltip>
              )}
            </div>
            
            <div className="flex items-center justify-between mb-6 text-gray-500 text-sm">
              <div>
                发布时间: {dayjs(typedArticle.publishTime * 1000).format('YYYY-MM-DD HH:mm')}
              </div>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                as="a"
                href={`https://mp.weixin.qq.com/s/${typedArticle.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                原文链接
              </Button>
            </div>
            
            {typedArticle.aiReason && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-2">AI评分理由:</h3>
                <p className="text-gray-700 dark:text-gray-300">{typedArticle.aiReason}</p>
              </div>
            )}
            
            <Divider className="my-4" />
            
            <h2 className="text-xl font-semibold mb-4">AI分析数据</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="p-4 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">分析请求数据</h3>
                <Divider className="my-2" />
                {aiModelData.request ? (
                  <div>
                    <p className="mb-2"><span className="font-medium">标题:</span> {aiModelData.request.title}</p>
                    <p className="mb-2"><span className="font-medium">内容:</span></p>
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg max-h-[400px] overflow-auto">
                      <pre className="whitespace-pre-wrap text-sm">
                        {aiModelData.request.content}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">无请求数据</p>
                )}
              </Card>
              
              <Card className="p-4 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">分析响应数据</h3>
                <Divider className="my-2" />
                {aiModelData.response ? (
                  <div>
                    <p className="mb-2">
                      <span className="font-medium">评分:</span> 
                      {aiModelData.response.score >= 0 ? aiModelData.response.score : '-'}
                    </p>
                    <p className="mb-2"><span className="font-medium">原因:</span> {aiModelData.response.reason}</p>
                    {aiModelData.response.raw && (
                      <>
                        <p className="mb-2"><span className="font-medium">原始响应:</span></p>
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg max-h-[400px] overflow-auto">
                          <pre className="whitespace-pre-wrap text-sm">
                            {aiModelData.response.raw}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">无响应数据</p>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center p-10">
            <p className="text-gray-500">文章不存在或已被删除</p>
            <Button
              color="primary"
              variant="light"
              className="mt-4"
              onPress={() => navigate('/analysis')}
            >
              返回
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AnalysisDetail; 