pragma solidity >=0.5.0;
pragma experimental ABIEncoderV2;

/// @title Aggregate results from multiple read-only function calls
/// @author Michael Elliot <mike@makerdao.com>

contract DefiAggregator {

    enum Expecting {
        PASS,
        EQUAL,
        INCREASE,
        DECREASE
    }

    struct Expectation {
        Call call;
        Expecting expecting;
        uint256 vpos;
        uint256 value;
    }

    struct Call {
        address target;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    function aggregate(Call[] calldata calls, Expectation calldata expect) public returns (uint256 blockNumber, bytes[] memory returnData) {
        uint256 last;
        if (expect.call.target != address(0) && expect.expecting != Expecting.PASS) {
            last = callGetValue(expect.call, expect.vpos);
        }
        require(calls.length != 0, "Aggregator: invalid call");
        blockNumber = block.number;
        returnData = new bytes[](calls.length);
        for(uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, "Aggregator: call failed");
            returnData[i] = ret;
        }
        if (expect.call.target != address(0)) {
            uint256 value = callGetValue(expect.call, expect.vpos);
            if (expect.expecting == Expecting.EQUAL) {
                require(expect.value == value, "Expect: not equal");
            } else if (expect.expecting == Expecting.INCREASE) {
                require((value - last) == expect.value, "Expect: condition not met");
            } else if (expect.expecting == Expecting.DECREASE) {
                require((last - value) == expect.value, "Expect: condition not met");
            }
        }
    }

    function callGetValue(Call calldata call, uint256 vpos) internal returns (uint256 value) {
        (bool success, bytes memory ret) = call.target.call(call.callData);
        require(success, "Expect: call failed");
        assembly {
            value := mload(add(ret, mul(0x20, add(vpos, 1))))
        }
    }

    function getBlock(uint256 number) public view returns (uint256 blockNumber, bytes32 blockHash, bytes32 lastBlockHash, uint256 timestamp, uint256 difficulty, address coinbase) {
        blockNumber = (number == 0) ? block.number : number;
        blockHash = blockhash(blockNumber);
        lastBlockHash = blockhash(block.number - 1);
        timestamp = block.timestamp;
        difficulty = block.difficulty;
        coinbase = block.coinbase;
    }

}