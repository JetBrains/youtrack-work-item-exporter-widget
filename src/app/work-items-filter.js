import {observable} from "mobx";
import {addDays, format, parse} from 'date-fns';

const FORMAT = 'YYYY-MM-DD';

class WorkItemsFilter {

  @observable search = null;
  @observable context = null;

  @observable withoutWorkType = false;
  @observable workTypes = [];

  @observable startDate = null;
  @observable endDate = null;

  @observable youTrackId = null;

  restore(props) {
    try {
      const filter = props.configWrapper.getFieldValue('filter');
      this.search = filter.search;
      this.context = filter.context;

      this.workTypes = filter.workTypes || [];
      this.withoutWorkType = filter.withoutWorkType || false;

      this.startDate = filter.startDate ? parse(filter.startDate, FORMAT) : addDays(new Date(), -7);
      this.endDate = filter.endDate ? parse(filter.endDate, FORMAT) : new Date();
    } catch (e) {
      this.sync(props);
    }
  }

  async sync(props) {
    await props.configWrapper.update({filter: this.toRestFilter()});
  }

  toRestFilter() {
    const context = this.context;

    function formatDate(date) {
      return date ? format(date, FORMAT) : null;
    }

    return {
      context: context ? {id: context.id, name: context.id, $type: context.$type} : null,
      search: this.search,
      workTypes: (this.workTypes || []).map(type => type && {id: type.id, name: type.name}),
      withoutWorkType: this.withoutWorkType,

      startDate: formatDate(this.startDate),
      endDate: formatDate(this.endDate),

      youTrack: {
        id: this.youTrackId
      }
    }
  }
}

// @ts-ignore
const filter = window.filter = new WorkItemsFilter();

export default filter;
