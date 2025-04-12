import { FC, useMemo, useEffect, useState } from 'react';
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
  Link,
  Card,
  ButtonGroup,
} from '@nextui-org/react';
import { trpc } from '@web/utils/trpc';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

const ArticleList: FC = () => {
  const { id, groupId } = useParams();
  const navigate = useNavigate();
  const mpId = id || '';
  
  // 添加公众号名称映射
  const [mpNameMap, setMpNameMap] = useState<Record<string, string>>({});
  
  // 获取公众号列表
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
  
  // 更新公众号名称映射
  useEffect(() => {
    if (feedData?.items && feedData.items.length > 0) {
      const map: Record<string, string> = {};
      console.log('开始构建公众号名称映射，找到', feedData.items.length, '个公众号');
      
      feedData.items.forEach(feed => {
        if (feed && feed.id) {
          // 检查可能的名称属性
          let mpName = '';
          
          if (typeof feed.mpName === 'string' && feed.mpName) {
            mpName = feed.mpName;
            console.log(`使用mpName: ${feed.id} => ${mpName}`);
          } else if (typeof (feed as any).name === 'string' && (feed as any).name) {
            mpName = (feed as any).name;
            console.log(`使用name: ${feed.id} => ${mpName}`);
          } else {
            console.warn(`未找到公众号名称: ${feed.id}`, feed);
            mpName = '未知公众号';
          }
          
          map[feed.id] = mpName;
        }
      });
      
      console.log('公众号名称映射构建完成:', map);
      setMpNameMap(map);
    } else {
      console.warn('未获取到公众号数据或数据为空');
    }
  }, [feedData]);

  // 根据不同类型参数获取文章数据
  const getArticleData = () => {
    // 如果有分组ID，则获取分组内文章
    if (groupId) {
      return trpc.feedGroup.articles.useInfiniteQuery(
        {
          groupId: groupId,
          limit: 20,
        },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
      );
    }
    
    // 否则获取普通文章列表（全部或按公众号筛选）
    return trpc.article.list.useInfiniteQuery(
      {
        limit: 20,
        mpId: mpId,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );
  };
  
  // 获取文章数据
  const { data, fetchNextPage, isLoading, hasNextPage } = getArticleData();

  // 将文章数据与公众号名称整合
  const items = useMemo(() => {
    try {
      if (!data) return [];
      
      // 首先合并所有页面的数据
      const allItems = data.pages.reduce((acc, page) => [...acc, ...page.items], [] as any[]);
      
      // 如果公众号映射表为空，直接返回原始数据
      if (Object.keys(mpNameMap).length === 0) {
        console.log('公众号名称映射为空，返回原始数据');
        return allItems;
      }
      
      // 为每篇文章附加公众号名称
      const processedItems = allItems.map(item => {
        // 检查是否有对应的公众号名称
        const feedName = mpNameMap[item.mpId];
        if (feedName) {
          return {
            ...item,
            mpName: feedName
          };
        } else {
          console.log(`找不到文章 ${item.id} 对应的公众号 ${item.mpId}`, mpNameMap);
          return item;
        }
      });
      
      return processedItems;
    } catch (error) {
      console.error('处理文章列表数据出错:', error);
      return [];
    }
  }, [data, mpNameMap]);
  
  useEffect(() => {
    if (items && items.length > 0) {
      console.log('文章列表数据:', items[0]);
    }
  }, [items]);

  return (
    <div className="h-full">
      <Card className="shadow-sm border border-gray-200 dark:border-gray-800 p-0 overflow-hidden h-full">
        <Table
          aria-label="文章列表"
          removeWrapper
          isHeaderSticky
          classNames={{
            base: "h-full overflow-auto",
            table: "min-h-[420px]",
            th: "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-medium",
            tr: "hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors",
          }}
          bottomContent={
            hasNextPage && !isLoading ? (
              <div className="flex w-full justify-center py-3">
                <Button
                  isDisabled={isLoading}
                  variant="flat"
                  color="primary"
                  className="px-8"
                  onPress={() => {
                    fetchNextPage();
                  }}
                >
                  {isLoading ? <Spinner color="white" size="sm" /> : null}
                  加载更多文章
                </Button>
              </div>
            ) : null
          }
        >
          <TableHeader>
            <TableColumn key="title">标题</TableColumn>
            <TableColumn width={180} key="publishTime">
              发布时间
            </TableColumn>
            <TableColumn width={200} key="actions">
              操作
            </TableColumn>
          </TableHeader>
          <TableBody
            isLoading={isLoading}
            emptyContent={
              <div className="py-10 text-center">
                <p className="text-gray-500 mb-3">暂无文章数据</p>
                <p className="text-xs text-gray-400">请添加公众号后查看</p>
              </div>
            }
            items={items || []}
            loadingContent={<Spinner color="primary" />}
          >
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => {
                  let value = getKeyValue(item, columnKey);

                  if (columnKey === 'publishTime') {
                    value = dayjs(value * 1e3).format('YYYY-MM-DD HH:mm');
                    return <TableCell className="text-gray-500 text-sm">{value}</TableCell>;
                  }

                  if (columnKey === 'title') {
                    return (
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div 
                            className="font-medium hover:text-primary transition-colors line-clamp-2 cursor-pointer" 
                            onClick={() => navigate(`/feeds/article/${item.id}`)}
                          >
                            {value}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {mpNameMap[item.mpId] || '未知公众号'}
                          </div>
                        </div>
                      </TableCell>
                    );
                  }

                  if (columnKey === 'actions') {
                    return (
                      <TableCell>
                        <ButtonGroup size="sm" variant="flat">
                          <Button
                            as={Link}
                            color="primary"
                            href={`https://mp.weixin.qq.com/s/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            打开原文
                          </Button>
                          <Button
                            color="secondary"
                            onPress={() => navigate(`/feeds/article/${item.id}`)}
                          >
                            查看详情
                          </Button>
                        </ButtonGroup>
                      </TableCell>
                    );
                  }
                  
                  return <TableCell>{value}</TableCell>;
                }}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ArticleList;
