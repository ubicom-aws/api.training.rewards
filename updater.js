import Post from './server/models/post.model';
import config from './config/config';

const steem = require('steem');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  // updating only posts created in last 15 days
  const query = {
    created:
      {
        $gte: new Date((new Date().getTime() - (15 * 24 * 60 * 60 * 1000)))
      }
  };

  Post
    .countAll({ query })
    .then(count => {
      if (count === 0) {
        console.log(`NO POSTS TO UPDATE. ENDED.`);
        return;
      } else {
        console.log(`${count} ACTIVE POSTS. CHECKING AND UPDATING`);
      }

      Post
        .list({ skip: 0, limit: count, query })
        .then(posts => {
          if(posts.length > 0) {
            posts.forEach((post, index) => {
              steem.api.getContent(post.author, post.permlink, (err, updatedPost) => {
                if (!err) {
                  console.log(`---- NOW CHECKING POST ${post.permlink} by ${post.author} ----\n`);

                  updatedPost['json_metadata'] = JSON.parse(updatedPost['json_metadata']);

                  for (var prop in updatedPost) {
                      if (updatedPost[prop] !== post[prop]) {
                      post[prop] = updatedPost[prop];
                      console.log(`UPDATED PROP ${prop} was ${JSON.stringify(post[prop])} now is ${JSON.stringify(updatedPost[prop])}\n`);
                    }
                  }

                  post.save()
                    .then(() => console.log(`POST UPDATED SUCCESSFULLY\n`))
                    .catch(e => {
                      console.log(`ERROR UPDATING POST ${e}\n`);
                      next(e);
                    })
                    .finally(() => {
                      if ((index + 1) === count) {
                        process.exit(0);
                      }
                    })
                } else {
                  console.log(`CANNOT RETRIEVE POST - STEEM ERROR ${err}\n`);
                  if ((index + 1) === count) {
                    process.exit(0);
                  }
                }

              });
            });
          }
        })
        .catch(e => console.log(`CANNOT RETRIEVE POSTS FROM MONGO ${e}\n`));
    })
    .catch(e => console.log(`CANNOT COUNT ACTIVE POSTS IN MONGO ${e}\n`));
});
