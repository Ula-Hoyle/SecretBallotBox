"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

interface GitHubPagesLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  replace?: boolean;
}

/**
 * GitHub Pages兼容的Link组件
 * 自动处理basePath，确保在GitHub Pages环境下链接正确工作
 */
export default function GitHubPagesLink({ 
  href, 
  children, 
  className,
  replace = false 
}: GitHubPagesLinkProps) {
  const router = useRouter();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  };

  return (
    <Link 
      href={href} 
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}

/**
 * 获取GitHub Pages兼容的资源路径
 */
export function getAssetPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${basePath}${path}`;
}

/**
 * 获取GitHub Pages兼容的API路径
 */
export function getApiPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${basePath}/api${path}`;
}
