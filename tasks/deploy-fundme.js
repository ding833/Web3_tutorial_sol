const { task } = require("hardhat/config");

task("deploy-fundme", "deploy and verify fundme contract").setAction(async(taskArgs, hre) =>{
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
})