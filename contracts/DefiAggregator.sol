pragma solidity >=0.8.0;
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

    event Aggregated(address indexed account, uint256 gas);

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
        uint256 eth;
    }

    struct Expectation {
        Call call;
        Expecting expecting;
        uint256 value;
        uint16 vpos;
    }

    struct Transfer {
        address asset;
        uint256 amount;
    }

    struct Result {
        bool success;
        bytes result;
    }

    /* CONSTANTS */

    bytes4 constant internal TRANSER_SIG = 0xa9059cbb;
    bytes4 constant internal TRANSERFROM_SIG = 0x23b872dd;

    /* VARIABLES */

    address internal owner;

    bool internal guard;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Recover: not owner");
        _;
    }

    function name() external pure returns (string memory) {
        return "BRicher Automatic Aggregator";
    }

    /* FUNCTIONS */

    /**
     * Main aggregator proxy support
     */
    function aggregate(Call[] calldata calls, Expectation[] calldata expect, Transfer[] calldata tins, Transfer[] calldata touts) public payable returns (uint256 blockNumber, bytes[] memory results) {
        uint256 gas = gasleft();
        require(!guard, "Aggregator: guarded");
        guard = true;

        //
        uint256 last;
        results = new bytes[](calls.length);

        //
        if (expect.length != 0 && expect[0].expecting != Expecting.PASS) {
            last = _callgetvalue(expect[0].call, expect[0].vpos);
        }
        _handletransfers(tins, false);

        require(calls.length != 0, "Aggregator: 0 calls");

        //
        for(uint256 i; i != calls.length; i++) {
            bytes calldata data = calls[i].data;

            // block transfer calls
            assembly {
                let sig := calldataload(data.offset)
                // high level assembly, so expect eq() to strip data before compare
                if eq(sig, TRANSER_SIG) {
                    revert(0, 0)
                }
                if eq(sig, TRANSERFROM_SIG) {
                    revert(0, 0)
                }
            }
            //require(sig != TRANSER_SIG && sig != TRANSERFROM_SIG, "Aggregator: transfer in calls prohibited");

            results[i] = _call(calls[i]);
        }

        // Expecting handler
        if (expect.length != 0) {
            uint256 value = _callgetvalue(expect[0].call, expect[0].vpos);
            if (expect[0].expecting == Expecting.EQUAL) {
                require(expect[0].value == value, "Expect: not equal");
            } else if (expect[0].expecting == Expecting.INCREASE) {
                require((value - last) == expect[0].value, "Expect: condition not met");
            } else if (expect[0].expecting == Expecting.DECREASE) {
                require((last - value) == expect[0].value, "Expect: condition not met");
            }
        }

        //
        _handletransfers(touts, true);
        guard = false;
        blockNumber = block.number;
        emit Aggregated(msg.sender, gas - gasleft());
    }

    /**
     * Stop at first success
     */
    function any(Call[] calldata calls) external view returns (uint256 blockNumber, bytes memory result, uint16 index) {
        blockNumber = block.number;
        bool success;
        for(; index != calls.length; index++) {
            (success, result) = _staticcall(calls[index]);
            if (success) break;
        }
        revert("Any: all calls rejected");
    }

    /**
     *
     */
    function _callgetvalue(Call calldata call, uint256 vpos) internal view returns (uint256 value) {
        (bool success, bytes memory ret) = _staticcall(call);
        require(success, string(abi.encodePacked("Expect: ", ret)));
        assembly {
            value := mload(add(ret, mul(0x20, add(vpos, 1))))
        }
    }

    /**
     *
     */
    function _staticcall(Call calldata call) internal view returns (bool success, bytes memory ret) {
        (success, ret) = call.target.staticcall(call.data);
    }

    /**
     *
     */
    function _call(Call calldata call) internal returns (bytes memory ret) {
        bool success;
        (success, ret) = call.target.call{value: call.eth}(call.data);
        require(success, string(abi.encodePacked(ret)));
    }

    /**
     *
     */
    function _eth(address to, uint256 amount) internal returns (bool success) {
        (success,) = to.call{gas: 3000, value: amount}("");
    }

    /**
     *
     */
    function _handletransfers(Transfer[] calldata transfers, bool out) internal {
        for (uint256 i; i != transfers.length; i++) {
            address asset = transfers[i].asset;
            uint256 amount = transfers[i].amount;
            require(
                (asset == address(0)) ?
                (out ? _eth(msg.sender, amount) : msg.value == amount) :
                (out ? IERC20(asset).transfer(msg.sender, amount) : IERC20(asset).transferFrom(msg.sender, address(this), amount))
            , "Transfer: failed");
        }
    }

    /* HELPERS */

    /**
     *
     */
    function getBlock(uint256 number) public view returns (uint256 blockNumber, bytes32 blockHash, bytes32 lastBlockHash, uint256 timestamp, uint256 difficulty, address coinbase) {
        blockNumber = (number == 0) ? block.number : number;
        blockHash = blockhash(blockNumber);
        lastBlockHash = blockhash(block.number - 1);
        timestamp = block.timestamp;
        difficulty = block.difficulty;
        coinbase = block.coinbase;
    }

    /**
     *
     */
    function balance(address _user) public view returns (uint256) {
        return _user.balance;
    }

    /* MANAGE */

    /**
     *
     */
    function transferOwnership(address _owner) external onlyOwner {
        owner = _owner;
    }

    /**
     *
     */
    function recoverLostToken(address _token) external onlyOwner {
        require(
            (_token == address(0)) ?
            _eth(msg.sender, balance(address(this))) :
            IERC20(_token).transfer(msg.sender, IERC20(_token).balanceOf(address(this))),
            "Recover: failed"
        );
    }

    /**
     *
     */
    function recoverActions(Call[] calldata calls) external onlyOwner {
        for(uint256 i; i != calls.length; i++) {
            _call(calls[i]);
        }
    }

}
