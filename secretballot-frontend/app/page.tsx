"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import GitHubPagesLink from "@/components/GitHubPagesLink";

import { SecretBallotBoxABI } from "@/abi/SecretBallotBoxABI";
import { SecretBallotBoxAddresses } from "@/abi/SecretBallotBoxAddresses";
import LoadingSpinner from "@/components/LoadingSpinner";
import NetworkStatus from "@/components/NetworkStatus";

export default function Home() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  const contract = useMemo(() => {
    if (!provider || !chainId) return null;
    const entry = SecretBallotBoxAddresses[chainId.toString() as "31337" | "11155111"];
    if (!entry?.address) return null;
    return new ethers.Contract(entry.address, SecretBallotBoxABI.abi, provider);
  }, [provider, chainId]);

  const isDeployed = contract && contract.target !== ethers.ZeroAddress;

  useEffect(() => {
    (async () => {
      if (!window?.ethereum) return;
      
      try {
        const bp = new ethers.BrowserProvider(window.ethereum);
        setProvider(bp);
        
        // 添加重试机制获取网络信息
        let retries = 3;
        while (retries > 0) {
          try {
            const net = await bp.getNetwork();
            setChainId(Number(net.chainId));
            break;
          } catch (error) {
            console.warn(`获取网络信息失败，剩余重试次数: ${retries - 1}`, error);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // 检查已连接的账户
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.warn('获取账户信息失败:', error);
        }
      } catch (error) {
        console.error('初始化 Provider 失败:', error);
      }
    })();
  }, []);

  const connectWallet = async () => {
    if (!window?.ethereum) return;
    setIsConnecting(true);
    try {
      // 先尝试切换到Sepolia网络
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // 11155111 in hex (Sepolia)
        });
      } catch (switchError: any) {
        // 如果Sepolia不可用，尝试本地网络
        if (switchError.code === 4902 || switchError.code === -32603) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x7a69' }], // 31337 in hex
            });
          } catch (localSwitchError: any) {
            // 如果本地网络不存在，添加本地网络
            if (localSwitchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x7a69',
                  chainName: 'Hardhat Local',
                  nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: ['http://127.0.0.1:8545'],
                }],
              });
            }
          }
        }
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // 重新获取网络信息
      const bp = new ethers.BrowserProvider(window.ethereum);
      const net = await bp.getNetwork();
      setChainId(Number(net.chainId));
      setProvider(bp);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="animate-fade-in">
          <h1 className="text-6xl font-bold text-gradient mb-4">
            SecretBallotBox
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            基于 FHEVM 同态加密技术的匿名投票平台，确保投票隐私的同时保证结果透明可验证
          </p>
        </div>
        
        <div className="flex items-center justify-center pt-8">
          <NetworkStatus chainId={chainId} isDeployed={isDeployed ?? false} />
        </div>
      </div>

      {/* Wallet Connection */}
      {!account ? (
        <div className="card max-w-md mx-auto text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">连接钱包</h3>
            <p className="text-gray-600 text-sm">
              请连接您的钱包以开始使用投票功能
            </p>
            <button 
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>连接中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>连接 MetaMask</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card max-w-md mx-auto text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">钱包已连接</h3>
            <p className="text-gray-600 text-sm font-mono bg-gray-100 p-2 rounded-lg">
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </p>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <div className="card card-hover text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">隐私保护</h3>
          <p className="text-gray-600 text-sm">
            使用同态加密技术，投票内容在链上完全加密，确保个人投票隐私
          </p>
        </div>

        <div className="card card-hover text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">透明可验证</h3>
          <p className="text-gray-600 text-sm">
            所有投票记录上链存储，计票过程公开透明，结果可独立验证
          </p>
        </div>

        <div className="card card-hover text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">去中心化</h3>
          <p className="text-gray-600 text-sm">
            无需中心化服务器，直接与区块链交互，确保系统的可靠性
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {account && isDeployed && (
        <div className="card text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">开始使用</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <GitHubPagesLink href="/vote" className="btn-primary block">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>创建投票</span>
              </div>
            </GitHubPagesLink>
            <GitHubPagesLink href="/ballots" className="btn-outline block">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>查看投票</span>
              </div>
            </GitHubPagesLink>
          </div>
        </div>
      )}
    </div>
  );
}