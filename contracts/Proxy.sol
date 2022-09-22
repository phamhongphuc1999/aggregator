// SPDX-License-Identifier: MIT
//pragma solidity ^0.7.0;

contract Proxy {
    bytes32 private constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    bytes32 private constant _ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
    modifier ifAdmin() {
        if (msg.sender == _admin()) {
            _;
        } else {
            _fallback();
        }
    }
    constructor () {
        _setAdmin(msg.sender);
    }
    function implementation() external view  returns (address) {
//        return _implementation();
    }
    function upgradeToAndCall(address impl, bytes calldata data) public ifAdmin {
        _setImplementation(impl);
        if(data.length != 0) {
            (bool success,) = impl.delegatecall(data);
            require(success);
        }
    }
    function changeAdmin(address admin) external ifAdmin {
        require(admin != address(0), "!address");
        _setAdmin(admin);
    }
    function _isContract(address account) internal view returns (bool) {
        bytes32 codehash;
        assembly { codehash := extcodehash(account) }
        return (codehash != 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470 && codehash != 0x0);
    }
    function _setImplementation(address impl) private {
        require(_isContract(impl), "!contract");
        assembly {
            sstore(_IMPLEMENTATION_SLOT, impl)
        }
    }
    function _setAdmin(address admin) private {
        assembly {
            sstore(_ADMIN_SLOT, admin)
        }
    }
    function _implementation() internal view returns (address impl) {
        assembly {
            impl := sload(_IMPLEMENTATION_SLOT)
        }
    }
    function _admin() internal view returns (address adm) {
        assembly {
            adm := sload(_ADMIN_SLOT)
        }
    }
    function _beforeFallback() internal {
    }
    function _fallback() internal {
        address impl = _implementation();
        _beforeFallback();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    fallback () payable external {
        _fallback();
    }
    receive () payable external {
        _fallback();
    }
}
