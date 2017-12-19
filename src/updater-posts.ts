import * as mongoose from 'mongoose';

import { getUpdatedPost } from './server/controllers/post.controller/update';
import Post from './server/models/post.model';
import Stats from './server/models/stats.model';
import steemApi from './server/steemAPI';
import config from './config/config';

mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
  Stats.get().then(stats => {
    // @TODO should be used to increment the stats based on last check, instead then rechecking from the start
    const lastCheck = stats.stats_last_updated_posts;
    const now = new Date().toISOString();
    // updating only posts created in last 7 days
    const activeSince = new Date((new Date().getTime() - (7 * 24 * 60 * 60 * 1000)));
    const query = {
      created:
        {
          $gte: activeSince.toISOString()
        }
    };

    Post
      .countAll({ query })
      .then(count => {
        if (count === 0) {
          console.log(`NO POSTS TO UPDATE. ENDED.`);
          process.exit(0);
        } else {
          console.log(`${count} ACTIVE POSTS. CHECKING AND UPDATING`);
        }

        Post
          .list({ skip: 0, limit: count, query })
          .then(posts => {
            if(posts.length > 0) {
              posts.forEach((post, index) => {
                setTimeout(async function() {
                  try {
                    const updatedPost = await getUpdatedPost(post.author, post.permlink);
                    console.log(`---- NOW CHECKING POST ${post.permlink} by ${post.author} ----\n`);
                      post.save()
                        .then(() => console.log(`POST UPDATED SUCCESSFULLY\n`))
                        .catch(e => {
                          console.log(`ERROR UPDATING POST ${e}\n`);
                        })
                        .finally(() => {
                          if ((index + 1) === count) {
                            conn.close();
                            process.exit(0);
                          }
                        });
                  } catch (err) {
                    console.log(`CANNOT RETRIEVE POST - STEEM ERROR ${err}\n`);
                    if ((index + 1) === count) {
                      stats.stats_last_updated_posts = now;

                      stats.save().then(savedStats => {
                        conn.close();
                        process.exit(0);
                      });
                    }
                  }
                }, index * 3000);
              });
            }
          })
          .catch(e => console.log(`CANNOT RETRIEVE POSTS FROM MONGO ${e}\n`));
      })
      .catch(e => console.log(`CANNOT COUNT ACTIVE POSTS IN MONGO ${e}\n`));
  }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});
