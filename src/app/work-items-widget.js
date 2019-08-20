import React from 'react';
import PropTypes from 'prop-types';

import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';
import {observer} from 'mobx-react';
import {i18n} from 'hub-dashboard-addons/dist/localization';

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
      filter.youTrackId = youTrackService.id;
      await filter.sync(this.props);
    }
  }

  async initializeExistingWidget(youTrackService) {
    await filter.restore(this.props);

    if (youTrackService && youTrackService.id) {
      filter.youTrackId = youTrackService.id;
      filter.sync(this.props);
    }
  }

  syncConfiguration = async () => {
    filter.sync(this.props);
    this.setState({hackToForceRedrawDomRightNow: false});
  };

  onExport = csv =>
    async () => {
      const {dashboardApi} = this.props;
      try {
        await loadWorkItems(dashboardApi, filter.youTrackId, csv, filter.toRestFilter(), `work_items.${csv ? 'csv' : 'xlsx'}`);
      } catch (error) {
        const errorMessage = i18n('Can\'t export data: {{error}}', {error});
        this.props.dashboardApi.setError({data: errorMessage});
      }
    };

  render() {
    if (filter.youTrackId) {
      return (
        <WorkItemsEditForm
          className="work-items-widget"
          syncConfig={this.syncConfiguration}
          dashboardApi={this.props.dashboardApi}
          exportActionGetter={this.onExport}
        />
      );
    }

    return <LoaderInline/>;
  }
}


export default WorkItemsWidget;
