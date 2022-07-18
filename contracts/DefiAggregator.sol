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
    event StaticCheck();

    enum Expecting {
        PASS,
        EQUAL,
        INCREASE,
        DECREASE,
        MORETHAN,
        FAIL
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

    modifier onlyStatic() {
        try this.staticCheck() {
            revert("Prohibited");
        } catch {}
        _;
    }

    modifier nonReentrant() {
        require(!guard, "Aggregator: guarded");
        guard = true;
        _;
        guard = false;
    }

    function staticCheck() external {
        require(msg.sender == address(this));
        emit StaticCheck();
    }

    function name() external pure returns (string memory) {
        return "Strategy Automatic Aggregator";
    }

    /* FUNCTIONS */

    /**
     * Main aggregator proxy support
     * Issues:
     * - Working with ETH or evens tokens still dangerous
     */
    function aggregate(Call[] calldata calls, Expectation[] calldata expect, Transfer[] calldata tins, Transfer[] calldata touts) public payable nonReentrant returns (uint256 blockNumber, bytes[] memory results) {
        uint256 gas = gasleft();

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
                // actually high level assembly, so expect eq() to strip data before compare
                if eq(sig, TRANSER_SIG) {
                    revert(0, 0)
                }
                if eq(sig, TRANSERFROM_SIG) {
                    revert(0, 0)
                }
            }
            //require(sig != TRANSER_SIG && sig != TRANSERFROM_SIG, "Aggregator: transfer in calls prohibited");

            results[i] = _call(calls[i], i);
        }

        // Expecting handler
        _handleexpect();

        //
        _handletransfers(touts, true);

        //
        blockNumber = block.number;
        emit Aggregated(msg.sender, gas - gasleft());
    }

    /**
     * Simpler multicall for views
     */
    /*
    function all(Call[] calldata calls) external view onlyStatic returns (uint256 blockNumber, bytes[] memory results) {
        bool success;
        for(uint256 i; i != calls.length; i++) {
            (success, results[i]) = _staticcall(calls[i]);
            require(success, string(abi.encodePacked("All: failed at ", _tostring(i), ": ", results[i])));
        }
        blockNumber = block.number;
    }
    */

    /**
     * Stop at first success, no state got saved, only parallel calls allowed
     */
    function any(Call[] calldata calls) external view returns (uint256 blockNumber, bytes memory result, uint16 index) {
        bool success;
        blockNumber = block.number;
        for(; index != calls.length; index++) {
            (success, result) = _staticcall(calls[index]);
            if (success) break;
        }
        revert("Any: all: rejected");
    }

    /**
     * Get view value
     */
    function _callgetvalue(Call calldata call, uint256 vpos) internal view returns (uint256 value) {
        (bool success, bytes memory ret) = _staticcall(call);
        _require(success, "View", -1, ret);
        assembly {
            value := mload(add(ret, mul(0x20, add(vpos, 1))))
        }
    }

    /**
     *
     */
    function _require(bool pass, string name, uint256 index, bytes memory data) internal pure {
        require(pass, string(abi.encodePacked(name, ": ", _tostring(index), ": ", data)));
    }

    /**
     * Inspired by OraclizeAPI's implementation - MIT licence (oraclizeAPI_0.4.25.sol)
     */
    function _tostring(uint256 value) internal pure returns (bytes memory buffer) {
        if (value == 0) {
            return new bytes(1);
        }
        unchecked {
            uint256 temp = value / 10;
            uint256 digits = 1;
            while (temp != 0) {
                digits++;
                temp /= 10;
            }
            buffer = new bytes(digits);
            while (value != 0) {
                digits--;
                buffer[digits] = bytes1(uint8(48 + (value % 10)));
                value /= 10;
            }
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
    function _call(Call calldata call, uint256 i) internal returns (bytes memory ret) {
        bool success;
        (success, ret) = call.target.call{value: call.eth}(call.data);
        _require(success, "Aggregate", i, ret);
    }

    /**
     *
     */
     function _transfer(address token, address from, address to, uint256 amount) internal returns (bool) {
         return (from == address(0)) ?
            IERC20(token).transfer(to, (amount == 0) ? IERC20(token).balanceOf(address(this)) : amount) :
            IERC20(token).transferFrom(from, to, amount);
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
    function _handleexpect(Expectation calldata expect) internal view {
            uint256 value = _callgetvalue(expect[0].call, expect[0].vpos);
        if (expect[0].expecting == Expecting.EQUAL) {
            require(expect[0].value == value, _concat("Expect", value, ""));
        } else if (expect[0].expecting == Expecting.INCREASE) {
            require((value - last) == expect[0].value, _concat("Expect", value, ""));
        } else if (expect[0].expecting == Expecting.DECREASE) {
            require((last - value) == expect[0].value, _concat("Expect", value, ""));
        }
    }

    /**
     *
     */
    function _handletransfers(Transfer[] calldata transfers, bool out) internal {
        for (uint256 i; i != transfers.length; i++) {
            address asset = transfers[i].asset;
            uint256 amount = transfers[i].amount;
            _require(
                (asset == address(0)) ?
                (out ? _eth(msg.sender, amount) : msg.value == amount) :
                (out ? _transfer(asset, address(0), msg.sender, amount) : _transfer(asset, msg.sender, address(this), amount))
            , out ? "TransferOut" : "TransferIn", i, "");
        }
        if (out && balance(address(this)) != 0) {
            _eth(msg.sender, balance(address(this)));
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
            _transfer(_token, address(this), msg.sender, 0),
            "Recover: failed"
        );
    }

    /**
     *
     */
    function recoverActions(Call[] calldata calls) external onlyOwner {
        for(uint256 i; i != calls.length; i++) {
            _call(calls[i], i);
        }
    }

}
