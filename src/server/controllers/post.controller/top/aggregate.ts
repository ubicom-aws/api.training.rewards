export function aggregateMatch(startDate: Date|undefined, endDate: Date) {
  const matcher: any = {
    $match: {
      'json_metadata.repository.full_name': { $ne: null },
      'created': {
        $lt: endDate.toISOString()
      },
      'flagged': false
    }
  };
  if (startDate) {
    matcher.$match.created.$gte = startDate.toISOString();
  }
  return matcher;
}

export function aggregateGroup(addToSet?: any) {
  if (!addToSet) {
    addToSet = {};
  }

  let group: any = {
    _id: '$json_metadata.repository.full_name',
    count: { $sum: 1 },
    posts: {
      $addToSet: {
        'created': '$created',
        ...addToSet
      }
    }
  };

  return [
    { $group: group },
    { $sort: { count: -1 } }
  ];
}
