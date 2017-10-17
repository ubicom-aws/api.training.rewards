import Sponsor from '../models/sponsor.model';
import steemAPI from '../steemAPI';

function list(req, res, next) {
  Sponsor.list()
    .then(sponsors => res.json({
      total: sponsors.length,
      results: sponsors
    }))
    .catch(e => next(e));
}

function create(req, res, next) {
  const account = req.body.account;
  console.log("ACCOUNT", account)

  steemAPI.getAccounts([account], (err, accounts) => {
    if (!err) {
      if (accounts && accounts.length === 1) {
        const json_metadata = JSON.parse(accounts[0].json_metadata);

        const newSponsor = new Sponsor({
          account: accounts[0].name,
          json_metadata,
          vesting_shares: 0
        });

        newSponsor.save()
          .then(savedSponsor => res.json(savedSponsor))
          .catch(e => {
            res.status(500).json({
              message: 'Cannot save the sponsor. Please try again later.'
            });
            next(e);
          });
      } else {
        res.status(404).json({
          message: 'Cannot find this account. Please make sure you wrote it correctly'
        });
      }
    } else {
      res.status(500).json({
        message: 'Something went wrong. Please try again later!' + err
      });
    }
  });
}

export default { create, list };
