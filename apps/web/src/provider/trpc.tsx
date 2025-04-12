import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { isTRPCClientError, trpc } from '../utils/trpc';
import { getAuthCode, setAuthCode } from '../utils/auth';
import { enabledAuthCode, serverOriginUrl } from '../utils/env';

export const TrpcProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();

  const handleNoAuth = () => {
    if (enabledAuthCode) {
      setAuthCode('');
      navigate('/login');
    }
  };
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchIntervalInBackground: false,
            retryDelay: (retryCount) => Math.min(retryCount * 1000, 60 * 1000),
            retry(failureCount, error) {
              console.log('failureCount: ', failureCount);
              if (isTRPCClientError(error)) {
                if (error.data?.httpStatus === 401) {
                  return false;
                }
              }
              return failureCount < 3;
            },
            onError(error) {
              console.error('queries onError: ', error);
              if (isTRPCClientError(error)) {
                if (error.data?.httpStatus === 401) {
                  toast.error('无权限', {
                    description: error.message,
                  });

                  handleNoAuth();
                } else {
                  toast.error('请求失败!', {
                    description: error.message,
                  });
                }
              }
            },
          },
          mutations: {
            onError(error) {
              console.error('mutations onError: ', error);
              if (isTRPCClientError(error)) {
                if (error.data?.httpStatus === 401) {
                  toast.error('无权限', {
                    description: error.message,
                  });
                  handleNoAuth();
                } else {
                  toast.error('请求失败!', {
                    description: error.message,
                  });
                }
              }
            },
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: () => true,
        }),
        httpBatchLink({
          url: serverOriginUrl + '/trpc',
          fetch: (url, options) => {
            console.log('TRPC 请求 URL:', url);
            console.log('TRPC 请求选项:', JSON.stringify(options));
            return fetch(url, options).then(response => {
              console.log('TRPC 响应状态:', response.status, response.statusText);
              return response;
            }).catch(error => {
              console.error('TRPC 请求失败:', error);
              throw error;
            });
          },
          async headers() {
            const token = getAuthCode();
            console.log('获取到的授权码:', token);

            if (!token) {
              handleNoAuth();
              return {};
            }

            return {
              Authorization: token,
            };
          },
        }),
      ],
    }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
