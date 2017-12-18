export function aggregateMatch(startDate: Date, endDate: Date) {
  return {
    $match: {
      'json_metadata.repository.full_name': { $ne: null },
      'created': {
        $gte: startDate.toISOString(),
        $lt: endDate.toISOString()
      },
      'flagged': false
    }
  };
}

export function aggregateGroup(addToSet?: any) {
  let group: any = {
    _id: '$json_metadata.repository.full_name',
    count: { $sum: 1 },
  };

  if (addToSet) {
    group = {
      ...group,
      posts: {
        $addToSet: addToSet
      }
    };
  }
  return [
    { $group: group },
    { $sort: { count: -1 } }
  ];
}
