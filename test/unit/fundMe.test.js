const { ethers, deployments } = require("hardhat")
const { assert, expect } = require("chai")
const helpers = require("@nomicfoundation/hardhat-network-helpers")

describe("test fundMe contract", async function () {
    let fundMe
    let fundMeSecondAccount
    let firstAccount
    let secondAccount
    let mockV3Aggregator

    //beforeEash 在每个it测试用例之前执行, 初始化合约，账户....
    beforeEach(async function() {
        //这里用到deploy（hardhat-deploy)的部署合约的脚本
        await deployments.fixture(["all"])
        firstAccount = (await getNamedAccounts()).firstAccount
        secondAccount = (await getNamedAccounts()).secondAccount
        //从deployments部署信息中获取合约信息
        const fundMeDeployment = await deployments.get("FundMe")
        mockV3Aggregator = await deployments.get("MockV3Aggregator")
        fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address)
        //第二个账户部署合约
        fundMeSecondAccount = await ethers.getContract("FundMe", secondAccount)
    })

    //测试构造函数有没有执行
    it("test if the owner is msg.sender", async function () {
        await fundMe.waitForDeployment()
        assert.equal(await fundMe.owner(), firstAccount)
    })

    it("test if the datafeed is assigned correctly", async function () {
        await fundMe.waitForDeployment()
        assert.equal((await fundMe.dataFeed()), mockV3Aggregator.address)
    })

    //单元测试合约函数 fund getFund refund
    //fund 函数测试, 测试点：window open, value greater than minimum, funderbalance
    it("window closed, value great than minimum, fund failed",
        async function() {
            //make sure the window is closed 模拟时间流逝200秒
            await helpers.time.increase(200)
            //模拟挖矿
            await helpers.mine()
            //value is greater minimum value 模拟值大于单次筹款最小值
            //expect: fund failed 预期要失败
            expect(fundMe.fund({value: ethers.parseEther("0.001")}))
                .to.be.revertedWith("window is closed")
        }
    )

    it("window open, value is less than minimun, fund failed",
         async function() {
            expect(fundMe.fund({value: ethers.parseEther("0.0001")}))
                .to.be.revertedWith("Send more ETH")
         }
    )

    it("window open, value is less than minimun, fund success",
        async function() {
            //greater than minimum value 模拟值大于单次筹款最小值
            await fundMe.fund({value: ethers.parseEther("1")})
            const balance = await fundMe.funderToAmount(firstAccount)
            expect(balance).to.equal(ethers.parseEther("1"))
        }
   )


   //unit test for getFund
   //onlyOwner, window closed, target reached
   it("notOwner, window closed, target reached",
        async function() {
            //make sure the target is reached 模拟筹款目标达成
            await fundMe.fund({value: ethers.parseEther("1")})

            //make sure the window is closed 模拟时间流逝200秒
            await helpers.time.increase(200)
            //模拟挖矿
            await helpers.mine()

            //基于第二个账户的合约对象，调用getFund函数，预期失败
            await expect(fundMeSecondAccount.getFund())
                .to.be.revertedWith("this function can only be called owner")
            
        }
    )

    it("isOwner, window open, target reached",
        async function() {
            //make sure the target is reached 模拟筹款目标达成
            await fundMe.fund({value: ethers.parseEther("0.1")})

            //基于第二个账户的合约对象，调用getFund函数，预期失败
            await expect(fundMe.getFund())
                .to.be.revertedWith("window is not closed")
            
        }
    )

    it("isOwner, window closed, target not reached",
        async function() {
            //make sure the target is reached 模拟筹款目标没有达成
            await fundMe.fund({value: ethers.parseEther("0.001")})

            //make sure the window is closed 模拟时间流逝200秒
            await helpers.time.increase(200)
            //模拟挖矿
            await helpers.mine()

            //基于第二个账户的合约对象，调用getFund函数，预期失败
            await expect(fundMe.getFund())
                .to.be.revertedWith("Target is not reached")
        }
    )

    it("isOwner, window closed, target not reached",
        async function() {
            //make sure the target is reached 模拟筹款目标没有达成
            await fundMe.fund({value: ethers.parseEther("1")})

            //make sure the window is closed 模拟时间流逝200秒
            await helpers.time.increase(200)
            //模拟挖矿
            await helpers.mine()

            //基于第二个账户的合约对象，调用getFund函数，预期失败
            await expect(fundMe.getFund())
                .to.emit(fundMe, "FundWithdrawByOwner")
                .withArgs(ethers.parseEther("1"))
        }
    )


})