"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import Link from "next/link";

import { SecretBallotBoxABI } from "@/abi/SecretBallotBoxABI";
import { SecretBallotBoxAddresses } from "@/abi/SecretBallotBoxAddresses";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusBadge from "@/components/StatusBadge";

interface BallotInfo {
  ballotId: number;
  title: string;
  description: string;
  options: string[];
  startTime: number;
  endTime: number;
  resultPublished: boolean;
  initiator: string;
  status: number;
  votes: number;
}

export default function BallotsPage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [count, setCount] = useState<number>(0);
  const [items, setItems] = useState<BallotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const contractRO = useMemo(() => {
    if (!provider || !chainId) return null;
    const entry = SecretBallotBoxAddresses[chainId.toString() as "31337" | "11155111"];
    if (!entry?.address) return null;
    return new ethers.Contract(entry.address, SecretBallotBoxABI.abi, provider);
  }, [provider, chainId]);

  useEffect(() => {
    (async () => {
      if (!window?.ethereum) return;
      const bp = new ethers.BrowserProvider(window.ethereum);
      setProvider(bp);
      const net = await bp.getNetwork();
      setChainId(Number(net.chainId));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!contractRO) return;
      setIsLoading(true);
      
      try {
        const c = Number(await contractRO.getBallotCount());
        setCount(c);
        
        const arr: BallotInfo[] = [];
        for (let i = 1; i <= c; i++) {
          const [title, description, options, startTime, endTime, resultPublished, initiator] = await contractRO.getBallot(i);
          const status = await contractRO.getBallotStatus(i);
          const votes = await contractRO.getVoteCount(i);
          
          arr.push({
            ballotId: i,
            title,
            description,
            options,
            startTime: Number(startTime),
            endTime: Number(endTime),
            resultPublished,
            initiator,
            status: Number(status),
            votes: Number(votes)
          });
        }
        
        // 按创建时间倒序排列
        arr.reverse();
        setItems(arr);
      } catch (error) {
        console.error("Failed to load ballots:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [contractRO]);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    
    if (remaining <= 0) return "已结束";
    
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">加载投票列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gradient mb-2">投票列表</h1>
        <p className="text-gray-600">
          共有 <span className="font-semibold text-primary-600">{count}</span> 个投票
        </p>
      </div>

      {/* Empty State */}
      {count === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">暂无投票</h3>
          <p className="text-gray-600 mb-6">还没有任何投票，快来创建第一个吧！</p>
          <Link href="/vote" className="btn-primary inline-flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>创建投票</span>
          </Link>
        </div>
      ) : (
        /* Ballot Cards */
        <div className="grid gap-6">
          {items.map((ballot) => (
            <div key={ballot.ballotId} className="card card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 hover:text-primary-600 transition-colors">
                      <Link href={`/ballots/${ballot.ballotId}`}>
                        {ballot.title}
                      </Link>
                    </h3>
                    <StatusBadge status={ballot.status} />
                  </div>
                  
                  {ballot.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {ballot.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {ballot.status === 1 ? `剩余 ${getTimeRemaining(ballot.endTime)}` : formatDateTime(ballot.endTime)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{ballot.votes} 票</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span>{ballot.options.length} 个选项</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  <Link
                    href={`/ballots/${ballot.ballotId}`}
                    className="btn-outline text-sm px-4 py-2"
                  >
                    查看详情
                  </Link>
                  
                  {ballot.status >= 2 && (
                    <Link
                      href={`/results/${ballot.ballotId}`}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      查看结果
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Options Preview */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  {ballot.options.slice(0, 4).map((option, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </span>
                  ))}
                  {ballot.options.length > 4 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      +{ballot.options.length - 4} 更多
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}