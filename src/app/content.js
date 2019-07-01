import React from 'react';
import PropTypes from 'prop-types';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';

import './style/work-items-widget.scss';
import {Button} from "@jetbrains/ring-ui";
import {loadWorkItems} from "./resources";

class Content extends React.Component {

  static propTypes = {
    youTrack: PropTypes.object,
    context: PropTypes.object,
    query: PropTypes.string,

    start: PropTypes.number,
    end: PropTypes.number,

    // isLoading: PropTypes.bool,

    onEdit: PropTypes.func,
    editable: PropTypes.bool
  };

  constructor(props) {
    super(props);
  }

  renderLoader() {
    return <LoaderInline/>;
  }

  fetchYouTrack = async (url, params) => {
    const {dashboardApi} = this.props;
    const {youTrack} = this.state;
    return await dashboardApi.fetch(youTrack.id, url, params);
  };

  renderWidgetBody() {
    const {
      context,
      query,

      start,
      end
    } = this.props;

    const onExport = (csv) => loadWorkItems(this.fetchYouTrack, context, query, csv);

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
