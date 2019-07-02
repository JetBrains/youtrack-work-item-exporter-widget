import React from 'react';
import PropTypes from 'prop-types';
import QueryAssist from '@jetbrains/ring-ui/components/query-assist/query-assist';
import {Size as InputSize} from '@jetbrains/ring-ui/components/input/input';
import Select from '@jetbrains/ring-ui/components/select/select';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';
import {i18n} from 'hub-dashboard-addons/dist/localization';
import HttpErrorHandler from '@jetbrains/hub-widget-ui/dist/http-error-handler';
import '@jetbrains/ring-ui/components/form/form.scss';

import ServiceResource from './components/service-resource';
import DebounceDecorator from './debounceDecorator';
import {loadPinnedIssueFolders, loadWorkTypes, underlineAndSuggest} from './resources';
import filter from "./work-items-filter";


const MIN_YOUTRACK_VERSION = '2019.1';

class WorkItemsEditForm extends React.Component {

  static WITHOUT_TYPE = {
    id: 'without_type',
    name: 'Without type'
  };

  static EVERYTHING_CONTEXT_OPTION = {
    id: '-1',
    label: i18n('Everything')
  };

  static propTypes = {
    onSubmit: PropTypes.func,
    onCancel: PropTypes.func,
    dashboardApi: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.state = {
      youTracks: []
    };
    this.underlineAndSuggestDebouncer = new DebounceDecorator();
  }

  componentDidMount() {
    this.loadYouTrackList();
    this.onAfterYouTrackChanged();
  }

  setFormLoaderEnabled(isLoading) {
    this.setState({isLoading});
  }

  async loadYouTrackList() {
    const {youTrackId} = filter;
    const youTracks = await ServiceResource.getYouTrackServices(
      this.props.dashboardApi.fetchHub, MIN_YOUTRACK_VERSION
    );
    const selectedYouTrackWithAllFields = youTracks.filter(yt => yt.id === youTrackId)[0];
    this.setState({
      youTracks, selectedYouTrack: selectedYouTrackWithAllFields
    });
  }

  async onAfterYouTrackChanged() {
    this.setFormLoaderEnabled(true);
    try {
      await this.loadAllBackendData();
    } catch (err) {
      this.setState({
        isLoading: false,
        errorMessage: HttpErrorHandler.getMessage(
          err,
          i18n('Selected YouTrack service is not available')
        )
      });
      return;
    }
    this.setFormLoaderEnabled(false);
  }

  changeSearch = search => {
    this.setState({search, errorMessage: ''});
  };

  changeYouTrack = selected => {
    this.setState({
      selectedYouTrack: selected.model,
      errorMessage: ''
    }, () => this.onAfterYouTrackChanged());
  };

  fetchYouTrack = async (url, params) => {
    const {dashboardApi} = this.props;
    return await dashboardApi.fetch(filter.youTrackId, url, params);
  };

  underlineAndSuggest = async (query, caret, folder) =>
    // eslint-disable-next-line max-len
    this.underlineAndSuggestDebouncer.decorate(() => underlineAndSuggest(this.fetchYouTrack, query, caret, folder));

  queryAssistDataSource = async queryAssistModel =>
    await this.underlineAndSuggest(
      queryAssistModel.query, queryAssistModel.caret, this.state.context
    );

  changeSearchContext = selected => {
    filter.context = selected.model;
    this.props.onSubmit();
  };

  changeWorkTypes = selected => {
    const array = (selected || []).map((workType) => workType.model);
    const workTypes = array.filter((workType) => workType.id !== WorkItemsEditForm.WITHOUT_TYPE.id);
    filter.workTypes = workTypes;
    filter.withoutWorkType = array.length !== workTypes.length;

    this.props.onSubmit();
  };

  loadAllBackendData = async () => {
    this.setState({allContexts: null, allWorkTypes: []});
    const allContexts = await loadPinnedIssueFolders(this.fetchYouTrack, true);
    const allWorkTypes = await loadWorkTypes(this.fetchYouTrack);
    this.setState({allContexts, allWorkTypes});
  };

  onQueryAssistInputChange = queryAssistModel =>
    this.changeSearch(queryAssistModel.query);

  renderWorkTypes() {
    const {allWorkTypes} = this.state;

    const toSelectItem = it => it && {key: it.id, label: it.name, model: it};

    const all = (allWorkTypes || []).concat(WorkItemsEditForm.WITHOUT_TYPE).map(toSelectItem);

    let selectedWorkTypes = filter.workTypes;
    if (filter.withoutWorkType) {
      selectedWorkTypes = selectedWorkTypes.concat(WorkItemsEditForm.WITHOUT_TYPE)
    }

    return (
      <div>
        <Select className="work-items-widget__form-select"
                size={InputSize.S}
                data={all}
                multiple={true}
                selected={selectedWorkTypes.map(toSelectItem)}
                onChange={this.changeWorkTypes}
                loading={!allWorkTypes}
                label={i18n('All work types')}>
        </Select>
      </div>
    );
  }

  renderFilteringSettings() {
    const {
      allContexts,
      errorMessage
    } = this.state;

    const toSelectItem = it => it && {key: it.id, label: it.name, model: it};

    const contextOptions = (allContexts || []).map(toSelectItem);
    contextOptions.unshift(WorkItemsEditForm.EVERYTHING_CONTEXT_OPTION);

    if (errorMessage) {
      return (
        <span>{errorMessage}</span>
      )
    }

    return (
      <div>
        <div>
          <Select
            className="work-items-widget__search-context"
            type={Select.Type.BUTTON}
            size={InputSize.S}
            data={contextOptions}
            selected={toSelectItem(filter.context)}
            onSelect={this.changeSearchContext}
            filter
            loading={!allContexts}
            label={i18n('Everything')}
          />
          <div className="work-items-widget__search-query">
            <QueryAssist
              disabled={this.state.isLoading}
              query={filter.search}
              placeholder={i18n('Type search query')}
              onChange={this.onQueryAssistInputChange}
              dataSource={this.queryAssistDataSource}
            />
          </div>
        </div>
        {
          this.renderWorkTypes()
        }
      </div>
    );
  }

  render() {
    const {
      youTracks,
      errorMessage,
      allContexts
    } = this.state;

    const youTrackServiceToSelectItem = it => it && {
      key: it.id,
      label: it.name,
      description: it.homeUrl,
      model: it
    };

    return (
      <div>
        {
          youTracks.length > 1 &&
          (
            <Select
              size={InputSize.FULL}
              type={Select.Type.BUTTON}
              data={youTracks.map(youTrackServiceToSelectItem)}
              selected={youTrackServiceToSelectItem(filter.youTrackId)}
              onSelect={this.changeYouTrack}
              filter
              label={i18n('Select YouTrack')}
            />
          )
        }
        <div className="ring-form__group">
          {
            allContexts && this.renderFilteringSettings()
          }
          {
            !allContexts && !errorMessage && <LoaderInline/>
          }
        </div>
      </div>
    );
  }
}


export default WorkItemsEditForm;
