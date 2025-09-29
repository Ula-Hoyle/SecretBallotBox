"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import dynamic from "next/dynamic";
const loadMock = () => import("@/fhevm/internal/mock/fhevmMock");

import { SecretBallotBoxABI } from "@/abi/SecretBallotBoxABI";
import { SecretBallotBoxAddresses } from "@/abi/SecretBallotBoxAddresses";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function VotePage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [msg, setMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [options, setOptions] = useState<string[]>(["选项A", "选项B"]);
  // 避免 SSR 与 CSR 时间不一致引发 Hydration 报错：首次渲染不带时间，挂载后再设置
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  // 将时间戳转换为本地时间的 datetime-local 格式
  const timestampToLocalDateTime = (timestamp: number | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    // 获取本地时区偏移并调整
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 将 datetime-local 格式转换为时间戳
  const localDateTimeToTimestamp = (dateTimeString: string) => {
    return Math.floor(new Date(dateTimeString).getTime() / 1000);
  };

  const contractRW = useMemo(() => {
    if (!provider || !chainId || !signer) return null;
    const entry = SecretBallotBoxAddresses[chainId.toString() as "31337" | "11155111"];
    if (!entry?.address) return null;
    return new ethers.Contract(entry.address, SecretBallotBoxABI.abi, signer);
  }, [provider, chainId, signer]);

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
      // 挂载后再设置默认时间，避免服务端时间参与首屏 HTML
      const nowSec = Math.floor(Date.now() / 1000);
      setStart(nowSec + 60);
      setEnd(nowSec + 3600);
      setMounted(true);
    })();
  }, []);

  const addOption = () => {
    setOptions([...options, `选项${String.fromCharCode(65 + options.length)}`]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const createBallot = useCallback(async () => {
    if (!contractRW || !title.trim() || options.some(o => !o.trim()) || start === null || end === null) {
      setMsg("请填写完整信息");
      return;
    }

    setIsLoading(true);
    setMsg("正在创建投票...");

    try {
      const tx = await contractRW.createBallot(
        title.trim(),
        desc.trim(),
        options.map(o => o.trim()),
        BigInt(start),
        BigInt(end),
        1
      );
      
      setMsg("交易已提交，等待确认...");
      const receipt = await tx.wait();
      setMsg(`投票创建成功！交易哈希: ${receipt?.hash}`);
      
      // 重置表单
      setTitle("");
      setDesc("");
      setOptions(["选项A", "选项B"]);
      const nowSec = Math.floor(Date.now() / 1000);
      setStart(nowSec + 60);
      setEnd(nowSec + 3600);
    } catch (error: any) {
      console.error("创建投票失败:", error);
      setMsg(`创建失败: ${error.message || "未知错误"}`);
    } finally {
      setIsLoading(false);
    }
  }, [contractRW, title, desc, options, start, end]);

  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return "";
    // 只显示到分钟，避免秒级差异导致水合不一致
    const d = new Date(timestamp * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${hh}:${mm}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gradient mb-2">创建投票</h1>
        <p className="text-gray-600">创建一个新的匿名投票议题</p>
      </div>

      {/* Form */}
      <div className="card space-y-6">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投票标题 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入投票标题"
            className="input-modern"
            maxLength={100}
          />
          <div className="text-xs text-gray-500 mt-1">{title.length}/100</div>
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投票描述
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="请输入投票描述（可选）"
            className="input-modern resize-none"
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-1">{desc.length}/500</div>
        </div>

        {/* 选项 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投票选项 *
          </label>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">
                    {String.fromCharCode(65 + index)}
                  </span>
                </div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                  className="input-modern flex-1"
                  maxLength={50}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="flex-shrink-0 w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {options.length < 10 && (
            <button
              onClick={addOption}
              className="mt-3 flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm">添加选项</span>
            </button>
          )}
        </div>

        {/* 时间设置 */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              开始时间
            </label>
            <input
              type="datetime-local"
              value={timestampToLocalDateTime(start)}
              onChange={(e) => setStart(localDateTimeToTimestamp(e.target.value))}
              className="input-modern"
            />
            {mounted && (
              <div className="text-xs text-gray-500 mt-1">{formatDateTime(start)}</div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              结束时间
            </label>
            <input
              type="datetime-local"
              value={timestampToLocalDateTime(end)}
              onChange={(e) => setEnd(localDateTimeToTimestamp(e.target.value))}
              className="input-modern"
            />
            {mounted && (
              <div className="text-xs text-gray-500 mt-1">{formatDateTime(end)}</div>
            )}
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="pt-4">
          <button
            onClick={createBallot}
            disabled={isLoading || !title.trim() || options.some(o => !o.trim()) || start === null || end === null || (start !== null && end !== null && start >= end)}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>创建中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>创建投票</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 状态消息 */}
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