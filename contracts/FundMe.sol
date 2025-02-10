//SPDX-License-Identifier:MIT
pragma solidity ^0.8.28;
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// 1. 创建一个收款函数
// 2. 记录投资人并且查看
// 3. 在锁定期内，达到目标值，生产商可以提款
// 4. 在锁定期内，没有达到目标值，投资人在锁定期以后退款

contract FundMe {

    // 建立一个映射，记录投资人(发送人)的地址和投资金额（address是一种数据类型）
    mapping (address => uint256) public funderToAmount;

    //预言机对象
    AggregatorV3Interface internal dataFeed;

    //设置单笔投资最小值：100美元
    uint256 constant MINIMUM_VALUE = 1*10**18; //USD

    //设置筹集目标值, constant修饰的为常量，不能修改
    uint256 constant TARGET = 1*10**18;

    //合约拥有者
    address public owner;

    //锁定期
    uint256 deploymentTimestamp;
    //锁定多久
    uint256 lockTime;

    //记录erc20合约的地址，用于校验：只有erc20合约才可以调用更改映射中eth的数量
    address public erc20Addr;

    //记录拥有者是否已经提取资金池冲的eth，默认为false
    bool public getFundSuccess;

    //构造函数，只有部署的时候才会执行一次
    constructor(uint256 _lockTime){
        // sepolia testnet 测试网
        dataFeed = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);
        //初始化owner,把部署人设置为owner，此后不再改变
        owner = msg.sender;

        //初始化时,从（部署合约所在区块）中获取锁定期
        deploymentTimestamp = block.timestamp;
        //用户设置锁定时间
        lockTime = _lockTime;
    }

    /**
    * 筹款，并记录合约地址，金额
    */
    function fund() external payable {
        require(convertEthToUsd(msg.value) >= MINIMUM_VALUE, "Send more ETH");
        //从（调用函数所在区块）中获取当前时间 < 锁定期开始时间+锁定时长
        require(block.timestamp < deploymentTimestamp + lockTime, "window is closed");
        // 映射中，msg的发送地址映射msg的值
        funderToAmount[msg.sender] += msg.value;
    }

     /**
     * 获取usd与ETH的价格比例
     */
    function getChainlinkDataFeedLatestAnswer() public view returns (int) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int answer,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return answer;
    }

    /**
    * 计算获取发送eth的总价值
    */
    function convertEthToUsd(uint256 ethAmount) internal view returns(uint256){
        uint256 ethPrice = uint256(getChainlinkDataFeedLatestAnswer());
        // 语言及这里获取的是：1ETH = USD*10^8 
        return ethAmount * ethPrice/(10 ** 8);
    }

    /**
    * 更改owner
    */
    function transferOwnership(address newOwner) public onlyOwner{
        
        owner = newOwner;
    }

    /**
    * owner验证是否达到Target，owner提款
    */
    function getFund() external windowClosed onlyOwner{
        require(convertEthToUsd(address(this).balance) >= TARGET, "Target is not reached");

        // // transfer: addr.transfer(valible) 把ETH从此合约地址转移到owner地址
        // payable(msg.sender).transfer(address(this).balance);

        // // send
        // bool success = payable(msg.sender).send(address(this).balance);
        // require(success, "tx failed");

        // call:
        bool success;
        (success, ) = payable (msg.sender).call{value: address(this).balance}("");
        require(success, "transfer is failed");
    

        //已提取
        getFundSuccess = true;
    }

    /**
    * 目标值没达到要求，需要退款
    */
    function refund() external windowClosed{
        //查看筹集资金是否达到了目标值
        require(convertEthToUsd(address(this).balance) < TARGET, "Target is reached");
        //查询当前用户存入的eth是多少
        require(funderToAmount[msg.sender] !=0 , "there is no fund");
        bool success;
        (success, ) = payable (msg.sender).call{value: funderToAmount[msg.sender]}("");
        require(success, "transfer is failed");
        //完成退款后，要把映射中的存款清零
        funderToAmount[msg.sender] = 0;
    }

    /**
    * 用来更新映射通证的数量（只有erc20的合约才可以调用此函数）
    */
    function setFunderToAmount(address funder, uint256 amountToUpdate) external {
        //限制调用的合约，只能是erc20合约
        require(msg.sender == erc20Addr, "you do not have permission to call this function");
        funderToAmount[funder] = amountToUpdate;
    }

    /**
    * 设定erc20合约的地址
    */
    function setErc20Addr(address _erc20Addr) public onlyOwner{
        erc20Addr = _erc20Addr;
    }  

    modifier windowClosed() {
        require(block.timestamp >= deploymentTimestamp + lockTime, "window is not closed");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "this function can only be called owner");
        _;
    }
}