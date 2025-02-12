// mock是模拟的链，

const {DECIMAL, INITIAL_ANSWER} = require("../helper-hardhat-config")
const {devlopmentChains} = require("../helper-hardhat-config")

// hardhat-deploy部署脚本的用法
// hre 是hardhat runtime environment（运行时环境）
// getNamedAccounts()获取账户   deployments获取部署信息
module.exports= async({getNamedAccounts, deployments}) => {
    //判断是否是本地环境, 只有本地环境才需要部署mock, 用来获取等同预言机的价格
    if(devlopmentChains.includes(network.name)){
        const {firstAccount} = await getNamedAccounts()
        const {deploy} = deployments
        //部署合约
        await deploy("MockV3Aggregator", {
            from: firstAccount,
            //MockV3Aggregator合约的构造函数参数 8位小数点后两位，3000就是价率3000*10^8
            args: [DECIMAL,INITIAL_ANSWER],
            log: true,
        })
    }else {
        console.log("environment is not local network, mock contract is skipped")
    }
    
}

// all：当npx hardhat deploy --tags all 时，会执行此脚本, 不写all或者其他的，不会执行
module.exports.tags = ["all", "mock"]