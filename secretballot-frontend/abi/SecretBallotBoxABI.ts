
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const SecretBallotBoxABI = {
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "initiator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "startTime",
          "type": "uint64"
        },
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "endTime",
          "type": "uint64"
        }
      ],
      "name": "BallotCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint32[]",
          "name": "resultPerOption",
          "type": "uint32[]"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "proofHash",
          "type": "string"
        }
      ],
      "name": "TallyPublished",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        }
      ],
      "name": "VoteCast",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        },
        {
          "internalType": "externalEuint32",
          "name": "inputEncryptedChoice",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "inputProof",
          "type": "bytes"
        }
      ],
      "name": "castVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        },
        {
          "internalType": "externalEuint32[]",
          "name": "encryptedOneHot",
          "type": "bytes32[]"
        },
        {
          "internalType": "bytes",
          "name": "inputProof",
          "type": "bytes"
        }
      ],
      "name": "castVoteOneHot",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string[]",
          "name": "options",
          "type": "string[]"
        },
        {
          "internalType": "uint64",
          "name": "startTime",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "endTime",
          "type": "uint64"
        },
        {
          "internalType": "uint32",
          "name": "maxVotesPerAddress",
          "type": "uint32"
        }
      ],
      "name": "createBallot",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        }
      ],
      "name": "getBallot",
      "outputs": [
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string[]",
          "name": "options",
          "type": "string[]"
        },
        {
          "internalType": "uint64",
          "name": "startTime",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "endTime",
          "type": "uint64"
        },
        {
          "internalType": "bool",
          "name": "resultPublished",
          "type": "bool"
        },
        {
          "internalType": "address",
          "name": "initiator",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getBallotCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        }
      ],
      "name": "getBallotStatus",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        }
      ],
      "name": "getEncryptedTally",
      "outputs": [
        {
          "internalType": "euint32[]",
          "name": "",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        }
      ],
      "name": "getEncryptedVotes",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "voteId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ballotId",
              "type": "uint256"
            },
            {
              "internalType": "euint32",
              "name": "encryptedChoice",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "voter",
              "type": "address"
            }
          ],
          "internalType": "struct SecretBallotBox.EncryptedVote[]",
          "name": "votes",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        }
      ],
      "name": "getTallyResult",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "ballotId",
              "type": "uint256"
            },
            {
              "internalType": "uint32[]",
              "name": "resultPerOption",
              "type": "uint32[]"
            },
            {
              "internalType": "string",
              "name": "proofHash",
              "type": "string"
            },
            {
              "internalType": "uint64",
              "name": "timestamp",
              "type": "uint64"
            }
          ],
          "internalType": "struct SecretBallotBox.TallyResult",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        }
      ],
      "name": "getVoteCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "grantTallyDecryption",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "protocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ballotId",
          "type": "uint256"
        },
        {
          "internalType": "uint32[]",
          "name": "resultPerOption",
          "type": "uint32[]"
        },
        {
          "internalType": "string",
          "name": "proofHash",
          "type": "string"
        }
      ],
      "name": "submitTallyResult",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
} as const;
