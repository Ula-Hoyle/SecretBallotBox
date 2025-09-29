//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAY USE DYNAMICALLY IMPORT THIS FILE TO AVOID INCLUDING THE ENTIRE 
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
//////////////////////////////////////////////////////////////////////////

import { JsonRpcProvider } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import { FhevmInstance } from "../../fhevmTypes";

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<FhevmInstance> => {
  const provider = new JsonRpcProvider(parameters.rpcUrl);
  const mockInstance = await MockFhevmInstance.create(provider, provider, {
    aclContractAddress: parameters.metadata.ACLAddress,
    chainId: parameters.chainId,
    gatewayChainId: 55815,
    inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
    kmsContractAddress: parameters.metadata.KMSVerifierAddress,
    verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
    verifyingContractAddressInputVerification: "0x812b06e1CDCE800494b79fFE4f925A504a9A9810",
  });
  
  // 创建适配器以匹配FhevmInstance接口
  return {
    createEncryptedInput: (contractAddress: `0x${string}`, userAddress: string) => {
      const input = mockInstance.createEncryptedInput(contractAddress, userAddress);
      return {
        add32: input.add32.bind(input),
        encrypt: async () => {
          const result = await input.encrypt();
          // 转换Uint8Array到string以匹配接口
          return {
            handles: result.handles.map((h: Uint8Array) => 
              Array.from(h).map(b => b.toString(16).padStart(2, '0')).join('')
            ),
            inputProof: Array.from(result.inputProof).map(b => b.toString(16).padStart(2, '0')).join('')
          };
        }
      };
    },
    userDecrypt: mockInstance.userDecrypt.bind(mockInstance),
    generateKeypair: mockInstance.generateKeypair.bind(mockInstance),
    createEIP712: mockInstance.createEIP712.bind(mockInstance)
  } as FhevmInstance;
};


