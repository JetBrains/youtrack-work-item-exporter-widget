import React from 'react';
import PropTypes from 'prop-types';
import {i18n} from 'hub-dashboard-addons/dist/localization';
import ConfigurableWidget from '@jetbrains/hub-widget-ui/dist/configurable-widget';

import ServiceResource from './components/service-resource';
import WorkItemsEditForm from './work-items-edit-form';

import './style/work-items-widget.scss';
import Content from './content';

class WorkItemsWidget extends React.Component {

  static DEFAULT_REFRESH_PERIOD = 240; // eslint-disable-line no-magic-numbers

  static digitToUnicodeSuperScriptDigit = digitSymbol => {
    const unicodeSuperscriptDigits = [
      0x2070, 0x00B9, 0x00B2, 0x00B3, 0x2074, // eslint-disable-line no-magic-numbers
      0x2075, 0x2076, 0x2077, 0x2078, 0x2079 // eslint-disable-line no-magic-numbers
    ];
    return String.fromCharCode(unicodeSuperscriptDigits[Number(digitSymbol)]);
  };

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
    i18n('Issues List');

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
    const refreshPeriod =
      this.props.configWrapper.getFieldValue('refreshPeriod');
    const title = this.props.configWrapper.getFieldValue('title');

    this.setState({
      title,
      search: search || '',
      context,
      refreshPeriod: refreshPeriod || WorkItemsWidget.DEFAULT_REFRESH_PERIOD
    });

    if (youTrackService && youTrackService.id) {
      this.setYouTrack(youTrackService);
    }
  }

  setYouTrack(youTrackService) {
    const {homeUrl} = youTrackService;

    this.setState({
      youTrack: {
        id: youTrackService.id, homeUrl
      }
    });

    if (WorkItemsWidget.youTrackServiceNeedsUpdate(youTrackService)) {
      const {dashboardApi} = this.props;
      ServiceResource.getYouTrackService(
        dashboardApi.fetchHub.bind(dashboardApi),
        youTrackService.id
      ).then(
        updatedYouTrackService => {
          const shouldReSetYouTrack = updatedYouTrackService &&
            !WorkItemsWidget.youTrackServiceNeedsUpdate(
              updatedYouTrackService
            ) && updatedYouTrackService.homeUrl !== homeUrl;
          if (shouldReSetYouTrack) {
            this.setYouTrack(updatedYouTrackService);
            if (!this.state.isConfiguring && this.props.editable) {
              this.props.configWrapper.update({
                youTrack: {
                  id: updatedYouTrackService.id,
                  homeUrl: updatedYouTrackService.homeUrl
                }
              });
            }
          }
        }
      );
    }
  }

  submitConfiguration = async formParameters => {
    const {
      search, title, context, refreshPeriod, selectedYouTrack
    } = formParameters;
    this.setYouTrack(
      selectedYouTrack, async () => {
        this.setState(
          {search: search || '', context, title, refreshPeriod},
          async () => {
            await this.props.configWrapper.replace({
              search,
              context,
              title,
              refreshPeriod,
              youTrack: {
                id: selectedYouTrack.id,
                homeUrl: selectedYouTrack.homeUrl
              }
            });
            this.setState(
              {isConfiguring: false, fromCache: false}
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
        refreshPeriod={this.state.refreshPeriod}
        onSubmit={this.submitConfiguration}
        onCancel={this.cancelConfiguration}
        dashboardApi={this.props.dashboardApi}
        youTrackId={this.state.youTrack.id}
      />
    </div>
  );

  renderContent = () => {
    const {
      issues,
      isLoading,
      fromCache,
      isLoadDataError,
      dateFormats,
      issuesCount,
      isNextPageLoading,
      refreshPeriod,
      youTrack
    } = this.state;

    return (
      <Content
        youTrack={youTrack}
        onEdit={this.editSearchQuery}
        editable={this.props.editable}
      />
    );
  };

  // eslint-disable-next-line complexity
  render() {
    const {
      isConfiguring,
      search,
      context,
      title,
      youTrack
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
