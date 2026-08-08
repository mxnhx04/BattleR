// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IBattleRoyale {
    function joinGame() external payable;

    function attack(address target) external payable;

    function claimPrize() external;
}

/// @dev Test-only helper used to exercise BattleRoyale's claimPrize
/// reentrancy guard. Not part of the deployed game.
contract ReentrantAttacker {
    IBattleRoyale public immutable game;
    bool public reentered;

    constructor(address gameAddress) {
        game = IBattleRoyale(gameAddress);
    }

    function doJoin(uint256 fee) external payable {
        game.joinGame{value: fee}();
    }

    function doAttack(address target, uint256 fee) external payable {
        game.attack{value: fee}(target);
    }

    function doClaim() external {
        game.claimPrize();
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            // Attempt to claim again while the first claimPrize call is
            // still on the call stack. Should fail either way (nonReentrant
            // guard, or prizePool already zeroed) — the try/catch just keeps
            // that expected revert from bubbling up and killing the payout.
            try game.claimPrize() {} catch {}
        }
    }
}
