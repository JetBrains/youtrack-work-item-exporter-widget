const QUERY_ASSIST_FIELDS = 'query,caret,styleRanges(start,length,style),suggestions(options,prefix,option,suffix,description,matchingStart,matchingEnd,caret,completionStart,completionEnd,group,icon)';
const WATCH_FOLDERS_FIELDS = 'id,$type,name,query,shortName';

// eslint-disable-next-line complexity
export async function loadWorkItems(fetchYouTrack, query, context, csv) {
  return await fetchYouTrack(
    `api/workItems?$top=-1`, {
      method: 'POST',
      headers: {
        'Accept': csv ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      body: {
        query: query,
        folder: context,
        // start: 0,
        // end: 0,
        // issueFields: '',
        // workTypes: [],
        // withoutType: false,
        // authors: [],
        // creators: [],
        // authorsGroup: [],
        // creatorsGroup: []
      }
    }
  );
}

export async function loadPinnedIssueFolders(fetchYouTrack, loadAll) {
  const packSize = 100;
  return await fetchYouTrack(`api/userIssueFolders?fields=${WATCH_FOLDERS_FIELDS}&$top=${loadAll ? -1 : packSize}`);
}

export async function underlineAndSuggest(fetchYouTrack, query, caret, folder) {
  return await fetchYouTrack(`api/search/assist?fields=${QUERY_ASSIST_FIELDS}`, {
    method: 'POST',
    body: {query, caret, folder}
  });
}
