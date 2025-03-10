import React, {useState, useEffect} from "react"
import { Link } from "react-router-dom"
import { useWallet } from '@binance-chain/bsc-use-wallet'
import {
  Container,
  Row,
  Button,
  Col,
  Card,
  CardBody,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  Label,
  Input,
  Form,
  FormGroup,
  InputGroup,
  ButtonGroup,
} from "reactstrap"

import Tooltip from '@material-ui/core/Tooltip';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

import lendingOptions from 'data/lendingOptions'
import farmOptions from 'data/farmOptions'
import Web3Class from 'helpers/bigfoot/Web3Class'
import Calculator from 'helpers/bigfoot/Calculator'
import Formatter from "helpers/bigfoot/Formatter"
import ApprovalModal from "components/BigFoot/ApprovalModal";
import useApiStats from 'hooks/useApiStats';


const Earn = () => {

  //wallet & web3
  const wallet = useWallet()
  const web3Instance = new Web3Class(wallet);
  const userAddress = wallet.account;

  const { isLoadingApiStats, apiStats } = useApiStats();

  const [options, setOptions] = useState(lendingOptions);
  const [bankStats, setBankStats] = useState({});
  const [loadingBankStats, setLoadingBankStats] = useState(false);
  const [isModalOpen, setisModalOpen] = useState(false);
  const [ assetToApprove, setAssetToApprove ] = useState(null);
  const [formData, setFormData] = useState({
    chosenOption: '', // lending option chosen by the user
    action: '', // supply,withdraw
    assetAmounts: {},
    assetBalance: {},
    withdrawalChosenAsset: null,
  });
  const [singleAssetValues, setSingleAssetValues] = useState({});
  const [userPendingRewards, setUserPendingRewards] = useState({});
  const [userBalance, setUserBalance] = useState([]);

  
  useEffect( async () => {
    if(wallet.account) {
      updateUserBalance();
      updateUserPendingRewards();
    }
  }, [wallet.account]);
  
  useEffect( async () => {
    if(wallet.account) {
      updateBankStats();
    }
  }, [wallet.account, apiStats]);

  useEffect( async () => {
    if(wallet.account) {
      updateSingleAssetValues(formData.chosenOption?.bankAddress,formData.chosenOption?.title);
    }
  }, [formData]);


  const updateUserBalance = () => {
    let newUserBalance = JSON.parse(JSON.stringify(userBalance));
    options.filter( option => option.bankAddress ).forEach( (option) => {
      option.assets.forEach(async (asset) => {
        let valueInBankReferenceAsset = 0;
        let amount = await web3Instance.getUserBalance(asset.address);
        if(amount > 0){
          valueInBankReferenceAsset = parseFloat(amount * await web3Instance.getTokenValueInBankAsset(asset.address));
        }
        newUserBalance.push({
          title: option.title, 
          code: asset.code, 
          address: asset.address, 
          amount,
          valueInBankReferenceAsset
        });
      });
    });
    setUserBalance(newUserBalance);
  }

  const updateUserPendingRewards = () => {
    const newPendingRewards = JSON.parse(JSON.stringify(userPendingRewards));
    options.forEach( async option => {
      newPendingRewards[option.title] = await web3Instance.getPendingRewardsBank(option.address);
    });

    setUserPendingRewards(newPendingRewards);
  }


  const updateBankStats = async () => {
    setLoadingBankStats(true);
    const newStats = {};
    options.forEach( async(option) => {
      if(option.bankAddress){

        //get bank stats
        let data = await web3Instance.getBankStats(option.bankAddress);
        
        //calc yields
        const yieldsObj = {};
        yieldsObj["Lend APY"] = data.lendApy;
        yieldsObj["ELE APR"] = apiStats?.[option.apiKey]?.farm?.aprl;

        if (option.title === "bfUSD") {
          yieldsObj["11NRV"] = apiStats?.["3NRV LP"]?.vault?.apy * (1 - data.utilization/100);
        }
        
        data.yields = yieldsObj;
        data.totalApy = Object.values(yieldsObj).reduce( (accumulator, value) => {
          if(parseFloat(value)){
            return accumulator + value;
          } else {
            return accumulator;
          }
        });

        newStats[option.title] = data;

        setTimeout(() => {
          setBankStats(newStats);
          setLoadingBankStats(false);
        }, 1000); //fixes stats not rerendering

      }
    });
  }


  const updateSingleAssetValues = async (bankAddress, coinName) => {
    const amount = formData.assetAmounts[coinName];
    switch (coinName) {
      case 'bfBNB':
        if( isNaN(amount) || amount == 0){
          setSingleAssetValues({
            BNB: 0,
          });  
        } else {
          const amountWeis = Calculator.getWeiStrFromAmount(amount) 
          const amountBNB = await web3Instance.convertBfsToBankCurrency(bankAddress, amountWeis);
          setSingleAssetValues({
            BNB: amountBNB
          });
        }
        break;
      case 'bfUSD':
        if( isNaN(amount) || amount == 0){
          setSingleAssetValues({
            BUSD: 0,
            USDT: 0,
            USDC: 0
          });  
        } else {
          const ratio = await web3Instance.getRatio3poolPerBfusd();
          const resultBusd = await web3Instance.getDollarFrom3pool(amount, "BUSD");
          const resultUsdt = await web3Instance.getDollarFrom3pool(amount, "USDT");
          const resultUsdc = await web3Instance.getDollarFrom3pool(amount, "USDC");
          const result3nrvLps = amount * ratio;
          setSingleAssetValues({
            BUSD: resultBusd * ratio,
            USDT: resultUsdt * ratio,
            USDC: resultUsdc * ratio,
            "3NRV-LP": result3nrvLps
          });
        }  
        break;
    }
    
  }

  const togglemodal = async (chosenOption = null, action = '') => {

    //if wallet not connected
    if( !isModalOpen && !wallet.account){
      toast.warn("Connect your wallet");
      return;
    }

    if (isModalOpen) { //close...
      setFormData({
        chosenOption: chosenOption,
        action: action,
        assetAmounts: {},
        assetBalance: {},
        withdrawalChosenAsset: null
      });
      setisModalOpen(false);
    } else { //open...
      let balances = {};
      if (action === 'supply') {
        for(const asset of chosenOption.assets){
          balances[asset.code] = await web3Instance.getUserBalance(asset.address);
        }
      } else if (action === 'withdraw') {
        balances[chosenOption.title] = await web3Instance.getUserBalance(chosenOption.address);
      }

      setFormData({
        chosenOption: chosenOption,
        action: action,
        assetAmounts: {},
        assetBalance: balances,
        withdrawalChosenAsset: chosenOption.assets[0].code,
      });
      setisModalOpen(true);
    }
  }

  const toggleApprovalModal = (assetDetails) => {
    if (assetToApprove) {
      setAssetToApprove(null);
    } else {
      setAssetToApprove(assetDetails);
    }
  }

  const updateAssetAmounts = (assetCode, value) => {
    let newFormData = {...formData};
    newFormData.assetAmounts[assetCode] = value;
    setFormData(newFormData);
  }

  const updateWithdrawalChosenAsset = (assetCode) => {
    let newFormData = {...formData};
    newFormData.withdrawalChosenAsset = assetCode;
    setFormData(newFormData);
  }

  const setMax = (assetCode, isNativeToken = false) => {
    let newAmount = 0;
    const gasReserve = 0.02;
    const balance = formData.assetBalance[assetCode];

    if (isNativeToken === true) {
      if( balance > gasReserve ){
        newAmount = balance - gasReserve; //leave a small amount for gas
        toast.info(`Leaving a small amount for gas (${gasReserve})`);
      } else {
        newAmount = balance;
        toast.warn("Remember to leave some spare balance for gas.");
      } 
    } else {
      newAmount = balance;  
    }

    updateAssetAmounts(assetCode, newAmount);
  }


  const sendTransaction = async (option) => {

    /* Validation */
    if( Object.values(formData.assetAmounts).every( amount => !amount ) ){
      toast.warn("Please enter a valid amount")
      return;
    }

    /* Prep. amount/s in the correct format */
    let amounts;
    if(formData.action === 'supply'){
      if(option.assets.length === 1){ 
        // single asset --> amount will be provided as a plain variable
        const assetCode = option.assets[0].code;
        amounts = Calculator.getWeiStrFromAmount(formData.assetAmounts[assetCode]);
      }else{ 
        // multiple asset --> amount will be provided as an array
        // note: the expected order of the assets is given by the smart contract
        // (ex., bfUSD bank expects an array with [ busdAmount, usdtAmount, usdcAmount, 3nrv-lpAmount])
        amounts = formData.chosenOption.assets.map( asset => {
          const assetAmount = formData.assetAmounts[asset.code] || 0;
          return Calculator.getWeiStrFromAmount(assetAmount);
        });
      }
    } else if (formData.action === 'withdraw') {
      const assetCode = formData.chosenOption.title;
      amounts = Calculator.getWeiStrFromAmount(formData.assetAmounts[assetCode]);
    }


    /* Check approvals */
    for(const asset of option.assets){
      if( asset.address && formData.assetAmounts[asset.code] > 0 ){ //note: skips if address null (native token)
        const isApproved = await web3Instance.checkApproval(asset.address, option.bankAddress);
        if(!isApproved){
          setAssetToApprove(asset); //if user supplies vault asset & that asset is not approved, request approval
          return; //exit
        }
      }
    }
    setAssetToApprove(null); //all assets approved



    /* Submit tx */
    if(formData.action === 'supply'){
      // SUPPLY

      let depositRequest;
      let payload;

      if (formData.chosenOption.title === "bfBNB"){ //payable function --> amount is provided in .send()
        depositRequest = await web3Instance.reqPayableBankDeposit(option.bankAddress);
        payload = { from: userAddress, value: amounts };
      } else { //non-payable --> amount is provided in .deposit()
        depositRequest = await web3Instance.reqNonPayableBankDeposit(option.bankAddress, amounts);
        payload = { from: userAddress };
      }

      depositRequest.send(payload)
        .on('transactionHash', function (hash) {
          togglemodal()
          toast.info(`Supply in process. ${hash}`)
        })
        .on('receipt', function (receipt) {
          updateBankStats();
          toast.success(`Supply completed.`)
        })
        .on('error', function (error) {
          toast.warn(`Supply failed. ${error?.message}`)
        })
        .catch(error => {
          console.log(error?.message, "Supply error: ")
        });
    } else if (formData.action === 'withdraw') {
      // WITHDRAW
      let withdrawRequest;
      if (formData.chosenOption.title === "bfUSD"){  //banks with multiple options to withdraw
        const bfUsdWithdrawOptions = {
          BUSD: 0,
          USDT: 1,
          USDC: 2,
          "3NRV-LP": 3
        }
        const withdrawOption = bfUsdWithdrawOptions[formData.withdrawalChosenAsset];
        withdrawRequest = await web3Instance.reqBankWithdraw(option.bankAddress, amounts, withdrawOption);
      } else { //banks allowing to withdraw in a single asset
        withdrawRequest = await web3Instance.reqBankWithdraw(option.bankAddress, amounts);
      }

      withdrawRequest.send({ from: userAddress })
        .on('transactionHash', function (hash) {
          togglemodal()
          toast.info(`Withdraw in process. ${hash}`)
        })
        .on('receipt', function (receipt) {
          updateBankStats();
          toast.success(`Withdraw completed.`)
        })
        .on('error', function (error) {
          toast.warn(`Withdraw failed. ${error?.message}`)
        })
        .catch(error => {
          console.log(error?.message, "Withdraw error: ")
        });
    }
  }

  const renderTotalApy = (stats) => {
    if( !stats ){
      return '--'
    } else {
      return (
        <>
          {Formatter.getFormattedYield(stats?.totalApy)} %
          <Tooltip
            placement='right'
            title={
              <ul>
                {/* yields */}
                {Object.entries(stats?.yields).map( ([key, value]) => {
                  if(key === "11NRV"){ //includes disclaimer msg
                    return(
                      <li key={key}>
                        <h5>
                          {key}: {Formatter.getFormattedYield(value)} %*
                        </h5>
                        <h6>* 2/3 vest in 6 months</h6>
                      </li>
                    );
                  } else {
                    return(
                      <li key={key}>
                        <h5>
                          {key}: {Formatter.getFormattedYield(value)}%
                        </h5>
                      </li>
                    );
                  }
                })}
              </ul>
            }
          >
            <i style={{marginLeft:'0.3rem'}} className="tooltip-trigger mdi mdi-information-outline" />
          </Tooltip>
        </>
      );
    }
  }

  const renderFormContent = () => {

    const selectedOption = options.find( option => option.title === formData.chosenOption.title);
    const {title = '', assets = []} = selectedOption || {};
    
    if (formData.action === 'supply') {
      return (
        <React.Fragment>
          <p>I'd like to supply...</p>
          { assets.map( asset => {
            return(
              <FormGroup key={asset.code}>
                <Row className="mb-3">
                  <Col lg="6">
                    <InputGroup className="mb-2">
                      <Label className="input-group-text">
                        <div className="avatar-xs me-3">
                          <span className={"avatar-title rounded-circle bg-transparent"} >
                            <img src={asset.icon.default} />
                          </span>
                        </div>
                        {asset.code}
                      </Label>
                      <Input
                        type="number"
                        className="form-control"
                        min={0}
                        step={0.000001}
                        value={formData.assetAmounts[asset.code] ?? 0}
                        onChange={(e) => updateAssetAmounts(asset.code, e.target.value)} />
                    </InputGroup>
                  </Col>
                  <Col lg="6" className="max-balance-wrapper text-end">
                    <span className="me-3">
                      Balance: {formData.assetBalance[asset.code]}
                    </span>
                    <Button
                      outline
                      color="primary"
                      onClick={() => setMax(asset.code, asset.isNativeToken)}
                    >
                      MAX
                    </Button>
                  </Col>
                </Row>
              </FormGroup>
            )
          })
          }
        </React.Fragment>
      );
    } else if (formData.action === 'withdraw') {
      return (
        <React.Fragment>
          <p>I'd like to withdraw...</p>
          <FormGroup>
            <Row>
              <Col sm="6" lg="8">
                <InputGroup className="mb-3">
                  <Label className="input-group-text">
                    <div className="avatar-xs me-3">
                      <span className={"avatar-title rounded-circle bg-transparent"} >
                        <img src={selectedOption.bankIcon.default} />
                      </span>
                    </div>
                    {title}
                  </Label>
                  <Input 
                    type="number" 
                    className="form-control" 
                    min={0}
                    step={0.000001}
                    value={formData.assetAmounts[selectedOption.title] ?? 0}
                    onChange={(e) => updateAssetAmounts(selectedOption.title, e.target.value)} />
                </InputGroup>
              </Col>
              <Col sm="6" lg="4" className="max-balance-wrapper text-end">
                <span className="me-3">
                  Balance: {formData.assetBalance[selectedOption.title]}
              </span>
                <Button
                  outline
                  color="primary"
                  onClick={ () => setMax(selectedOption.title) }
                >
                  MAX
                </Button>
              </Col>
            </Row>
          </FormGroup>

          <p className="mt-4">Choose how you want to get your {selectedOption.title}:</p>

          <div className="btn-group btn-group-toggle mb-4 children-img-responsive" data-toggle="buttons">
            { assets.map( asset => {
              let amount;
              let value;
              let display;

              if(selectedOption.title==="bfBNB"){
                amount = singleAssetValues[asset.code] || 0;;
                value = Formatter.formatAmount(amount, 4)
                display = `${value}`;
              }else if(selectedOption.title==="bfUSD"){
                amount = singleAssetValues[asset.code] || 0;
                value = Formatter.formatAmount(amount, 2)
                display = `${value}`;
              }

              return (
                <div className="ms-1">
                  <label key={asset.code} style={{minWidth:'80px'}} className={formData.withdrawalChosenAsset === asset.code && "btn btn-secondary active image-withdraw-earn" || "btn btn-secondary active"}>
                  <img src={asset.icon.default} className="icon-withdraw-earn" />
                    <input 
                      type="radio" 
                      value={asset.code}
                      checked={ formData.withdrawalChosenAsset === asset.code }
                      onChange={ () =>  updateWithdrawalChosenAsset(asset.code) }/>
                    <br /><strong>{asset.code}</strong>
                    <br />{display}
                  </label>
                </div>
                )
              })
            }
          </div>
        </React.Fragment>
      );
    }
  }

  const renderActionButtons = (option) => {
    return (
      <>
        <div className="mb-2">
          <Link
            to="#"
            className="btn btn-primary btn-sm w-xs"
            onClick={() => togglemodal(option, 'supply')}
          >
            Supply
          </Link>
        </div>
        <div>
          <Link
            to="#"
            className="btn btn-primary btn-sm w-xs"
            onClick={() => togglemodal(option, 'withdraw')}
          >
            Withdraw
          </Link>
        </div>
      </>
    );
  }


  const requestHarvest = async (bankAddress) => {
    const claim = await web3Instance.reqClaimRewards(bankAddress)
    claim.send({ from: userAddress })
      .on('transactionHash', function (hash) {
        toast.info(`Harvest in process. ${hash}`)
      })
      .on('receipt', function (receipt) {
        toast.success(`Harvest completed.`)
      })
      .on('error', function (error) {
        toast.warn(`Harvest failed. ${error?.message}`)
      })
      .catch(error => {
        console.log(`Harvest error. ${error?.message}`)
      });

  }


  const renderRewardButtons = (option) => {
    const bankHasFarm = (option.title === "bfBNB") ? true : false;
    const userCanFarm = (bankStats[option.title]?.bigfootBalance > 0) ? true : false;
    const userCanHarvest = userPendingRewards[option.title] && Object.values(userPendingRewards[option.title]).some( amount => amount > 0);
    
    if (bankHasFarm) {
      return (
        <Button
          outline
          color="primary"
          disabled={!userCanFarm}
          tag={Link} to="/farms"
        >Deposit on farm</Button>
      );
    } else if (userCanHarvest) {
      const rewardsELE = Calculator.getAmoutFromWeis(userPendingRewards[option.title].ele);
      const rewardsNRV = Calculator.getAmoutFromWeis(userPendingRewards[option.title].nrv);
      return (
        <>
          { Formatter.formatAmount(rewardsELE, 6) } ELE<br />
          { Formatter.formatAmount(rewardsNRV, 6) } 11NRV<br />
          <Button
            style={{ width: "100%" }}
            className="mt-1"
            color="primary"
            onClick={ () => requestHarvest(option.bankAddress)}
          >Harvest</Button>
        </>
      );
    } else {
      return (
        <>
          <Button
            outline
            style={{ width: "100%" }}
            className="mt-1"
            color="primary"
            disabled
          >Harvest</Button>
        </>
      );
    }
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Row>
            <Col xl="12">
              <Card className={ loadingBankStats ? 'card-loading' : ''}>
                <CardBody>
                  <h4 className="card-title">
                    <i className="mdi mdi-rocket-launch text-primary h1"/>
                    Lending
                  </h4>

                  <div className="table-responsive">
                    <Table className="table table-nowrap align-middle text-center mb-0">
                      <thead>
                        <tr>
                          <th scope="col"></th>
                          <th scope="col">Balance</th>
                          <th scope="col">APY</th>
                          <th scope="col">Total Supply</th>
                          <th scope="col">Utilization</th>
                          <th scope="col">BigFoot Balance</th>
                          <th scope="col">BigFoot Chef</th>
                          <th scope="col">Actions</th>
                          <th scope="col">Rewards</th>
                        </tr>
                      </thead>
                      <tbody>
                        { options.map((option, key) => {

                            const stats = bankStats[option.title];
                            
                            let balanceValue = 0;
                            userBalance.map((balance) => {
                              if(balance.title == option.title){
                                  balanceValue += balance.valueInBankReferenceAsset;
                              }
                            })
                            
                            return(
                            <tr key={key}>
                              <th scope="row">
                                <div className="d-flex align-items-center">
                                  <div className="avatar-xs me-3">
                                    <span className={"avatar-title rounded-circle bg-transparent"} >
                                      <img src={option.bankIcon.default} />
                                    </span>
                                  </div>
                                  <span>{option.title}</span>
                                </div>
                              </th>
                              <td>
                                <div>
                                  <span>{ option.isComingSoon ? "" : 
                                    option.referenceCurrency ==='$' ? `$${Formatter.formatAmount(balanceValue, 0)}` :
                                    `${Formatter.formatAmount(balanceValue)} ${option.referenceCurrency}` }</span>
                                </div>
                              </td>
                              <td>
                                <div>
                                  {option.isComingSoon ? "" : renderTotalApy(stats)}
                                </div>
                              </td>
                              <td>
                                <h5 className="font-size-14 mb-1">
                                  { option.isComingSoon ? "" : 
                                    option.referenceCurrency ==='$' ? `$${Formatter.formatAmount((stats?.totalSupply * stats?.referenceAssetValueInUsd), 0)}` :
                                    `${Formatter.formatAmount(stats?.totalSupply)} ${option.referenceCurrency}` }
                                </h5>
                                <div className="text-muted">
                                  { option.isComingSoon || option.referenceCurrency ==='$' ? "" : 
                                    `($${Formatter.formatAmount((stats?.totalSupply * stats?.referenceAssetValueInUsd), 0)})` }
                                </div>
                              </td>
                              <td>
                                <h5 className="font-size-14 mb-1">
                                  { option.isComingSoon ? "" : 
                                    stats?.utilization === undefined ?  ' %' :
                                    `${stats?.utilization.toFixed(2)} %` 
                                  }
                                  
                                </h5>
                                <div className="text-muted"> 
                                  { option.isComingSoon ? "" : 
                                    option.referenceCurrency ==='$' ? `($${Formatter.formatAmount((stats?.totalBorrow * stats?.referenceAssetValueInUsd), 0)})` :
                                    `(${Formatter.formatAmount(stats?.totalBorrow)} ${option.referenceCurrency})` 
                                  }
                                </div>
                              </td>
                              <td>
                                <h5 className="font-size-14 mb-1">
                                  { option.isComingSoon ? "" : 
                                    option.referenceCurrency ==='$' ? `$${Formatter.formatAmount((stats?.bigfootBalance * stats?.referenceAssetValueInUsd))}` :
                                    `${Formatter.formatAmount(stats?.bigfootBalance)} ${option.referenceCurrency}` }
                                </h5>
                                <div className="text-muted">
                                  { option.isComingSoon || option.referenceCurrency ==='$' ? "" : 
                                    `($${Formatter.formatAmount((stats?.bigfootBalance * stats?.referenceAssetValueInUsd))})` }
                                </div>
                              </td>
                              <td>
                                <h5 className="font-size-14 mb-1">
                                  { option.isComingSoon ? "" : 
                                    stats?.bigfootChefBalance === null ? "--" :
                                    `${Formatter.formatAmount(stats?.bigfootChefBalance)} ${option.referenceCurrency}` }
                                </h5>
                                <div className="text-muted">
                                  { option.isComingSoon || stats?.bigfootChefBalance === null  ? "" : 
                                    `($${Formatter.formatAmount(stats?.bigfootChefBalance * stats?.referenceAssetValueInUsd)})` }
                                </div>
                              </td>
                              <td style={{ width: "120px" }}>
                                {option.isComingSoon ? "Coming Soon" : renderActionButtons(option) }
                              </td>
                              <td style={{ width: "120px" }}>
                                {option.isComingSoon ? "" : renderRewardButtons(option) }
                              </td>
                            </tr>
                        )})}
                      </tbody>
                    </Table>
                  </div>
                </CardBody>

                <Modal
                  isOpen={isModalOpen}
                  role="dialog"
                  size="lg"
                  autoFocus={true}
                  centered={true}
                  toggle={() => togglemodal()}
                >
                  <div className="modal-content">
                    <ModalHeader toggle={() => togglemodal()}>
                      <span className="text-capitalize">
                        {formData.action}: 
                      </span>
                      &nbsp;
                      {formData.chosenOption?.title}
                    </ModalHeader>
                    <ModalBody>
                      <div
                        className="wizard clearfix"
                      >
                        <div className="content clearfix">
                          <Form>
                            { formData.chosenOption &&
                              renderFormContent()
                            }
                            <p>
                              Note: BigFoot is a leveraged yield farming/liquidity providing product. There are risks involved when using this product. Please read <a target="_blank" href="https://11eleven-11finance.gitbook.io/bigfoot/introduction/an-introduction">here</a> to understand the risks involved.
                            </p>
                          </Form>
                        </div>
                        <div className="actions clearfix">
                          <ul role="menu" aria-label="Pagination">
                            <li className={"next"} >
                              <Link
                                to="#"
                                onClick={ () => sendTransaction(formData.chosenOption) }
                              >
                                Confirm
                              </Link>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </ModalBody>
                  </div>
                </Modal>

                { assetToApprove && 
                  <ApprovalModal assetToApprove={assetToApprove} bigfootAddress={formData.chosenOption.bankAddress} toggleApprovalModal={toggleApprovalModal} />
                }

              </Card>
            </Col>
          </Row>

        </Container>
      </div>
    </React.Fragment>
  )
}

export default Earn;