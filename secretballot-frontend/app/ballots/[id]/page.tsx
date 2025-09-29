"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import dynamic from "next/dynamic";
const loadMock = () => import("@/fhevm/internal/mock/fhevmMock");

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

export default function BallotDetail() {
  const params = useParams<{ id: string }>();
  const ballotId = Number(params?.id);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [info, setInfo] = useState<BallotInfo | null>(null);
  const [selected, setSelected] = useState<number>(0);
  const [msg, setMsg] = useState<string>("");
  const [fhe, setFhe] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const contractRW = useMemo(() => {
    if (!provider || !chainId) return null;
    const entry = SecretBallotBoxAddresses[chainId.toString() as "31337" | "11155111"];
    if (!entry?.address) return null;
    // 使用 provider 而不是 signer 进行只读调用，避免签名问题
    return new ethers.Contract(entry.address, SecretBallotBoxABI.abi, provider);
  }, [provider, chainId]);

  useEffect(() => {
    (async () => {
      if (!window?.ethereum) {
        setMsg("请安装 MetaMask");
        setIsLoading(false);
        return;
      }
      
      try {
        const bp = new ethers.BrowserProvider(window.ethereum);
        setProvider(bp);
        
        const net = await bp.getNetwork();
        const netId = Number(net.chainId);
        setChainId(netId);
        
        console.log("网络连接:", { chainId: netId, expected: 31337 });
        
        if (netId !== 31337) {
          setMsg(`请切换到本地网络 (31337)，当前网络: ${netId}`);
          setIsLoading(false);
          return;
        }
        
        try {
          const s = await bp.getSigner();
          setSigner(s);
          console.log("钱包已连接:", await s.getAddress());
        } catch (error) {
          setMsg("请连接 MetaMask 钱包");
          console.error("获取 signer 失败:", error);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("初始化失败:", error);
        setMsg("网络连接失败");
        setIsLoading(false);
      }
    })();
  }, []);

  const loadBallotInfo = useCallback(async () => {
    if (!contractRW || !ballotId) {
      console.log("loadBallotInfo 跳过:", { contractRW: !!contractRW, ballotId });
      return;
    }
    setIsRefreshing(true);
    
    try {
      console.log("开始调用合约:", { 
        contractAddress: contractRW.target, 
        ballotId,
        signerAddress: signer?.address 
      });
      
      const tuple = await contractRW.getBallot(ballotId);
      console.log("getBallot 成功:", tuple);
      
      const status = await contractRW.getBallotStatus(ballotId);
      console.log("getBallotStatus 成功:", Number(status));
      
      const votes = await contractRW.getVoteCount(ballotId);
      console.log("getVoteCount 成功:", Number(votes));
      
      console.log("投票状态调试:", {
        status: Number(status),
        startTime: Number(tuple[3]),
        endTime: Number(tuple[4]),
        currentTime: Math.floor(Date.now() / 1000)
      });
      
      // 检查当前用户是否已投票
      // 如果当前状态已经是已投票，则保持不变
      setHasVoted(prevHasVoted => {
        if (prevHasVoted) {
          console.log("保持已投票状态");
          return true;
        }
        
        // 否则禁用自动检测，避免误判
        console.log("投票检测已禁用，允许用户尝试投票");
        return false;
      });
      console.log("投票状态检查完成，status:", Number(status));
      
      setInfo({
        ballotId,
        title: tuple[0],
        description: tuple[1],
        options: tuple[2],
        startTime: Number(tuple[3]),
        endTime: Number(tuple[4]),
        resultPublished: tuple[5],
        initiator: tuple[6],
        status: Number(status),
        votes: Number(votes)
      });
      setMsg(""); // 清除错误信息
    } catch (error) {
      console.error("Failed to load ballot:", error);
      setMsg(`加载投票信息失败: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [contractRW, ballotId, signer]);

  useEffect(() => {
    if (!contractRW || !ballotId || !provider || !chainId) return;
    console.log("触发 loadBallotInfo:", { contractRW: !!contractRW, ballotId, provider: !!provider, chainId });
    loadBallotInfo().finally(() => setIsLoading(false));
  }, [contractRW, ballotId, provider, chainId, loadBallotInfo]);

  const ensureFhe = useCallback(async () => {
    if (!chainId) return null;
    const rpcs: Record<number, string> = { 31337: "http://localhost:8545" };
    const rpcUrl = rpcs[chainId] ?? "http://localhost:8545";
    const meta = await import("@/fhevm/internal/PublicKeyStorage");
    const rel = await meta.PublicKeyStorage.get();
    const mod = await loadMock();
    const inst = await mod.fhevmMockCreateInstance({ rpcUrl, chainId, metadata: rel });
    setFhe(inst);
    return inst;
  }, [chainId]);

  const castVoteIndex = useCallback(async () => {
    if (!contractRW || chainId === undefined || !signer) return;
    setIsVoting(true);
    setMsg("正在准备投票...");
    
    try {
      // 创建带 signer 的合约实例用于写操作
      const contractWithSigner = contractRW.connect(signer);
      
      const instance = fhe || (await ensureFhe());
      if (!instance) return;
      
      setMsg("正在加密您的选择...");
      const input = instance.createEncryptedInput(
        contractRW.target as `0x${string}`,
        signer.address
      );
      input.add32(selected);
      const enc = await input.encrypt();
      
      setMsg("正在提交投票...");
      const tx = await contractWithSigner.castVote(ballotId, enc.handles[0], enc.inputProof);
      
      setMsg("等待交易确认...");
      const r = await tx.wait();
      setMsg(`投票成功！交易哈希: ${r?.hash}`);
      
      // 立即设置为已投票状态
      setHasVoted(true);
      
      // 刷新投票信息
      loadBallotInfo();
    } catch (error: any) {
      console.error("投票失败:", error);
      
      // 检查是否是因为已投票而失败
      const errorStr = error.toString().toLowerCase();
      if (errorStr.includes('vote quota exceeded') || 
          errorStr.includes('quota exceeded') ||
          error.data === '0xb9688461' ||
          errorStr.includes('0xb9688461')) {
        setMsg("您已经投过票了！每个地址只能投票一次。");
        setHasVoted(true);
      } else {
        setMsg(`投票失败: ${error.message || "未知错误"}`);
      }
    } finally {
      setIsVoting(false);
    }
  }, [contractRW, chainId, signer, fhe, ensureFhe, selected, ballotId, loadBallotInfo]);

  const castVoteOneHot = useCallback(async () => {
    if (!contractRW || chainId === undefined || !info || !signer) return;
    setIsVoting(true);
    setMsg("正在准备同态聚合投票...");
    
    try {
      // 创建带 signer 的合约实例用于写操作
      const contractWithSigner = contractRW.connect(signer);
      
      const instance = fhe || (await ensureFhe());
      if (!instance) return;
      
      setMsg("正在加密 One-Hot 向量...");
      const input = instance.createEncryptedInput(
        contractRW.target as `0x${string}`,
        signer.address
      );
      const onehot = new Array(info.options.length).fill(0).map((_, i) => (i === selected ? 1 : 0));
      for (const v of onehot) input.add32(v);
      const enc = await input.encrypt();
      
      setMsg("正在提交聚合投票...");
      const tx = await contractWithSigner.castVoteOneHot(ballotId, enc.handles, enc.inputProof);
      
      setMsg("等待交易确认...");
      const r = await tx.wait();
      setMsg(`同态聚合投票成功！交易哈希: ${r?.hash}`);
      
      // 立即设置为已投票状态
      setHasVoted(true);
      
      // 刷新投票信息
      loadBallotInfo();
    } catch (error: any) {
      console.error("投票失败:", error);
      
      // 检查是否是因为已投票而失败
      const errorStr = error.toString().toLowerCase();
      if (errorStr.includes('vote quota exceeded') || 
          errorStr.includes('quota exceeded') ||
          error.data === '0xb9688461' ||
          errorStr.includes('0xb9688461')) {
        setMsg("您已经投过票了！每个地址只能投票一次。");
        setHasVoted(true);
      } else {
        setMsg(`投票失败: ${error.message || "未知错误"}`);
      }
    } finally {
      setIsVoting(false);
    }
  }, [contractRW, chainId, fhe, ensureFhe, signer, info, selected, ballotId, loadBallotInfo]);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
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
          <p className="text-gray-600">加载投票详情中...</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">投票不存在</h3>
        <p className="text-gray-600">未找到指定的投票，请检查链接是否正确。</p>
      </div>
    );
  }

  const canVote = info.status === 1 && !isVoting && !hasVoted;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="card">
          <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h1 className="text-2xl font-bold text-gray-800">{info.title}</h1>
              <StatusBadge status={info.status} />
              <button
                onClick={loadBallotInfo}
                disabled={isRefreshing}
                className="text-sm px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors duration-200 flex items-center space-x-1"
              >
                {isRefreshing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>刷新</span>
              </button>
            </div>
            
            {info.description && (
              <p className="text-gray-600 mb-4">{info.description}</p>
            )}
            
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {info.status === 1 ? `剩余 ${getTimeRemaining(info.endTime)}` : `结束于 ${formatDateTime(info.endTime)}`}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{info.votes} 人已投票</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-mono text-xs">
                  {info.initiator.slice(0, 6)}...{info.initiator.slice(-4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Section */}
      {canVote && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>请选择您的投票</span>
          </h2>
          
          <div className="space-y-3 mb-6">
            {info.options.map((option, index) => (
              <label
                key={index}
                className={`block p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  selected === index
                    ? 'border-primary-500 bg-primary-50 shadow-glow-sm'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-primary-25'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={selected === index}
                    onChange={() => setSelected(index)}
                    className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      selected === index
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-gray-800 font-medium">{option}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={castVoteIndex}
              disabled={isVoting}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              {isVoting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>投票中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>投票（索引方式）</span>
                </>
              )}
            </button>
            
            <button
              onClick={castVoteOneHot}
              disabled={isVoting}
              className="btn-secondary flex-1 flex items-center justify-center space-x-2"
            >
              {isVoting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>投票中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>投票（同态聚合）</span>
                </>
              )}
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">投票方式说明：</p>
                <ul className="space-y-1 text-xs">
                  <li><strong>索引方式：</strong> 传统的加密投票，存储选项索引的密文</li>
                  <li><strong>同态聚合：</strong> 使用 One-Hot 向量，支持链上同态计算累计票数</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {msg && (
        <div className={`card text-center ${
          msg.includes('成功') ? 'bg-green-50 border-green-200' : 
          msg.includes('失败') || msg.includes('错误') ? 'bg-red-50 border-red-200' : 
          'bg-blue-50 border-blue-200'
        }`}>
          <p className={`text-sm ${
            msg.includes('成功') ? 'text-green-700' : 
            msg.includes('失败') || msg.includes('错误') ? 'text-red-700' : 
            'text-blue-700'
          }`}>
            {msg}
          </p>
        </div>
      )}

      {/* Voting Not Available */}
      {!canVote && (
        <div className="card text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {hasVoted ? '您已投票' :
             info.status === 0 ? '投票尚未开始' : 
             info.status === 2 ? '投票已结束' : 
             info.status === 3 ? '投票已结束，结果已公布' : '无法投票'}
          </h3>
          <p className="text-gray-600 mb-4">
            {hasVoted ? '每个地址只能投票一次，感谢您的参与！' :
             info.status === 0 ? `投票将于 ${formatDateTime(info.startTime)} 开始` : 
             info.status >= 2 ? `投票已于 ${formatDateTime(info.endTime)} 结束` : ''}
          </p>
          
          <div className="flex space-x-3 justify-center">
            {info.status >= 2 && (
              <a
                href={`/results/${info.ballotId}`}
                className="btn-outline inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>查看结果</span>
              </a>
            )}
            
            <a
              href={`/analytics/${info.ballotId}`}
              className="btn-secondary inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>数据分析</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}