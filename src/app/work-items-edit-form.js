import React from 'react';
import PropTypes from 'prop-types';
import QueryAssist from '@jetbrains/ring-ui/components/query-assist/query-assist';
import {Size as InputSize} from '@jetbrains/ring-ui/components/input/input';
import Select from '@jetbrains/ring-ui/components/select/select';
import TagsInput from '@jetbrains/ring-ui/components/tags-input/tags-input';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';
import {i18n} from 'hub-dashboard-addons/dist/localization';
import HttpErrorHandler from '@jetbrains/hub-widget-ui/dist/http-error-handler';
import ConfigurationForm from '@jetbrains/hub-widget-ui/dist/configuration-form';
import Permissions from '@jetbrains/hub-widget-ui/dist/permissions';
import ButtonGroup from '@jetbrains/ring-ui/components/button-group/button-group';
import List from '@jetbrains/ring-ui/components/list/list';
import EmptyWidget, {EmptyWidgetFaces} from '@jetbrains/hub-widget-ui/dist/empty-widget';
import '@jetbrains/ring-ui/components/form/form.scss';

import {Button, DatePicker} from '@jetbrains/ring-ui'; // theme css file

import ServiceResource from './components/service-resource';
import DebounceDecorator from './debounceDecorator';
import {loadPinnedIssueFolders, loadWorkTypes, queryUserGroups, queryUsers, underlineAndSuggest} from './resources';
import filter from './work-items-filter';

const MIN_YOUTRACK_VERSION = '2019.1';

function toUsers(array) {
  return array.map(it => {
    it.isUser = true;
    return it;
  });
}

function toGroups(array) {
  return array.map(it => {
    it.isUser = false;
    return it;
  });
}

const toSelectItem = it => it && {key: it.id, label: it.name, avatar: it.avatarURL, model: it};


class WorkItemsEditForm extends React.Component {

  static getWithoutTypeOption = () => ({
    id: 'without_type',
    label: i18n('Without type')
  });

  static getAllTypesOption = () => ({
    id: 'all_types',
    label: i18n('All types'),
    description: i18n('Clear selected')
  });

  static getEverythingContextOption = () => ({
    id: '-1',
    label: i18n('Everything')
  });

  static getAllAuthorsOption = () => ({
    id: 'all_authors',
    label: i18n('All authors'),
    description: i18n('Clear selected')
  });

  static propTypes = {
    syncConfig: PropTypes.func,
    dashboardApi: PropTypes.object,
    exportActionGetter: PropTypes.func,
    editable: PropTypes.bool
  };

  constructor(props) {
    super(props);

    const selectedAuthors = toUsers(filter.authors).concat(toGroups(filter.authorGroups));

    this.state = {
      youTracks: [],
      authors: selectedAuthors.map(toSelectItem),
      request: null
    };
    this.underlineAndSuggestDebouncer = new DebounceDecorator();
  }

  componentDidMount() {
    this.loadYouTrackList();
    this.onAfterYouTrackChanged();

    Permissions.init(this.props.dashboardApi).then(
      () => this.setState({
        permissions: Permissions
      })
    );
  }

  setFormLoaderEnabled(isLoading) {
    this.setState({isLoading});
  }

  async loadYouTrackList() {
    const youTracks = await ServiceResource.getYouTrackServices(
      this.props.dashboardApi.fetchHub, MIN_YOUTRACK_VERSION
    );
    this.setState({youTracks});
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
    this.props.syncConfig();
    this.setFormLoaderEnabled(false);
  }

  changeSearch = search => {
    filter.search = search;
    this.setState({search, errorMessage: ''});
  };

