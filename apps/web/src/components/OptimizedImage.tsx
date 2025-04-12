import React, { useState, useEffect } from 'react';
import { Image, Skeleton } from '@nextui-org/react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'eager' | 'lazy';
  placeholder?: React.ReactNode;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  objectFit = 'cover',
  loading = 'lazy',
  placeholder
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // 重置状态
    setIsLoading(true);
    setError(false);

    // 检查是否支持WebP格式
    const checkWebpSupport = async () => {
      const webpSupported = document.createElement('canvas')
        .toDataURL('image/webp')
        .indexOf('data:image/webp') === 0;
      
      // 如果图片URL包含微信图片域名，尝试通过代理获取WebP版本
      if (src.includes('mmbiz.qpic.cn') && webpSupported) {
        // 假设后端有一个图片代理端点，可以转换为WebP
        const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(src)}&format=webp`;
        setImageSrc(proxyUrl);
      } else {
        setImageSrc(src);
      }
    };

    checkWebpSupport();
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
    // 如果加载失败，回退到原始URL
    if (imageSrc !== src) {
      setImageSrc(src);
    }
  };

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 z-10">
          {placeholder || (
            <Skeleton className="h-full w-full rounded-lg">
              <div className="h-full w-full bg-default-200"></div>
            </Skeleton>
          )}
        </div>
      )}
      
      {!error ? (
        <Image
          src={imageSrc}
          alt={alt}
          className={`img-transition ${className} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ 
            width: width || '100%', 
            height: height || 'auto',
            objectFit,
            transition: 'opacity 0.3s ease-in-out'
          }}
          loading={loading}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div 
          className="flex items-center justify-center rounded-lg bg-default-100 text-default-500"
          style={{ width: width || '100%', height: height || '200px' }}
        >
          图片加载失败
        </div>
      )}
    </div>
  );
};

export default OptimizedImage; 