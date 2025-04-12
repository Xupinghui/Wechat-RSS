import React, { useEffect, useRef, useState } from 'react';

interface LazyContentProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  className?: string;
  threshold?: number;
  animationDelay?: number;
}

const LazyContent: React.FC<LazyContentProps> = ({
  children,
  placeholder,
  className = '',
  threshold = 0.1,
  animationDelay = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // 当元素进入视口时
        if (entry.isIntersecting && !hasLoaded) {
          // 如果设置了延迟，则延迟显示内容
          if (animationDelay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              setHasLoaded(true);
            }, animationDelay);
          } else {
            setIsVisible(true);
            setHasLoaded(true);
          }
          // 已经加载过的内容不需要再次观察
          observer.unobserve(entry.target);
        }
      },
      {
        root: null, // 默认使用视口作为根元素
        rootMargin: '0px',
        threshold: threshold // 元素可见比例
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [hasLoaded, animationDelay, threshold]);

  // 为内容添加淡入动画效果
  const contentClass = isVisible
    ? `content-appear ${className}`
    : `opacity-0 ${className}`;

  return (
    <div ref={ref} className={contentClass} style={{ animationDelay: `${animationDelay}ms` }}>
      {isVisible ? children : placeholder}
    </div>
  );
};

export default LazyContent; 