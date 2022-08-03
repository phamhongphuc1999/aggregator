pragma solidity >=0.8.0;
//pragma experimental ABIEncoderV2;

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
    event OwnerAction();
    event StaticCheck();

    enum Expecting {
        PASS,
        EQUAL,
        INCREASE,
        DECREASE,
        MORETHAN,
        FAIL,
        NOTEQUAL
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
    bytes4 constant internal PERMIT_SIG = 0xd505accf;

    /* VARIABLES */

    address internal owner;

    bool public verity;

    bool internal guard;

    constructor() {
        owner = msg.sender;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

    modifier guarded() {
        require(!guard && tx.origin == msg.sender, "Aggregator: guarded");
        guard = true;
        _;
        // may yield
        if (balance(address(this)) != 0) {
            _eth(msg.sender, balance(address(this)));
        }
        // final
        guard = false;
    }

    function staticCheck() external {
        require(msg.sender == address(this));
        emit StaticCheck();
    }

    function name() external pure returns (string memory) {
        return "Strategy Automatic Aggregator";
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Main aggregator proxy support
     * Issues:
     * - Working with ETH or evens tokens still dangerous
     */
    function aggregate(Call[] calldata calls, Expectation[] calldata expect, Transfer[] calldata ins) public payable guarded returns (uint256 blockNumber, bytes[] memory results) {
        uint256 gas = gasleft();
        uint256 last;
        results = new bytes[](calls.length);

        if (verity) {
            uint256 offset;
            assembly {
                offset := ins.offset
                offset := add(add(offset, mul(calldataload(offset), 0x40)), 0x20)
            }
            address signer = _verify(keccak256(msg.data[0 : offset]), msg.data[offset:]);
            _require(signer == owner, "Signature", uint160(signer), "not allowed");
        }

        //
        if (expect.length != 0 && expect[0].expecting != Expecting.PASS) {
            (, last) = _callgetvalue(expect[0].call, expect[0].vpos);
        }
        _handletransfers(ins);

        require(ins.length != 0 && calls.length != 0, "Aggregator: no transfers or calls");

        //
        for(uint256 i; i != calls.length; i++) {
            bytes calldata data = calls[i].data;

            assembly {
                let sig := calldataload(data.offset)
                // high level assembly, so expect eq() to cast values before comparison
                // block transfer calls
                //if eq(sig, TRANSER_SIG) { revert(0, 0) }
                // block transferFrom calls
                if eq(sig, TRANSERFROM_SIG) { revert(0, 0) }
                //if eq(sig, PERMIT_SIG) { revert(0, 0) }
            }

            results[i] = _call(calls[i], i);
        }

        // Expecting handler
        _handleexpect(expect[0], last);

        //
        //_handletransfers(touts);

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

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Check aggregate signature if required
     * @dev sigs is append right after aggregate() arguments
     */
    function _verify(bytes32 hashed, bytes memory signatureBlob) internal pure returns (address signer) {
        if (true) {
        }
    }

    /**
     * Require helper
     */
    function _require(bool pass, string memory name, uint256 index, bytes memory data) internal pure {
        require(pass, string(abi.encodePacked(name, ": ", _tostring(index), ": ", data)));
    }

    /**
     * Get view value
     */
    function _callgetvalue(Call calldata call, uint256 vpos) internal view returns (bool success, uint256 value) {
        bytes memory ret;
        (success, ret) = _staticcall(call);
        assembly {
            value := mload(add(ret, mul(0x20, add(vpos, 1))))
        }
    }

    /**
     * Inspired by OraclizeAPI's implementation - MIT licence (oraclizeAPI_0.4.25.sol)
     */
    function _tostring(uint256 value) internal pure returns (bytes memory buffer) {
        if (value == 0) {
            return bytes("0");
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
     function _transfer(address token, address to, uint256 amount) internal returns (bool) {
        return IERC20(token).transfer(to, (amount == 0) ? IERC20(token).balanceOf(address(this)) : amount);
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
    function _handleexpect(Expectation calldata expect, uint256 last) internal view {
        (bool success, uint256 value) = _callgetvalue(expect.call, expect.vpos);
        bytes memory reason;
        if (!success) {
            success = expect.expecting == Expecting.FAIL;
        } else {
            if (expect.expecting == Expecting.EQUAL) {
                success = expect.value == value;
            } else if (expect.expecting == Expecting.INCREASE) {
                success = (value - last) == expect.value;
            } else if (expect.expecting == Expecting.DECREASE) {
                success = (last - value) == expect.value;
            } else if (expect.expecting == Expecting.MORETHAN) {
                success = value >= expect.value;
            } else if (expect.expecting == Expecting.NOTEQUAL) {
                success = value != expect.value;
            }
        }
        // pass also
        _require(success, "Expect", value, "failed");
    }

    /**
     *
     */
    function _handletransfers(Transfer[] calldata transfers) internal {
        for (uint256 i; i != transfers.length; i++) {
            uint256 amount = transfers[i].amount;
            bool success;
            bytes memory ret;

            if (transfers[i].asset == address(0)) {
                success = msg.value == amount;
                ret = bytes(msg.value == 0 ? "no eth" : "not enough eth");

            //    success = out ? _eth(msg.sender, amount) : msg.value == amount;
            //} else if (out) {
            //    try IERC20(asset).transfer(msg.sender, (amount == 0) ? IERC20(asset).balanceOf(address(this)) : amount) returns (bool ok) {
            //        success = ok;
            //    } catch (bytes memory ok) {
            //        ret = ok;
            //    }

            } else {
                try IERC20(transfers[i].asset).transferFrom(msg.sender, address(this), amount) returns (bool ok) {
                    success = ok;
                } catch Error(string memory ok) {
                    ret = bytes(ok);
                } catch (bytes memory ok) {
                    ret = ok;
                }
            }

            //_require(success, out ? "TransferOut" : "TransferIn", i, ret);
            _require(success, "TransferIn", amount, ret);
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get block parameters
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
     * Get ETH balance wrapper
     */
    function balance(address _user) public view returns (uint256) {
        return _user.balance;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Toggle verity status
     */
    function toggleVerity() external onlyOwner {
        verity = !verity;
        emit OwnerAction();
    }

    /**
     * Recover stuck tokens
     */
    //function recoverLostTokens(Transfer[] calldata outs) external onlyOwner {
    //    emit OwnerAction();
    //}

    /**
     * Allow owner to send arbitrary calls to help users recover mishap actions
     */
    function recoverActions(Call[] calldata calls) external onlyOwner {
        for(uint256 i; i != calls.length; i++) {
            _call(calls[i], i);
        }
        emit OwnerAction();
    }

    /**
     * Transfer owner
     */
    function transferOwnership(address _owner) external onlyOwner {
        owner = _owner;
        emit OwnerAction();
    }

    /**
     * Prevent further usage
     */
    function destroy(uint256 secret) external onlyOwner {
        require(secret == 982173);
        emit OwnerAction();
        selfdestruct(payable(msg.sender));
    }

}
