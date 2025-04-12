import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Button, Card, CardBody, CardHeader, Chip, Divider, Spinner, Tab, Tabs, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Tooltip, Select, SelectItem } from '@nextui-org/react';
import { trpc } from '@web/utils/trpc';
import { RefreshIcon, CalendarIcon, TimeIcon } from '@web/components/icons/MaterialIcons';
import { toast, Toaster } from 'react-hot-toast';
import { format, startOfDay } from 'date-fns';

interface HotSearchItem {
  rank: number;
  keyword: string;
  hotIndex: number;
  aiScore?: number; // AI评分
  source?: string; // 添加来源字段
}

// 分析历史记录类型定义
interface AnalysisRecord {
  timestamp: string; // 分析时间，格式为ISO字符串
  date: string; // 日期部分，YYYY-MM-DD
  hour: number; // 小时部分，0-23
  items: Array<{
    keyword: string;
    score: number;
  }>;
}

// AI评分API配置
const AI_API_CONFIG = {
  token: 'pat_8rJhqLAHFCVf2SiBDYZ78jaohmjwU4nZedwndJvXhazt9zllzU4kqdikZ3LLni1U',
  botId: '7487603103236522035',
  url: 'https://api.coze.cn/v3/chat',
};

// 热榜类型定义
type HotListType = 'smartRank' | 'weiboHot' | 'weiboNews' | 'baiduHot' | 'baiduLife' | 'zhihuHot' | 'toutiaoHot';

// 热榜来源配置
const hotListSources = [
  {
    key: 'smartRank',
    title: '热榜智能评分',
    apiKey: 'smartRank',
    link: '',
    keywordLink: (keyword: string) => `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`,
    showHotIndex: true,
  },
  {
    key: 'weiboHot',
    title: '微博热搜榜',
    apiKey: 'weiboHotSearch',
    link: 'https://s.weibo.com/top/summary?cate=realtimehot',
    keywordLink: (keyword: string) => `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}`,
    showHotIndex: true,
  },
  {
    key: 'weiboNews',
    title: '微博要闻榜',
    apiKey: 'weiboNews',
    link: 'https://s.weibo.com/top/summary?cate=socialevent',
    keywordLink: (keyword: string) => `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}`,
    showHotIndex: false,
  },
  {
    key: 'baiduHot',
    title: '百度热搜榜',
    apiKey: 'baiduHot',
    link: 'https://top.baidu.com/board?tab=realtime',
    keywordLink: (keyword: string) => `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`,
    showHotIndex: true,
  },
  {
    key: 'baiduLife',
    title: '百度民生榜',
    apiKey: 'baiduLife',
    link: 'https://top.baidu.com/board?platform=wise',
    keywordLink: (keyword: string) => `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`,
    showHotIndex: true,
  },
  {
    key: 'toutiaoHot',
    title: '头条热榜',
    apiKey: 'toutiaoHot',
    link: 'https://www.toutiao.com',
    keywordLink: (keyword: string) => `https://www.toutiao.com/search/?keyword=${encodeURIComponent(keyword)}`,
    showHotIndex: true,
  },
  {
    key: 'zhihuHot',
    title: '知乎热榜',
    apiKey: 'zhihuHot',
    link: 'https://www.zhihu.com/billboard',
    keywordLink: (keyword: string) => `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(keyword)}`,
    showHotIndex: true,
  },
];

