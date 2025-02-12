// hardhat-deploy部署脚本的用法, 方便本地测试
// hre 是hardhat runtime environment（运行时环境）

const { network } = require("hardhat")
const {devlopmentChains, networkConfig, LOCK_TIME, CONFIRMATIONS} = require("../helper-hardhat-config")

// getNamedAccounts()获取账户   deployments获取部署信息
module.exports= async({getNamedAccounts, deployments}) => {
    const {firstAccount} = await getNamedAccounts()
    const {deploy} = deployments

    //判断是helper-hardhat-config配置中包含的本地网络, 还是在sepolia/或者BNB Chain.../...部署
    let dataFeedAddr
    let confirmations
    if(devlopmentChains.includes(network.name)){
        const MockV3Aggregator = await deployments.get("MockV3Aggregator")
        dataFeedAddr = MockV3Aggregator.address
        //本地测试：等待区块设置为0
        confirmations = 0
    }else {
        //network.config.chainId:当前部署的的chainId, 通过chainId获取对应的dataFeedAddr
        dataFeedAddr = networkConfig[network.config.chainId].ethUsdDataFeed
        //不是本地环境，直接获取配置
        confirmations = CONFIRMATIONS
    }

    //部署合约 
    const fundMe = await deploy("FundMe", {
        from: firstAccount,
        args: [LOCK_TIME, dataFeedAddr],
        log: true,
        //等待的区块确认数，默认为1, 这里设置5
        waitConfirmations: confirmations
    })

    //合约的验证
    if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY){
        await hre.run("verify:verify", {
            //地址
            address: fundMe.address,
            //合约的参数
            constructorArguments: [LOCK_TIME, dataFeedAddr],
      });
    } else{
        console.log("Network is not sepolia, skipped verify .....")
    }
    
}

// all：当npx hardhat deploy --tags all 时，会执行此脚本, 不写all或者其他的，不会执行
module.exports.tags = ["all", "fundme"]