"use client";

import { useEffect, useState } from "react";

interface NetworkStatusProps {
  chainId?: number;
  isDeployed?: boolean;
}

export default function NetworkStatus({ chainId, isDeployed }: NetworkStatusProps) {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [networkName, setNetworkName] = useState('');

  useEffect(() => {
    const isSupportedNetwork = chainId === 31337 || chainId === 11155111;
    setIsCorrectNetwork(isSupportedNetwork);
    
    if (chainId === 31337) {
      setNetworkName('Hardhat本地');
    } else if (chainId === 11155111) {
      setNetworkName('Sepolia测试网');
    } else {
      setNetworkName('未支持');
    }
  }, [chainId]);

  const switchToSepoliaNetwork = async () => {
    if (!window?.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
      });
    } catch (switchError: any) {
      console.error('切换到Sepolia网络失败:', switchError);
    }
  };

  const switchToLocalNetwork = async () => {
    if (!window?.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // 31337 in hex
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
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
        } catch (addError) {
          console.error('添加本地网络失败:', addError);
        }
      }
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full">
        <div className={`w-3 h-3 rounded-full ${isCorrectNetwork ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
        <span className="text-sm text-green-700">
          {networkName}: {chainId || '未连接'}
          {chainId && !isCorrectNetwork && (
            <div className="ml-2 space-x-1">
              <button 
                onClick={switchToSepoliaNetwork}
                className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded"
              >
                Sepolia
              </button>
              <button 
                onClick={switchToLocalNetwork}
                className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded"
              >
                本地
              </button>
            </div>
          )}
        </span>
      </div>
      
      <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full">
        <div className={`w-3 h-3 rounded-full ${isDeployed ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
        <span className="text-sm text-blue-700">
          合约: {isDeployed ? '已部署' : '未部署'}
        </span>
      </div>
    </div>
  );
}


