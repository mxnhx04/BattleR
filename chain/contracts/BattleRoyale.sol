// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Monad Battle Royale
/// @notice Every game action (join, attack, shield, heal, power attack) is its
/// own paid transaction and is the authoritative source of match state — the
/// frontend only reads what this contract emits and stores. Fees mirror
/// frontend/src/lib/economy.ts so the two never drift apart.
contract BattleRoyale is Ownable, ReentrancyGuard {
    enum MatchStatus {
        Waiting,
        Active,
        Finished
    }

    struct Player {
        bool joined;
        bool alive;
        bool shielded;
        uint8 hp;
        uint8 healsUsed;
        uint64 attackReadyAt;
        uint64 powerReadyAt;
    }

    // ---------------- Economy & rules ----------------
    // "ether" is just the Solidity literal for 1e18 base units — Monad's
    // native MON token uses the same 18-decimal convention as ETH, so the
    // unit works, it does not mean these fees are denominated in ETH.
    uint256 public constant ENTRY_FEE = 0.01 ether;
    uint256 public constant ATTACK_FEE = 0.001 ether;
    uint256 public constant SHIELD_FEE = 0.001 ether;
    uint256 public constant HEAL_FEE = 0.002 ether;
    uint256 public constant POWER_ATTACK_FEE = 0.003 ether;

    uint8 public constant MAX_HP = 3;
    uint8 public constant MAX_HEALS = 2;
    uint8 public constant ATTACK_DAMAGE = 1;
    uint8 public constant POWER_ATTACK_DAMAGE = 2;

    uint64 public constant ATTACK_COOLDOWN = 5 seconds;
    uint64 public constant POWER_ATTACK_COOLDOWN = 15 seconds;

    // ---------------- Match state ----------------
    mapping(address => Player) public players;
    address[] public playerAddresses;

    MatchStatus public matchStatus;
    address public winner;
    uint256 public prizePool;
    uint16 public aliveCount;

    // ---------------- Events ----------------
    event PlayerJoined(address indexed player, uint256 prizePool, uint256 playerCount);
    event GameStarted(uint256 playerCount, uint256 timestamp);
    event PlayerAttacked(
        address indexed attacker,
        address indexed target,
        bool isPowerAttack,
        bool blockedByShield,
        uint8 damage,
        uint8 targetHpAfter
    );
    event PlayerShielded(address indexed player);
    event PlayerHealed(address indexed player, uint8 hpAfter);
    event PlayerEliminated(address indexed player);
    event GameFinished(address indexed winner, uint256 prizePool);
    event PrizePaid(address indexed winner, uint256 amount);

    // ---------------- Errors ----------------
    error WrongStatus();
    error AlreadyJoined();
    error WrongFee(uint256 expected, uint256 sent);
    error NotAlive();
    error TargetNotAlive();
    error CannotTargetSelf();
    error OnCooldown(uint64 readyAt);
    error AlreadyShielded();
    error AtMaxHp();
    error HealLimitReached();
    error NotEnoughPlayers();
    error NotWinner();
    error NothingToClaim();
    error TransferFailed();

    modifier onlyStatus(MatchStatus required) {
        if (matchStatus != required) revert WrongStatus();
        _;
    }

    constructor() Ownable(msg.sender) {}

    // ---------------- Core game loop ----------------

    function joinGame() external payable onlyStatus(MatchStatus.Waiting) {
        if (players[msg.sender].joined) revert AlreadyJoined();
        if (msg.value != ENTRY_FEE) revert WrongFee(ENTRY_FEE, msg.value);

        players[msg.sender] = Player({
            joined: true,
            alive: true,
            shielded: false,
            hp: MAX_HP,
            healsUsed: 0,
            attackReadyAt: 0,
            powerReadyAt: 0
        });
        playerAddresses.push(msg.sender);
        aliveCount += 1;
        prizePool += msg.value;

        emit PlayerJoined(msg.sender, prizePool, playerAddresses.length);
    }

    /// @notice Host-only: opens combat once enough players have joined.
    function startGame() external onlyOwner onlyStatus(MatchStatus.Waiting) {
        if (playerAddresses.length < 2) revert NotEnoughPlayers();
        matchStatus = MatchStatus.Active;
        emit GameStarted(playerAddresses.length, block.timestamp);
    }

    function attack(address target) external payable onlyStatus(MatchStatus.Active) {
        Player storage attacker = players[msg.sender];
        if (!attacker.alive) revert NotAlive();
        if (msg.value != ATTACK_FEE) revert WrongFee(ATTACK_FEE, msg.value);
        if (block.timestamp < attacker.attackReadyAt) revert OnCooldown(attacker.attackReadyAt);

        attacker.attackReadyAt = uint64(block.timestamp) + ATTACK_COOLDOWN;
        prizePool += msg.value;

        _resolveAttack(target, false, ATTACK_DAMAGE);
    }

    function powerAttack(address target) external payable onlyStatus(MatchStatus.Active) {
        Player storage attacker = players[msg.sender];
        if (!attacker.alive) revert NotAlive();
        if (msg.value != POWER_ATTACK_FEE) revert WrongFee(POWER_ATTACK_FEE, msg.value);
        if (block.timestamp < attacker.powerReadyAt) revert OnCooldown(attacker.powerReadyAt);

        attacker.powerReadyAt = uint64(block.timestamp) + POWER_ATTACK_COOLDOWN;
        prizePool += msg.value;

        _resolveAttack(target, true, POWER_ATTACK_DAMAGE);
    }

    function shield() external payable onlyStatus(MatchStatus.Active) {
        Player storage player = players[msg.sender];
        if (!player.alive) revert NotAlive();
        if (msg.value != SHIELD_FEE) revert WrongFee(SHIELD_FEE, msg.value);
        if (player.shielded) revert AlreadyShielded();

        player.shielded = true;
        prizePool += msg.value;

        emit PlayerShielded(msg.sender);
    }

    function heal() external payable onlyStatus(MatchStatus.Active) {
        Player storage player = players[msg.sender];
        if (!player.alive) revert NotAlive();
        if (msg.value != HEAL_FEE) revert WrongFee(HEAL_FEE, msg.value);
        if (player.hp >= MAX_HP) revert AtMaxHp();
        if (player.healsUsed >= MAX_HEALS) revert HealLimitReached();

        player.hp += 1;
        player.healsUsed += 1;
        prizePool += msg.value;

        emit PlayerHealed(msg.sender, player.hp);
    }

    /// @notice Pull-payment: the winner claims instead of the contract
    /// pushing funds automatically when the match ends. This keeps the
    /// state-changing attack/powerAttack calls that can end a match free of
    /// any outbound transfer, and confines the one place MON leaves the
    /// contract to a single, reentrancy-guarded, checks-effects-interactions
    /// function.
    function claimPrize() external nonReentrant onlyStatus(MatchStatus.Finished) {
        if (msg.sender != winner) revert NotWinner();
        uint256 amount = prizePool;
        if (amount == 0) revert NothingToClaim();

        prizePool = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit PrizePaid(msg.sender, amount);
    }

    /// @notice Host-only demo convenience so the same deployed contract can
    /// run multiple test matches without redeploying. Blocked mid-match and
    /// blocked while a finished match still has an unclaimed prize, so a
    /// reset can never strand MON that's owed to a winner.
    function resetMatch() external onlyOwner {
        bool unclaimedPrize = matchStatus == MatchStatus.Finished && prizePool > 0;
        if (matchStatus == MatchStatus.Active || unclaimedPrize) revert WrongStatus();

        uint256 len = playerAddresses.length;
        for (uint256 i = 0; i < len; i++) {
            delete players[playerAddresses[i]];
        }
        delete playerAddresses;

        matchStatus = MatchStatus.Waiting;
        winner = address(0);
        prizePool = 0;
        aliveCount = 0;
    }

    // ---------------- Views ----------------

    function getAllPlayers() external view returns (address[] memory) {
        return playerAddresses;
    }

    function getPlayerCount() external view returns (uint256) {
        return playerAddresses.length;
    }

    // ---------------- Internal ----------------

    /// @dev Shared by attack/powerAttack. Caller has already validated the
    /// attacker's own alive/cooldown/fee state and charged the fee.
    function _resolveAttack(address target, bool isPower, uint8 damage) private {
        if (target == msg.sender) revert CannotTargetSelf();
        Player storage targetPlayer = players[target];
        if (!targetPlayer.alive) revert TargetNotAlive();

        bool blocked = targetPlayer.shielded;
        uint8 hpAfter = targetPlayer.hp;

        if (blocked) {
            targetPlayer.shielded = false;
        } else {
            hpAfter = targetPlayer.hp > damage ? targetPlayer.hp - damage : 0;
            targetPlayer.hp = hpAfter;
            if (hpAfter == 0) {
                targetPlayer.alive = false;
                aliveCount -= 1;
                emit PlayerEliminated(target);
            }
        }

        emit PlayerAttacked(msg.sender, target, isPower, blocked, damage, hpAfter);

        // alivePlayerCount is maintained incrementally on every elimination,
        // so finding the winner never requires scanning every player on
        // every action — only this one time, when the count drops to 1.
        if (aliveCount == 1) {
            _finishGame();
        }
    }

    function _finishGame() private {
        matchStatus = MatchStatus.Finished;

        uint256 len = playerAddresses.length;
        for (uint256 i = 0; i < len; i++) {
            address candidate = playerAddresses[i];
            if (players[candidate].alive) {
                winner = candidate;
                break;
            }
        }

        emit GameFinished(winner, prizePool);
    }
}