  changeYouTrack = selected => {
    filter.youTrackId = selected && selected.model && selected.model.id;
    this.setState({
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
    this.props.syncConfig();
  };

  onAddWorkType = ({tag}) => {
    if (tag.id === WorkItemsEditForm.getAllTypesOption().id) {
      filter.workTypes = [];
    } else if (tag.model) {
      filter.workTypes = (filter.workTypes || []).concat([tag.model]);
    }
    this.props.syncConfig();
  };

  onRemoveWorkType = ({tag}) => {
    filter.workTypes = (filter.workTypes || []).filter(type => type.id !== tag.id);
    this.props.syncConfig();
  };

  changeDateRange = range => {
    filter.startDate = range.from;
    filter.endDate = range.to;
    this.props.syncConfig();
  };

  loadAllBackendData = async () => {
    this.setState({allContexts: null, allWorkTypes: []});
    const allContexts = await loadPinnedIssueFolders(this.fetchYouTrack, true);
    const allWorkTypes = await loadWorkTypes(this.fetchYouTrack);
    this.setState({allContexts, allWorkTypes});
  };

  onQueryAssistInputChange = queryAssistModel =>
    this.changeSearch(queryAssistModel.query);

  queryUsersAndGroups = async ({query}) => {
    const fetchHub = this.props.dashboardApi.fetchHub;
    const usersData = queryUsers(fetchHub, query);
    const groupsData = queryUserGroups(fetchHub, query);

    const request = Promise.all([usersData, groupsData]);
    this.setState({request});

    const data = await request;

    // only the latest request is relevant
    if (this.state.request === request) {
      const users = (data[0].users || []).map(it => {
        if (it.profile && it.profile.avatar && it.profile.avatar.url) {
          it.avatarURL = it.profile.avatar.url;
        } else {
          it.avatarURL = null;
        }
        return it;
      });
      const groups = data[1].usergroups || [];
      const authors = toUsers(users).concat(toGroups(groups)).map(toSelectItem);
      this.setState({
        authors,
        request: null
      });

      return authors;
    }

    return this.state.authors;
  };

  onAddWorkAuthor = ({tag}) => {
    if (tag.id === WorkItemsEditForm.getAllAuthorsOption().id) {
      filter.authors = [];
      filter.authorGroups = [];
      this.props.syncConfig();
      return;
    }

    const workAuthor = tag.model;
    if (!workAuthor) {
      return;
    }

    if (workAuthor.isUser) {
      filter.authors = (filter.authors || []).concat([workAuthor]);
    } else {
      filter.authorGroups = (filter.authorGroups || []).concat([workAuthor]);
    }

    this.props.syncConfig();
  };


  onRemoveWorkAuthor = ({tag}) => {
    const workAuthor = tag.model;
    if (!workAuthor) {
      return;
    }

    if (workAuthor.isUser) {
      filter.authors = (filter.authors || []).filter(
        author => author.id !== workAuthor.id
      );
    } else {
      filter.authorGroups = (filter.authorGroups || []).filter(
        author => author.id !== workAuthor.id
      );
    }

    this.props.syncConfig();
  };

  renderExportButton = () => {
    const {allWorkTypes} = this.state;

    if (!(allWorkTypes || []).length) {
      return (
        <div>{i18n('No work items types loaded')}</div>
      );
    }

    return (
      <ButtonGroup className="work-items-widget_button-group">
        <Button
          className="work-items-widget_button"
          onClick={this.props.exportActionGetter(true)}
        >
          {i18n('CSV')}
        </Button>
        <Button
          className="work-items-widget_button"
          onClick={this.props.exportActionGetter(false)}
        >
          {i18n('EXCEL')}
        </Button>
      </ButtonGroup>
    );
  };

  renderWorkTypes() {
    const {allWorkTypes} = this.state;

    const toSelectItemShort = it => it && {
      id: it.id,
      key: it.id,
      label: it.name,
      model: it,
      description: it.description
    };

    const selectedWorkTypes = filter.workTypes || [];
    const placeholder = filter.workTypes.length ? i18n('Add work type') : i18n('All work types');

    return (
      <div className="ring-form__group">
        <TagsInput
          tags={(selectedWorkTypes || []).map(toSelectItemShort)}
          maxPopupHeight={150}
          dataSource={getWorkItemsOptions}
          onAddTag={this.onAddWorkType}
          onRemoveTag={this.onRemoveWorkType}
          filter={{fn: saveClearOptionAtTheTop}}
          placeholder={placeholder}
          disabled={!this.props.editable}
        />
      </div>
    );

    function getWorkItemsOptions() {
      const options = [];
      if ((filter.workTypes || []).length) {
        options.push(WorkItemsEditForm.getAllTypesOption());
        options.push({
          rgItemType: List.ListProps.Type.SEPARATOR
        });
      }
      options.push(WorkItemsEditForm.getWithoutTypeOption());
      return options.concat((allWorkTypes || []).map(toSelectItemShort));
    }

    function saveClearOptionAtTheTop(tag, query) {
      return tag.id === WorkItemsEditForm.getAllTypesOption().id ||
        !tag.label || !query || tag.label.toLowerCase().indexOf(query.toLowerCase()) > -1;
    }
  }

  renderDateRange() {
    return (
      <div className="ring-form__group">
        <DatePicker
          from={filter.startDate}
          to={filter.endDate}
          onChange={this.changeDateRange}
          disabled={!this.props.editable}
          range
        />
      </div>
    );
  }

  renderAuthorsAndGroups() {
    const selected = toUsers(filter.authors).concat(toGroups(filter.authorGroups));

    const placeholder = (selected || []).length
      ? i18n('Add user or group')
      : i18n('All authors');

    const toSelectItemShort = it => it && {
      key: it.id,
      label: it.name,
      model: it,
      description: it.description
    };

    const queryUsersAndGroups = this.queryUsersAndGroups;

    return (
      <div className="ring-form__group">
        <TagsInput
          tags={(selected || []).map(toSelectItemShort)}
          size={TagsInput}
          maxPopupHeight={150}
          dataSource={getWorkAuthorsOptions}
          onAddTag={this.onAddWorkAuthor}
          onRemoveTag={this.onRemoveWorkAuthor}
          filter={{
            fn: () => true // disable client filtering
          }}
          placeholder={placeholder}
          disabled={!this.props.editable}
        />
      </div>
    );

    async function getWorkAuthorsOptions(args) {
      const options = await queryUsersAndGroups(args);
      if ((selected || []).length) {
        options.unshift({
          rgItemType: List.ListProps.Type.SEPARATOR
        });
        options.unshift(WorkItemsEditForm.getAllAuthorsOption());
      }
      return options;
    }
  }

  renderFilteringSettings() {
    const {
      allContexts,
      errorMessage
    } = this.state;

    const contextOptions = (allContexts || []).map(toSelectItem);
    contextOptions.unshift(WorkItemsEditForm.getEverythingContextOption());

    if (errorMessage) {
      return (
        <div>{errorMessage}</div>
      );
    }

    return (
      <div>
        <div className="ring-form__group">
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
            disabled={!this.props.editable}
          />
          <div className="work-items-widget__search-query">
            <QueryAssist
              disabled={this.state.isLoading || !this.props.editable}
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
        {
          this.renderDateRange()
        }
        {
          this.renderAuthorsAndGroups()
        }
      </div>
    );
  }

  render() {
    const {
      youTracks,
      errorMessage,
      allContexts,
      permissions
    } = this.state;

    if (permissions && !permissions.has('JetBrains.YouTrack.READ_WORK_ITEM')) {
      return (
        <EmptyWidget smile={EmptyWidgetFaces.ERROR}/>
      );
    }

    const youTrackServiceToSelectItem = it => it && {
      key: it.id,
      label: it.name,
      description: it.homeUrl,
      model: it
    };

    const selectedYouTrack = (youTracks || []).filter(
      youTrack => youTrack.id === filter.youTrackId
    )[0];

    return (
      <ConfigurationForm panelControls={this.renderExportButton()}>
        {
          youTracks.length > 1 &&
          (
            <Select
              size={InputSize.FULL}
              type={Select.Type.BUTTON}
              data={youTracks.map(youTrackServiceToSelectItem)}
              selected={youTrackServiceToSelectItem(selectedYouTrack)}
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
      </ConfigurationForm>
    );
  }
}


export default WorkItemsEditForm;
