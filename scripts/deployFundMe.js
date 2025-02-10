// import ethers.js 引入ethers
// create main function 创建主函数
// execute main function 执行主函数

// 用常量把ethers引入, ethers可以对EVM链上的合约进行部署和交互
const { ethers } = require("hardhat")

async function main() {
    //create factory创建一个合约工厂
    //注意：做任何合约操作之前加关键字：await(此操作结束之前不要下一步何操作), 且在异步函数中，使用async修饰的函数
    const fundMeFactory = await ethers.getContractFactory("FundMe")
    console.log('contract is deploying...')
    // deploy contract from factory通过工厂发送部署合约请求
    const fundMe = await fundMeFactory.deploy(300)
    //等合约入块
    await fundMe.waitForDeployment()
    //输出内容，打印到控制台
    console.log(`contract has been deployed successfully, contract address: ${fundMe.target}`)

    //验证合约(链的id,和apikey存在)
    if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY){
        //提高合约验证成功率，需要等待五个区块
        // console.log("waiting for 5 confirmations...")
        await fundMe.deploymentTransaction().wait(5)
        //调用函数验证合约
        await verifyFundMe(fundMe.target, [300])
    } else{
        console.log("no need to verify, verification skipped")
    }
    
    const balance = await ethers.provider.getBalance(fundMe.target)   //对合约账户查看
    console.log(`Balance : ${balance}`)
    // 1. init 2 accounts(owner,user1)  初始化两个账户
    const [firstAccount, secondAccount] = await ethers.getSigners() //ethers.getSigners() 可以获取配置文件中的账户
    // 2. fund contract with first account     账户1向合约转账
    const fundTx = await fundMe.fund({ value: ethers.parseEther("0.001")})  //交易发送成功
    await fundTx.wait()     //交易入块
    // 3. check balance of contract
    const balanceOfContract = await ethers.provider.getBalance(fundMe.target)   //对合约账户查看
    console.log(`Balance of contract is : ${balanceOfContract}`)
    // 4. fund contract with second account
    const fundTxWithSecondAccount = await fundMe.connect(secondAccount).fund({ value: ethers.parseEther("0.001")})  //交易发送成功
    await fundTxWithSecondAccount.wait()     //交易入块
    // 5. check balance of contract
    const balanceOfContractAfterSecondFund = await ethers.provider.getBalance(fundMe.target)   //对合约账户查看
    console.log(`Balance of contract is : ${balanceOfContractAfterSecondFund}`)
    // 6. check mapping fundersToAmount
    const firstAccountbalanceInFundMe = await fundMe.funderToAmount(firstAccount.address)
    const secondAccountbalanceInFundMe = await fundMe.funderToAmount(secondAccount.address)
    console.log(`Banlance of first account: ${firstAccountbalanceInFundMe}`)
    console.log(`Banlance of second account: ${secondAccountbalanceInFundMe}`)

}

async function verifyFundMe(fundMeAddr, args) {
    //合约的验证
    await hre.run("verify:verify", {
        //地址
        address: fundMeAddr,
        //合约的参数
        constructorArguments: args,
      });
}

main().then().catch((error) => {
    // 输出错误信息
    console.error(error)
    process.exit(0) 
})