import { FC, useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Spinner,
  Button,
  Breadcrumbs,
  BreadcrumbItem,
  Divider,
  Chip,
} from '@nextui-org/react';
import { trpc } from '@web/utils/trpc';
import dayjs from 'dayjs';
import { Article } from '@web/types';
import OptimizedImage from '@web/components/OptimizedImage';
import LazyContent from '@web/components/LazyContent';
import { ExternalLinkIcon } from '@web/components/icons/MaterialIcons';

// 扩展 Article 类型，确保与后端返回的数据兼容
interface ArticleWithContent {
  id: string;
  mpId: string;
  createdAt: string;
  updatedAt: string | null;
  title: string;
  picUrl: string;
  publishTime: number;
  content?: string;
  isCrawled: number;
  aiScore?: number | null;
  aiReason?: string | null;
}

const ArticleDetail: FC = () => {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [mpName, setMpName] = useState<string>('');
  const [mpId, setMpId] = useState<string>('');

  // 获取公众号名称映射
  const { data: feedData } = trpc.feed.list.useQuery(
    {},
    {
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 3,
      retryDelay: 1000,
    }
  );

  // 构建公众号ID到名称的映射表
  const mpNameMap = useMemo(() => {
    if (!feedData?.items || feedData.items.length === 0) {
      console.warn('文章详情页：未获取到公众号数据或数据为空');
      return {};
    }
    
    const map: Record<string, string> = {};
    console.log('文章详情页：开始构建公众号名称映射，找到', feedData.items.length, '个公众号');
    
    feedData.items.forEach(feed => {
      if (feed && feed.id) {
        // 检查可能的名称属性
        let name = '';
        
        if (typeof feed.mpName === 'string' && feed.mpName) {
          name = feed.mpName;
          console.log(`文章详情页：使用mpName: ${feed.id} => ${name}`);
        } else if (typeof (feed as any).name === 'string' && (feed as any).name) {
          name = (feed as any).name;
          console.log(`文章详情页：使用name: ${feed.id} => ${name}`);
        } else {
          console.warn(`文章详情页：未找到公众号名称: ${feed.id}`, feed);
          name = '未知公众号';
        }
        
        map[feed.id] = name;
      }
    });
    
    console.log('文章详情页：公众号名称映射构建完成:', map);
    return map;
  }, [feedData]);

  // 使用mpId更新公众号名称
  useEffect(() => {
    if (mpId && Object.keys(mpNameMap).length > 0) {
      const name = mpNameMap[mpId] || '未知公众号';
      console.log(`文章详情页：为mpId=${mpId}设置公众号名称: ${name}`);
      setMpName(name);
    }
  }, [mpId, mpNameMap]);

  // 处理图片URL，确保能正确加载
  const getDisplayImageUrl = (url: string) => {
    if (!url) return '';
    
    // 特殊处理本地图片路径
    if (url.includes('/images/')) {
      // 提取文件名
      const filename = url.split('/').pop();
      if (filename) {
        const apiUrl = `${window.location.origin}/images/${filename}`;
        return apiUrl;
      }
    }
    
    // 如果URL包含双斜杠问题，修复它
    if (url.includes('//')) {
      // 修复类似 /http://localhost 这样的错误格式
      if (url.startsWith('/http')) {
        url = url.substring(1); // 去掉第一个斜杠
      }
    }
    
    // 如果是相对路径，添加域名前缀
    if (url.startsWith('/')) {
      const result = window.location.origin + url;
      return result;
    }
    
    // 如果URL不含协议，添加http前缀
    if (!url.startsWith('http')) {
      const result = 'http://' + url;
      return result;
    }
    
    return url;
  };

  // 获取文章内容
  const { mutateAsync: getArticleContent } = trpc.article.getContent.useMutation();
  const [typedArticle, setTypedArticle] = useState<ArticleWithContent | undefined>();

  useEffect(() => {
    const fetchArticleContent = async () => {
      if (!articleId) return;

      try {
        setIsLoading(true);
        const article = await getArticleContent(articleId);
        setTypedArticle(article as ArticleWithContent);
        
        // 设置公众号ID，稍后用于查找名称
        if (article.mpId) {
          console.log(`文章详情页：获取到文章的mpId=${article.mpId}`);
          setMpId(article.mpId);
        }
      } catch (error) {
        console.error('获取文章内容失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticleContent();
  }, [articleId, getArticleContent]);

  // 修改文章内容中的图片标签，添加懒加载
  useEffect(() => {
    if (typedArticle?.content && !isLoading) {
      const articleContentEl = document.getElementById('article-content');
      if (articleContentEl) {
        // 查找所有图片
        const images = articleContentEl.querySelectorAll('img');
        
        // 为每个图片添加懒加载和渐变效果
        images.forEach(img => {
          // 添加懒加载属性
          img.setAttribute('loading', 'lazy');
          
          // 添加动画类
          img.classList.add('img-transition');
          
          // 添加合适的尺寸
          if (!img.getAttribute('width') && !img.getAttribute('height')) {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
          }
        });
      }
    }
  }, [typedArticle, isLoading]);

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto">
      <Breadcrumbs className="mb-4">
        <BreadcrumbItem onClick={() => navigate('/feeds')} className="btn-hover-effect">公众号列表</BreadcrumbItem>
        <BreadcrumbItem onClick={() => navigate(-1)} className="btn-hover-effect">文章列表</BreadcrumbItem>
        <BreadcrumbItem>文章详情</BreadcrumbItem>
      </Breadcrumbs>

      <Card className="p-6 shadow-md linear-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <Spinner color="primary" size="lg" />
            <p className="text-gray-500 mt-4">加载文章内容中...</p>
          </div>
        ) : typedArticle ? (
          <div>
            <LazyContent className="fade-in">
              <h1 className="text-2xl font-bold mb-4">{typedArticle.title}</h1>
              
              <div className="flex items-center justify-between mb-6 text-gray-500 text-sm">
                <div className="flex items-center gap-2">
                  {mpName && (
                    <Chip color="primary" variant="flat" size="sm" className="mr-2">
                      {mpName}
                    </Chip>
                  )}
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
                  className="btn-hover-effect"
                  endContent={<ExternalLinkIcon className="w-4 h-4" />}
                >
                  原文链接
                </Button>
              </div>
            </LazyContent>
            
            {typedArticle.picUrl && (
              <LazyContent className="mb-6 delay-100">
                <OptimizedImage
                  src={getDisplayImageUrl(typedArticle.picUrl)}
                  alt={typedArticle.title}
                  className="w-full max-h-64 object-cover rounded-lg"
                  loading="eager"
                />
              </LazyContent>
            )}
            
            <Divider className="my-4" />
            
            <LazyContent className="delay-200">
              <div 
                id="article-content"
                className="article-content max-w-none"
                dangerouslySetInnerHTML={{ __html: typedArticle.content || '' }}
              />
            </LazyContent>
          </div>
        ) : (
          <div className="text-center p-10 text-gray-500">
            文章不存在或已被删除
          </div>
        )}
      </Card>
    </div>
  );
};

export default ArticleDetail; 