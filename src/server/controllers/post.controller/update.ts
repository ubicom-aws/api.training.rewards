import Post from '../../models/post.model';
import steem from '../../steemAPI';

export async function updatePost(author: string, permlink: string) {
  const post = await Post.get(author, permlink);
  const updatedPost = await new Promise((resolve, reject) => {
    steem.getContent(author, permlink, (e, p) => {
      if (e) {
        return reject(e);
      }
      resolve(p);
    });
  });

  Object.assign(post, updatedPost);
  await post.save();
}
