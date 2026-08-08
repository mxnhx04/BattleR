import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer signer loaded. Set DEPLOYER_PRIVATE_KEY in .env and rerun the deploy command.",
    );
  }
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} MON`);

  if (balance === 0n) {
    throw new Error(
      `Deployer ${deployer.address} has 0 balance on ${network.name}. Fund it from the Monad testnet faucet before deploying.`,
    );
  }

  const Factory = await ethers.getContractFactory("BattleRoyale");
  const game = await Factory.deploy();
  await game.waitForDeployment();

  const address = await game.getAddress();
  const deployTx = game.deploymentTransaction();

  console.log(`BattleRoyale deployed to: ${address}`);
  if (deployTx) console.log(`Deployment tx: ${deployTx.hash}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        network: network.name,
        chainId: Number((await ethers.provider.getNetwork()).chainId),
        address,
        deployer: deployer.address,
        txHash: deployTx?.hash ?? null,
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`Wrote deployment info to ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
