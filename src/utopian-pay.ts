import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import Sponsor from './server/models/sponsor.model';
import Moderator from './server/models/moderator.model';
import Stats from './server/models/stats.model';
import config from './config/config';
import * as steem from 'steem';

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

            let totalVests = 0;

            const getHistory = (from, callback) => {
                steem.api.getAccountHistory(payAccount, from, limit, function(err, result) {
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

                    steem.api.getDynamicGlobalProperties(function(err, props) {
                        if (err) {
                            console.log("FAILED TO RETRIEVE STEEM VALUE");
                            conn.close();
                            process.exit();
                        }

                        const totalSteem = steem.formatter.vestToSteem(totalVests, props.total_vesting_shares, props.total_vesting_fund_steem);
                        let totalPaidSponsors = 0;
                        let totalPaidModerators = 0;
                        let supervisors = {};

                        console.log("TOTAL STEEM CALCULATED FROM VESTS", totalSteem);

                        const paySponsors = (done) => {
                            Sponsor.listBeneficiaries()
                                .then(sponsors => {
                                    sponsors.forEach((sponsor, sponsorIndex) => {
                                        const sponsorShares = sponsor.percentage_total_vesting_shares;
                                        const sponsorPercent = sponsorShares * percentSponsors / 100;
                                        const sponsorPayout = (sponsorPercent * totalSteem / 100) > 0.001 ? (sponsorPercent * totalSteem / 100) : 0.001;

                                        const finalSponsorPayout = `${sponsorPayout.toFixed(3)} STEEM`;
                                        const memoSponsor = `Hello ${sponsor.account}, here your weekly payout as a Sponsor.`;

                                        totalPaidSponsors = totalPaidSponsors + sponsorPayout;

                                        console.log(`> $$ PAYOUT SPONSOR ${sponsor.account}: ${finalSponsorPayout}`);

                                        if (!TEST) {
                                            setTimeout(function() {
                                                steem.broadcast.transfer(WIF, payAccount, sponsor.account, finalSponsorPayout, memoSponsor, function(err, result) {
                                                    if (err) {
                                                        console.log("!----------COULD NOT PAY SPONSOR----------!", sponsor.account);
                                                        console.log(err);
                                                        return;
                                                    }

                                                    console.log(`>-- $$ PAID SPONSOR ${sponsor.account}: ${finalSponsorPayout}`);

                                                    if (sponsorIndex + 1 === sponsors.length) {
                                                        console.log("-------------------------------------");
                                                        console.log("SPONSORS PAID SUCCESSFULLY: ", totalPaidSponsors);
                                                        console.log("-------------------------------------");

                                                        done();
                                                    }
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
                        const payModerators = (done) => {
                            Moderator.listBeneficiaries()
                                .then(moderators => {
                                    moderators.forEach((moderator, moderatorIndex) => {
                                        const moderatorShares = moderator.percentage_total_rewards_moderators;
                                        const moderatorPercent = moderatorShares * percentModerators / 100;
                                        const moderatorPayout = (moderatorPercent * totalSteem / 100) >= 0.001 ? (moderatorPercent * totalSteem / 100) : 0.001;

                                        const finalModeratorPayout = `${moderatorPayout.toFixed(3)} STEEM`;
                                        const memoModerator = `Hello ${moderator.account}, here your weekly payout as a Moderator.`;

                                        totalPaidModerators = totalPaidModerators + moderatorPayout;

                                        console.log(`> $$ PAYOUT MODERATOR ${moderator.account}: ${finalModeratorPayout}`);

                                        // every moderator has a supervisor
                                        // supervisors get 20% of the shares of their own moderators
                                        // these shares are not removed by the moderator but paid by the system
                                        if (moderator.referrer) {
                                            const currentSupervisorsShares = supervisors[moderator.referrer] ? supervisors[moderator.referrer] : 0;
                                            supervisors[moderator.referrer] = currentSupervisorsShares + moderatorShares;
                                        }

                                        if (!TEST) {
                                            setTimeout(function() {
                                                steem.broadcast.transfer(WIF, payAccount, moderator.account, finalModeratorPayout, memoModerator, function(err, result) {
                                                    if (err) {
                                                        console.log("!----------COULD NOT PAY MODERATOR----------!", moderator.account);
                                                        console.log(err);
                                                        return;
                                                    }

                                                    console.log(`>-- $$ PAID MODERATOR ${moderator.account}: ${finalModeratorPayout}`);

                                                    if (moderatorIndex + 1 === moderators.length) {
                                                        console.log("-------------------------------------");
                                                        console.log("MODERATORS PAID SUCCESSFULLY: ", totalPaidModerators);
                                                        console.log("-------------------------------------");

                                                        done();
                                                    }
                                                });
                                            }, 30000 * moderatorIndex);
                                        }

                                        if (TEST && moderatorIndex + 1 === moderators.length) {
                                            console.log("-------------------------------------");
                                            console.log("MODERATORS PAID SUCCESSFULLY: ", totalPaidModerators);
                                            console.log("-------------------------------------");

                                            done();
                                        }
                                    });
                                }).catch(e => {
                                console.log("FAILED TO RETRIEVE MODERATORS", e);
                                conn.close();
                                process.exit();
                            });
                        };
                        const paySupervisors = () => {
                            let totalPaidSupervisors = 0;
                            let supervisorsCount = Object.keys(supervisors).length;
                            let supervisorsIndex = 0;

                            for(var supervisor in supervisors) {
                                const modsShares = supervisors[supervisor];
                                const supervisorShares = 20 * modsShares / 100;
                                const supervisorPercent = supervisorShares * percentModerators / 100;
                                const supervisorPayout = (supervisorPercent * totalSteem / 100) >= 0.001 ? (supervisorPercent * totalSteem / 100) : 0.001;
                                const finalSupervisorPayout = `${supervisorPayout.toFixed(3)} STEEM`;
                                const memoSupervisor = `Hello ${supervisor}, here your weekly payout as a Supervisor.`;

                                totalPaidSupervisors = totalPaidSupervisors + supervisorPayout;

                                console.log(`> $$ PAYOUT SUPERVISOR ${supervisor}: ${finalSupervisorPayout}`);

                                if (!TEST) {
                                    setTimeout(function() {
                                        steem.broadcast.transfer(WIF, payAccount, supervisor, finalSupervisorPayout, memoSupervisor, function(err, result) {
                                            if (err) {
                                                console.log("!----------COULD NOT PAY SUPERVISOR----------!", supervisor);
                                                console.log(err);
                                                return;
                                            }

                                            console.log(`>-- $$ PAID SUPERVISOR ${supervisor}: ${finalSupervisorPayout}`);

                                            if (supervisorsIndex + 1 === supervisorsCount) {
                                                console.log("-------------------------------------");
                                                console.log("SUPERVISORS PAID SUCCESSFULLY: ", totalPaidSupervisors);
                                                console.log("-------------------------------------");

                                                console.log("EVERYONE HAS BEEN PAID FOR THIS WEEK. SEE YOU NEXT WEEK!");
                                                conn.close();
                                                process.exit();
                                            }
                                        });
                                    }, 30000 * supervisorsIndex);
                                }

                                if (TEST && supervisorsIndex + 1 === supervisorsCount) {
                                    console.log("-------------------------------------");
                                    console.log("SUPERVISORS PAID SUCCESSFULLY: ", totalPaidSupervisors);
                                    console.log("-------------------------------------");

                                    console.log("EVERYONE HAS BEEN PAID FOR THIS WEEK. SEE YOU NEXT WEEK!");
                                    conn.close();
                                    process.exit();
                                }
                                supervisorsIndex++;
                            }
                        };

                        paySponsors(() => {
                            payModerators(() => {
                                paySupervisors();
                            });
                        });
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
