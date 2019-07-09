import React from 'react';
import PropTypes from 'prop-types';

import ButtonGroup from '@jetbrains/ring-ui/components/button-group/button-group';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';
import {Button} from '@jetbrains/ring-ui';
import {observer} from 'mobx-react';

import ServiceResource from './components/service-resource';
import WorkItemsEditForm from './work-items-edit-form';

import './style/work-items-widget.scss';

import {loadWorkItems} from './resources';
import filter from './work-items-filter';


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
    registerWidgetApi: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      isConfiguring: false
    };
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

  syncConfiguration = async () => {
    filter.sync(this.props);
    this.setState({isConfiguring: false});
  };

  onExport(csv) {
    return async () => {
      const {dashboardApi} = this.props;
      try {
        await loadWorkItems(dashboardApi, filter.youTrackId, csv, filter.toRestFilter(), `work_items.${csv ? 'csv' : 'xlsx'}`);
      } catch (error) {
        this.props.dashboardApi.setError({data: `Can't export data: ${error}`});
      }
    };
  }

  renderConfiguration = () => (
    <div className="work-items-widget">
      <WorkItemsEditForm
        title={this.state.title}
        syncConfig={this.syncConfiguration}
        dashboardApi={this.props.dashboardApi}
      />
    </div>
  );

  renderContent = () => (
    <div className="work-items-widget">
      <ButtonGroup className="work-items-widget_button-group">
        <Button className="work-items-widget_button" onClick={this.onExport(true)}>{'CSV'}</Button>
        <Button className="work-items-widget_button" onClick={this.onExport(false)}>{'EXCEL'}</Button>
      </ButtonGroup>
    </div>
  );

  // eslint-disable-next-line complexity
  render() {
    const {
      isConfiguring
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
