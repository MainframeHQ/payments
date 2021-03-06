import React, { Component } from 'react'
import MainframeSDK from '@mainframe/sdk'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
import { ThemeProvider } from '@morpheus-ui/core'
import styled from 'styled-components/native'
import ResponsiveDrawer from './components/ResponsiveDrawer'
import MainContainer from './components/MainContainer'
import LoginModal from './components/LoginModal'
import getWeb3 from './components/util/getWeb3'
import { mftABI } from './mft-abi'
import { Provider } from './hocs/Context'
import theme from './theme'
import { getData, writeTransaction } from './firebase'

const MFT_CONTRACT = {
  1: '0xDF2C7238198Ad8B389666574f2d8bc411A4b7428',
  3: '0xA46f1563984209fe47f8236f8B01a03f03F957E4',
}

export const NETWORKS = {
  '1': 'mainnet',
  '2': 'morden',
  '3': 'ropsten',
  '4': 'rinkeby',
  '5': 'goerli',
  '42': 'kovan',
  ganache: 'ganache',
}

const temptheme = createMuiTheme({
  typography: {
    useNextVariants: true,
  },
  palette: {
    primary: {
      main: '#8EDA11',
      contrastText: '#fff',
      titleText: '#fff',
    },
    complementary: {
      main: '#15d642',
      contrastText: '#fff',
    },
  },
})

const Root = styled.View`
  width: 100vw;
  height: 100vh;
  flex: 1;
  flex-direction: row;
`

class App extends Component {
  state = {
    mainframe: null,
    web3: null,
    account: null,
    network: null,
    transactions: null,
    transactionModalOpen: false,
    loading: false,
    mftContract: {},
    toggleCongratsScreen: false,
    initialState: false,
    staticBalance: { ETH: '0', MFT: '0' },
  }

  componentWillUnmount() {
    this.unsubscribe()
  }

  componentDidMount = async () => {
    try {
      // init Mainframe SDK
      const sdk = new MainframeSDK()
      // Get network provider and web3 instance.
      const web3 = await getWeb3(sdk)

      // Set web3 to the state
      this.setState({ web3: web3, mainframe: sdk })

      // initial fetch of blockchain data
      this.getBlockchainData()

      // even listener for account & network updates
      sdk.ethereum.on('accountsChanged', () => {
        this.getBlockchainData()
      })
      sdk.ethereum.on('networkChanged', () => {
        this.getBlockchainData()
      })
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3 or accounts. Check that paymo is approved, or the console for more details.`,
      )
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }

  getBlockchainData = async () => {
    try {
      // Use web3 to get the user's accounts.
      const accounts = await this.state.mainframe.ethereum.getAccounts()
      const account = accounts && accounts.length && accounts[0]
      const network = this.state.mainframe.ethereum.networkVersion

      // Set accounts and network to the state
      if (
        account !== undefined &&
        network !== undefined &&
        (!this.state.account ||
          !this.state.network ||
          this.state.account !== account ||
          this.state.network !== network)
      ) {
        const contract = new this.state.web3.eth.Contract(
          mftABI,
          MFT_CONTRACT[network],
        )

        if (
          account &&
          network &&
          (this.state.account !== account || this.state.network !== network)
        ) {
          this.unsubscribeData()
          this.dataListener = getData(account, NETWORKS[network], data => {
            this.setState({ transactions: data })
          })
        }

        this.setState({
          account,
          network,
          mftContract: contract,
        })
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(`Failed to load web3 or accounts. Check the console for details.`)
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }

  unsubscribeData = () => {
    this.dataListener && this.dataListener()
  }

  sendPayment = async (contactID, to, comment, amount, currency) => {
    const recipient = this.state.web3.utils.toChecksumAddress(to)

    const simpleReceipt = {
      to: recipient,
      from: this.state.account,
    }

    const transactionData = {
      comment: comment,
      value: amount + ' ' + currency,
      receipt: simpleReceipt,
    }

    const paymentParams = {
      contactID: contactID,
      currency: currency,
      value: amount,
    }

    if (!this.state.web3.utils.isAddress(recipient)) {
      alert(
        `Recipient was not a valid Ethereum address. Please try creating your transaction again.`,
      )
      return
    }

    this.handlePayment(transactionData, paymentParams, recipient)
  }

  handlePayment = async (transactionData, paymentParams, recipient) => {
    const res = await this.state.mainframe.payments.payContact(paymentParams)
    let hash
    res
      .on('hash', transactionHash => {
        hash = transactionHash
        this.setState({
          transactionHash,
          loading: true,
        })
      })
      .on('confirmed', () => {
        writeTransaction(
          this.state.account,
          NETWORKS[this.state.network],
          hash,
          transactionData,
          recipient,
        )
          .then(() => {
            this.setState({
              toggleCongratsScreen: true,
              loading: false,
            })
          })
          .catch(err => {
            alert('ERROR. Failed to write to Firebase. ', err)
          })
      })
      .on('error', this.logError)
  }

  handleOpenTransactionModal = () => {
    this.setState({ transactionModalOpen: true })
  }

  handleCloseTransactionModal = () => {
    this.setState({ transactionModalOpen: false, toggleCongratsScreen: false })
  }

  printTransactionHash = transactionHash => {
    this.setState({ transactionHash })
  }

  setInitialStateTrue = () => {
    this.setState({ initialState: true })
  }

  setInitialStateFalse = () => {
    this.setState({ initialState: false })
  }

  setStaticBalance = (bal, currency) => {
    this.setState(prevState => {
      const staticBalance = prevState.staticBalance
      staticBalance[currency] = bal
      return { staticBalance }
    })
  }

  logError = error => {
    alert('ERROR. Contact payment failed. ', error)
    this.setState({
      loading: false,
      transactionModalOpen: false,
      toggleCongratsScreen: false,
    })
  }

  render() {
    return (
      <ThemeProvider theme={theme}>
        <Provider
          value={{
            ...this.state,
            setInitialStateTrue: this.setInitialStateTrue,
            setInitialStateFalse: this.setInitialStateFalse,
            getBlockchainData: this.getBlockchainData,
            sendPayment: this.sendPayment,
            handleOpenTransactionModal: this.handleOpenTransactionModal,
            handleCloseTransactionModal: this.handleCloseTransactionModal,
            setStaticBalance: this.setStaticBalance,
          }}>
          <MuiThemeProvider theme={temptheme}>
            <LoginModal active={this.state.web3 == null} />
            <Root>
              <ResponsiveDrawer />
              <MainContainer />
            </Root>
          </MuiThemeProvider>
        </Provider>
      </ThemeProvider>
    )
  }
}

export default App
