import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import * as R from 'ramda';
import Sponsor from './server/models/sponsor.model';
import Stats from './server/models/stats.model';
import config from './config/config';
import steemAPI, { formatter, broadcast } from './server/steemAPI';
import { calculatePayout } from './server/steemitHelpers';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);
const conn = mongoose.connection;

conn.once('open', async function() {
    const dynamicProps = await getProps();

    Stats.get()
        .then(stats => {
            // @TODO should be used to increment the stats based on last check, instead then rechecking from the start
            const lastCheck = stats.stats_sponsors_shares_last_check;
            const paidRewardsDate = '1969-12-31T23:59:59';
            const now = new Date().toISOString();
            const dedicatedPercentageSponsors = 20;

            Sponsor.listAll()
                .then(sponsors => {
                    if (sponsors.length > 0) {
                        let total_vesting_shares = 0;

                        sponsors.forEach(sponsor => total_vesting_shares = total_vesting_shares + sponsor.vesting_shares);

                        sponsors.forEach((sponsor, sponsorsIndex) => {
                            setTimeout(function(){
                                steemAPI.getVestingDelegations(sponsor.account, -1, 1000, function(err, delegations) {
                                    const isDelegating = R.find(R.propEq('delegatee', 'utopian-io'))(delegations);
                                    let currentVestingShares = isDelegating ? parseInt(isDelegating.vesting_shares) : 0;
                                    let delegationDate = isDelegating ? isDelegating.min_delegation_time : new Date().toISOString();

                                    steemAPI.getWitnessByAccount(sponsor.account, function(witnessErr, witnessRes) {
                                        const isWitness = witnessRes && witnessRes.owner ? true : false;
                                        const percentageTotalShares = (currentVestingShares / total_vesting_shares) * 100;

                                        if (currentVestingShares > 0) {
                                            //const delegationDate = isDelegating.min_delegation_time;
                                            const query = {
                                                created:
                                                    {
                                                        $gte: delegationDate
                                                    },
                                                cashout_time:
                                                    {
                                                        $eq: paidRewardsDate
                                                    }
                                            };

                                            sponsor.vesting_shares = currentVestingShares;
                                            sponsor.percentage_total_vesting_shares = percentageTotalShares;
                                            sponsor.is_witness = isWitness;

                                            const delegatedSP = formatter.vestToSteem(currentVestingShares, dynamicProps.total_vesting_shares, dynamicProps.total_vesting_fund_steem);

                                            if (delegatedSP >= 25000) sponsor.level = 'Gold';
                                            if (delegatedSP >= 200000) sponsor.level = 'Platinum';

                                            sponsor.save(savedSponsor => {
                                                if ((sponsorsIndex + 1) === sponsors.length) {
                                                    stats.stats_sponsors_shares_last_check = now;
                                                    stats.save().then(() => {
                                                        conn.close();
                                                        process.exit(0);
                                                    });
                                                }
                                            });
                                        } else {
                                            sponsor.vesting_shares = 0;
                                            sponsor.percentage_total_vesting_shares = 0;
                                            sponsor.is_witness = isWitness;
                                            sponsor.level = 'Standard';

                                            sponsor.save(savedSponsor => {
                                                if ((sponsorsIndex + 1) === sponsors.length) {
                                                    stats.stats_sponsors_shares_last_check = now;
                                                    stats.save().then(() => {
                                                        conn.close();
                                                        process.exit(0);
                                                    });
                                                }
                                            });
                                        }
                                    });
                                });
                            }, sponsorsIndex * 3000);
                        })
                    }
                });
        }).catch(e => {
        console.log("ERROR STATS", e);
        conn.close();
        process.exit(0);
    });
});

async function getProps(): Promise<void> {
    return new Promise((resolve, reject) => {
        steemAPI.getDynamicGlobalProperties(function(err, result) {
            if (!err) {
                resolve({
                    total_vesting_shares: result.total_vesting_shares,
                    total_vesting_fund_steem: result.total_vesting_fund_steem,
                })
            }
            reject();
        })
    });
}