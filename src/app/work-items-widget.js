import React from 'react';
import PropTypes from 'prop-types';

import ServiceResource from './components/service-resource';
import WorkItemsEditForm from './work-items-edit-form';

import './style/work-items-widget.scss';
import LoaderInline from "@jetbrains/ring-ui/components/loader-inline/loader-inline";
import {Button} from "@jetbrains/ring-ui";
import {contentType, loadWorkItems} from "./resources";
import filter from "./work-items-filter";

import {observer} from 'mobx-react';

@observer
class WorkItemsWidget extends React.Component {

  static getDefaultYouTrackService =
    async (dashboardApi, predefinedYouTrack) => {
      if (predefinedYouTrack && predefinedYouTrack.id) {
        return predefinedYouTrack;
      }
      try {
        // TODO: pass min-required version here
        return await ServiceResource.getYouTrackService(
          dashboardApi.fetchHub.bind(dashboardApi)
        );
      } catch (err) {
        return null;
      }
    };

  static propTypes = {
    dashboardApi: PropTypes.object,
    configWrapper: PropTypes.object,
    registerWidgetApi: PropTypes.func,
    editable: PropTypes.bool
  };

  constructor(props) {
    super(props);
    const {registerWidgetApi} = props;

    this.state = {
      isConfiguring: false
    };

    registerWidgetApi({
      onConfigure: () => this.setState({
        isConfiguring: true,
        // isLoading: false,
        isLoadDataError: false
      })
    });
  }

  componentDidMount() {
    this.initialize(this.props.dashboardApi);
  }

  initialize = async dashboardApi => {
    await this.props.configWrapper.init();
    filter.restore(this.props);

    const youTrackService = await WorkItemsWidget.getDefaultYouTrackService(
      dashboardApi, {
        id: filter.youTrackId
      }
    );

    if (this.props.configWrapper.isNewConfig()) {
      this.initializeNewWidget(youTrackService);
    } else {
      await this.initializeExistingWidget(youTrackService);
    }
  };

  async initializeNewWidget(youTrackService) {
    if (youTrackService && youTrackService.id) {
      this.setState({isConfiguring: true});
      filter.youTrackId = youTrackService.id;
      await filter.sync(this.props);
    }

  }

  async initializeExistingWidget(youTrackService) {
    await filter.restore(this.props);

    if (youTrackService && youTrackService.id) {
      filter.youTrackId = youTrackService.id;
      filter.sync(this.props);
      this.setState({isConfiguring: false});
    }
  }

  submitConfiguration = async () => {
    filter.sync(this.props);
    this.setState({isConfiguring: false});
  };

  fetchYouTrack = async (url, params) => {
    const {dashboardApi} = this.props;
    return await dashboardApi.fetch(filter.youTrackId, url, params);
  };

  onExport(csv) {
    return async () => {
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

      let response;
      try {
        response = await loadWorkItems(this.fetchYouTrack, csv, filter.toRestFilter());
      }catch (error) {
        // TODO handle me
      }
      if (response) {
        saveBlob(response, 'work_items.' + (csv ? 'csv' : 'xls'))
      }
    };
  }


  cancelConfiguration = async () => {
    if (this.props.configWrapper.isNewConfig()) {
      await this.props.dashboardApi.removeWidget();
    } else {
      this.setState({isConfiguring: false});
      await this.props.dashboardApi.exitConfigMode();
      this.initialize(this.props.dashboardApi);
    }
  };

  renderConfiguration = () => (
    <div className="work-items-widget">
      <WorkItemsEditForm
        title={this.state.title}
        onSubmit={this.submitConfiguration}
        onCancel={this.cancelConfiguration}
        dashboardApi={this.props.dashboardApi}
      />
    </div>
  );

  renderContent = () => {
    return (
      <div className="work-items-widget">
        {/*<ButtonGroup className="work-items-widget_button-group">*/}
        <Button className="work-items-widget_button" onClick={this.onExport(true)}>CSV</Button>
        {/*<Button className="work-items-widget_button" onClick={onExport(false)}>EXCEL</Button>*/}
        {/*</ButtonGroup>*/}
      </div>
    );
  };

  // eslint-disable-next-line complexity
  render() {
    const {
      isConfiguring,
    } = this.state;
    if (isConfiguring || !filter.youTrackId) {
      return <LoaderInline/>;
    }

    return (
      <div>
        {this.renderConfiguration()}
        {this.renderContent()}
      </div>
    );
  }
}


export default WorkItemsWidget;
