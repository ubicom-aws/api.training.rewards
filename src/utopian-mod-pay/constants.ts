export interface CategoryValue {
  reviewed: number;
  flagged: number;
}

// Point value is in relation to 1 SBD
export const POST_MODERATION_THRESHOLD = 1;
export const POINT_VALUE = 1;
export const MAX_POINTS = 150;

// Earnings multiplier
export const CATEGORY_VALUE: { [key: string]: CategoryValue } = {
  ideas: {
    reviewed: 0.75,
    flagged: 0.75
  },
  development: {
    reviewed: 2,
    flagged: 2
  },
  translations: {
    reviewed: 1.25,
    flagged: 1.25
  },
  graphics: {
    reviewed: 1,
    flagged: 1
  },
  documentation: {
    reviewed: 0.75,
    flagged: 0.75
  },
  copywriting: {
    reviewed: 0.75,
    flagged: 0.75
  },
  tutorials: {
    reviewed: 1,
    flagged: 1
  },
  analysis: {
    reviewed: 1.25,
    flagged: 1.25
  },
  social: {
    reviewed: 1,
    flagged: 1
  },
  blog: {
    reviewed: 0.75,
    flagged: 0.75
  },
  'video-tutorials': {
    reviewed: 1.25,
    flagged: 1.25
  },
  'bug-hunting': {
    reviewed: 1,
    flagged: 1
  },
  'task-ideas': {
    reviewed: 0.50,
    flagged: 0.50
  },
  'task-development': {
    reviewed: 0.50,
    flagged: 0.50
  },
  'task-bug-hunting': {
    reviewed: 0.50,
    flagged: 0.50
  },
  'task-translations': {
    reviewed: 0.50,
    flagged: 0.50
  },
  'task-graphics': {
    reviewed: 0.50,
    flagged: 0.50
  },
  'task-documentation': {
    reviewed: 0.50,
    flagged: 0.50
  },
  'task-analysis': {
    reviewed: 0.50,
    flagged: 0.50
  },
  'task-social': {
    reviewed: 0.50,
    flagged: 0.50
  }
};
