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
    const limit = 500;
    // get all the posts in the editable window (7 days + 1)
    const activeSince = new Date((new Date().getTime() - ((7 + 1) * 24 * 60 * 60 * 1000)));
    const query = {
      created:
          {
            $gte: activeSince.toISOString()
          }
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
                setTimeout(() => {
                  steemApi.getContent(post.author, post.permlink, (err, updatedPost) => {
                    console.log(`----NOW CHECKING POST ${post.permlink} by ${post.author}----\n`);

                    if (err) {
                      console.log(`CANNOT RETRIEVE POST - STEEM ERROR ${err}\n`);

                      if (indexPosts + 1 === posts.length) {
                        console.log("----RECURSIVE OPERATION----", posts.length + skip);
                        updatePosts(posts.length + skip);
                      }
                    }

                    if (!err) {
                      updatedPost.json_metadata = JSON.parse(updatedPost.json_metadata);

                      // @UTOPIAN @TODO bad patches. Needs to have a specific place where the put the utopian data so it does not get overwritten
                      if (!updatedPost.json_metadata.type && post.json_metadata.type) {
                        updatedPost.json_metadata.type = post.json_metadata.type;
                      }
                      if (updatedPost.json_metadata.app !== 'utopian/1.0.0') updatedPost.json_metadata.app = 'utopian/1.0.0';
                      if (updatedPost.json_metadata.community !== 'utopian') updatedPost.json_metadata.community = 'utopian';
                      // making sure the repository does not get deleted
                      if (!updatedPost.json_metadata.repository) updatedPost.json_metadata.repository = post.json_metadata.repository;
                      if (!updatedPost.json_metadata.platform) updatedPost.json_metadata.platform = post.json_metadata.platform;
                      if (!updatedPost.json_metadata.pullRequests && post.json_metadata.pullRequests) updatedPost.json_metadata.pullRequests = post.json_metadata.pullRequests;

                      updatedPost.json_metadata.type = updatedPost.json_metadata.type.replace("announcement-", "task-");

                      for (var prop in updatedPost) {
                        if (updatedPost[prop] !== post[prop]) {
                          post[prop] = updatedPost[prop];
                          //console.log(`UPDATED PROP ${prop} was ${JSON.stringify(post[prop])} now is ${JSON.stringify(updatedPost[prop])}\n`);
                        }
                      }

                      post.save().then(() => {
                        console.log(`POST UPDATED SUCCESSFULLY\n`);

                        if (indexPosts + 1 === posts.length) {
                          console.log("----RECURSIVE OPERATION----", posts.length + skip);
                          updatePosts(posts.length + skip);
                        }
                      }).catch(e => {
                        console.log(`ERROR UPDATING POST ${e}\n`);
                        if (indexPosts + 1 === posts.length) {
                          console.log("----RECURSIVE OPERATION----", posts.length + skip);
                          updatePosts(posts.length + skip);
                        }
                      });
                    }
                  });
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
