pragma solidity >=0.5.0;
pragma experimental ABIEncoderV2;

interface IERC20 {
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}

interface IERC721 is IERC20 {
}

/**
 * Anonymous DeFi Aggregator
 * Users should not approve more than needed, money loss is guaranteed if not careful
 */
contract DefiAggregator {

    /* DATA STRUCTURES */

    event Aggregated(address indexed account);

    enum Expecting {
        PASS,
        EQUAL,
        INCREASE,
        DECREASE,
        MORETHAN
    }

    struct Call {
        address target;
        bytes data;
        uint256 value;
    }

    struct Expectation {
        Call call;
        Expecting expecting;
        uint256 vpos;
        uint256 value;
    }

    struct Transfer {
        address asset;
        uint256 amount;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    /* CONSTANTS */

    bytes4 constant internal TRANSER_SIG = 0xa9059cbb;
    bytes4 constant internal TRANSERFROM_SIG = 0x23b872dd;

    /* VARIABLES */

    address immutable internal owner;

    bool internal guard;

    constructor() {
        owner = msg.sender;
    }

    /* FUNCTIONS */

    function aggregate(Call[] calldata calls, Expectation[] calldata expect, Transfer[] calldata tins, Transfer[] calldata touts) public returns (uint256 blockNumber) {
        require(!guard, "Aggregator: guarded");
        guard = true;

        uint256 last;
        //returnData = new bytes[](calls.length);
        if (expect.length != 0 && expect[0].expecting != Expecting.PASS) {
            last = callGetValue(expect[0].call, expect[0].vpos);
        }
        handlerTransfers(tins, false);

        require(calls.length != 0, "Aggregator: invalid call");

        for(uint256 i; i != calls.length; i++) {
            bytes memory x = calls[i].data[0:4];
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].data);
            require(success, "Aggregator: call failed");
            //returnData[i] = ret;
        }

        if (expect.length != 0) {
            uint256 value = callGetValue(expect[0].call, expect[0].vpos);
            if (expect[0].expecting == Expecting.EQUAL) {
                require(expect[0].value == value, "Expect: not equal");
            } else if (expect[0].expecting == Expecting.INCREASE) {
                require((value - last) == expect[0].value, "Expect: condition not met");
            } else if (expect[0].expecting == Expecting.DECREASE) {
                require((last - value) == expect[0].value, "Expect: condition not met");
            }
        }

        handlerTransfers(touts, true);
        guard = false;
        blockNumber = block.number;
        emit Aggregated(msg.sender);
    }

    function callGetValue(Call calldata call, uint256 vpos) internal returns (uint256 value) {
        (bool success, bytes memory ret) = call.target.staticcall(call.data);
        require(success, "Expect: call failed");
        assembly {
            value := mload(add(ret, mul(0x20, add(vpos, 1))))
        }
    }

    function handlerTransfers(Transfer[] calldata transfers, bool out) internal {
        for (uint256 i; i != transfers.length; i++) {
            address asset = transfers[i].asset;
            uint256 amount = transfers[i].amount;
            bool success;
            if (asset == address(0)) {
                if (out) {
                    (success, ) = msg.sender.call{value: amount}("");
                } else {
                    success = msg.value == amount;
                }
            } else {
                success = (out) ? IERC20(asset).transfer(msg.sender, amount) : IERC20(asset).transferFrom(msg.sender, address(this), amount);
            }
            require(success, "Transfer: failed");
        }
    }

    /* HELPERS */

    function getBlock(uint256 number) public view returns (uint256 blockNumber, bytes32 blockHash, bytes32 lastBlockHash, uint256 timestamp, uint256 difficulty, address coinbase) {
        blockNumber = (number == 0) ? block.number : number;
        blockHash = blockhash(blockNumber);
        lastBlockHash = blockhash(block.number - 1);
        timestamp = block.timestamp;
        difficulty = block.difficulty;
        coinbase = block.coinbase;
    }


    function balance(address _user) external returns (uint256) {
        return _user.balance;
    }

    /* MANAGE */

    function recoverLostToken(address _token) external {
        require(msg.sender == owner, "Recover: not allowed");
        if (_token == address(0)) {
            msg.sender.call{value: address(this).balance}("");
        } else {
            IERC20(_token).transfer(msg.sender, IERC20(_token).balanceOf(address(this)));
        }
    }

}