import Sponsor from './server/models/sponsor.model';

import config from './config/config';
import steemApi from './server/steemAPI';

import * as R from 'ramda';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  Sponsor.listAll()
    .then(sponsors => {
      if (sponsors.length > 0) {
        sponsors.forEach((sponsor, index) => {
          steemApi.getVestingDelegations(sponsor.account, -1, 1000, function(err, delegations) {
            const isDelegating = R.find(R.propEq('delegatee', 'utopian-io'))(delegations);

            if (isDelegating) {
              sponsor.vesting_shares = parseInt(isDelegating.vesting_shares);
            } else {
              sponsor.vesting_shares = 0;
            }
            sponsor.save().finally(() => {
              if ((index + 1) === sponsors.length) {
                process.exit(0);
              }
            });
          });
        })
      }
    });
});
