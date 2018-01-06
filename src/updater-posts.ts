import * as mongoose from 'mongoose';

import { getUpdatedPost } from './server/controllers/post.controller/update';
import Post from './server/models/post.model';
import Stats from './server/models/stats.model';
import config from './config/config';

mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
  Stats.get().then(stats => {
    const limit = 500;
    // get all the posts in the editable window (7 days + 1)
    const activeSince = new Date((new Date().getTime() - ((7 + 1) * 24 * 60 * 60 * 1000)));

    const query = {
      created:
          {
            $gte: activeSince.toISOString(),
          },
    };
    const updatePosts = (skip = 0) => {
      Post
          .list({ skip, limit, query })
          .then(posts => {

            if (!posts.length) {
              const now = new Date().toISOString();

              stats.stats_last_updated_posts = now;

              return stats.save().then(() => {
                console.log("DONE");
                conn.close();
                process.exit(0);
              });
            }

            if(posts.length > 0) {
              posts.forEach((post, indexPosts) => {
                setTimeout(async () => {
                  console.log(`----NOW CHECKING POST ${post.permlink} by ${post.author}----\n`);
                  try {
                    const updatedPost = await getUpdatedPost(post.author, post.permlink);
                    try {
                      await updatedPost.save();
                      console.log(`POST UPDATED SUCCESSFULLY\n`);
                    } catch (e) {
                      console.log(`ERROR UPDATING POST ${e}\n`);
                    }
                  } catch (err) {
                    console.log(`CANNOT RETRIEVE POST - STEEM ERROR ${err}\n`);
                  }
                  if (indexPosts + 1 === posts.length) {
                    console.log("----RECURSIVE OPERATION----", posts.length + skip);
                    updatePosts(posts.length + skip);
                  }
                }, 1000 * indexPosts);
              });
            }
          });
    };

    updatePosts();

  }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});
