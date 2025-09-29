import { task } from "hardhat/config";

task("ballot:create", "Create a ballot")
  .addParam("title")
  .addParam("description")
  .addParam("options", "Comma separated options")
  .addParam("start", "Start timestamp (seconds)")
  .addParam("end", "End timestamp (seconds)")
  .addOptionalParam("max", "Max votes per address", "1")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const factory = await hre.ethers.getContractFactory("SecretBallotBox", signer);
    const deployed = await hre.deployments.get("SecretBallotBox");
    const contract = factory.attach(deployed.address);

    const opts = (args.options as string).split(",").map((s) => s.trim());
    const tx = await contract.createBallot(
      args.title,
      args.description,
      opts,
      BigInt(args.start),
      BigInt(args.end),
      Number(args.max)
    );
    const receipt = await tx.wait();
    console.log("createBallot tx:", receipt?.hash);
  });




