export type FhevmDecryptResult = Record<string, bigint | boolean | string>;

export type FhevmInstance = {
  createEncryptedInput: (
    contractAddress: `0x${string}`,
    userAddress: string
  ) => {
    add32: (v: number) => void;
    encrypt: () => Promise<{ handles: string[]; inputProof: string }>;
  };
  userDecrypt: (
    items: { handle: string; contractAddress: `0x${string}` }[],
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: `0x${string}`[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number
  ) => Promise<FhevmDecryptResult>;
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEIP712: (
    publicKey: string,
    contractAddresses: string[],
    startTimestamp: number,
    durationDays: number
  ) => EIP712Type;
};

export type FhevmDecryptionSignatureType = {
  publicKey: string;
  privateKey: string;
  signature: string;
  startTimestamp: number;
  durationDays: number;
  userAddress: `0x${string}`;
  contractAddresses: `0x${string}`[];
  eip712: EIP712Type;
};

export type EIP712Type = {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };
  message: any;
  primaryType: string;
  types: {
    [key: string]: {
      name: string;
      type: string;
    }[];
  };
};