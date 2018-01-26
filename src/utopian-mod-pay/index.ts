import Moderator from '../server/models/moderator.model';
import User from '../server/models/user.model';
import Post from '../server/models/post.model';
import steemAPI from '../server/steemAPI';
import config from '../config/config';
import * as mongoose from 'mongoose';
import * as sc2 from '../server/sc2';
import { Account } from './account';
import * as assert from 'assert';

const TEST = process.env.TEST === 'false' ? false : true;
const DO_UPVOTE = process.env.DO_UPVOTE === 'false' ? false : true;
let POSTER_TOKEN = process.env.POSTER_TOKEN;
let UTOPIAN_TOKEN = process.env.UTOPIAN_TOKEN;
let UTOPIAN_ACCOUNT: string;

// Point value is in relation to 1 SBD
const POST_MODERATION_THRESHOLD = 1;
const POINT_VALUE = 0.5;
const MAX_POINTS = 130;

// Earnings multiplier
const CATEGORY_VALUE: { [key: string]: CategoryValue } = {
  ideas: {
    reviewed: 1.5,
    flagged: 1.5
  },
  development: {
    reviewed: 3,
    flagged: 3
  },
  translations: {
    reviewed: 3.5,
    flagged: 3.5
  },
  graphics: {
    reviewed: 2,
    flagged: 2
  },
  documentation: {
    reviewed: 2,
    flagged: 2
  },
  copywriting: {
    reviewed: 2,
    flagged: 2
  },
  tutorials: {
    reviewed: 3,
    flagged: 3
  },
  analysis: {
    reviewed: 2,
    flagged: 2
  },
  social: {
    reviewed: 1,
    flagged: 1
  },
  blog: {
    reviewed: 2,
    flagged: 2
  },
  'video-tutorials': {
    reviewed: 3,
    flagged: 3
  },
  'bug-hunting': {
    reviewed: 2,
    flagged: 2
  },
  'task-ideas': {
    reviewed: 1,
    flagged: 2
  },
  'task-development': {
    reviewed: 1,
    flagged: 2
  },
  'task-bug-hunting': {
    reviewed: 1,
    flagged: 1
  },
  'task-translations': {
    reviewed: 1,
    flagged: 1
  },
  'task-graphics': {
    reviewed: 1,
    flagged: 1
  },
  'task-documentation': {
    reviewed: 1,
    flagged: 1
  },
  'task-analysis': {
    reviewed: 1,
    flagged: 1
  },
  'task-social': {
    reviewed: 1,
    flagged: 1
  }
};

interface CategoryValue {
  reviewed: number;
  flagged: number;
}

interface ModeratorStats {
  categories: { [key: string]: CategoryValue };
  totalReviewed: number;
  totalFlagged: number;
  comment: string;
  moderator: any; // moderator model
}

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo, {
  useMongoClient: true
});

const conn = mongoose.connection;
conn.once('open', async () => {
  try {
    POSTER_TOKEN = (await sc2.getToken(POSTER_TOKEN as any, true)).access_token;
    UTOPIAN_TOKEN = (await sc2.getToken(UTOPIAN_TOKEN as any, true)).access_token;

    const utopian = await sc2.send('/me', {
      token: UTOPIAN_TOKEN
    });
    UTOPIAN_ACCOUNT = utopian.name;
    if (!TEST && DO_UPVOTE) {
      const acc = new Account(utopian);
      const power = acc.getRecoveredPower();
      if (power < 9900) {
        throw new Error('Not enough power, currently at ' + power);
      }
    }

    // Run the payment script
    await run();
  } catch(e) {
    console.log('Error running pay script', e);
  }
  conn.close();
});

