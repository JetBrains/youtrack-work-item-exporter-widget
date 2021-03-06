import {observable} from 'mobx';
import {addDays, format, parse} from 'date-fns';

const FORMAT = 'YYYY-MM-DD';

class WorkItemsFilter {

  @observable query = null;
  @observable folder = null;

  @observable withoutWorkType = false;
  @observable workTypes = [];

  @observable startDate = null;
  @observable endDate = null;

  @observable authors = [];
  @observable authorGroups = [];

  @observable youTrackId = null;

  restore(props) {
    try {
      const filter = props.configWrapper.getFieldValue('filter');
      const WEEK_AGO = -7;
      this.query = filter.query;
      this.folder = filter.folder;

      this.workTypes = filter.workTypes || [];
      this.withoutWorkType = filter.withoutWorkType || false;

      this.startDate = filter.startDate ? parse(filter.startDate, FORMAT) : addDays(new Date(), WEEK_AGO);
      this.endDate = filter.endDate ? parse(filter.endDate, FORMAT) : new Date();

      this.authors = filter.authors || [];
      this.authorGroups = filter.authorGroups || [];

    } catch (e) {
      this.sync(props);
    }
  }

  async sync(props) {
    await props.configWrapper.update({filter: this.toConfig()});
  }

  toConfig() {
    const context = this.folder;

    function formatDate(date) {
      return date ? format(date, FORMAT) : null;
    }

    const hasId = it => it.id;

    return {
      folder: context ? {id: context.id, name: context.name, $type: context.$type} : null,
      query: this.query,
      workTypes: (this.workTypes || []).map(type => type && {id: type.id, name: type.name}),
      withoutWorkType: this.withoutWorkType,

      startDate: formatDate(this.startDate),
      endDate: formatDate(this.endDate),

      authors: (this.authors || []).filter(hasId).map(user => user && {id: user.id, name: user.name, avatarURL: user.avatarURL}),
      authorGroups: (this.authorGroups || []).filter(hasId).map(group => group && {id: group.id, name: group.name}),

      youTrack: {
        id: this.youTrackId
      }
    };
  }

  toRestFilter() {

    const withRingId = it => {
      const id = it.id;
      delete it.id;
      it.ringId = id;
    };

    const filter = this.toConfig();

    (filter.authors || []).forEach(withRingId);
    (filter.authorGroups || []).forEach(withRingId);

    return filter;
  }
}

// @ts-ignore
const filter = window.filter = new WorkItemsFilter();

export default filter;
