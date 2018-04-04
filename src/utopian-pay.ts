import steemAPI, { formatter, broadcast } from './server/steemAPI';
import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import Sponsor from './server/models/sponsor.model';
import Moderator from './server/models/moderator.model';
import Post from './server/models/post.model';
import Stats from './server/models/stats.model';
import config from './config/config';
import * as R from 'ramda';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
    Stats.get()
        .then(stats => {
            const payAccount = 'utopian.pay';
            const TEST = process.env.TEST === 'false' ? false : true;
            const WIF = process.env.WIF;
            const percentSponsors = 80;
            const percentModerators = 20;
            const fromStats = stats.last_limit_comment_benefactor;
            const limit = 100;
            const categoriesPoints = {
                ideas: 1.5,
                development: 3,
                'bug-hunting': 2,
                translations: 3.5,
                graphics: 2,
                documentation: 2,
                copywriting: 2,
                'video-tutorials': 3,
                tutorials: 3,
                analysis: 2,
                social: 1,
                'task-ideas': 1,
                'task-development': 1,
                'task-bug-hunting': 1,
                'task-translations': 1,
                'task-graphics': 1,
                'task-documentation': 1,
                'task-analysis': 1,
                'task-social': 1,
                blog: 2,
            };

            let totalVests = 0;

            const getHistory = (from, callback) => {
                steemAPI.getAccountHistory(payAccount, from, limit, function(err, result) {
                    if (err) {
                        console.log("FAILED TO RETRIEVE COMMENT BENEFACTOR REWARDS");
                        conn.close();
                        process.exit();
                    }
                    callback(result);
                });
            };
            const parseOperations = (from, done) => {
                const newLimit = from + limit;
                let lastParsedOperation = from;

                getHistory(newLimit, (results) => {
                    if (results.length && results[results.length - 1][0] > lastParsedOperation) {
                        results.forEach((result) => {
                            if (result[1] && result[1].op && result[1].op[0] === 'comment_benefactor_reward' && result[0] > from) {
                                const commentBenefactor = result[1].op[1];
                                const benefactorVests = parseFloat(commentBenefactor.reward.replace(' VESTS', ''));
                                console.log("NOW PARSING COMMENT BENEFACTOR", result[0]);

                                totalVests = totalVests + benefactorVests;
                            }
                            lastParsedOperation = result[0];
                        });
                        return parseOperations(lastParsedOperation, done);
                    }
                    return done(lastParsedOperation);
                });
            };

            console.log("STARTING BY LAST OPERATION PARSED", fromStats);

            parseOperations(fromStats, (lastParsedOperation) => {
                // saving the last parsed operation
                stats.last_limit_comment_benefactor = !TEST ? lastParsedOperation : fromStats;

                stats.save().then(() => {
                    console.log("SAVED LAST OPERATION PARSED", lastParsedOperation);
                    console.log("TOTAL VESTS CALCULATED", totalVests);

                    if (totalVests === 0) {
                        console.log("NOTHING TO PAY");
                        conn.close();
                        process.exit();
                    }

                    steemAPI.getDynamicGlobalProperties(function(err, props) {
                        if (err) {
                            console.log("FAILED TO RETRIEVE STEEM VALUE");
                            conn.close();
                            process.exit();
                        }

                        const totalSteem = formatter.vestToSteem(totalVests, props.total_vesting_shares, props.total_vesting_fund_steem);
                        let totalPaidSponsors = 0;
                        let totalPaidModerators = 0;
                        let supervisors = Array();

                        console.log("TOTAL STEEM CALCULATED FROM VESTS", totalSteem);

                        const paySponsors = (done) => {
                            Sponsor.listBeneficiaries()
                                .then(sponsors => {
                                    sponsors.forEach((sponsor, sponsorIndex) => {
                                        const sponsorShares = sponsor.percentage_total_vesting_shares;
                                        const sponsorPercent = sponsorShares * percentSponsors / 100;
                                        const sponsorPayout = (sponsorPercent * totalSteem / 100) > 0.001 ? (sponsorPercent * totalSteem / 100) : 0.001;

                                        const finalSponsorPayout = `${sponsorPayout.toFixed(3)} STEEM`;
                                        const memoSponsor = `Hello ${sponsor.account}, here is your weekly reward as a Sponsor.`;

                                        totalPaidSponsors = totalPaidSponsors + sponsorPayout;

                                        console.log(`> $$ PAYOUT SPONSOR ${sponsor.account}: ${finalSponsorPayout}`);

                                        if (!TEST) {
                                            setTimeout(function() {
                                                broadcast.transfer(WIF, payAccount, sponsor.account, finalSponsorPayout, memoSponsor, function(err, result) {
                                                    if (err) {
                                                        console.log("!----------COULD NOT PAY SPONSOR----------!", sponsor.account);
                                                        console.log(err);
                                                        return;
                                                    }

                                                    console.log(`>-- $$ PAID SPONSOR ${sponsor.account}: ${finalSponsorPayout}`);

                                                    sponsor.total_paid_rewards_steem = (sponsor.total_paid_rewards_steem || 0) + sponsorPayout;
                                                    sponsor.save().then(() => {
                                                        if (sponsorIndex + 1 === sponsors.length) {
                                                            console.log("-------------------------------------");
                                                            console.log("SPONSORS PAID SUCCESSFULLY: ", totalPaidSponsors);
                                                            console.log("-------------------------------------");

                                                            done();
                                                        }
                                                    });
                                                });
                                            }, 30000 * sponsorIndex);
                                        }

                                        if (TEST && sponsorIndex + 1 === sponsors.length) {
                                            console.log("-------------------------------------");
                                            console.log("SPONSORS PAID SUCCESSFULLY: ", totalPaidSponsors);
                                            console.log("-------------------------------------");

                                            done();
                                        }
                                    });
                                }).catch(e => {
                                console.log("FAILED TO RETRIEVE SPONSORS", e);
                                conn.close();
                                process.exit();
                            });
                        };

                        paySponsors(() => console.log("SPONSORS PAID"));
                    });
                }).catch(e => {
                    console.log("FAILED TO SAVE LAST PARSED OPERATION", e);
                    conn.close();
                    process.exit();
                });
            });
        }).catch(e => {
        console.log("ERROR STATS", e);
        conn.close();
        process.exit(0);
    });
});