const HotList = () => {
  const [activeTab, setActiveTab] = useState<HotListType>('smartRank');
  const [lastUpdateTimes, setLastUpdateTimes] = useState<Record<HotListType, string>>({} as Record<HotListType, string>);
  const [aiScores, setAiScores] = useState<Record<string, number>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEvaluateTime, setLastEvaluateTime] = useState<string | null>(null);
  const [apiResponseData, setApiResponseData] = useState<string | null>(null); // 存储API返回的原始数据
  const [aiMessage, setAiMessage] = useState<string | null>(null); // 存储解析后的AI消息
  const [jsonExtracted, setJsonExtracted] = useState<string | null>(null); // 存储从消息中提取的JSON字符串
  const [manualExtractionAttempted, setManualExtractionAttempted] = useState(false); // 是否尝试过手动提取
  const [evaluateProgress, setEvaluateProgress] = useState(0); // 添加进度状态
  const [evaluateStatus, setEvaluateStatus] = useState<string>(''); // 添加状态文本
  
  // 历史记录相关状态
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([]); // 历史分析记录
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd')); // 当前选择的日期
  const [selectedHour, setSelectedHour] = useState<string>('current'); // 当前选择的小时，'current'表示当前时间
  const timerRef = useRef<number | null>(null); // 用于存储定时器ID
  
  // 生成小时选项
  const hourOptions = useMemo(() => {
    return [
      ...Array.from({ length: 24 }, (_, i) => ({
        key: String(i + 1),
        label: `${String(i + 1).padStart(2, '0')}时`,
      })),
      { key: 'current', label: '当前' }, // 将当前选项放在最后
    ];
  }, []);
  
  // 当日期变化时设置默认小时
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const isToday = selectedDate === today;
    
    if (isToday) {
      // 今日默认选择"当前"
      setSelectedHour('current');
    } else {
      // 非今日默认选择当前小时对应的整点
      const currentHour = new Date().getHours();
      const hourString = String(currentHour + 1);
      
      // 检查该时间点在历史记录中是否存在
      const hasHour = analysisHistory.some(
        record => record.date === selectedDate && record.hour === currentHour
      );
      
      if (hasHour) {
        setSelectedHour(hourString);
      } else {
        // 如果该时间点不存在，选择该日期的第一个可用时间点
        const recordsForDate = analysisHistory.filter(record => record.date === selectedDate);
        if (recordsForDate.length > 0) {
          // 按小时排序
          recordsForDate.sort((a, b) => a.hour - b.hour);
          setSelectedHour(String(recordsForDate[0].hour + 1));
        }
      }
    }
  }, [selectedDate, analysisHistory]);
  
  // 过滤当前选择的日期可用的小时选项并排序
  const availableHours = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const isToday = selectedDate === today;
    
    // 过滤出选定日期的所有记录
    const recordsForDate = analysisHistory.filter(record => record.date === selectedDate);
    const availableHourKeys = recordsForDate.map(record => String(record.hour + 1));
    
    // 如果是今天，始终显示"当前"选项
    let filteredHours = hourOptions.filter(option => 
      option.key === 'current' ? isToday : availableHourKeys.includes(option.key)
    );
    
    // 确保"当前"选项在最后（如果存在）
    if (isToday) {
      const currentOption = filteredHours.find(option => option.key === 'current');
      if (currentOption) {
        filteredHours = filteredHours
          .filter(option => option.key !== 'current')
          .concat(currentOption);
      }
    }
    
    return filteredHours;
  }, [selectedDate, analysisHistory, hourOptions]);
  
  // 获取当前选择的数据
  const currentAnalysisData = useMemo(() => {
    if (selectedHour === 'current') {
      // 返回实时数据
      return null; 
    } else {
      // 查找历史记录
      const hourNumber = parseInt(selectedHour) - 1; // 转换为0-23的小时值
      return analysisHistory.find(
        record => record.date === selectedDate && record.hour === hourNumber
      );
    }
  }, [selectedDate, selectedHour, analysisHistory]);
  
  // 头条热榜数据
  const toutiaoHot = trpc.hotList.toutiaoHot.useQuery(undefined, {
    refetchInterval: 600000, // 每10分钟自动刷新一次
    retry: 3,
    retryDelay: 1000,
  });
  
  // 微博热搜榜数据
  const weiboHotSearch = trpc.hotList.weiboHotSearch.useQuery(undefined, {
    refetchInterval: 600000, // 每10分钟自动刷新一次
    retry: 3,
    retryDelay: 1000,
  });
  
  // 微博要闻榜数据
  const weiboNews = trpc.hotList.weiboNews.useQuery(undefined, {
    refetchInterval: 600000, // 每10分钟自动刷新一次
    retry: 3,
    retryDelay: 1000,
  });
  
  // 百度热搜榜数据
  const baiduHot = trpc.hotList.baiduHot.useQuery(undefined, {
    refetchInterval: 600000, // 每10分钟自动刷新一次
    retry: 3,
    retryDelay: 1000,
  });
  
  // 百度民生榜数据
  const baiduLife = trpc.hotList.baiduLife.useQuery(undefined, {
    refetchInterval: 600000, // 每10分钟自动刷新一次
    retry: 3,
    retryDelay: 1000,
  });
  
  // 知乎热榜数据
  const zhihuHot = trpc.hotList.zhihuHot.useQuery(undefined, {
    refetchInterval: 600000, // 每10分钟自动刷新一次
    retry: 3,
    retryDelay: 1000,
  });
  
  // 整合所有热榜数据为智能评分榜单
  const smartRankData = useMemo(() => {
    // 创建一个Map来存储所有的关键词和它们的热度指数
    const keywordMap = new Map<string, { hotIndex: number; source: string }>();
    
    // 添加所有热榜中的关键词
    const addItems = (items: HotSearchItem[] | undefined, source: string) => {
      if (!items) return;
      
      items.forEach(item => {
        if (!item.keyword || item.keyword === '-') return;
        
        // 如果关键词已存在，取更高的热度指数
        const currentData = keywordMap.get(item.keyword) || { hotIndex: 0, source: '' };
        const newScore = item.hotIndex || (1000000 / (item.rank || 1));
        
        // 根据来源权重调整热度指数
        let weightedScore = newScore;
        switch (source) {
          case 'weiboHot':
            weightedScore = newScore * 1.2; // 微博热搜权重高一些
            break;
          case 'zhihuHot':
            weightedScore = newScore * 1.1; // 知乎热榜权重高一些
            break;
          default:
            weightedScore = newScore;
        }
        
        if (weightedScore > currentData.hotIndex) {
          keywordMap.set(item.keyword, { 
            hotIndex: weightedScore,
            source: source // 保存来源信息
          });
        }
      });
    };
    
    // 添加各个热榜数据
    addItems(weiboHotSearch.data?.items, '微博热搜榜');
    addItems(weiboNews.data?.items, '微博要闻榜');
    addItems(baiduHot.data?.items, '百度热搜榜');
    addItems(baiduLife.data?.items, '百度民生榜');
    addItems(zhihuHot.data?.items, '知乎热榜');
    addItems(toutiaoHot.data?.items, '头条热榜');
    
    // 将Map转换为数组并按热度指数排序
    const sortedItems: HotSearchItem[] = Array.from(keywordMap.entries())
      .map(([keyword, data], index) => ({
        rank: index + 1,
        keyword,
        hotIndex: Math.round(data.hotIndex),
        aiScore: aiScores[keyword], // 添加AI评分
        source: data.source, // 添加来源信息
      }))
      .sort((a, b) => {
        // 优先按AI评分倒序排列
        if (a.aiScore !== undefined && b.aiScore !== undefined) {
          return b.aiScore - a.aiScore;
        }
        // 如果AI评分相同或没有评分，则按热度指数倒序排列
        return b.hotIndex - a.hotIndex;
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }))
      ;
    
    return {
      items: sortedItems,
      updateTime: new Date().toISOString(),
    };
  }, [
    weiboHotSearch.data?.items,
    weiboNews.data?.items,
    baiduHot.data?.items,
    baiduLife.data?.items,
    zhihuHot.data?.items,
    toutiaoHot.data?.items,
    aiScores,
  ]);
  
  // 调用AI评分API
  const evaluateKeywords = useCallback(async () => {
    if (isEvaluating || !smartRankData.items || smartRankData.items.length === 0) return;
    
    setIsEvaluating(true);
    setApiResponseData(null);
    setAiMessage(null);
    setEvaluateProgress(0);
    setEvaluateStatus('准备开始AI分析...');
    
    try {
      // 提取所有关键词
      const allKeywords = smartRankData.items.map(item => item.keyword);
      const totalCount = allKeywords.length;
      
      // 分批处理，每批最多100个关键词
      const batchSize = 100;
      const batches: string[][] = [];
      
      for (let i = 0; i < allKeywords.length; i += batchSize) {
        batches.push(allKeywords.slice(i, i + batchSize));
      }
      
      console.log(`关键词总数: ${totalCount}, 分为 ${batches.length} 批处理`);
      setEvaluateStatus(`关键词总数: ${totalCount}, 分为 ${batches.length} 批处理`);
      
      // 初始化结果对象
      const newScores: Record<string, number> = { ...aiScores };
      let processedCount = 0;
      let allResults: Array<{ keyword: string; score: number }> = [];
      
      // 逐批处理
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batchKeywords = batches[batchIndex];
        
        setEvaluateStatus(`处理第 ${batchIndex + 1}/${batches.length} 批关键词 (${batchKeywords.length}个)...`);
        
        // 构建API请求
        const promptContent = `关键词列表：${batchKeywords.join('、')}`;
        
        console.log(`正在发送第 ${batchIndex + 1}/${batches.length} 批AI评分请求到:`, AI_API_CONFIG.url);
        
        // 新的API请求体格式，启用流式输出
        const requestBody = {
          bot_id: AI_API_CONFIG.botId,
          user_id: "wewe-rss-user-" + new Date().getTime() + "-batch-" + (batchIndex + 1),
          stream: true,
          auto_save_history: true,
          additional_messages: [
            {
              role: "user",
              content: promptContent,
              content_type: "text"
            }
          ]
        };
        
        try {
          const response = await fetch(AI_API_CONFIG.url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AI_API_CONFIG.token}`,
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream'
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
          }
          
          // 处理流式响应
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('无法获取响应流');
          }
          
          let buffer = '';
          let currentEvent = '';
          let currentData = '';
          let fullContent = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }
            
            // 将Uint8Array转换为字符串
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            
            // 处理完整的SSE消息
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('event:')) {
                currentEvent = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                currentData = line.slice(5).trim();
                
                if (currentData === '[DONE]') {
                  continue;
                }
                
                try {
                  const eventData = JSON.parse(currentData);
                  
                  // 处理完整消息事件
                  if (currentEvent === 'conversation.message.completed' && eventData.type === 'answer' && eventData.role === 'assistant') {
                    const content = eventData.content;
                    if (content) {
                      fullContent = content;
                      setEvaluateStatus(`正在解析第 ${batchIndex + 1}/${batches.length} 批AI分析结果...`);
                      
                      // 尝试解析JSON
                      try {
                        const scoreResults = JSON.parse(content);
                        
                        // 验证并处理评分结果
                        let validItemCount = 0;
                        const batchResults: Array<{ keyword: string; score: number }> = [];
                        
                        scoreResults.forEach((item: any) => {
                          if (item && typeof item === 'object' && 'keyword' in item && 'score' in item) {
                            const { keyword, score } = item as { keyword: string; score: number };
                            if (keyword && typeof score === 'number' && score >= 0 && score <= 10) {
                              newScores[keyword] = score; // 更新评分
                              batchResults.push({ keyword, score });
                              validItemCount++;
                              processedCount++;
                            }
                          }
                        });
                        
                        if (validItemCount > 0) {
                          // 累积结果
                          allResults = [...allResults, ...batchResults];
                          
                          // 更新进度
                          const progress = Math.round((processedCount / totalCount) * 100);
                          setEvaluateProgress(progress);
                          setEvaluateStatus(`已处理 ${processedCount}/${totalCount} 个关键词 (${progress}%)...`);
                          
                          console.log(`批次 ${batchIndex + 1}/${batches.length} 成功分析 ${validItemCount} 个关键词`);
                        } else {
                          console.error(`批次 ${batchIndex + 1}/${batches.length} 未找到有效的评分项`);
                        }
                      } catch (e) {
                        console.error(`批次 ${batchIndex + 1}/${batches.length} 解析JSON失败:`, e);
                        throw new Error(`批次 ${batchIndex + 1}/${batches.length} 解析评分结果失败`);
                      }
                    }
                  }
                } catch (e) {
                  console.error('解析事件数据失败:', e);
                  console.log('原始数据:', currentData);
                }
              }
            }
          }
          
          if (!fullContent) {
            throw new Error(`批次 ${batchIndex + 1}/${batches.length} 未能获取到有效消息内容`);
          }
          
          // 如果不是最后一批，等待一小段时间再处理下一批，避免API限流
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error(`批次 ${batchIndex + 1}/${batches.length} AI评分失败:`, error);
          setEvaluateStatus(`批次 ${batchIndex + 1}/${batches.length} AI分析失败，继续处理下一批...`);
          // 记录错误但继续处理下一批
          toast.error(`批次 ${batchIndex + 1}/${batches.length} 处理失败，已跳过`);
        }
      }
      
      // 所有批次处理完成后的操作
      if (processedCount > 0) {
        setEvaluateStatus(`全部处理完成，成功分析 ${processedCount}/${totalCount} 个关键词`);
        setAiScores(newScores);
        
        // 更新最后评分时间
        const now = new Date();
        setLastEvaluateTime(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        
        // 存储到localStorage以便页面刷新后保留
        localStorage.setItem('aiScores', JSON.stringify(newScores));
        localStorage.setItem('lastEvaluateTime', now.toISOString());
        
        // 保存分析结果到历史记录
        if (allResults.length > 0) {
          saveAnalysisRecord(newScores, allResults);
        }
        
        // 显示完成提示
        toast.success(`AI分析完成，成功处理 ${processedCount}/${totalCount} 个关键词`);
      } else {
        throw new Error('所有批次处理后未找到有效的评分项');
      }
    } catch (error) {
      console.error('AI评分失败:', error);
      setEvaluateStatus('AI分析失败，请重试');
      alert(`AI评分失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsEvaluating(false);
      setEvaluateProgress(0);
      setEvaluateStatus('');
    }
  }, [smartRankData.items, aiScores, isEvaluating]);
  
  // 保存分析结果到历史记录
  const saveAnalysisRecord = useCallback((scores: Record<string, number>, rawResults: any[]) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const date = format(now, 'yyyy-MM-dd');
    const hour = now.getHours();
    
    // 转换评分结果为排序后的数组
    const items = rawResults
      .filter(item => item && typeof item === 'object' && 'keyword' in item && 'score' in item)
      .map(item => ({
        keyword: item.keyword,
        score: item.score
      }))
      .sort((a, b) => b.score - a.score); // 按评分倒序排列
    
    const newRecord: AnalysisRecord = {
      timestamp,
      date,
      hour,
      items
    };
    
    // 检查是否已有相同时间批次的记录，如果有则替换
    setAnalysisHistory(prevHistory => {
      const existingRecordIndex = prevHistory.findIndex(
        record => record.date === date && record.hour === hour
      );
      
      if (existingRecordIndex >= 0) {
        const newHistory = [...prevHistory];
        newHistory[existingRecordIndex] = newRecord;
        return newHistory;
      } else {
        return [...prevHistory, newRecord];
      }
    });
    
    // 保存到localStorage
    const historyKey = `aiAnalysisHistory_${date}_${hour}`;
    localStorage.setItem(historyKey, JSON.stringify(newRecord));
    
    // 更新历史记录索引
    const historyIndex = JSON.parse(localStorage.getItem('aiAnalysisHistoryIndex') || '[]');
    if (!historyIndex.includes(`${date}_${hour}`)) {
      historyIndex.push(`${date}_${hour}`);
      localStorage.setItem('aiAnalysisHistoryIndex', JSON.stringify(historyIndex));
    }
    
    return newRecord;
  }, []);
  
  // 加载历史分析记录
  const loadAnalysisHistory = useCallback(() => {
    try {
      const historyIndex = JSON.parse(localStorage.getItem('aiAnalysisHistoryIndex') || '[]');
      const loadedHistory: AnalysisRecord[] = [];
      
      historyIndex.forEach((key: string) => {
        const [date, hour] = key.split('_');
        const historyKey = `aiAnalysisHistory_${date}_${parseInt(hour)}`;
        const recordJson = localStorage.getItem(historyKey);
        
        if (recordJson) {
          try {
            const record = JSON.parse(recordJson);
            loadedHistory.push(record);
          } catch (e) {
            console.error(`解析历史记录失败: ${historyKey}`, e);
          }
        }
      });
      
      setAnalysisHistory(loadedHistory);
    } catch (e) {
      console.error('加载历史分析记录失败', e);
    }
  }, []);
  
  // 设置定时分析任务
  const setupAnalysisTimer = useCallback(() => {
    // 清除已有的定时器
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    
    // 计算距离下一个整点小时的毫秒数
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const timeUntilNextHour = nextHour.getTime() - now.getTime();
    
    console.log(`定时分析：将在 ${Math.round(timeUntilNextHour / 1000 / 60)} 分钟后（${nextHour.toLocaleTimeString()}）触发首次分析`);
    
    // 设置首次触发的定时器
    const initialTimer = window.setTimeout(() => {
      // 到达整点小时时执行分析
      if (activeTab === 'smartRank') {
        evaluateKeywords();
      }
      
      // 设置每小时定时执行的定时器
      timerRef.current = window.setInterval(() => {
        if (activeTab === 'smartRank') {
          evaluateKeywords();
        }
      }, 60 * 60 * 1000); // 每小时执行一次
    }, timeUntilNextHour);
    
    timerRef.current = initialTimer;
    
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [evaluateKeywords, activeTab]);
  
  // 从localStorage加载保存的评分
  useEffect(() => {
    const savedScores = localStorage.getItem('aiScores');
    const savedTime = localStorage.getItem('lastEvaluateTime');
    
    if (savedScores) {
      try {
        setAiScores(JSON.parse(savedScores));
      } catch (e) {
        console.error('解析保存的AI评分失败', e);
      }
    }
    
    if (savedTime) {
      try {
        const date = new Date(savedTime);
        setLastEvaluateTime(`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      } catch (e) {
        console.error('解析保存的评分时间失败', e);
      }
    }
  }, []);
  
  // 模拟生成历史分析记录数据
  const generateMockHistoryData = useCallback(() => {
    // 模拟关键词集合
    const mockKeywords = [
      { keyword: "世界杯", baseScore: 9.8 },
      { keyword: "春节", baseScore: 9.5 },
      { keyword: "ChatGPT", baseScore: 9.3 },
      { keyword: "元宇宙", baseScore: 8.9 },
      { keyword: "人工智能", baseScore: 8.7 },
      { keyword: "疫情", baseScore: 8.5 },
      { keyword: "房价", baseScore: 8.3 },
      { keyword: "股市", baseScore: 8.1 },
      { keyword: "数字人民币", baseScore: 8.0 },
      { keyword: "冬奥会", baseScore: 7.9 },
      { keyword: "国庆档", baseScore: 7.8 },
      { keyword: "高考", baseScore: 7.7 },
      { keyword: "电动汽车", baseScore: 7.6 },
      { keyword: "芯片短缺", baseScore: 7.5 },
      { keyword: "碳中和", baseScore: 7.4 },
      { keyword: "脱贫扶贫", baseScore: 7.3 },
      { keyword: "科技创新", baseScore: 7.2 },
      { keyword: "双减政策", baseScore: 7.1 },
      { keyword: "航天", baseScore: 7.0 },
      { keyword: "中国制造", baseScore: 6.9 },
      { keyword: "进博会", baseScore: 6.8 },
      { keyword: "振兴村", baseScore: 6.7 },
      { keyword: "数字经济", baseScore: 6.6 },
      { keyword: "ivism", baseScore: 6.5 },
      { keyword: "半导体", baseScore: 6.4 },
      { keyword: "抖音", baseScore: 6.3 },
      { keyword: "特斯拉", baseScore: 6.2 },
      { keyword: "光伏产业", baseScore: 6.1 },
      { keyword: "养老", baseScore: 6.0 },
      { keyword: "医疗改革", baseScore: 5.9 },
      { keyword: "教育公平", baseScore: 5.8 },
      { keyword: "直播带货", baseScore: 5.7 },
      { keyword: "游戏版号", baseScore: 5.6 },
      { keyword: "垃圾分类", baseScore: 5.5 },
      { keyword: "共同富裕", baseScore: 5.4 },
      { keyword: "燃油车禁售", baseScore: 5.3 },
      { keyword: "创业", baseScore: 5.2 },
      { keyword: "数字藏品", baseScore: 5.1 },
      { keyword: "5G", baseScore: 5.0 },
      { keyword: "中美关系", baseScore: 4.9 },
      { keyword: "台海局势", baseScore: 4.8 },
      { keyword: "北约", baseScore: 4.7 },
      { keyword: "国际贸易", baseScore: 4.6 },
      { keyword: "全球供应链", baseScore: 4.5 },
      { keyword: "通货膨胀", baseScore: 4.4 },
    ];
    
    // 清除旧的历史记录
    localStorage.removeItem('aiAnalysisHistoryIndex');
    
    // 获取当前时间
    const now = new Date();
    
    // 创建模拟历史记录索引
    const mockHistoryIndex: string[] = [];
    
    // 生成过去3天每小时的记录
    for (let day = 0; day < 3; day++) {
      // 创建日期对象（当前日期减去day天）
      const mockDate = new Date(now);
      mockDate.setDate(now.getDate() - day);
      const dateStr = format(mockDate, 'yyyy-MM-dd');
      
      // 每天生成24小时的数据
      for (let hour = 0; hour < 24; hour++) {
        // 创建固定数量的关键词（30个）
        const shuffledKeywords = [...mockKeywords]
          .sort(() => Math.random() - 0.5)
          .slice(0, 30);
        
        // 为关键词添加一些随机波动的评分
        const mockItems = shuffledKeywords.map(item => {
          // 随机变化每天的关键词评分以体现趋势
          const dayFactor = day * 0.2; // 每往前一天，评分基础值略有变化
          // 评分在原始baseScore上下浮动0.5分
          const randomOffset = (Math.random() - 0.5) * 1.0;
          let score = Math.min(10, Math.max(0, item.baseScore + randomOffset - dayFactor));
          score = Math.round(score * 10) / 10; // 保留一位小数
          
          return {
            keyword: item.keyword,
            score: score
          };
        });
        
        // 按评分降序排序
        mockItems.sort((a, b) => b.score - a.score);
        
        // 创建分析记录
        const mockRecord: AnalysisRecord = {
          timestamp: new Date(dateStr).toISOString(),
          date: dateStr,
          hour: hour,
          items: mockItems
        };
        
        // 保存到localStorage
        const historyKey = `aiAnalysisHistory_${dateStr}_${hour}`;
        localStorage.setItem(historyKey, JSON.stringify(mockRecord));
        
        // 添加到索引
        mockHistoryIndex.push(`${dateStr}_${hour}`);
      }
    }
    
    // 保存索引
    localStorage.setItem('aiAnalysisHistoryIndex', JSON.stringify(mockHistoryIndex));
    
    // 重新加载历史记录
    loadAnalysisHistory();
    
    console.log(`已生成${mockHistoryIndex.length}个模拟历史记录`);
    
    // 显示提示
    toast.success(`已生成${mockHistoryIndex.length}个模拟历史分析记录`);
  }, [loadAnalysisHistory]);
  
  // 初始化时自动模拟生成前3天的历史数据
  useEffect(() => {
    loadAnalysisHistory();
    const cleanup = setupAnalysisTimer();
    
    // 检查是否需要生成模拟数据
    const hasHistory = localStorage.getItem('aiAnalysisHistoryIndex');
    if (!hasHistory || JSON.parse(hasHistory).length < 24) {
      // 没有历史记录或记录不足一天，自动生成模拟数据
      generateMockHistoryData();
    }
    
    return cleanup;
  }, [loadAnalysisHistory, setupAnalysisTimer, generateMockHistoryData]);
  
  // 获取当前活动Tab的查询对象
  const getActiveQuery = () => {
    switch (activeTab) {
      case 'smartRank':
        // 智能评分榜单使用自定义查询对象
        return {
          data: smartRankData,
          isLoading: weiboHotSearch.isLoading || weiboNews.isLoading || baiduHot.isLoading || 
                    baiduLife.isLoading || zhihuHot.isLoading || toutiaoHot.isLoading,
          isError: false,
          error: null,
          refetch: () => {
            // 刷新所有热榜数据
            weiboHotSearch.refetch();
            weiboNews.refetch();
            baiduHot.refetch();
            baiduLife.refetch();
            zhihuHot.refetch();
            toutiaoHot.refetch();
          }
        };
      case 'toutiaoHot':
        return toutiaoHot;
      case 'weiboHot':
        return weiboHotSearch;
      case 'weiboNews':
        return weiboNews;
      case 'baiduHot':
        return baiduHot;
      case 'baiduLife':
        return baiduLife;
      case 'zhihuHot':
        return zhihuHot;
      default:
        return weiboHotSearch;
    }
  };
  
  // 获取当前活动Tab的配置
  const getActiveSource = () => {
    return hotListSources.find(source => source.key === activeTab) || hotListSources[0];
  };
  
  // 格式化更新时间
  useEffect(() => {
    const updateTimes: Record<HotListType, string> = {} as Record<HotListType, string>;
    
    // 智能评分榜单更新时间取最新的热榜更新时间
    const now = new Date();
    updateTimes.smartRank = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    if (toutiaoHot.data?.updateTime) {
      const date = new Date(toutiaoHot.data.updateTime);
      updateTimes.toutiaoHot = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    
    if (weiboHotSearch.data?.updateTime) {
      const date = new Date(weiboHotSearch.data.updateTime);
      updateTimes.weiboHot = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    
    if (weiboNews.data?.updateTime) {
      const date = new Date(weiboNews.data.updateTime);
      updateTimes.weiboNews = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    
    if (baiduHot.data?.updateTime) {
      const date = new Date(baiduHot.data.updateTime);
      updateTimes.baiduHot = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    
    if (baiduLife.data?.updateTime) {
      const date = new Date(baiduLife.data.updateTime);
      updateTimes.baiduLife = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    
    if (zhihuHot.data?.updateTime) {
      const date = new Date(zhihuHot.data.updateTime);
      updateTimes.zhihuHot = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    
    setLastUpdateTimes(updateTimes);
  }, [
    toutiaoHot.data?.updateTime,
    weiboHotSearch.data?.updateTime,
    weiboNews.data?.updateTime,
    baiduHot.data?.updateTime,
    baiduLife.data?.updateTime,
    zhihuHot.data?.updateTime,
  ]);
  
  // 手动刷新数据
  const handleRefresh = () => {
    getActiveQuery().refetch();
  };
  
  // 切换Tab
  const handleTabChange = (key: React.Key) => {
    setActiveTab(key as HotListType);
  };
  
  // 手动尝试从API响应中提取数据
  const tryExtractDataManually = useCallback(() => {
    if (!apiResponseData) return;
    
    try {
      setManualExtractionAttempted(true);
      
      // 分析是否是SSE格式（包含event:和data:前缀的行）
      if (apiResponseData.includes('event:') && apiResponseData.includes('data:')) {
        console.log('检测到SSE格式响应，开始手动处理');
        
        const lines = apiResponseData.trim().split('\n');
        let messageContent = '';
        let finalMessageContent = '';
        let messageCompleted = false;
        
        for (const line of lines) {
          // 过滤出data:开头的行
          if (line.startsWith('data:')) {
            const dataContent = line.substring(5); // 移除'data:'前缀
            
            try {
              // 解析JSON数据
              if (dataContent === '"[DONE]"') {
                continue;
              }
              
              const eventData = JSON.parse(dataContent);
              
              // 根据事件类型处理数据
              if (line.includes('conversation.message.delta')) {
                // 累积增量消息内容
                if (eventData.content && eventData.role === 'assistant') {
                  messageContent += eventData.content;
                }
              } else if (line.includes('conversation.message.completed')) {
                // 获取完整消息
                if (eventData.content && eventData.role === 'assistant' && eventData.type === 'answer') {
                  finalMessageContent = eventData.content;
                  messageCompleted = true;
                }
              }
            } catch (e) {
              // 忽略解析错误
              console.log('解析事件数据行失败:', line);
            }
          }
        }
        
        // 使用最完整的消息内容
        const extractedMessage = messageCompleted ? finalMessageContent : messageContent;
        
        if (extractedMessage) {
          setAiMessage(extractedMessage);
          console.log('从SSE流中手动提取消息成功:', extractedMessage);
          
          if (extractJsonFromText(extractedMessage)) {
            return;
          }
        }
      }
      
      // 分析是否是流式响应格式（多行JSON）
      const lines = apiResponseData.trim().split('\n');
      
      alert('手动提取数据失败，无法找到有效的评分数据。请检查API返回格式。');
    } catch (error) {
      console.error('手动解析API响应失败:', error);
      alert(`手动解析API响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [apiResponseData, aiScores]);
  
  // 处理解析后的数据对象
  const handleParsedData = useCallback((data: any) => {
    console.log('手动解析API响应:', data);
    
    // 尝试提取AI消息内容
    let extractedMessage = '';
    
    // 检查各种可能的数据结构
    if (data.data && data.data.delta && data.data.delta.content) {
      extractedMessage = data.data.delta.content;
      console.log('手动从data.data.delta.content获取内容成功');
    } else if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
      const lastMessage = data.messages[data.messages.length - 1];
      if (lastMessage && lastMessage.content) {
        extractedMessage = lastMessage.content;
        console.log('手动从messages数组获取内容成功');
      }
    } else if (data.response && typeof data.response === 'string') {
      extractedMessage = data.response;
      console.log('手动从response字段获取内容成功');
    } else if (data.content && typeof data.content === 'string') {
      extractedMessage = data.content;
      console.log('手动从content字段获取内容成功');
    } else if (data.data) {
      if (typeof data.data === 'string') {
        extractedMessage = data.data;
        console.log('手动从data.data字符串获取内容成功');
      } else if (data.data.content && typeof data.data.content === 'string') {
        extractedMessage = data.data.content;
        console.log('手动从data.data.content获取内容成功');
      } else if (data.data.message && typeof data.data.message === 'string') {
        extractedMessage = data.data.message;
        console.log('手动从data.data.message获取内容成功');
      }
    }
    
    if (extractedMessage) {
      setAiMessage(extractedMessage);
      try {
        extractJsonFromText(extractedMessage);
      } catch (e) {
        console.error('从提取的消息中提取JSON失败:', e);
      }
    }
  }, [aiScores]);
  
  // 从文本中提取JSON并解析评分数据
  const extractJsonFromText = useCallback((text: string) => {
    let jsonString: string | null = null;
    
    // 方法1: 正则表达式提取
    const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
      console.log('手动正则提取JSON字符串成功');
    } 
    // 方法2: 根据索引提取
    else {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      
      if (start !== -1 && end !== -1 && start < end) {
        jsonString = text.substring(start, end + 1);
        console.log('手动索引提取JSON字符串成功');
      }
    }
    
    if (jsonString) {
      setJsonExtracted(jsonString);
      try {
        // 尝试解析提取的JSON
        const scoreResults = JSON.parse(jsonString);
        
        if (Array.isArray(scoreResults) && scoreResults.length > 0) {
          console.log('手动解析评分数据成功:', scoreResults);
          
          // 更新评分状态
          const newScores = { ...aiScores };
          let validItemCount = 0;
          
          scoreResults.forEach((item: any) => {
            if (item && typeof item === 'object' && 'keyword' in item && 'score' in item) {
              const { keyword, score } = item as { keyword: string; score: number };
              if (keyword && typeof score === 'number' && score >= 0 && score <= 10) {
                newScores[keyword] = score;
                validItemCount++;
              }
            }
          });
          
          if (validItemCount > 0) {
            setAiScores(newScores);
            console.log(`手动提取成功，找到${validItemCount}个有效评分项`);
            
            // 更新最后评分时间
            const now = new Date();
            setLastEvaluateTime(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
            
            // 存储到localStorage以便页面刷新后保留
            localStorage.setItem('aiScores', JSON.stringify(newScores));
            localStorage.setItem('lastEvaluateTime', now.toISOString());
            
            alert(`手动解析成功！找到了${validItemCount}个有效的评分项。`);
            return true;
          }
        }
      } catch (e) {
        console.error('手动解析JSON失败:', e);
      }
    }
    
    return false;
  }, [aiScores]);
  
  const renderErrorState = (error?: any) => (
    <div className="py-10 text-center flex flex-col items-center gap-4">
      <div className="text-danger">加载失败: {error?.message || '未知错误'}</div>
      <Button 
        color="primary" 
        variant="flat" 
        size="sm"
        startContent={<RefreshIcon className="w-4 h-4" />}
        onClick={handleRefresh}
      >
        重试
      </Button>
    </div>
  );
  
  const renderLoadingState = () => (
    <div className="py-10 text-center flex justify-center">
      <Spinner label="加载中..." color="primary" />
    </div>
  );
  
  const renderHotListContent = () => {
    const activeQuery = getActiveQuery();
    const activeSource = getActiveSource();
    const { isLoading, isError, error, data } = activeQuery;
    
    if (isError) {
      return renderErrorState(error);
    }
    
    if (isLoading) {
      return renderLoadingState();
    }
    
    // 如果是智能评分榜单且有历史记录选择，则显示筛选界面
    if (activeTab === 'smartRank') {
      return (
        <div className="flex flex-col gap-4">
          {/* 筛选条件 */}
          <div className="flex flex-col gap-3 p-4 bg-default-50 rounded-lg shadow-sm border border-default-200">
            <div className="text-md font-semibold text-default-700 mb-1">分析记录筛选</div>
            <div className="flex flex-wrap items-start gap-4">
              {/* 日期选择器 */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="text-default-500" />
                  <span className="text-sm text-default-700">日期:</span>
                </div>
                <Select
                  size="sm"
                  aria-label="选择日期"
                  className="w-40"
                  selectedKeys={[selectedDate]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  startContent={<CalendarIcon className="text-default-400" />}
                >
                  {/* 获取历史记录中所有不重复的日期 */}
                  {[...new Set(analysisHistory.map(record => record.date))]
                    .sort((a, b) => b.localeCompare(a)) // 按日期倒序排列
                    .map(date => (
                      <SelectItem key={date} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  {/* 如果没有今日的记录，添加今日选项 */}
                  {![...new Set(analysisHistory.map(record => record.date))].includes(format(new Date(), 'yyyy-MM-dd')) && (
                    <SelectItem key={format(new Date(), 'yyyy-MM-dd')} value={format(new Date(), 'yyyy-MM-dd')}>
                      {format(new Date(), 'yyyy-MM-dd')} (今日)
                    </SelectItem>
                  )}
                </Select>
              </div>
              
              {/* 小时选择器 */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <TimeIcon className="text-default-500" />
                  <span className="text-sm text-default-700">时段:</span>
                </div>
                <Select
                  size="sm"
                  aria-label="选择时段"
                  className="w-40"
                  selectedKeys={[selectedHour]}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  startContent={<TimeIcon className="text-default-400" />}
                >
                  {availableHours.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
            
            {/* 提示信息 */}
            {selectedHour === 'current' ? (
              <div className="text-xs text-default-500 mt-1">
                当前显示的是实时热搜数据，每整点小时会自动分析并记录。
                {evaluateProgress > 0 ? (
                  <span className="text-primary ml-1">正在分析中 ({evaluateProgress}%)...</span>
                ) : (
                  <Button 
                    size="sm" 
                    variant="flat" 
                    color="primary" 
                    className="ml-2 h-6 py-0"
                    onClick={evaluateKeywords}
                    isLoading={isEvaluating}
                    startContent={<RefreshIcon className="w-3 h-3" />}
                  >
                    立即分析
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-xs text-default-500 mt-1">
                显示的是 {selectedDate} {selectedHour}:00 整点分析的历史记录，共 {currentAnalysisData?.items.length || 0} 条关键词。
              </div>
            )}
          </div>
          
          {/* 列表内容 */}
          <Table 
            aria-label={activeSource.title} 
            removeWrapper 
            isHeaderSticky
            isStriped
            classNames={{
              base: "border border-divider rounded-lg overflow-hidden shadow-sm",
              th: "bg-default-100 text-default-800 font-semibold py-4",
              td: "py-3.5",
              tr: [
                "transition-colors hover:bg-default-100",
                "data-[odd=true]:bg-default-50/50",
              ].join(" "),
            }}
          >
            <TableHeader columns={[
              { key: "rank", label: "序号" },
              { key: "keyword", label: "关键词" },
              { key: "hotIndex", label: "热门指数" },
              { 
                key: "aiScore", 
                label: (
                  <div className="flex items-center gap-2 justify-center">
                    AI评分
                    {selectedHour === 'current' && (
                      <Tooltip content={isEvaluating ? "评分中..." : "开始AI评分"}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          isLoading={isEvaluating}
                          onClick={evaluateKeywords}
                          className="min-w-0 w-6 h-6 p-0"
                        >
                          <RefreshIcon className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                )
              }
            ]}>
              {(column) => (
                <TableColumn 
                  key={column.key} 
                  className={column.key === "hotIndex" ? "text-center w-48" : column.key === "aiScore" ? "text-center" : ""}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody 
              items={getTableItems()} 
              emptyContent={
                <div className="py-8 text-center">
                  <div className="text-default-400">暂无数据</div>
                </div>
              }
            >
              {(item: HotSearchItem) => (
                <TableRow key={item.rank}>
                  <TableCell className="w-16 text-center">
                    {item.rank <= 3 ? (
                      <div className={`
                        w-7 h-7 rounded-lg inline-flex items-center justify-center font-semibold text-white text-sm
                        ${item.rank === 1 ? 'bg-gradient-to-br from-red-500 to-red-600' : 
                          item.rank === 2 ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 
                          'bg-gradient-to-br from-green-500 to-green-600'}
                        shadow-sm
                      `}>
                        {item.rank}
                      </div>
                    ) : (
                      <span className="text-default-500 font-mono text-sm">
                        {String(item.rank).padStart(2, '0')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[300px]">
                    <div className="flex flex-col">
                      <a 
                        href={activeSource.keywordLink(item.keyword)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-600 hover:underline transition-colors"
                      >
                        {item.keyword}
                      </a>
                      {item.source && (
                        <span className="text-xs text-default-400 mt-0.5">
                          来源：{item.source}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-center w-48">
                    {item.hotIndex?.toLocaleString() || 'N/A'}
                  </TableCell>
                  <TableCell className="text-center w-24">
                    {item.aiScore !== undefined ? (
                      <Chip
                        size="sm"
                        variant="flat"
                        classNames={{
                          base: "transition-colors min-w-[40px] justify-center",
                          content: "font-semibold"
                        }}
                        color={
                          item.aiScore >= 8 
                            ? "success" 
                            : item.aiScore >= 5 
                              ? "warning" 
                              : "default"
                        }
                      >
                        {item.aiScore}
                      </Chip>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      );
    }
    
    // 其他非智能评分榜单的渲染
    // 根据是否显示热门指数动态设置表头列
    const tableColumns = [
      { key: "rank", label: "序号" },
      { key: "keyword", label: "关键词" },
    ];
    
    if (activeSource.showHotIndex) {
      tableColumns.push({ key: "hotIndex", label: "热门指数" });
    }
    
    return (
      <Table 
        aria-label={activeSource.title} 
        removeWrapper 
        isHeaderSticky
        isStriped
        classNames={{
          base: "border border-divider rounded-lg overflow-hidden shadow-sm",
          th: "bg-default-100 text-default-800 font-semibold py-4",
          td: "py-3.5",
          tr: [
            "transition-colors hover:bg-default-100",
            "data-[odd=true]:bg-default-50/50",
          ].join(" "),
        }}
      >
        <TableHeader columns={tableColumns}>
          {(column) => (
            <TableColumn 
              key={column.key} 
              className={column.key === "hotIndex" ? "text-center w-48" : ""}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody 
          items={data?.items || []} 
          emptyContent={
            <div className="py-8 text-center">
              <div className="text-default-400">暂无数据</div>
            </div>
          }
        >
          {(item: HotSearchItem) => (
            <TableRow key={item.rank}>
              <TableCell className="w-16 text-center">
                {item.rank <= 3 ? (
                  <div className={`
                    w-7 h-7 rounded-lg inline-flex items-center justify-center font-semibold text-white text-sm
                    ${item.rank === 1 ? 'bg-gradient-to-br from-red-500 to-red-600' : 
                      item.rank === 2 ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 
                      'bg-gradient-to-br from-green-500 to-green-600'}
                    shadow-sm
                  `}>
                    {item.rank}
                  </div>
                ) : (
                  <span className="text-default-500 font-mono text-sm">
                    {String(item.rank).padStart(2, '0')}
                  </span>
                )}
              </TableCell>
              <TableCell className="min-w-[300px]">
                <div className="flex flex-col">
                  <a 
                    href={activeSource.keywordLink(item.keyword)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-600 hover:underline transition-colors"
                  >
                    {item.keyword}
                  </a>
                  {item.source && (
                    <span className="text-xs text-default-400 mt-0.5">
                      来源：{item.source}
                    </span>
                  )}
                </div>
              </TableCell>
              {activeSource.showHotIndex && (
                <TableCell className="font-mono text-center w-48">
                  {item.hotIndex?.toLocaleString() || 'N/A'}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };
  
  // 根据筛选条件获取表格数据
  const getTableItems = useCallback((): HotSearchItem[] => {
    if (selectedHour === 'current') {
      // 返回当前实时数据
      return smartRankData.items || [];
    } else {
      // 返回历史记录数据
      if (currentAnalysisData && currentAnalysisData.items) {
        // 转换为HotSearchItem格式
        return currentAnalysisData.items.map((item, index) => ({
          rank: index + 1,
          keyword: item.keyword,
          hotIndex: 0, // 历史记录中没有热度指数，设为0
          aiScore: item.score,
          source: '历史分析记录'
        }));
      }
      return [];
    }
  }, [selectedHour, currentAnalysisData, smartRankData.items]);
  
  return (
    <div className="p-4 h-[calc(100vh-80px)]">
      <Toaster position="top-center" />
      <Card className="h-full border-none shadow-md flex flex-col">
        <CardHeader className="flex-none flex justify-between items-center bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
          <div className="text-xl font-bold">AI分析热榜</div>
          <div className="flex items-center gap-2">
            <Chip color="primary" variant="flat" size="sm" className="bg-white/50">
              最后更新: {lastUpdateTimes[activeTab] || '加载中...'}
            </Chip>
            {activeTab === 'smartRank' && lastEvaluateTime && (
              <Chip color="secondary" variant="flat" size="sm" className="bg-white/50">
                AI评分更新: {lastEvaluateTime}
              </Chip>
            )}
            <Chip 
              color="primary" 
              variant="flat" 
              size="sm"
              className="cursor-pointer hover:bg-primary/20 transition-all duration-200 bg-white/50"
              onClick={handleRefresh}
              startContent={<RefreshIcon className="w-3 h-3" />}
              isDisabled={getActiveQuery().isLoading}
            >
              刷新
            </Chip>
            <a 
              href={getActiveSource().link} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Chip 
                color="default" 
                variant="flat" 
                size="sm"
                className="cursor-pointer hover:bg-default-100 transition-all duration-200 bg-white/50"
              >
                官网
              </Chip>
            </a>
          </div>
        </CardHeader>
        <Divider className="flex-none" />
        <div className="flex flex-1 min-h-0">
          {/* 左侧Tabs */}
          <div className="w-52 min-w-[208px] border-r border-divider bg-default-50">
            <Tabs 
              aria-label="热榜分类" 
              selectedKey={activeTab}
              onSelectionChange={handleTabChange}
              classNames={{
                base: "w-full",
                tabList: "gap-0 w-full relative rounded-none flex flex-col p-2",
                cursor: "w-full bg-white",
                tab: "w-full h-12 data-[selected=true]:bg-white rounded-lg transition-all duration-200",
                tabContent: "group-data-[selected=true]:text-primary font-medium whitespace-nowrap px-3"
              }}
            >
              {hotListSources.map(source => (
                <Tab 
                  key={source.key} 
                  title={
                    <div className="flex items-center gap-2">
                      {source.key === activeTab && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      <span className="text-sm">{source.title}</span>
                    </div>
                  } 
                />
              ))}
            </Tabs>
          </div>
          
          {/* 右侧内容区域 */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* AI分析结果区域 */}
            {activeTab === 'smartRank' && (
              <div className="flex-none px-4 pt-4">
                {jsonExtracted && (
                  <Card className="mb-2 bg-success-50/30 shadow-sm">
                    <CardHeader className="pb-0">
                      <h3 className="text-md font-bold text-success">提取的JSON数据</h3>
                    </CardHeader>
                    <CardBody>
                      <div className="max-h-40 overflow-auto">
                        <pre className="text-sm whitespace-pre-wrap break-words">{jsonExtracted}</pre>
                      </div>
                    </CardBody>
                  </Card>
                )}
                
                {aiMessage && (
                  <Card className="mb-2 bg-primary-50/30 shadow-sm">
                    <CardHeader className="pb-0">
                      <h3 className="text-md font-bold text-primary">大模型返回的消息内容</h3>
                    </CardHeader>
                    <CardBody>
                      <div className="max-h-60 overflow-auto">
                        <pre className="text-sm whitespace-pre-wrap break-words">{aiMessage}</pre>
                      </div>
                    </CardBody>
                  </Card>
                )}
                
                {apiResponseData && (
                  <Card className="mb-4 bg-danger-50/10 shadow-sm">
                    <CardHeader className="pb-0 flex justify-between items-center">
                      <h3 className="text-md font-bold text-danger">大模型API原始返回数据（调试用）</h3>
                      {!manualExtractionAttempted && (
                        <Button 
                          size="sm" 
                          color="danger"
                          variant="flat" 
                          onClick={tryExtractDataManually}
                          className="bg-danger-50"
                        >
                          尝试手动提取数据
                        </Button>
                      )}
                    </CardHeader>
                    <CardBody>
                      <div className="max-h-96 overflow-auto">
                        <pre className="text-xs whitespace-pre-wrap break-words">{apiResponseData}</pre>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            )}
            
            {/* 添加进度条 */}
            {isEvaluating && (
              <div className="px-4 py-3 bg-default-50 rounded-lg border border-default-200 mx-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-sm font-medium text-default-700">AI分析进度</span>
                  </div>
                  <span className="text-sm font-medium text-primary">{evaluateProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-default-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${evaluateProgress}%` }}
                  ></div>
                </div>
                <div className="text-sm text-default-500 mt-2">{evaluateStatus}</div>
              </div>
            )}
            
            {/* 列表区域 */}
            <div className="flex-1 min-h-0 px-4 overflow-hidden">
              <div className="h-full overflow-y-auto py-4">
                {renderHotListContent()}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HotList;