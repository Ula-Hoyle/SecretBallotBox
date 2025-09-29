// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SecretBallotBox — 匿名加密投票（MVP）
/// @notice 使用 FHEVM 存储加密选票；计票结果由链下聚合后提交。
contract SecretBallotBox is SepoliaConfig {
    struct BallotMeta {
        string title;
        string description;
        string[] options;
        uint64 startTime;
        uint64 endTime;
        bool resultPublished;
        address initiator;
    }

    struct EncryptedVote {
        uint256 voteId;
        uint256 ballotId;
        // 加密的选项索引（0..n-1），采用 euint32 存储
        euint32 encryptedChoice;
        address voter;
    }

    struct TallyResult {
        uint256 ballotId;
        uint32[] resultPerOption;
        string proofHash;
        uint64 timestamp;
    }

    event BallotCreated(uint256 indexed ballotId, address indexed initiator, string title, uint64 startTime, uint64 endTime);
    event VoteCast(uint256 indexed ballotId, address indexed voter);
    event TallyPublished(uint256 indexed ballotId, uint32[] resultPerOption, string proofHash);

    uint256 private _ballotSeq;
    uint256 private _voteSeq;

    mapping(uint256 => BallotMeta) private _ballots;
    mapping(uint256 => uint256[]) private _ballotVotes; // ballotId => voteIds
    mapping(uint256 => EncryptedVote) private _votes; // voteId => vote
    mapping(uint256 => mapping(address => uint32)) private _addressVoteCount; // 一人一票（或多票）控制
    mapping(uint256 => uint32) private _maxVotesPerAddress; // 默认 1
    mapping(uint256 => uint256) private _totalVoteCount; // 总投票数量（包括所有投票方式）

    mapping(uint256 => TallyResult) private _tallyResults;
    mapping(uint256 => euint32[]) private _encryptedTallies; // 每个议题的同态累计计数（每个选项一个加密计数）

    modifier onlyExistingBallot(uint256 ballotId) {
        require(bytes(_ballots[ballotId].title).length != 0, "Ballot not found");
        _;
    }

    function getBallot(uint256 ballotId)
        external
        view
        onlyExistingBallot(ballotId)
        returns (
            string memory title,
            string memory description,
            string[] memory options,
            uint64 startTime,
            uint64 endTime,
            bool resultPublished,
            address initiator
        )
    {
        BallotMeta storage b = _ballots[ballotId];
        return (b.title, b.description, b.options, b.startTime, b.endTime, b.resultPublished, b.initiator);
    }

    /// @notice 返回已创建的议题总数（可用于前端枚举 1..N）
    function getBallotCount() external view returns (uint256) {
        return _ballotSeq;
    }

    /// @notice 返回议题状态：0未开始/1进行中/2已结束/3已公布结果
    function getBallotStatus(uint256 ballotId) external view onlyExistingBallot(ballotId) returns (uint8) {
        BallotMeta storage b = _ballots[ballotId];
        if (b.resultPublished) return 3;
        if (block.timestamp < b.startTime) return 0;
        if (block.timestamp <= b.endTime) return 1;
        return 2;
    }

    function getEncryptedVotes(uint256 ballotId)
        external
        view
        onlyExistingBallot(ballotId)
        returns (EncryptedVote[] memory votes)
    {
        uint256[] storage voteIds = _ballotVotes[ballotId];
        votes = new EncryptedVote[](voteIds.length);
        for (uint256 i = 0; i < voteIds.length; i++) {
            votes[i] = _votes[voteIds[i]];
        }
    }

    function createBallot(
        string memory title,
        string memory description,
        string[] memory options,
        uint64 startTime,
        uint64 endTime,
        uint32 maxVotesPerAddress
    ) external returns (uint256 ballotId) {
        require(bytes(title).length > 0, "Invalid title");
        require(options.length >= 2, "Need >=2 options");
        require(endTime > startTime && endTime > block.timestamp, "Invalid time window");

        _ballotSeq += 1;
        ballotId = _ballotSeq;

        BallotMeta storage b = _ballots[ballotId];
        b.title = title;
        b.description = description;
        b.options = options;
        b.startTime = startTime;
        b.endTime = endTime;
        b.resultPublished = false;
        b.initiator = msg.sender;

        _maxVotesPerAddress[ballotId] = maxVotesPerAddress == 0 ? 1 : maxVotesPerAddress;

        emit BallotCreated(ballotId, msg.sender, title, startTime, endTime);
    }

    function castVote(
        uint256 ballotId,
        externalEuint32 inputEncryptedChoice,
        bytes calldata inputProof
    ) external onlyExistingBallot(ballotId) {
        BallotMeta storage b = _ballots[ballotId];
        require(block.timestamp >= b.startTime && block.timestamp <= b.endTime, "Not in voting window");

        // 导入外部密文
        euint32 encryptedChoice = FHE.fromExternal(inputEncryptedChoice, inputProof);

        // 将密文授权给本合约与投票者，方便后续导出或构造证明（如需）
        FHE.allowThis(encryptedChoice);
        FHE.allow(encryptedChoice, msg.sender);

        // 计票限制：一人 N 票
        uint32 used = _addressVoteCount[ballotId][msg.sender];
        require(used < _maxVotesPerAddress[ballotId], "Vote quota exceeded");
        _addressVoteCount[ballotId][msg.sender] = used + 1;

        _voteSeq += 1;
        uint256 voteId = _voteSeq;
        _votes[voteId] = EncryptedVote({
            voteId: voteId,
            ballotId: ballotId,
            encryptedChoice: encryptedChoice,
            voter: msg.sender
        });
        _ballotVotes[ballotId].push(voteId);
        _totalVoteCount[ballotId] += 1;

        emit VoteCast(ballotId, msg.sender);
    }

    /// @notice 提交一票（同态聚合版），前端传入 one-hot 加密数组，合约对每个选项进行同态累加。
    /// @dev encryptedOneHot.length 必须与 options.length 一致；数组元素应为 0/1 的加密值。
    function castVoteOneHot(
        uint256 ballotId,
        externalEuint32[] calldata encryptedOneHot,
        bytes calldata inputProof
    ) external onlyExistingBallot(ballotId) {
        BallotMeta storage b = _ballots[ballotId];
        require(block.timestamp >= b.startTime && block.timestamp <= b.endTime, "Not in voting window");
        require(encryptedOneHot.length == b.options.length, "onehot length");

        uint32 used = _addressVoteCount[ballotId][msg.sender];
        require(used < _maxVotesPerAddress[ballotId], "Vote quota exceeded");
        _addressVoteCount[ballotId][msg.sender] = used + 1;

        // 导入所有密文
        euint32[] memory enc = new euint32[](encryptedOneHot.length);
        for (uint256 i = 0; i < encryptedOneHot.length; i++) {
            enc[i] = FHE.fromExternal(encryptedOneHot[i], inputProof);
        }

        euint32[] storage tallies = _encryptedTallies[ballotId];
        if (tallies.length == 0) {
            // 首票：直接初始化为首票的 one-hot 值
            for (uint256 i = 0; i < enc.length; i++) {
                tallies.push(enc[i]);
            }
        } else {
            require(tallies.length == enc.length, "tally length mismatch");
            for (uint256 i = 0; i < enc.length; i++) {
                tallies[i] = FHE.add(tallies[i], enc[i]);
            }
        }

        // 可选授权：允许发起者或当前用户对累计结果解密（在前端需要）
        for (uint256 i = 0; i < enc.length; i++) {
            FHE.allowThis(tallies[i]);
            FHE.allow(tallies[i], b.initiator);
            FHE.allow(tallies[i], msg.sender);
        }

        _totalVoteCount[ballotId] += 1;
        emit VoteCast(ballotId, msg.sender);
    }

    function submitTallyResult(
        uint256 ballotId,
        uint32[] calldata resultPerOption,
        string calldata proofHash
    ) external onlyExistingBallot(ballotId) {
        BallotMeta storage b = _ballots[ballotId];
        require(block.timestamp > b.endTime, "Voting not ended");
        require(!b.resultPublished, "Already published");
        require(resultPerOption.length == b.options.length, "Length mismatch");

        _tallyResults[ballotId] = TallyResult({
            ballotId: ballotId,
            resultPerOption: resultPerOption,
            proofHash: proofHash,
            timestamp: uint64(block.timestamp)
        });

        b.resultPublished = true;
        emit TallyPublished(ballotId, resultPerOption, proofHash);
    }

    function getTallyResult(uint256 ballotId)
        external
        view
        onlyExistingBallot(ballotId)
        returns (TallyResult memory)
    {
        return _tallyResults[ballotId];
    }

    /// @notice 获取同态累计的加密结果（每个选项一个 euint32 计数）。
    function getEncryptedTally(uint256 ballotId)
        external
        view
        onlyExistingBallot(ballotId)
        returns (euint32[] memory)
    {
        euint32[] storage tallies = _encryptedTallies[ballotId];
        euint32[] memory out = new euint32[](tallies.length);
        for (uint256 i = 0; i < tallies.length; i++) {
            out[i] = tallies[i];
        }
        return out;
    }

    /// @notice 在投票结束后，为指定用户授予对累计密文的解密权限（前端调用以便解密展示）。
    function grantTallyDecryption(uint256 ballotId, address user)
        external
        onlyExistingBallot(ballotId)
    {
        BallotMeta storage b = _ballots[ballotId];
        require(block.timestamp > b.endTime, "Voting not ended");
        require(msg.sender == b.initiator, "Only initiator");
        euint32[] storage tallies = _encryptedTallies[ballotId];
        for (uint256 i = 0; i < tallies.length; i++) {
            FHE.allow(tallies[i], user);
        }
    }

    // 便捷查询：投票数量（包括所有投票方式）
    function getVoteCount(uint256 ballotId) external view onlyExistingBallot(ballotId) returns (uint256) {
        return _totalVoteCount[ballotId];
    }
}


