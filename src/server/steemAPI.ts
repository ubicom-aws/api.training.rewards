import * as steem from 'steem';
import config from '../config/config';

steem.api.setOptions({ url: config.steemNode });

export function getContent(author: string, permlink: string): Promise<any> {
  return new Promise((resolve, reject) => {
    steem.api.getContent(author, permlink, (e, p) => {
      if (e) return reject(e);
      resolve(p);
    });
  });
}

export const formatter = steem.formatter;
export const broadcast = steem.broadcast;

export default steem.api;
