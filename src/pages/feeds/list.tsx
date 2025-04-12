// ... 现有代码 ...

// 在文件顶部添加类型定义
interface FeedItem {
  id: string;
  title: string;
  link?: string;
  // 根据实际情况添加其他必要的属性
  [key: string]: any;
}

// 然后修改相关代码，将 item 的类型从 unknown 改为 FeedItem
// 例如在第109行附近:
const renderItems = (items: FeedItem[]) => {
  // ... 现有代码 ...
}

// 在使用 item 的地方指定类型
items.map((item: FeedItem) => {
  // ... 现有代码 ...
})

// ... 现有代码 ...