async function run() {
  const globalData: { [key: string]: ModeratorStats } = {};

  { // Process moderators
    const moderators: any[] = await Moderator.list();
    const date = new Date(Date.now() - (1000 * 60 * 60 * 24 * 7));
    for (const mod of moderators) {
      try {
        const data = await processMod(mod, date);
        if (data) {
          globalData[mod.account] = data;
        }
      } catch (e) {
        console.log('Error handling moderator', mod.account, e);
      }
    }
  }

  let mainPost;
  { // Generate global post
    const totalReviewed: number = Object.keys(globalData).reduce((prev, cur) => {
      return typeof(prev) === 'number'
              ? prev + globalData[cur].totalReviewed
              : globalData[prev].totalReviewed + globalData[cur].totalReviewed as any;
    }) as any;
    const totalFlagged: number = Object.keys(globalData).reduce((prev, cur) => {
      return typeof(prev) === 'number'
              ? prev + globalData[cur].totalFlagged
              : globalData[prev].totalFlagged + globalData[cur].totalFlagged as any;
    }) as any;

    mainPost =
`\
![utopian-post-banner.png](https://res.cloudinary.com/hpiynhbhq/image/upload/v1516449865/t0gmipslwoa6htmribn7.png)\

This is an automated weekly reward post for moderators from @utopian-io. Each \
comment is generated for the moderator and receives an upvote as reward for \
contributions to Utopian.\

In total for this week, there were ${totalReviewed} posts reviewed and \
${totalFlagged} posts flagged. ${(totalReviewed / (totalFlagged + totalReviewed) * 100).toFixed(0)}% \
of the total amount of posts were accepted by moderators.
`;

    const cats: { [key: string]: CategoryValue } = {};
    for (const key in globalData) {
      const mod = globalData[key];
      for (const catKey in mod.categories) {
        let cat = cats[catKey];
        if (!cats[catKey]) {
          cat = cats[catKey] = {
            reviewed: 0,
            flagged: 0
          };
        }
        cat.reviewed += mod.categories[catKey].reviewed;
        cat.flagged += mod.categories[catKey].flagged;
      }
    }

    for (const key in cats) {
      mainPost +=
`
### ${formatCat(key)} Category
- ${cats[key].reviewed} post${cats[key].reviewed === 1 ? '' : 's'} reviewed
- ${cats[key].flagged} post${cats[key].flagged === 1 ? '' : 's'} flagged
`;
    }
  }

  { // Calculate rewards
    // Calculate raw rewards without the bound cap applied
    const rawPoints: { [key: string]: number } = {};
    for (const modKey in globalData) {
      const stat = globalData[modKey];

      let referrer: ModeratorStats|undefined = globalData[stat.moderator.referrer];
      if (referrer && (stat.moderator.supermoderator === true
                        || referrer.moderator.supermoderator !== true)) {
        referrer = undefined;
      }

      let totalPoints = rawPoints[modKey] || 0;
      for (const catKey in stat.categories) {
        assert(CATEGORY_VALUE[catKey], 'category ' + catKey + ' is missing from the reward registry');
        const cat = stat.categories[catKey];
        const reviewedPoints = cat.reviewed * CATEGORY_VALUE[catKey].reviewed * POINT_VALUE;
        const flaggedPoints = cat.flagged * CATEGORY_VALUE[catKey].flagged * POINT_VALUE;
        totalPoints += reviewedPoints + flaggedPoints;
        if (referrer) {
          let reffererPoints = rawPoints[stat.moderator.referrer] || 0;
          rawPoints[stat.moderator.referrer] = reviewedPoints + flaggedPoints;
        }
      }

      if (stat.moderator.supermoderator === true) {
        // Supervisors receive a 20% bonus
        totalPoints *= 1.20;
      }

      if (stat.totalReviewed + stat.totalFlagged >= POST_MODERATION_THRESHOLD) {
        rawPoints[modKey] = totalPoints;
      }
    }

    // Normalize the rewards
    for (const modReward in rawPoints) {
      rawPoints[modReward] = Math.min(rawPoints[modReward], MAX_POINTS);
    }

    { // It's show time!
      const account = await Account.get(UTOPIAN_ACCOUNT);

      {
        const payout = await account.estimatePayout(10000);
        console.log('Estimated current 100% vote is worth $' + payout + ' SBD');

        const est = await account.estimateWeight(payout);
        console.log('Estimated weight value for $' + payout + ' SBD is ' + est);
      }

      const author = (await sc2.send('/me', {
        token: POSTER_TOKEN
      })).name;
      const date = new Date();
      const dateString = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
      const title = 'Utopian Moderator Payout - ' + dateString;
      const permlink = 'utopian-pay-' + dateString.replace(/\//g, '-');

      const operations = [
        ['comment',
          {
            parent_author: '',
            parent_permlink: TEST ? 'testcategory' : 'utopian-mods',
            author,
            permlink,
            title,
            body: mainPost,
            json_metadata : JSON.stringify({})
          }
        ],
        [
          'comment_options',
          {
            author,
            permlink,
            allow_curation_rewards: false,
            allow_votes: true,
            max_accepted_payout: '0.000 SBD',
            percent_steem_dollars : 10000,
          }
        ]
      ];

      console.log('BROADCASTING MAIN POST:', operations);
      if (!TEST) {
        await sc2.send('/broadcast', {
          token: POSTER_TOKEN,
          data: {
            operations
          }
        });
      }


      for (const modKey in globalData) {
        if (!rawPoints[modKey]) {
          continue;
        }
        const operations = [
          [
            'comment',
            {
              parent_author: author,
              parent_permlink: permlink,
              author: modKey,
              permlink,
              title,
              body: globalData[modKey].comment,
              json_metadata: JSON.stringify({}),
            }
          ],
          [
            'comment_options',
            {
              author: modKey,
              permlink,
              allow_curation_rewards: false,
              allow_votes: true,
              percent_steem_dollars: 10000,
              max_accepted_payout: '1000000.000 SBD',
              extensions: [[0, {
                beneficiaries: [
                  {
                    account: 'utopian.pay',
                    weight: 2500
                  }
                ]
              }]]
            }
          ]
        ];
        console.log('BROADCASTING MODERATOR COMMENT\n' + operations);
        if (!TEST) {
          const user = await User.get(modKey);
          await sc2.send('/broadcast', {
            user,
            data: {
              operations
            }
          });
        }

        const weight = account.estimateWeight(rawPoints[modKey]);
        console.log('BROADCASTING UPVOTE FOR $' + rawPoints[modKey] + ' SBD (weight: ' + weight + ')');
        if (!TEST && DO_UPVOTE) {
          await sc2.send('/broadcast', {
            token: UTOPIAN_TOKEN,
            data: {
              operations: [[
                'vote',
                {
                  author: modKey,
                  permlink,
                  weight
                }
              ]]
            }
          });
        }

      }
    }
  }
}

async function processMod(mod: any, date: Date): Promise<ModeratorStats|undefined> {
  const posts: any[] = await Post.find({
    'json_metadata.moderator.account': mod.account,
    'created': {
      $gte: date.toISOString()
    }
  });

  const cats = processModCategories(posts);
  const total = posts.length;
  let totalReviewed = 0;
  let totalFlagged = 0;
  if (!total) {
    return;
  }

  let comment =
`
In total for this week, I have moderated ${total} post${total === 1 ? '' : 's'} \
on Utopian. Overall, I moderated a total of ${mod.total_moderated} posts.
`;

  for (const key of Object.keys(cats)) {
    const val = cats[key];
    const count = val.reviewed + val.flagged;

    totalReviewed += val.reviewed;
    totalFlagged += val.flagged;

    comment +=
`
### ${formatCat(key)} Category
- ${val.reviewed} post${val.reviewed === 1 ? '' : 's'} reviewed
- ${val.flagged} post${val.flagged === 1 ? '' : 's'} flagged
`;
  }

  return {
    moderator: mod,
    categories: cats,
    totalReviewed,
    totalFlagged,
    comment
  };
}

function processModCategories(posts: any[]): { [key: string]: CategoryValue } {
  const cats: { [key: string]: CategoryValue } = {};
  for (const post of posts) {
    const type = post.json_metadata.type;
    if (!cats[type]) {
      cats[type] = {
        reviewed: 0,
        flagged: 0
      };
    }
    const data = post.json_metadata.moderator;
    if (data.reviewed) {
      cats[type].reviewed++;
    } else if (data.flagged) {
      cats[type].flagged++;
    }
  }
  return cats;
}

function formatCat(cat: string): string {
  return cat.replace('-', ' ').replace(/\w\S*/g, (str) => {
    return str.charAt(0).toUpperCase() + str.substring(1);
  });
}
