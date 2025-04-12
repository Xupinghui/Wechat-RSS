import { SVGProps } from 'react';

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

/**
 * 文章类型定义
 */
export interface Article {
  /** 文章唯一ID，对应微信文章ID */
  id: string;
  /** 公众号ID */
  mpId: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string | null;
  /** 文章标题 */
  title: string;
  /** 文章封面图片URL */
  picUrl: string;
  /** 发布时间戳（秒) */
  publishTime: number;
  /** 文章内容HTML（可能为空，需要单独获取） */
  content?: string;
  /** 是否已爬取过内容 0:未爬取 1:已爬取 */
  isCrawled?: number;
  /** AI评分 */
  aiScore?: number;
  /** AI评分原因 */
  aiReason?: string;
  /** 公众号名称（前端处理字段） */
  mpName?: string;
}

/**
 * 公众号信息类型
 */
export interface Feed {
  /** 公众号ID */
  id: string;
  /** 公众号名称 */
  mpName: string;
  /** 公众号封面图 */
  mpCover: string;
  /** 公众号简介 */
  mpIntro: string;
  /** 状态 0:失效 1:启用 2:禁用 */
  status: number;
  /** 最后同步时间 */
  syncTime: number;
  /** 信息更新时间 */
  updateTime: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string | null;
  /** 是否有历史文章 */
  hasHistory?: number;
}

/**
 * 公众号分组类型
 */
export interface FeedGroup {
  /** 分组ID */
  id: string;
  /** 分组名称 */
  name: string;
  /** 分组下的公众号数量 */
  feedCount: number;
  /** 分组下的公众号列表 */
  feeds?: Feed[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string | null;
}
