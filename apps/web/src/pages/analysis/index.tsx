import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  Button,
  Spinner,
  Card,
  Tooltip,
} from '@nextui-org/react';
import { trpc } from '@web/utils/trpc';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Analysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();
  
  // 获取最近24小时的文章
  const twentyFourHoursAgo = dayjs().subtract(24, 'hour').unix();
  
  // 文章列表查询，设置更积极的刷新策略
  const { data: articleData, isLoading, refetch } = trpc.article.list.useQuery(
    {
      limit: 1000,
      mpId: '',
      skipImageDownload: true,
    },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    },
  );

  const { mutateAsync: analyzeArticle } = trpc.article.analyze.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const { mutateAsync: getContentMutation } = trpc.article.getContent.useMutation();

  // 添加清空所有分析结果的mutation
  const { mutateAsync: clearAnalysisResults } = trpc.article.clearAnalysisResults.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // 添加清空指定ID列表分析结果的mutation
  const { mutateAsync: clearAnalysisResultsByIds } = trpc.article.clearAnalysisResultsByIds.useMutation({
    onSuccess: (data) => {
      toast.success(`已清除${data.count}篇文章的分析结果`);
      refetch();
    }
  });

  // 将公众号ID映射到公众号名称
  const [mpNameMap, setMpNameMap] = useState<Record<string, string>>({});
  
  // 公众号数据查询，设置更积极的刷新策略
  const { data: feedData, refetch: refetchFeeds } = trpc.feed.list.useQuery(
    {},
    {
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 3,
      retryDelay: 1000,
    }
  );
  
  // 更新公众号名称映射
  useEffect(() => {
    if (feedData?.items && feedData.items.length > 0) {
      const map: Record<string, string> = {};
      
      // 使用console来帮助调试问题
      console.log('获取到公众号数据:', feedData.items.length, '个公众号');
      
      // 详细记录每个公众号的ID和名称
      feedData.items.forEach(feed => {
        if (feed && feed.id) {
          // 尝试多种可能的名称字段
          const mpName = feed.mpName || (feed as any).name;
          const feedName = mpName || '未知公众号';
          
          console.log(`公众号映射: ${feed.id} => ${feedName}`);
          map[feed.id] = feedName;
        }
      });
      
      // 将映射保存到状态
      setMpNameMap(map);
    } else {
      console.warn('公众号数据为空或未加载', feedData);
      // 如果数据为空，尝试重新获取
      refetchFeeds();
    }
  }, [feedData, refetchFeeds]);

  // 在组件挂载时进行一次公众号数据获取
  useEffect(() => {
    // 立即获取一次最新的feeds数据
    refetchFeeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 预处理文章数据，添加公众号名称
  const processedArticles = useMemo(() => {
    if (!articleData?.items || articleData.items.length === 0) {
      return [];
    }
    
    // 如果公众号映射表为空，直接返回原始数据
    if (Object.keys(mpNameMap).length === 0) {
      return articleData.items;
    }
    
    // 为每篇文章附加公众号名称
    return articleData.items.map(article => ({
      ...article,
      mpName: mpNameMap[article.mpId] || '未知公众号'
    }));
  }, [articleData, mpNameMap]);

  // 跳转到AI分析详情页面
  const navigateToAiDetail = (articleId: string) => {
    navigate(`/analysis/ai-detail/${articleId}`);
  };

  const handleStartAnalysis = async () => {
    if (!articleData?.items.length) {
      toast.error('没有可分析的文章');
      return;
    }

    setIsAnalyzing(true);
    toast.info('开始分析', { description: '将逐条分析文章，请耐心等待...' });

    try {
      // 过滤最近24小时内的文章
      const recentArticles = articleData.items.filter(article => article.publishTime >= twentyFourHoursAgo);
      if (recentArticles.length === 0) {
        toast.error('没有最近24小时内的文章');
        setIsAnalyzing(false);
        return;
      }
      
      // 按发布时间从近到远排序
      const sortedArticles = [...recentArticles].sort((a, b) => b.publishTime - a.publishTime);
      let successCount = 0;
      let failCount = 0;
      
      for (const article of sortedArticles) {
        if (article.aiScore) continue; // 跳过已分析的文章
        
        try {
          // 获取文章内容
          const articleWithContent = await getContentMutation(article.id);
          
          if (!articleWithContent || !articleWithContent.content) {
            console.error('获取文章内容失败:', article.id);
            failCount++;
            continue;
          }
          
          // 纯文本内容 - 移除HTML标签
          const htmlContent = articleWithContent.content;
          
          // 分析文章 - 发送纯文本内容进行分析
          await analyzeArticle({
            articleId: article.id,
            title: article.title,
            content: htmlContent // 后端会处理HTML内容提取纯文本
          });
          
          successCount++;
          // 暂停一下避免频率限制
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`处理文章 ${article.id} 时出错:`, error);
          failCount++;
          continue;
        }
      }
      
      if (successCount > 0) {
        toast.success(`分析完成，成功: ${successCount}，失败: ${failCount}`);
      } else if (failCount > 0) {
        toast.error(`分析失败，请检查日志`);
      } else {
        toast.info('没有需要分析的文章');
      }
      
      // 刷新列表以显示最新结果
      await refetch();
      // 确保获取最新的feed数据
      await refetchFeeds();
    } catch (error) {
      console.error('分析过程失败:', error);
      toast.error('分析过程失败，请查看控制台日志');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 过滤显示最近24小时内的文章
  const recentArticles = processedArticles.filter(article => article.publishTime >= twentyFourHoursAgo) || [];
  
  // 确保公众号数据的完整性
  useEffect(() => {
    // 如果有文章但没有公众号数据，重新获取公众号数据
    if (recentArticles.length > 0 && Object.keys(mpNameMap).length === 0) {
      console.log('文章数据已加载但缺少公众号数据，重新获取公众号列表');
      refetchFeeds();
    }
    
    // 检查是否所有文章的公众号ID都有对应的名称
    if (recentArticles.length > 0 && Object.keys(mpNameMap).length > 0) {
      const missingMpIds = recentArticles
        .map(article => article.mpId)
        .filter(mpId => !mpNameMap[mpId]);
      
      if (missingMpIds.length > 0) {
        console.log('发现缺少公众号名称的ID:', missingMpIds);
        refetchFeeds();
      }
    }
  }, [recentArticles, mpNameMap, refetchFeeds]);
  
  // 按AI评分从高到低排序
  const sortedArticles = [...recentArticles].sort((a, b) => {
    // 如果两边都有评分，按评分从高到低排序
    if (a.aiScore !== undefined && a.aiScore !== null && 
        b.aiScore !== undefined && b.aiScore !== null) {
      return b.aiScore - a.aiScore;
    }
    // 如果只有a有评分，a排前面
    if (a.aiScore !== undefined && a.aiScore !== null) return -1;
    // 如果只有b有评分，b排前面
    if (b.aiScore !== undefined && b.aiScore !== null) return 1;
    // 都没有评分，按发布时间排序（新的在前）
    return b.publishTime - a.publishTime;
  });

  // 清除当前列表中文章的分析结果
  const handleClearCurrentListResults = async () => {
    if (!recentArticles?.length) {
      toast.error('当前列表没有文章');
      return;
    }

    // 获取已有分析结果的文章
    const articlesWithAnalysis = recentArticles.filter(
      article => article.aiScore !== null && article.aiScore !== undefined
    );

    if (articlesWithAnalysis.length === 0) {
      toast.info('当前列表没有已分析的文章');
      return;
    }

    try {
      toast.info('正在清除当前列表分析结果...');
      
      // 获取当前列表中所有已分析文章的ID
      const articleIds = articlesWithAnalysis.map(article => article.id);
      
      // 调用后端API清除当前列表文章的分析结果
      await clearAnalysisResultsByIds({ articleIds });
    } catch (error) {
      console.error('清除分析结果失败:', error);
      toast.error('清除分析结果失败', { description: String(error) });
    }
  };

  return (
    <div className="p-5 h-screen overflow-hidden">
      <div className="flex justify-between mb-5 items-center">
        <div className="text-xl font-semibold">AI分析文章</div>
        <div className="flex gap-2">
          <Button 
            color="default" 
            variant="flat"
            onPress={handleClearCurrentListResults}
            className="text-sm"
          >
            清除当前列表分析结果
          </Button>
          <Button 
            color="primary" 
            isLoading={isAnalyzing}
            onPress={handleStartAnalysis}
            className="bg-gradient-to-tr from-primary to-secondary hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 shadow-md"
          >
            开始分析
          </Button>
        </div>
      </div>
      
      <Card className="shadow-sm border border-gray-200 dark:border-gray-800 p-0 overflow-hidden h-[calc(100vh-120px)]">
        <div className="h-full overflow-auto">
          <Table
            aria-label="文章分析列表"
            removeWrapper
            isHeaderSticky
            classNames={{
              base: "h-full",
              table: "min-h-[420px]",
              th: "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-medium sticky top-0 z-10",
              tr: "hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors",
            }}
          >
            <TableHeader>
              <TableColumn key="rank" width="8%" className="text-center">序号</TableColumn>
              <TableColumn key="title" width="37%">文章标题</TableColumn>
              <TableColumn key="aiScore" width="10%" className="text-center">AI评分</TableColumn>
              <TableColumn key="aiReason" width="45%">评分原因说明</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              emptyContent={
                <div className="py-10 text-center">
                  <p className="text-gray-500 mb-3">暂无最近24小时内的文章数据</p>
                </div>
              }
              items={sortedArticles}
              loadingContent={<Spinner color="primary" />}
            >
              {(item: any) => (
                <TableRow key={item.id}>
                  {(columnKey) => {
                    if (columnKey === 'rank') {
                      // 通过查找当前项在排序后数组中的索引来确定排名
                      const index = sortedArticles.findIndex(article => article.id === item.id);
                      const isTopThree = index < 3;
                      return (
                        <TableCell>
                          <div className={`text-center font-medium ${isTopThree ? 'text-danger text-lg' : 'text-gray-500'}`}>
                            {index + 1}
                          </div>
                        </TableCell>
                      );
                    }

                    if (columnKey === 'title') {
                      const formattedTime = dayjs(item.publishTime * 1e3).format('YYYY-MM-DD HH:mm');
                      return (
                        <TableCell>
                          <div className="flex flex-col">
                            <Tooltip 
                              content={item.title}
                              placement="top"
                              showArrow
                              delay={500}
                              closeDelay={0}
                            >
                              <div 
                                className="font-medium line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                                onClick={() => navigate(`/feeds/article/${item.id}`)}
                              >
                                {item.title}
                              </div>
                            </Tooltip>
                            <div className="text-gray-500 text-xs mt-1">
                              {mpNameMap[item.mpId] || '未知公众号'} · {formattedTime}
                            </div>
                          </div>
                        </TableCell>
                      );
                    }

                    if (columnKey === 'aiScore') {
                      // 高于80分的评分用红色加粗显示，同时设为可点击
                      const isHighScore = item.aiScore !== undefined && item.aiScore !== null && item.aiScore > 80;
                      return (
                        <TableCell className="text-center">
                          {item.aiScore !== undefined && item.aiScore !== null ? (
                            <span 
                              className={`${isHighScore ? "text-danger font-bold" : ""} cursor-pointer hover:underline`}
                              onClick={() => navigateToAiDetail(item.id)}
                            >
                              {item.aiScore}
                            </span>
                          ) : '-'}
                        </TableCell>
                      );
                    }

                    if (columnKey === 'aiReason') {
                      return (
                        <TableCell>
                          {item.aiReason ? (
                            <Tooltip 
                              content={
                                <div className="max-w-md p-2">{item.aiReason}</div>
                              }
                              placement="bottom"
                              showArrow
                              delay={300}
                              closeDelay={0}
                              classNames={{
                                content: "max-w-[400px] w-full"
                              }}
                            >
                              <div className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400 cursor-help">
                                {item.aiReason}
                              </div>
                            </Tooltip>
                          ) : (
                            <div className="line-clamp-2 text-sm text-gray-400">-</div>
                          )}
                        </TableCell>
                      );
                    }

                    return <TableCell>{getKeyValue(item, columnKey)}</TableCell>;
                  }}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default Analysis; 