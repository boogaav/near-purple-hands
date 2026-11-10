// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWormholeCore {
    function chainId() external view returns (uint16);
    function messageFee() external view returns (uint256);
    function publishMessage(uint32 nonce, bytes calldata payload, uint8 consistencyLevel) external payable returns (uint64);
}

/// Publishes the raw HyperCore BTC book observed during the source transaction.
contract BtcQuoteEmitter {
    IWormholeCore public immutable core;
    address private constant BOOK = address(0x080e);

    constructor(IWormholeCore verifiedCore) {
        require(block.chainid == 999 && verifiedCore.chainId() == 47, "Wrong network");
        core = verifiedCore;
    }

    function capture() external payable returns (uint64 sequence) {
        require(msg.value == core.messageFee(), "Incorrect message fee");
        (bool ok, bytes memory result) = BOOK.staticcall(abi.encode(uint32(0)));
        require(ok && result.length == 64, "BTC book unavailable");
        (uint64 bid, uint64 ask) = abi.decode(result, (uint64, uint64));
        require(bid > 0 && ask >= bid, "Invalid book");
        // This timestamp dates the read. HyperCore BBO exposes no last-update timestamp.
        bytes memory payload = abi.encode(bytes4("YHB1"), uint32(0), bid, ask, block.number, block.timestamp);
        return core.publishMessage{value:msg.value}(0, payload, 0);
    }
}
