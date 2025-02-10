const { task } = require("hardhat/config")

task("interact-fundme", "interact with fundme contract")
    .addParam("addr", "fundme contract address")
    .setAction(async(taskArgs, hre) =>{
        //获取合约工厂
        const fundMeFactory = await ethers.getContractFactory("FundMe")
        //使用工厂创建合约实例
        const fundMe = await fundMeFactory.attach(taskArgs.addr)

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
})