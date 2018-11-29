import Avatar from '@material-ui/core/Avatar';
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import base from '../base';
import getWeb3 from "./util/getWeb3";
import Jazzicon from './util/JazzIcon/Jazzicon';
import jsNumberForAddress from './util/JazzIcon/jsNumberForAddress';

const styles = theme => ({
  root: {
    width: '100%',
    overflowX: 'auto',
  },
  row: {
    display: 'flex',
  },
  fade: {
    color: '#999',
  },
  noWrap: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    color: '#999'
  },
});

const CustomTableCell = withStyles(theme => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  body: {
    fontSize: 14,
    height: 75,
  }
}))(TableCell);


let rowId = 0;
function createData(identifier, avatar, comment, date, value) {
  rowId += 1;
  return { rowId, identifier, avatar, comment, date, value };
}

const danAvatar = 'https://images-production-f.squarecdn.com/unsafe/72x0/https://franklin-assets.s3.amazonaws.com/apps/imgs/cpxmXqyosrjLWFdWz32SmH.jpeg';
const daveAvatar = 'https://images-production-f.squarecdn.com/unsafe/72x0/https://franklin-assets.s3.amazonaws.com/apps/imgs/7slho2uSf2zlr6CmHu04lH.jpeg';
const wesAvatar = 'https://images-production-f.squarecdn.com/unsafe/72x0/https://franklin-assets.s3.amazonaws.com/apps/imgs/7slho2uSf2zlr6CmHu04lH.jpeg';

const rows = [
  createData('Daniel Jensen', danAvatar, 'For maisy’s birthday party dinner', 'Aug 28', '-$38' ),
  createData('Robert Pratt', wesAvatar, 'For Nano Ledger S', 'Aug 28', '$100' ),
  createData('David Jensen', daveAvatar, 'For 🍪', 'Oct 21, 2017', '-$7' ),
  createData('David Jensen', daveAvatar, 'For pizza', 'Aug 28', '-$38' ),
  createData('Daniel Jensen', danAvatar, 'For replacement drone blades', 'Sept 5, 2018', '$10.67' ),
  createData('Chandler Hobard', '', 'Expired', 'Aug 18, 2017', '$20' ),
];

function initials(name){
  let initials = name.match(/\b\w/g) || [];
  initials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
  return initials;
}

function condenseAddress(address){
  const len = 4;
  return address.slice(0, len + 2) + '...' + address.slice(-len, address.length)
}

class SimpleTable extends React.Component {

  state = {
    rows: []
  }

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      const network = await web3.eth.net.getNetworkType();

      // Set web3 and accounts to the state
      this.setState({ web3, accounts, network });
      console.log(`account_transactions/${accounts[0]}/${network}`);
      base.listenTo(`account_transactions/${accounts[0]}/${network}`, {
        context: this,
        asArray: true,
        then(transactionData) {
          let rows = []
          transactionData.forEach((transaction, index) => {
            console.log(index, transaction);
            const ethAmount =   web3.utils.fromWei(transaction.value);
            rows.push(createData(transaction.receipt.to, '', transaction.comment, this.formatedDate(transaction.timestamp * 1000), ethAmount))
          });
          this.setState({rows});
        }
      });
    } catch (error) {
      // Catch any errors for any of the above operations.
      console.log(error);
    }
  };

  formatedDate(timestamp) {
    const today = new Date(timestamp).toLocaleDateString(undefined, {
      day : 'numeric',
      month : 'short',
    });
    return today;
  }

  render() {
    const { classes } = this.props;

    return (
      <Paper className={classes.root}>
        <Table className={classes.table}>
          <TableBody>
            {this.state.rows.map(row => {
              return (
                <TableRow key={row.rowId}>
                  <TableCell>
                    {/*<Avatar alt={row.name} src={row.avatarURL} >{initials(row.name)}</Avatar>*/}
                    <Jazzicon diameter={50} seed={jsNumberForAddress(row.identifier)} />
                  </TableCell>
                  <CustomTableCell className={classes.fade}>{condenseAddress(row.identifier)}</CustomTableCell>
                  <CustomTableCell>{row.comment}</CustomTableCell>
                  <CustomTableCell className={classes.noWrap}>{row.date}</CustomTableCell>
                  <CustomTableCell className={classes.noWrap} numeric>{row.value} Eth</CustomTableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    );
  }
}




SimpleTable.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(SimpleTable);
