import {
  Avatar,
  Button,
  Divider,
  Listbox,
  ListboxItem,
  ListboxSection,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Textarea,
  Tooltip,
  useDisclosure,
  Link,
  Chip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  CheckboxGroup,
  Checkbox,
  Input,
} from '@nextui-org/react';
import { PlusIcon } from '@web/components/PlusIcon';
import { trpc } from '@web/utils/trpc';
import { useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { serverOriginUrl } from '@web/utils/env';
import ArticleList from './list';
import { Feed, FeedGroup } from '@web/types';

const Feeds = () => {
  const { id, groupId } = useParams();

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const { isOpen: isGroupOpen, onOpen: onGroupOpen, onOpenChange: onGroupOpenChange, onClose: onGroupClose } = useDisclosure();
  const { isOpen: isAddFeedToGroupOpen, onOpen: onAddFeedToGroupOpen, onOpenChange: onAddFeedToGroupOpenChange, onClose: onAddFeedToGroupClose } = useDisclosure();
  const { isOpen: isRemoveFeedFromGroupOpen, onOpen: onRemoveFeedFromGroupOpen, onOpenChange: onRemoveFeedFromGroupOpenChange, onClose: onRemoveFeedFromGroupClose } = useDisclosure();
  
  const { refetch: refetchFeedList, data: feedData } = trpc.feed.list.useQuery(
    {},
    {
      refetchOnWindowFocus: true,
    },
  );
  
  const { refetch: refetchGroupList, data: groupData } = trpc.feedGroup.list.useQuery(
    undefined,
    {
      refetchOnWindowFocus: true,
      onSuccess: (data) => {
        console.log('成功加载分组数据:', data);
      },
      onError: (error) => {
        console.error('加载分组数据失败:', error);
      },
    },
  );

  const navigate = useNavigate();

  const queryUtils = trpc.useUtils();

  const { mutateAsync: getMpInfo, isLoading: isGetMpInfoLoading } =
    trpc.platform.getMpInfo.useMutation({});
  const { mutateAsync: updateMpInfo } = trpc.feed.edit.useMutation({});

  const { mutateAsync: addFeed, isLoading: isAddFeedLoading } =
    trpc.feed.add.useMutation({
      onSuccess: () => {
        onClose();
        queryUtils.article.list.reset();
        refetchFeedList();
      },
    });
    
  const { mutateAsync: createGroup, isLoading: isCreateGroupLoading } =
    trpc.feedGroup.create.useMutation({
      onSuccess: () => {
        onGroupClose();
        refetchGroupList();
      },
    });
    
  const { mutateAsync: addFeedsToGroup, isLoading: isAddFeedsToGroupLoading } =
    trpc.feedGroup.addFeeds.useMutation({
      onSuccess: () => {
        onAddFeedToGroupClose();
        refetchGroupList();
      },
    });
    
  const { mutateAsync: refreshMpArticles, isLoading: isGetArticlesLoading } =
    trpc.feed.refreshArticles.useMutation();
  const {
    mutateAsync: getHistoryArticles,
    isLoading: isGetHistoryArticlesLoading,
  } = trpc.feed.getHistoryArticles.useMutation();

  const { data: inProgressHistoryMp, refetch: refetchInProgressHistoryMp } =
    trpc.feed.getInProgressHistoryMp.useQuery(undefined, {
      refetchOnWindowFocus: true,
      refetchInterval: 10 * 1e3,
      refetchOnMount: true,
      refetchOnReconnect: true,
    });

  const { data: isRefreshAllMpArticlesRunning } =
    trpc.feed.isRefreshAllMpArticlesRunning.useQuery();

  const { mutateAsync: deleteFeed, isLoading: isDeleteFeedLoading } =
    trpc.feed.delete.useMutation({
      onSuccess: () => {
        navigate('/feeds');
        refetchFeedList();
      },
    });

  const { mutateAsync: removeFeedsFromGroup, isLoading: isRemoveFeedsFromGroupLoading } =
    trpc.feedGroup.removeFeeds.useMutation({
      onSuccess: () => {
        onRemoveFeedFromGroupClose();
        refetchGroupList();
      },
    });

  const [wxsLink, setWxsLink] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>([]);
  const [currentMpId, setCurrentMpId] = useState(id || '');
  const [currentGroupId, setCurrentGroupId] = useState(groupId || '');

  const handleConfirm = async () => {
    console.log('wxsLink', wxsLink);
    // TODO show operation in progress
    const wxsLinks = wxsLink.split('\n').filter((link) => link.trim() !== '');
    for (const link of wxsLinks) {
      console.log('add wxsLink', link);
      const res = await getMpInfo({ wxsLink: link });
      if (res[0]) {
        const item = res[0];
        await addFeed({
          id: item.id,
          mpName: item.name,
          mpCover: item.cover,
          mpIntro: item.intro,
          updateTime: item.updateTime,
          status: 1,
        });
        await refreshMpArticles({ mpId: item.id });
        toast.success('添加成功', {
          description: `公众号 ${item.name}`,
        });
        await queryUtils.article.list.reset();
      } else {
        toast.error('添加失败', { description: '请检查链接是否正确' });
      }
    }
    refetchFeedList();
    setWxsLink('');
    onClose();
  };

  const handleAddGroup = async () => {
    if (!groupName.trim()) {
      toast.error('分组名称不能为空');
      return;
    }
    
    try {
      await createGroup({ name: groupName });
      toast.success('添加成功', {
        description: `分组 ${groupName}`,
      });
      setGroupName('');
    } catch (error: any) {
      toast.error('添加失败', { description: error?.message || '创建分组时出错' });
    }
  };
  
  const handleAddFeedsToGroup = async () => {
    if (!selectedFeeds.length) {
      toast.error('请选择至少一个公众号');
      return;
    }
    
    try {
      await addFeedsToGroup({ 
        groupId: currentGroupId, 
        feedIds: selectedFeeds 
      });
      toast.success('添加成功', {
        description: `已将选中的公众号添加到分组`,
      });
      setSelectedFeeds([]);
      
      // 刷新文章列表数据
      queryUtils.article.list.reset();
      queryUtils.feedGroup.articles.reset();
    } catch (error: any) {
      toast.error('添加失败', { description: error?.message || '添加公众号到分组时出错' });
    }
  };

  const handleRemoveFeedsFromGroup = async () => {
    if (!selectedFeeds.length) {
      toast.error('请选择至少一个公众号');
      return;
    }
    
    try {
      await removeFeedsFromGroup({ 
        groupId: currentGroupId, 
        feedIds: selectedFeeds 
      });
      toast.success('移除成功', {
        description: `已将选中的公众号从分组中移除`,
      });
      setSelectedFeeds([]);
      
      // 刷新文章列表数据
      queryUtils.article.list.reset();
      queryUtils.feedGroup.articles.reset();
    } catch (error: any) {
      toast.error('移除失败', { description: error?.message || '从分组中移除公众号时出错' });
    }
  };

  const isActive = (key: string) => {
    return currentMpId === key;
  };

  const currentMpInfo = useMemo(() => {
    return feedData?.items.find((item) => item.id === currentMpId);
  }, [currentMpId, feedData?.items]);
  
  const currentGroupInfo = useMemo(() => {
    return groupData?.items?.find((item) => item.id === currentGroupId);
  }, [currentGroupId, groupData?.items]);

  const handleExportOpml = async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!feedData?.items?.length) {
      console.warn('没有订阅源');
      return;
    }

    let opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <opml version="2.0">
      <head>
        <title>WeWeRSS 所有订阅源</title>
      </head>
      <body>
    `;

    feedData?.items.forEach((sub) => {
      opmlContent += `    <outline text="${sub.mpName}" type="rss" xmlUrl="${window.location.origin}/feeds/${sub.id}.atom" htmlUrl="${window.location.origin}/feeds/${sub.id}.atom"/>\n`;
    });

    opmlContent += `    </body>
    </opml>`;

    const blob = new Blob([opmlContent], { type: 'text/xml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'WeWeRSS-All.opml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="h-full flex justify-between">
        <div className="w-72 p-4 h-full border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col">
          <div className="pb-4 flex justify-between align-middle items-center">
            <Popover placement="bottom-start" showArrow={true}>
              <PopoverTrigger>
                <Button
                  color="primary"
                  size="sm"
                  endContent={<PlusIcon />}
                  className="bg-gradient-to-tr from-primary to-secondary hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 shadow-md"
                >
                  添加
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="px-1 py-2">
                  <div className="text-small font-bold">选择操作</div>
                  <div className="mt-2 flex flex-col gap-2">
                    <Button
                      color="primary"
                      variant="flat"
                      onPress={onOpen}
                      className="justify-start text-left"
                    >
                      添加公众号订阅
                    </Button>
                    <Button
                      color="secondary"
                      variant="flat"
                      onPress={onGroupOpen}
                      className="justify-start text-left"
                    >
                      添加分组
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="font-normal text-sm px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900 text-primary">
              共{feedData?.items?.length || 0}个订阅
            </div>
          </div>

          {feedData?.items?.length ? (
            <div className="flex-1 overflow-y-auto">
              <Listbox
                topContent={
                  <div className="flex justify-between items-center py-2 px-1">
                    <div
                      className={`text-sm font-semibold ${
                        id === '' && !groupId ? 'text-primary' : ''
                      }`}
                    >
                      公众号列表
                    </div>
                    <Chip size="sm" variant="flat" color="primary">
                      {feedData.items.length} 个
                    </Chip>
                  </div>
                }
                classNames={{
                  base: 'py-0',
                }}
                selectionMode="single"
                selectedKeys={[currentMpId]}
                aria-label="公众号列表"
              >
                <ListboxSection showDivider>
                  <ListboxItem 
                    key="" 
                    className="bg-transparent"
                    onPress={() => {
                      setCurrentMpId('');
                      setCurrentGroupId('');
                      navigate('/feeds');
                    }}
                  >
                    全部公众号
                  </ListboxItem>
                </ListboxSection>
                
                {groupData && groupData.items && groupData.items.length > 0 && (
                  <ListboxSection 
                    title="分组" 
                    showDivider
                    classNames={{
                      heading: "text-primary-600 font-medium"
                    }}
                  >
                    {groupData.items.map((group) => (
                      <ListboxItem
                        key={`group-${group.id}`}
                        classNames={{
                          base: `${currentGroupId === group.id ? 'bg-secondary-50 dark:bg-secondary-900/20' : ''}`
                        }}
                        endContent={
                          <Popover placement="right">
                            <PopoverTrigger>
                              <Chip 
                                size="sm" 
                                variant="flat" 
                                color="secondary"
                                className="cursor-pointer"
                              >
                                {group.feedCount}个
                              </Chip>
                            </PopoverTrigger>
                            <PopoverContent>
                              <div className="px-1 py-2 max-w-xs">
                                <div className="text-small font-bold mb-2">分组内公众号</div>
                                <div className="max-h-40 overflow-y-auto">
                                  {group.feeds && group.feeds.length > 0 ? (
                                    <ul className="list-disc pl-4">
                                      {group.feeds.map(feed => (
                                        <li key={feed.id} className="text-sm py-1">
                                          {feed.mpName}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-gray-500">暂无公众号</p>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        }
                        onPress={() => {
                          setCurrentMpId('');
                          setCurrentGroupId(group.id);
                          navigate(`/feeds/group/${group.id}`);
                        }}
                      >
                        {group.name}
                      </ListboxItem>
                    ))}
                  </ListboxSection>
                )}
                
                <ListboxSection>
                  {feedData.items.map((item) => {
                    return (
                      <ListboxItem
                        key={item.id}
                        classNames={{
                          base: `${currentMpId === item.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`
                        }}
                        startContent={
                          item.mpCover ? (
                            <Avatar
                              classNames={{
                                base: 'shadow-sm',
                              }}
                              size="sm"
                              radius="full"
                              src={item.mpCover}
                              fallback={
                                <span className="text-sm text-gray-400">
                                  {item.mpName?.slice(0, 1) || '?'}
                                </span>
                              }
                            />
                          ) : null
                        }
                        onPress={() => {
                          setCurrentMpId(item.id);
                          setCurrentGroupId('');
                          navigate(`/feeds/${item.id}`);
                        }}
                      >
                        {item.mpName}
                      </ListboxItem>
                    );
                  }) || []}
                </ListboxSection>
              </Listbox>
            </div>
          ) : (
            ''
          )}
        </div>

        <div className="flex-1 h-full flex flex-col">
          <div className="p-4 pb-2 flex justify-between items-center bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
            <h3 className="text-xl font-semibold flex-1 overflow-hidden text-ellipsis break-keep text-nowrap pr-1">
              {currentGroupInfo?.name || currentMpInfo?.mpName || '全部公众号文章'}
            </h3>
            {currentMpInfo ? (
              <div className="flex h-5 items-center space-x-4 text-small">
                <div className="font-light text-gray-600 dark:text-gray-400">
                  最后更新:
                  {dayjs(currentMpInfo.syncTime * 1e3).format(
                    'YYYY-MM-DD HH:mm'
                  )}
                </div>
                <Divider orientation="vertical" />
                <Tooltip
                  content="频繁调用可能会导致一段时间内不可用"
                  color="danger"
                  showArrow
                  closeDelay={200}
                >
                  <Link
                    size="sm"
                    className="text-primary hover:text-primary-600 transition-colors"
                    isDisabled={isGetArticlesLoading}
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      await refreshMpArticles({ mpId: currentMpInfo.id });
                      await refetchFeedList();
                      await queryUtils.article.list.reset();
                    }}
                  >
                    {isGetArticlesLoading ? '更新中...' : '立即更新'}
                  </Link>
                </Tooltip>
                <Divider orientation="vertical" />
                <Tooltip
                  content="获取历史文章，可能比较耗时"
                  color="primary"
                  showArrow
                  closeDelay={200}
                >
                  <Link
                    size="sm"
                    className="text-secondary hover:text-secondary-600 transition-colors"
                    isDisabled={
                      isGetHistoryArticlesLoading ||
                      currentMpInfo.hasHistory === 0
                    }
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      await getHistoryArticles({
                        mpId: currentMpInfo.id,
                      });
                      await refetchInProgressHistoryMp();
                    }}
                  >
                    {isGetHistoryArticlesLoading
                      ? '获取中...'
                      : '获取历史文章'}
                  </Link>
                </Tooltip>
                <Divider orientation="vertical" />
                <Tooltip
                  content="删除此公众号订阅"
                  color="danger"
                  showArrow
                  closeDelay={200}
                >
                  <Link
                    size="sm"
                    color="danger"
                    className="text-danger hover:text-danger-600 transition-colors"
                    isDisabled={isDeleteFeedLoading}
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (
                        window.confirm(
                          `确定要删除公众号【${currentMpInfo.mpName}】吗？此操作不可恢复！`
                        )
                      ) {
                        await deleteFeed(currentMpInfo.id);
                      }
                    }}
                  >
                    删除订阅
                  </Link>
                </Tooltip>
              </div>
            ) : currentGroupId ? (
              <div className="flex h-5 items-center space-x-4 text-small">
                <Button
                  color="default"
                  size="sm"
                  variant="light"
                  className="text-gray-600"
                  onClick={() => {
                    setCurrentGroupId(currentGroupId);
                    setSelectedFeeds([]);
                    onRemoveFeedFromGroupOpen();
                  }}
                >
                  移除公众号
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  variant="flat"
                  onClick={() => {
                    setCurrentGroupId(currentGroupId);
                    onAddFeedToGroupOpen();
                  }}
                >
                  添加公众号
                </Button>
              </div>
            ) : (
              <div className="flex h-5 items-center space-x-4 text-small">
                <div className="font-light text-gray-600 dark:text-gray-400">
                  合并所有公众号文章
                </div>
                <Divider orientation="vertical" />
                <Link
                  size="sm"
                  className="text-primary hover:text-primary-600 transition-colors"
                  onClick={handleExportOpml}
                >
                  导出OPML
                </Link>
                <Divider orientation="vertical" />
                <Tooltip
                  content="更新所有公众号文章"
                  color="primary"
                  showArrow
                  closeDelay={200}
                >
                  <Link
                    size="sm"
                    className="text-secondary hover:text-secondary-600 transition-colors"
                    as="button"
                    isDisabled={isRefreshAllMpArticlesRunning}
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      await fetch('/feeds/all.atom?update=true');
                      toast.success('已触发更新', {
                        description: '稍后刷新页面查看最新内容',
                      });
                    }}
                  >
                    {isRefreshAllMpArticlesRunning ? '更新中...' : '全部更新'}
                  </Link>
                </Tooltip>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <ArticleList />
          </div>
        </div>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">添加公众号</ModalHeader>
              <ModalBody>
                <div className="text-gray-600 text-sm mb-2">
                  粘贴公众号分享链接，支持批量添加（每行一个链接）
                </div>
                <Textarea
                  autoFocus
                  placeholder="输入微信公众号文章链接，如 https://mp.weixin.qq.com/s/xxx"
                  value={wxsLink}
                  onChange={(e) => setWxsLink(e.target.value)}
                  minRows={5}
                  maxRows={10}
                  classNames={{
                    input: "resize-y"
                  }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  提示：添加频率过高容易被封控，建议每次添加后等待一段时间
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                >
                  取消
                </Button>
                <Button
                  color="primary"
                  isLoading={isGetMpInfoLoading || isAddFeedLoading}
                  onPress={handleConfirm}
                  className="bg-gradient-to-tr from-primary to-secondary"
                >
                  添加
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
      <Modal isOpen={isGroupOpen} onOpenChange={onGroupOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">添加分组</ModalHeader>
              <ModalBody>
                <div className="text-gray-600 text-sm mb-2">
                  请输入分组名称
                </div>
                <Input
                  autoFocus
                  placeholder="输入分组名称"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                >
                  取消
                </Button>
                <Button
                  color="secondary"
                  isLoading={isCreateGroupLoading}
                  onPress={handleAddGroup}
                >
                  创建
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
      <Modal isOpen={isAddFeedToGroupOpen} onOpenChange={onAddFeedToGroupOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                添加公众号到 {currentGroupInfo?.name || '分组'}
              </ModalHeader>
              <ModalBody>
                <div className="text-gray-600 text-sm mb-2">
                  选择要添加到该分组的公众号
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {feedData && feedData.items && feedData.items.length > 0 ? (
                    <CheckboxGroup
                      value={selectedFeeds}
                      onValueChange={setSelectedFeeds}
                      orientation="vertical"
                    >
                      {feedData.items.map((feed) => {
                        const isInGroup = currentGroupInfo?.feeds?.some(
                          (groupFeed) => groupFeed.id === feed.id
                        );
                        
                        return (
                          <Checkbox
                            key={feed.id}
                            value={feed.id}
                            isDisabled={isInGroup}
                            classNames={{
                              base: isInGroup ? "opacity-50" : "",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {feed.mpCover && (
                                <Avatar
                                  src={feed.mpCover}
                                  size="sm"
                                  radius="full"
                                  className="flex-shrink-0"
                                />
                              )}
                              <span>{feed.mpName}</span>
                              {isInGroup && (
                                <Chip size="sm" color="secondary" variant="flat">已添加</Chip>
                              )}
                            </div>
                          </Checkbox>
                        );
                      })}
                    </CheckboxGroup>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">暂无可添加的公众号</p>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                >
                  取消
                </Button>
                <Button
                  color="primary"
                  isLoading={isAddFeedsToGroupLoading}
                  onPress={handleAddFeedsToGroup}
                  isDisabled={selectedFeeds.length === 0}
                >
                  添加到分组
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
      <Modal isOpen={isRemoveFeedFromGroupOpen} onOpenChange={onRemoveFeedFromGroupOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                从 {currentGroupInfo?.name || '分组'} 移除公众号
              </ModalHeader>
              <ModalBody>
                <div className="text-gray-600 text-sm mb-2">
                  选择要从分组中移除的公众号
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {currentGroupInfo?.feeds && currentGroupInfo.feeds.length > 0 ? (
                    <CheckboxGroup
                      value={selectedFeeds}
                      onValueChange={setSelectedFeeds}
                      orientation="vertical"
                    >
                      {currentGroupInfo.feeds.map((feed) => (
                        <Checkbox
                          key={feed.id}
                          value={feed.id}
                        >
                          <div className="flex items-center gap-2">
                            {feed.mpCover && (
                              <Avatar
                                src={feed.mpCover}
                                size="sm"
                                radius="full"
                                className="flex-shrink-0"
                              />
                            )}
                            <span>{feed.mpName}</span>
                          </div>
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">分组中暂无公众号</p>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                >
                  取消
                </Button>
                <Button
                  color="danger"
                  isLoading={isRemoveFeedsFromGroupLoading}
                  onPress={handleRemoveFeedsFromGroup}
                  isDisabled={selectedFeeds.length === 0}
                >
                  移除选中的公众号
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default Feeds;
