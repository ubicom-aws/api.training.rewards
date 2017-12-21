import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import Moderator from './server/models/moderator.model';
import Stats from './server/models/stats.model';
import Post from './server/models/post.model';
import config from './config/config';
import * as R from 'ramda';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function () {
    Stats.get()
        .then(stats => {
            const lastPostDate = stats.stats_moderators_shares_last_post_date;
            let stats_total_moderated = stats.stats_total_moderated;
            const limit = 500;
            const query = {
                moderator: {
                    $exists: true
                },
                created: {
                    $gt: lastPostDate
                }
            };
            const sort = { created: 1 };
            let moderators = Array();

            Post.list({skip: 0, limit, query, sort }).then(posts => {
                if (!posts.length) {
                    console.log("NO POSTS");
                    conn.close();
                    process.exit(0);
                }
                posts.forEach((post, indexPosts) => {
                    const mod = R.find(R.propEq('account', post.moderator))(moderators);

                    stats_total_moderated = stats_total_moderated + 1;

                    if (mod) {
                        moderators = [
                            ...moderators.filter(moderator => moderator.account !== mod.account),
                            {
                                account: mod.account,
                                total_moderated: mod.total_moderated + 1
                            }
                        ]
                    } else {
                        moderators.push({
                            account: post.moderator,
                            total_moderated: 1,
                        })
                    }

                    if (indexPosts + 1 === posts.length) {
                        stats.stats_total_moderated = stats_total_moderated;
                        stats.stats_moderators_shares_last_post_date = post.created;
                        stats.stats_moderator_shares_last_check = new Date().toISOString();
                        stats.save();
                    }
                });

                moderators.forEach((mod, indexMods) => {
                    Moderator.get(mod.account).then(moderator => {
                        if (moderator) {
                            const total_moderated = moderator.total_moderated;
                            const current_total_moderated = total_moderated + mod.total_moderated;

                            moderator.total_moderated = current_total_moderated;
                            moderator.percentage_total_rewards_moderators = (current_total_moderated / stats_total_moderated) * 100;

                            moderator.save().then(() => {
                                if (indexMods + 1 === moderators.length) {
                                    console.log("DONE");
                                    conn.close();
                                    process.exit(0);
                                }
                            });
                        }
                    });
                });
            });
        }).catch(e => {
        console.log("ERROR STATS", e);
        conn.close();
        process.exit(0);
    });
});
