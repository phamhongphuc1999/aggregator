
interface Factory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);
    function allPairs(uint256) view returns (address);
    function allPairsLength() view returns (uint256);
    function feeTo() view returns (address);
    function feeToSetter() view returns (address);
    function getPair(address, address) view returns (address);
    function createPair(address tokenA, address tokenB) returns (address pair);
    function setFeeTo(address _feeTo);
    function setFeeToSetter(address _feeToSetter);
}
interface Pair {

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function name() pure returns (string);
    function decimals() pure returns (uint8);
    function symbol() pure returns (string);

    function allowance(address owner, address spender) view returns (uint256);
    function approve(address spender, uint256 value) returns (bool);
    function balanceOf(address owner) view returns (uint256);
    function totalSupply() view returns (uint256);
    function transfer(address to, uint256 value) returns (bool);
    function transferFrom(address from, address to, uint256 value) returns (bool);

    function DOMAIN_SEPARATOR() view returns (bytes32);
    function PERMIT_TYPEHASH() pure returns (bytes32);
    function nonces(address owner) view returns (uint256);
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s);

    function token0() pure returns (address);
    function token1() pure returns (address);
    function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function mint(address to) returns (uint256 liquidity);
    function burn(address to) returns (uint amount0, uint amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes data);
    function sync();

}

interface Router {

}
