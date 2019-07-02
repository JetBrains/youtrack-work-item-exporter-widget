const QUERY_ASSIST_FIELDS = 'query,caret,styleRanges(start,length,style),suggestions(options,prefix,option,suffix,description,matchingStart,matchingEnd,caret,completionStart,completionEnd,group,icon)';
const WATCH_FOLDERS_FIELDS = 'id,$type,name,query,shortName';

export function contentType(csv) {
  return csv ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

// eslint-disable-next-line complexity
export async function loadWorkItems(fetchYouTrack, csv, params) {
  return await fetchYouTrack(
    `api/workItems/export?$top=-1`, {
      method: 'POST',
      responseType: 'blob',
      headers: {
        'Accept': contentType(csv)
      },
      body: params
    }
  );
}

export async function loadPinnedIssueFolders(fetchYouTrack, loadAll) {
  const packSize = 100;
  return await fetchYouTrack(`api/userIssueFolders?fields=${WATCH_FOLDERS_FIELDS}&$top=${loadAll ? -1 : packSize}`);
}

export async function loadWorkTypes(fetchYouTrack) {
  return await fetchYouTrack(`api/admin/timeTrackingSettings/workItemTypes?$top=-1&fields=id,name`);
}

export async function underlineAndSuggest(fetchYouTrack, query, caret, folder) {
  return await fetchYouTrack(`api/search/assist?fields=${QUERY_ASSIST_FIELDS}`, {
    method: 'POST',
    body: {query, caret, folder}
  });
}
