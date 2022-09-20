pragma solidity >=0.8.0;
//pragma experimental ABIEncoderV2;

interface IERC20 {
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}

interface IERC721 is IERC20 {
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

/**
 * Anonymous DeFi Aggregator
 * Users should not approve more than needed, money loss is guaranteed if not careful
 */
contract DefiAggregator is Context {

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
        NOTEQUAL,
        RANGE
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

    bytes4 constant internal TRANSFER_SIG = 0xa9059cbb;
    bytes4 constant internal TRANSFERFROM_SIG = 0x23b872dd;
    bytes4 constant internal PERMIT_SIG = 0xd505accf;
    bytes4 constant internal SPECIAL_SIG = 0xafffffff;

    /* VARIABLES */

    address internal owner;

    bool public verity;

    bool internal guard;

    function initialize() external {
        owner = _msgSender();
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    modifier onlyOwner {
        require(_msgSender() == owner, "Recover: not owner");
        _;
    }

    modifier onlyStatic() {
        // only allow static call to pass
        try this.staticCheck() {
            revert("Aggregate: prohibited");
        } catch {}
        _;
    }

    function staticCheck() external {
        require(_msgSender() == address(this));
        // emit a event
        emit StaticCheck();
    }

    modifier guarded() {
        // only allow EOA
        require(!guard && tx.origin == _msgSender(), "Aggregate: guarded");
        guard = true;
        _;
        // may yield
        if (balance(address(this)) != 0) {
            _eth(_msgSender(), balance(address(this)));
        }
        // final
        guard = false;
    }

    function name() external pure returns (string memory) {
        // some idenitifying
        return "Strategy Automatic Aggregator";
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Main aggregator proxy support
     * Issues:
     */
    function aggregate(Call[] calldata calls, Transfer[] calldata ins, Expectation memory expect) public payable guarded returns (uint256 blockNumber, bytes[] memory results) {
        uint256 gas = gasleft();

        require(ins.length != 0 && calls.length != 0, "Aggregate: no capitals or calls");

/*
        if (verity) {
            uint256 offset;
            assembly {
                // determine the size of call params in msg.data
                offset := ins.offset
                offset := add(add(offset, mul(calldataload(offset), 0x40)), 0x20)
            }
            // actual verity logic
            _verify(offset);
        }
*/

        results = new bytes[](calls.length + 1);

        if (expect.call.target != address(0)) {
            if (expect.expecting == Expecting.INCREASE || expect.expecting == Expecting.DECREASE) {
                (, blockNumber, ) = _staticcall(expect.call, expect.vpos);
            }
        }

        _transfers(ins);

        uint256 i;
        for(; i != calls.length; i++) {
            Call calldata call = calls[i];
            bytes calldata data = call.data;

            assembly {
                let sig := calldataload(data.offset)
                // high level assembly, eq() cast value before comparison
                // block delegated transfer calls, prevent user fund loss due to unspent approvals
                //if eq(sig, TRANFSER_SIG) { revert(0, 0) }
                if eq(sig, TRANSFERFROM_SIG) { revert(0, 0) }
                if eq(sig, PERMIT_SIG) { revert(0, 0) }
/*
                if eq(sig, TRANSFER_SIG) {
                    if eq(calldataload(add(data.offset, 4), msg.sender)) {
                        revert(0, 0)
                    }
                }
*/
            }

            results[i] = _call(call.target, data, call.eth, i);
        }

        if (expect.call.target != address(0)) {
            // Expecting handling, only one needed
            bool success;
            uint256 value;
            (success, value, results[++i]) = _staticcall(expect.call, expect.vpos);
            _expect(expect.expecting, expect.value, success, value, blockNumber);
        }

        //_transferOuts(outs);

        blockNumber = block.number;
        emit Aggregated(_msgSender(), gas - gasleft());
    }

    /**
     * Stop at first success, no state saved, only parallel calls allowed
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

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Check aggregate signature if required
     * @dev sigs is append right after aggregate() arguments
     */
/*
    function _verify(uint256 offset) internal view {
        address user;
        uint64 time;
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            //32 - 12
            user := calldataload(sub(offset, 12))
            //32 + 20 - 24
            time := calldataload(sub(offset, 4))
            r := calldataload(add(offset, 32))
            s := calldataload(add(offset, 64))
            v := byte(0, calldataload(add(offset, 96)))
        }
        require(ecrecover(keccak256(msg.data[0 : offset]), v, r, s) == owner, "Signature: invalid");
        // do the tests
        require(time <= 3600, "Signature: expired");
        require(user == _msgSender(), "Signature: wrong sender");
    }
*/

    /**
     * Require helper
     */
    function _require(bool pass, string memory name, uint256 index, bytes memory data) internal pure {
        require(pass, string(abi.encodePacked(name, ": ", _tostring(index), ": ", data)));
    }

    /**
     * Get view value
     */
    function _staticcall(Call memory call, uint256 vpos) internal view returns (bool success, uint256 value, bytes memory ret) {
        (success, ret) = _staticcall(call);
        assembly {
            value := mload(add(ret, mul(0x20, add(vpos, 1))))
        }
    }

    /**
     * Number to string helper
     * Inspired by OraclizeAPI's implementation - MIT licence
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
     * do view-only call
     */
    function _staticcall(Call memory call) internal view returns (bool success, bytes memory ret) {
        (success, ret) = call.target.staticcall(call.data);
    }

    /**
     * do state-altering call
     */
    function _call(address target, bytes calldata data, uint256 eth, uint256 i) internal returns (bytes memory ret) {
        bool success;
        (success, ret) = target.call{value: eth}(data);
        _require(success, "Aggregate", i, ret);
    }

    /**
     * transfer helper
     */
    function _transfer(address token, address to, uint256 amount) internal returns (bool) {
        return IERC20(token).transfer(to, (amount == 0) ? IERC20(token).balanceOf(address(this)) : amount);
    }

    /**
     * send eth helper
     */
    function _eth(address to, uint256 amount) internal returns (bool success) {
        (success,) = to.call{gas: 3000, value: amount}("");
    }

    /**
     * expectation checking helper
     */
    function _expect(Expecting expecting, uint256 eval, bool success, uint256 value, uint256 last) internal view {
        if (!success) {
            success = expecting == Expecting.FAIL;
        } else {
            if (expecting == Expecting.EQUAL) {
                success = value == eval;
            } else if (expecting == Expecting.RANGE) {
                success = value >= (eval >> 128) && value <= (eval & 0xffffffffffffffffffffffffffffffff);
            } else if (expecting == Expecting.MORETHAN) {
                success = value >= eval;
            } else if (expecting == Expecting.NOTEQUAL) {
                success = value != eval;
            } else if (expecting == Expecting.INCREASE) {
                success = (value - last) == eval;
            } else if (expecting == Expecting.DECREASE) {
                success = (last - value) == eval;
            } else {
                success = true;
            }
        }
        _require(success, "Expect", value, "failed");
    }

    /**
     * capitals / token outs transfer helper
     */
    function _transfers(Transfer[] calldata transfers) internal {
        for (uint256 i; i != transfers.length; i++) {
            uint256 amount = transfers[i].amount;
            bool success;
            bytes memory ret;
            if (transfers[i].asset == address(0)) {
                success = msg.value == amount;
                ret = "not enough eth";
            } else {
                (success, ret) = transfers[i].asset.call(abi.encodePacked(
                    TRANSFERFROM_SIG,
                    abi.encode(_msgSender(), address(this), amount)
                ));
                // Safe ERC20 standard
                if (ret.length == 32 && success) {
                    assembly {
                        success := mload(add(ret, 32))
                    }
                }
/*
                try IERC20(transfers[i].asset).transferFrom(_msgSender(), address(this), amount) returns (bool ok) {
                    success = ok;
                } catch Error(string memory ok) {
                    ret = bytes(ok);
                } catch (bytes memory ok) {
                    ret = ok;
                }
*/
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

/*
    function toggleVerity() external onlyOwner {
        verity = !verity;
        emit OwnerAction();
    }
*/

    /**
     * Allow owner to send arbitrary calls to help users recover mishap actions
     */

/*
    function recoverActions(Call[] calldata calls) external onlyOwner {
        for(uint256 i; i != calls.length; i++) {
            Call calldata call = calls[i];
            _call(call.target, call.data, call.eth, i);
        }
        emit OwnerAction();
    }
*/

    /**
     * Transfer owner
     */
    function transferOwnership(address _owner) external onlyOwner {
        owner = _owner;
        emit OwnerAction();
    }

    /**
     * Prevent further usage
     * Can not be undone
     */
    function destroy(uint256 confirm) external onlyOwner {
        require(confirm == 842917232);
        emit OwnerAction();
        selfdestruct(payable(_msgSender()));
    }

    receive() external payable {
        // allow eth to be send back by, by swap router
    }

    fallback() external {
        // do nothing on wrong calls
        revert();
    }

}
