declare namespace _default {
    export { abis };
    export { addresses };
    export { chains };
    export { methods };
    export { tokens };
}
export default _default;
declare const abis: Readonly<{
    "lendings.a": string[];
    "lendings.ax": string[];
    "lendings.b": any[];
    "lendings.c": string[];
    "lendings.cx": string[];
    meta: any[];
    "oracle.u": string[];
    swaps: string[];
    token: string[];
    trava: string[];
    "vaults.a": string[];
    "vaults.c": string[];
    "vaults.o": string[];
    "vaults.p": string[];
    "vaults.ve": string[];
    "vaults.vex": string[];
}>;
declare const addresses: Readonly<{
    "56": {
        "0": string;
        aggregator: string;
        aggregator_old: string;
        "swap.router": string;
        "swap.factory": string;
        "swap.fee": string;
        "token.usd": string[];
        "token.eth": string;
    };
    "97": {
        "0": string;
        aggregator: string;
    };
}>;
declare const chains: readonly ({
    name: string;
    chainId: number;
    shortName: string;
    networkId: number;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpc: string[];
    faucets: string[];
    infoURL: string;
    archive?: undefined;
    avgBlockTime?: undefined;
    explorer?: undefined;
} | {
    name: string;
    chainId: number;
    shortName: string;
    networkId: number;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpc: string[];
    faucets: string[];
    infoURL: string;
    archive: string[];
    avgBlockTime: number;
    explorer: {
        url: string;
        api_url: string;
        api_key: string;
    };
})[];
declare const methods: Readonly<{
    lendings: string;
    vaults: string;
    swaps: string;
    providinglps: string;
    borrows: string;
}>;
declare const tokens: Readonly<{
    "": {
        img_prefix: string;
        chainId: string;
    };
    "0x007ec643c7cc33a70c083fc305c283dd009c8b94": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x014608e87af97a054c9a49f81e1473076d51d9a3": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x03f18135c44c64ebfdcbad8297fe5bdafdbbdd86": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x133ee93fe93320e1182923e1a640912ede17c90c": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x16afc4f2ad82986bbe2a4525601f8199ab9c832d": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x2354ef4df11afacb85a5c7f98b624072eccddbb1": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x28415ff2c35b65b9e5c7de82126b4015ab9d031f": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x2e28b9b74d6d99d4697e913b82b41ef1cac51c6c": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x3dcb1787a95d2ea0eb7d00887704eebf0d79bb13": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x6045931e511ef7e53a4a817f971e0ca28c758809": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x66fdb2eccfb58cf098eaa419e5efde841368e489": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x71b01ebddd797c8e9e0b003ea2f4fd207fbf46cc": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x7eb5d86fd78f3852a3e0e064f2842d45a3db6ea2": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x804678fa97d91b974ec2af3c843270886528a9e6": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x824eb9fadfb377394430d2744fa7c42916de3ece": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x89ee0491ce55d2f7472a97602a95426216167189": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x8ca3ff14a52b080c54a6d1a405eeca02959d39fe": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x8e744ec2795c8b836689d1b4ebe1489204357dac": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xa39af17ce4a8eb807e076805da1e2b8ea7d0755b": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xac109c8025f272414fd9e2faa805a583708a017f": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xacf47cbeaab5c8a6ee99263cfe43995f89fb3206": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xbe6a4f74fddc88853612c50d7404e059b37692d8": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xc13aa76aac067c86ae38028019f414d731b3d86a": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xc2d00de94795e60fb76bc37d899170996cbda436": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xd171b26e4484402de70e3ea256be5a2630d7e88d": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xd8e2f8b6db204c405543953ef6359912fe3a88d6": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xdd5bad8f8b360d76d12fda230f8baf42fe0022cf": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xea26b78255df2bbc31c1ebf60010d78670185bd0": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xec6557348085aa57c72514d67070dc863c0a5a8c": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xf45cd219aef8618a92baa7ad848364a158a24f33": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x865c77d4ff6383e06c58350a2cfb95cca2c0f056": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x55d398326f99059ff775485246999027b3197955": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xe9e7cea3dedca5984780bafc599bd69add087d56": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xcc42724c6683b7e57334c4e856f4c9965ed682bd": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x0eb3a705fc54725037cc9e008bdede697f62f335": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xbf5140a22578168fd562dccf235e5d43a02ce9b1": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x715d400f88c167884bbcc41c5fea407ed4d2f8a0": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xfe19f0b51438fd612f6fd59c1dbb3ea319f433ba": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x3019bf2a2ef8040c242c9a4c5c4bd4c81678b2a1": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x361c60b7c2828fcab80988d00d1d542c83387b50": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x90c97f71e18723b0cf0dfa30ee176ab653e89f40": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xad29abb318791d579433d831ed122afeaf29dcfe": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x14016e85a25aeb13065688cafb43044c2ef86784": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xfb6115445bff7b52feb98650c87f44907e58f802": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x7ddee176f665cd201f93eede625770e2fd911990": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xb86abcb37c3a4b64f74f59301aff131a1becc787": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xe48a3d7d0bc88d552f730b62c006bc925eadb9ee": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x52ce071bd9b1c4b00a0b92d298c512478cad67e8": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xd17479997f34dd9156deef8f95a52d81d265be9c": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x111111111117dc0aa78b770fa6a738034120c302": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x3764bc0de9b6a68c67929130aaec16b6060cab8c": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x947950bcc74888a40ffa2593c5798f11fc9124c4": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xf307910a4c7bbc79691fd374889b36d8531b08e3": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x475bfaa1848591ae0e6ab69600f48d828f61a80e": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x9678e42cebeb63f23197d726b29b1cb20d0064e5": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x20ee7b720f4e4c4ffcb00c4065cdae55271aecca": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x0a7e7d210c45c4abba183c1d0551b53ad1756eca": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xa4080f1778e69467e905b8d6f72f6e441f9e9484": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x47bead2563dcbf3bf2c9407fea4dc236faba485a": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x3f56e0c36d275367b8c502090edf38289b3dea0d": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x42981d0bfbaf196529376ee702f2a9eb9092fcb5": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xe4cc45bb5dbda06db6183e8bf016569f40497aa5": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x4b0f1812e5df2a09796481ff14017e6005508003": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x4691937a7508860f876c9c0a2a617e7d9e945d4b": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x1f64fdad335ed784898effb5ce22d54d8f432523": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xfce146bf3146100cfe5db4129cf6c82b0ef4ad8c": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x12bb890508c125661e03b09ec06e404bc9289040": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xf9cec8d50f6c8ad3fb6dccec577e05aa32b224fe": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x22f3997a5df5a80e29871fed24fe3e85741f5e82": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xfe56d5892bdffc7bf58f2e84be1b2c32d21c308b": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x678e840c640f619e17848045d23072844224dd37": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xe9c803f48dffe50180bd5b01dc04da939e3445fc": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x965f527d9159dce6288a2219db51fc6eef120dd1": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x7083609fce4d1d8dc0c979aab8c869ea2c873402": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xba2ae424d960c26247dd6c32edc70b295c744c43": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x0391be54e72f7e001f6bbc331777710b4f2999ef": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x170772a06affc0d375ce90ef59c8ec04c7ebf5d2": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x0000000000000000000000000000000000000000": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x0d8ce2a99bb6e3b7db580ed848240e4a0f9ae153": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x156ab3346823b651294766e23e6cf87254d68962": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x250632378e573c6be1ac2f97fcdf00515d0aa91b": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x3d4350cd54aef9f9b2c29435e0fa809957b3f30a": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x4338665cbb7b2485a8855a139b75d5e34ab0db94": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x85eac5ac2f758618dfa09bdbe0cf174e7d574d5b": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x8ff795a6f4d97e7887c79bea79aba5cc76444adf": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x0ed7e52944161450477ee417de9cd3a859b14fd0": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x101d82428437127bf1608f699cd651e6abf9766e": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x16939ef78684453bfdfb47825f8a5f714f12623a": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x1b96b92314c44b159149f7e0303511fb2fc4774f": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x4bd17003473389a42daf6a0a729f6fdb328bbbd7": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x56b6fb708fc5732dec1afc8d8556423a2edccbd6": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x61eb789d75a95caa3ff50ed7e47b96c132fec082": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x695fd30af473f2960e81dc9ba7cb67679d35edb7": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x70d8929d04b60af4fb9b58713ebcf18765ade422": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x74e4716e431f45807dcf19f284c7aa99f18a4fbc": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x7561eee90e24f3b348e1087a005f78b4c8453524": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x7efaef62fddcca950418312c6c91aef321375a00": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0x88f1a5ae2a3bf98aeaf342d26b30a79438c9142e": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xa184088a740c695e156f91f5cc086a06bb78b827": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xa1faa113cbe53436df28ff0aee54275c13b40975": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xa527a61703d82139f8a06bc30097cc9caa2df5a6": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xad6caeb32cd2c308980a548bd0bc5aa4306c6c18": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xc15fa3e22c912a276550f3e5fe3b0deb87b55acd": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xd4cb328a82bdf5f03eb737f37fa6b370aef3e888": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
    "0xa325ad6d9c92b55a3fc5ad7e412b1518f96441c0": {
        symbol: string;
        decimals: number;
        internal: boolean;
        img: string;
        name: string;
    };
}>;
