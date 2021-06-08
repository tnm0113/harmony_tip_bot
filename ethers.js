import { ethers } from "ethers";

const provider = new ethers.providers.JsonRpcProvider("https://api.s0.b.hmny.io/");

const signer = provider.getSigner();

provider.getBlockNumber().then(res => {
    console.log(res)
});

const mn2 =
  "ability repair service cabin coconut wash satisfy myself model border oppose vivid";
const w = ethers.Wallet.fromMnemonic(mn2);
w.getAddress().then(address => {
    console.log(address)
})

