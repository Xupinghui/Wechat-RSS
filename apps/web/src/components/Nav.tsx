import {
  Badge,
  Image,
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Tooltip,
} from '@nextui-org/react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { GitHubIcon } from './GitHubIcon';
import { useLocation } from 'react-router-dom';
import { appVersion, serverOriginUrl } from '@web/utils/env';
import { useEffect, useState } from 'react';
import { ArticleIcon, AnalysisIcon, AccountIcon, HotListIcon } from './icons/MaterialIcons';

const navbarItemLink = [
  {
    href: '/feeds',
    name: '公众号订阅',
    icon: <ArticleIcon className="w-4 h-4" />,
  },
  {
    href: '/analysis',
    name: 'AI分析文章',
    icon: <AnalysisIcon className="w-4 h-4" />,
  },
  {
    href: '/hotlist',
    name: 'AI分析热榜',
    icon: <HotListIcon className="w-4 h-4" />,
  },
  {
    href: '/accounts',
    name: '账号管理',
    icon: <AccountIcon className="w-4 h-4" />,
  },
  // {
  //   href: '/settings',
  //   name: '设置',
  // },
];

const Nav = () => {
  const { pathname } = useLocation();
  const [releaseVersion, setReleaseVersion] = useState(appVersion);
  const [isScrolled, setIsScrolled] = useState(false);

  // 检测页面滚动，为导航栏添加阴影
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('https://api.github.com/repos/cooderl/wewe-rss/releases/latest')
      .then((res) => res.json())
      .then((data) => {
        setReleaseVersion(data.name.replace('v', ''));
      });
  }, []);

  const isFoundNewVersion = releaseVersion > appVersion;

  return (
    <div>
      <Navbar 
        isBordered 
        className={`transition-shadow duration-300 ${isScrolled ? 'shadow-md' : ''}`}
      >
        <Tooltip
          content={
            <div className="p-1">
              {isFoundNewVersion && (
                <Link
                  href={`https://github.com/cooderl/wewe-rss/releases/latest`}
                  target="_blank"
                  className="mb-1 block text-medium hover:text-primary transition-colors duration-300"
                >
                  发现新版本：v{releaseVersion}
                </Link>
              )}
              当前版本: v{appVersion}
            </div>
          }
          placement="left"
        >
          <NavbarBrand className="cursor-default">
            <Badge
              content={isFoundNewVersion ? '' : null}
              color="danger"
              size="sm"
              className="animate-pulse"
            >
              <Image
                width={28}
                alt="WeWe RSS"
                className="mr-2 img-transition"
                src={
                  serverOriginUrl
                    ? `${serverOriginUrl}/favicon.ico`
                    : 'https://r2-assets.111965.xyz/wewe-rss.png'
                }
              ></Image>
            </Badge>
            <p className="font-bold text-inherit">WeWe RSS</p>
          </NavbarBrand>
        </Tooltip>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          {navbarItemLink.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <NavbarItem
                isActive={isActive}
                key={item.href}
              >
                <Link 
                  color={isActive ? "primary" : "foreground"} 
                  href={item.href}
                  className="flex items-center gap-1.5 btn-hover-effect"
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </NavbarItem>
            );
          })}
        </NavbarContent>
        <NavbarContent justify="end">
          <ThemeSwitcher></ThemeSwitcher>
          <Link
            href="https://github.com/cooderl/wewe-rss"
            target="_blank"
            color="foreground"
            className="btn-hover-effect"
          >
            <GitHubIcon className="hover:rotate-12 transition-transform duration-300" />
          </Link>
        </NavbarContent>
      </Navbar>
    </div>
  );
};

export default Nav;
