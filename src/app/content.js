import React from 'react';
import PropTypes from 'prop-types';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';

import './style/work-items-widget.scss';
import {Button} from "@jetbrains/ring-ui";
import {contentType, loadWorkItems} from "./resources";

class Content extends React.Component {

  static propTypes = {
    dashboardApi: PropTypes.object,
    youTrackId: PropTypes.string,

    context: PropTypes.object,
    search: PropTypes.string,

    start: PropTypes.number,
    end: PropTypes.number,

    // isLoading: PropTypes.bool,

    onEdit: PropTypes.func,
    editable: PropTypes.bool
  };

  fetchYouTrack = async (url, params) => {
    const {dashboardApi, youTrackId} = this.props;
    return await dashboardApi.fetch(youTrackId, url, params);
  };

  constructor(props) {
    super(props);
  }

  renderLoader() {
    return <LoaderInline/>;
  }

  renderWidgetBody() {
    const {
      context,
      search,

      start,
      end
    } = this.props;

    const onExport = (csv) => async () => {
      function saveBlob(response, fileName) {
        const blob = response.data;
        if (
          window.navigator &&
          window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, fileName);
          return;
        }

        const binaryData = [];
        binaryData.push(blob);
        const blobURL = window.URL.createObjectURL(new Blob(binaryData, {type: contentType(csv)}));
        // const blobURL = window.URL.createObjectURL(blob);

        let element = document;
        const anchor = document.createElement('a');
        anchor.download = fileName;
        anchor.href = blobURL;

        // append to the document to make URL works in Firefox
        anchor.style.display = 'none';
        element.body.appendChild(anchor);
        anchor.onclick = () => anchor.parentNode.removeChild(anchor);

        anchor.click();

        setTimeout(() => window.URL.revokeObjectURL(blobURL), 0, false);
      }

      const response = await loadWorkItems(this.fetchYouTrack, search, context, csv);
      saveBlob(response, 'work_items.' + (csv ? 'csv' : 'xls'))
    };

    return (
      <div className="work-items-widget">
        <Button className="work-items-widget_button" onClick={onExport(true)}>CSV</Button>
        <Button className="work-items-widget_button" onClick={onExport(false)}>EXCEL</Button>
      </div>
    );
  }

  render() {
    // const {
    //   isLoading
    // } = this.props;

    // if (isLoading) {
    //   return this.renderLoader();
    // }
    return this.renderWidgetBody();
  }
}


export default Content;
