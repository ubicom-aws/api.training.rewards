import * as mongoose from 'mongoose';
import Post from './server/models/post.model';
import config from './config/config';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);
const conn = mongoose.connection;

conn.once('open', async function() {
  // get all the posts pending since one 1 hour
  const pendingSince = new Date((new Date().getTime() - (1 * 60 * 60 * 1000)));
  const editableMaxTime = new Date((new Date().getTime() - (7 * 24 * 60 * 60 * 1000)));

  const query = {
    'json_metadata.moderator.pending': true,
    'json_metadata.moderator.time': {
      $lte: pendingSince.toISOString()
    },
    created: {
      $gte: editableMaxTime.toISOString()
    }
  };

  const find = Post.find(query);
  const c = find.cursor({ batchSize: 1 });
  console.log(`Found ${await find.count()} posts to check`);
  let index = 0;
  let post;
  while ((post = await c.next()) !== null) {
    await processPost(post, ++index);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log("DONE");
  conn.close();
});

async function processPost(post: any, index: number): Promise<void> {
  console.log(`----NOW CHECKING POST ${post.permlink} by ${post.author} (post number: ${index})----\n`);
  try {
    post.json_metadata.moderator = {};
    post.pending = false;
    post.reviewed = false;
    post.flagged = false;
    post.moderator = undefined;

    post.markModified('json_metadata.moderator');
    post.markModified('pending');
    post.markModified('reviewed');
    post.markModified('flagged');
    post.markModified('moderator');

    try {
      await post.save();
      console.log(`POST UPDATED SUCCESSFULLY\n`);
    } catch (e) {
      console.log(`ERROR UPDATING POST ${e}\n`);
    }
  } catch (err) {
    console.log(`CANNOT RETRIEVE POST - STEEM ERROR ${err}\n`);
  }
}
