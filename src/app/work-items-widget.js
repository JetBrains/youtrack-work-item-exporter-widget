import React from 'react';
import PropTypes from 'prop-types';
import {i18n} from 'hub-dashboard-addons/dist/localization';
import ConfigurableWidget from '@jetbrains/hub-widget-ui/dist/configurable-widget';

import ServiceResource from './components/service-resource';
import WorkItemsEditForm from './work-items-edit-form';

import './style/work-items-widget.scss';
import Content from './content';
import LoaderInline from "@jetbrains/ring-ui/components/loader-inline/loader-inline";

class WorkItemsWidget extends React.Component {

  static DEFAULT_REFRESH_PERIOD = 240; // eslint-disable-line no-magic-numbers

  static getFullSearchPresentation = (context, search) => [
    context && context.name && `#{${context.name}}`, search
  ].filter(str => !!str).join(' ') || `#${i18n('issues')}`;

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

  static youTrackServiceNeedsUpdate = service => !service.name;

  static getDefaultWidgetTitle = () =>
    i18n('Work items');

  static getWidgetTitle = (search, context, title) => {
    return title || WorkItemsWidget.getFullSearchPresentation(context, search);
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
      // isLoading: true
    };

    registerWidgetApi({
      onConfigure: () => this.setState({
        isConfiguring: true,
        // isLoading: false,
        isLoadDataError: false
      }),
      getExternalWidgetOptions: () => ({
        authClientId:
          (this.props.configWrapper.getFieldValue('youTrack') || {}).id
      })
    });
  }

  componentDidMount() {
    this.initialize(this.props.dashboardApi);
  }

  initialize = async dashboardApi => {
    // this.setState({isLoading: true});
    await this.props.configWrapper.init();

    const youTrackService =
      await WorkItemsWidget.getDefaultYouTrackService(
        dashboardApi, this.props.configWrapper.getFieldValue('youTrack')
      );

    if (this.props.configWrapper.isNewConfig()) {
      this.initializeNewWidget(youTrackService);
    } else {
      await this.initializeExistingWidget(youTrackService);
    }
  };

  initializeNewWidget(youTrackService) {
    if (youTrackService && youTrackService.id) {
      this.setState({
        isConfiguring: true,
        youTrack: youTrackService
        // isLoading: false
      });
    }
    // this.setState({isLoadDataError: true, isLoading: false});
  }

  async initializeExistingWidget(youTrackService) {
    const search = this.props.configWrapper.getFieldValue('search');
    const context = this.props.configWrapper.getFieldValue('context');

    const title = this.props.configWrapper.getFieldValue('title');

    this.setState({
      title,
      search: search || '',
      context
    });

    if (youTrackService && youTrackService.id) {
      this.setYouTrack(youTrackService, () => this.setState({isConfiguring: false}));
    }
  }

  setYouTrack(youTrackService, callback) {
    const {homeUrl} = youTrackService;

    this.setState({
      youTrack: {
        id: youTrackService.id, homeUrl
      },
      isConfiguring: false
    }, callback);

  }

  submitConfiguration = async formParameters => {
    const {
      search, title, context, selectedYouTrack
    } = formParameters;
    this.setYouTrack(
      selectedYouTrack, async () => {
        this.setState(
          {search: search || '', context, title},
          async () => {
            await this.props.configWrapper.replace({
              search,
              context,
              title,
              youTrack: {
                id: selectedYouTrack.id
              }
            });
            this.setState(
              {isConfiguring: false}
            );
          }
        );
      }
    );
  };

  cancelConfiguration = async () => {
    if (this.props.configWrapper.isNewConfig()) {
      await this.props.dashboardApi.removeWidget();
    } else {
      this.setState({isConfiguring: false});
      await this.props.dashboardApi.exitConfigMode();
      this.initialize(this.props.dashboardApi);
    }
  };

  fetchYouTrack = async (url, params) => {
    const {dashboardApi} = this.props;
    const {youTrack} = this.state;
    return await dashboardApi.fetch(youTrack.id, url, params);
  };

  editSearchQuery = () =>
    this.setState({isConfiguring: true});

  renderConfiguration = () => (
    <div className="work-items-widget">
      <WorkItemsEditForm
        search={this.state.search}
        context={this.state.context}
        title={this.state.title}
        onSubmit={this.submitConfiguration}
        onCancel={this.cancelConfiguration}
        dashboardApi={this.props.dashboardApi}
        youTrackId={this.state.youTrack.id}
      />
    </div>
  );

  renderContent = () => {
    const {
      isConfiguring,
      youTrack,
      context,
      search
    } = this.state;
    if (isConfiguring || !youTrack) {
      return <LoaderInline/>;
    }
    return (
      <Content
        dashboardApi={this.props.dashboardApi}
        youTrackId={youTrack.id}
        onEdit={this.editSearchQuery}
        editable={this.props.editable}
        query={search}
        context={context}
      />
    );
  };

  // eslint-disable-next-line complexity
  render() {
    const {
      isConfiguring,
      search,
      context,
      title
    } = this.state;

    const widgetTitle = isConfiguring
      ? WorkItemsWidget.getDefaultWidgetTitle()
      : WorkItemsWidget.getWidgetTitle(search, context, title);

    return (
      <ConfigurableWidget
        isConfiguring={isConfiguring}
        dashboardApi={this.props.dashboardApi}
        widgetTitle={widgetTitle}
        // widgetLoader={this.state.isLoading}
        Configuration={this.renderConfiguration}
        Content={this.renderContent}
      />
    );
  }
}


export default WorkItemsWidget;
