"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import dynamic from "next/dynamic";
const loadMock = () => import("@/fhevm/internal/mock/fhevmMock");

import { SecretBallotBoxABI } from "@/abi/SecretBallotBoxABI";
import { SecretBallotBoxAddresses } from "@/abi/SecretBallotBoxAddresses";
import { GenericStringInMemoryStorage } from "@/fhevm/GenericStringStorage";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusBadge from "@/components/StatusBadge";

interface BallotInfo {
  ballotId: number;
  title: string;
  description: string;
  options: string[];
  startTime: number;
  endTime: number;
  initiator: string;
  status: number;
  votes: number;
}

interface VoteData {
  voteId: number;
  voter: string;
  timestamp?: number;
}

export default function AnalyticsPage() {
  const params = useParams<{ id: string }>();
  const ballotId = Number(params?.id);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [info, setInfo] = useState<BallotInfo | null>(null);
  const [encTallies, setEncTallies] = useState<string[] | null>(null);
  const [clearTallies, setClearTallies] = useState<Record<string, bigint> | null>(null);
  const [voteData, setVoteData] = useState<VoteData[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [fhe, setFhe] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);

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
      try {
        const s = await bp.getSigner();
        setSigner(s);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!contractRO || !ballotId) return;
      setIsLoading(true);
      
      try {
        const tuple = await contractRO.getBallot(ballotId);
        const status = await contractRO.getBallotStatus(ballotId);
        const votes = await contractRO.getVoteCount(ballotId);
        
        setInfo({
          ballotId,
          title: tuple[0],
          description: tuple[1],
          options: tuple[2],
          startTime: Number(tuple[3]),
          endTime: Number(tuple[4]),
          initiator: tuple[6],
          status: Number(status),
          votes: Number(votes)
        });

        // 获取加密的累计票数
        try {
          const enc = await contractRO.getEncryptedTally(ballotId);
          console.log("获取到的加密累计:", enc);
          if (enc && enc.length > 0) {
            setEncTallies(enc);
          } else {
            console.log("该投票使用传统索引方式，无同态聚合数据");
          }
        } catch (error) {
          console.log("No encrypted tallies available:", error);
        }

        // 获取投票事件（简化版，实际应该解析链上事件）
        const mockVotes: VoteData[] = [];
        for (let i = 0; i < Number(votes); i++) {
          mockVotes.push({
            voteId: i + 1,
            voter: `0x${"*".repeat(40)}`, // 匿名显示
            timestamp: tuple[3] + BigInt(i * 300) // 模拟时间间隔
          });
        }
        setVoteData(mockVotes);

      } catch (error) {
        console.error("Failed to load ballot:", error);
        setMsg("加载投票信息失败");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [contractRO, ballotId]);

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

  const decryptTallies = useCallback(async () => {
    if (!contractRO || chainId === undefined || !encTallies || !signer) return;
    setIsDecrypting(true);
    setMsg("正在准备解密...");
    
    try {
      const instance = fhe || (await ensureFhe());
      if (!instance) return;

      setMsg("正在生成解密签名...");
      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [contractRO.target as `0x${string}`],
        signer,
        new GenericStringInMemoryStorage()
      );
      if (!sig) {
        setMsg("生成解密签名失败");
        return;
      }

      setMsg("正在解密累计结果...");
      const items = encTallies.map((h) => ({ handle: h, contractAddress: contractRO.target as `0x${string}` }));
      const res = await instance.userDecrypt(
        items,
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );
      
      setClearTallies(res as unknown as Record<string, bigint>);
      setMsg("解密成功！");
    } catch (error: any) {
      console.error("解密失败:", error);
      setMsg(`解密失败: ${error.message || "未知错误"}`);
    } finally {
      setIsDecrypting(false);
    }
  }, [contractRO, chainId, encTallies, fhe, ensureFhe, signer]);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const getResults = () => {
    if (!info || !encTallies || !clearTallies) return [];
    
    return info.options.map((option, index) => {
      const handle = index < encTallies.length ? encTallies[index] : null;
      const votes = handle ? Number(clearTallies[handle] || 0) : 0;
      return { option, votes, index };
    });
  };

  const results = getResults();
  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
  const maxVotes = Math.max(...results.map(r => r.votes), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">加载数据分析中...</p>
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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h1 className="text-2xl font-bold text-gray-800">{info.title}</h1>
              <StatusBadge status={info.status} />
            </div>
            
            {info.description && (
              <p className="text-gray-600 mb-4">{info.description}</p>
            )}
            
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>结束于 {formatDateTime(info.endTime)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{info.votes} 人已投票</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>{info.options.length} 个选项</span>
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

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-1">{info.votes}</div>
          <div className="text-sm text-gray-600">总投票数</div>
        </div>

        <div className="card text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">{info.options.length}</div>
          <div className="text-sm text-gray-600">投票选项</div>
        </div>

        <div className="card text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {clearTallies ? totalVotes : '加密'}
          </div>
          <div className="text-sm text-gray-600">解密状态</div>
        </div>
      </div>

      {/* No Homomorphic Data Notice */}
      {!encTallies && (
        <div className="card text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">传统投票模式</h3>
          <p className="text-gray-600 mb-4">
            该投票使用传统的索引加密方式，投票内容以密文形式存储，但无法进行链上同态聚合计算。
            要查看详细结果分析，需要使用"同态聚合"投票方式。
          </p>
          <p className="text-sm text-gray-500">
            当前投票数：{info?.votes || 0} 票（所有投票均已加密保护）
          </p>
        </div>
      )}

      {/* Decrypt Section */}
      {encTallies && encTallies.length > 0 && !clearTallies && (
        <div className="card text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">解密投票结果</h3>
          <p className="text-gray-600 mb-6">
            投票结果已加密存储在链上，点击下方按钮解密查看详细统计
          </p>
          
          <button
            onClick={decryptTallies}
            disabled={isDecrypting}
            className="btn-primary flex items-center justify-center space-x-2 mx-auto"
          >
            {isDecrypting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>解密中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>解密累计结果</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results Chart */}
      {clearTallies && results.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>投票结果分析</span>
            </h2>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => {
              const percentage = totalVotes > 0 ? (result.votes / totalVotes * 100) : 0;
              const barWidth = totalVotes > 0 ? (result.votes / maxVotes * 100) : 0;
              const isWinner = result.votes === maxVotes && result.votes > 0;
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    isWinner 
                      ? 'border-green-300 bg-green-50 shadow-glow-sm' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isWinner
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="font-medium text-gray-800">{result.option}</span>
                      {isWinner && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium">获胜</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">{result.votes}</div>
                      <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isWinner
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vote Timeline */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>投票时间线</span>
        </h2>
        
        <div className="space-y-3">
          {voteData.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>暂无投票记录</p>
            </div>
          ) : (
            voteData.map((vote, index) => (
              <div key={vote.voteId} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">#{vote.voteId}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">匿名投票者</div>
                  <div className="text-xs text-gray-500 font-mono">{vote.voter}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {vote.timestamp ? formatDateTime(Number(vote.timestamp)) : '时间未知'}
                  </div>
                  <div className="text-xs text-gray-500">加密存储</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="card">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">隐私保护说明</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• <strong>投票内容加密</strong>：所有投票选择在链上以密文形式存储，无法追溯到个人</p>
              <p>• <strong>同态计算</strong>：使用 FHEVM 技术在加密状态下直接计算累计票数</p>
              <p>• <strong>选择性解密</strong>：仅在投票结束后，授权用户可解密查看聚合结果</p>
              <p>• <strong>链上审计</strong>：所有操作记录在区块链上，过程完全透明可验证</p>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
