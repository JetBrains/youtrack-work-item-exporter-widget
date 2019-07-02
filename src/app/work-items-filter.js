import {observable} from "mobx";

class WorkItemsFilter {

  @observable search = null;
  @observable context = null;

  @observable withoutWorkType = false;
  @observable workTypes = [];

  @observable youTrackId = null;

  restore(props) {
    try {
      const filter = props.configWrapper.getFieldValue('filter');
      this.search = filter.search;
      this.context = filter.context;

      this.workTypes = filter.workTypes || [];
      this.withoutWorkType = filter.withoutWorkType || false;
    } catch (e) {
      this.sync(props);
    }
  }

  cleanup(allWorkTypes) {

  }

  async sync(props) {
    await props.configWrapper.update({filter: this.toRestFilter()});
  }

  toRestFilter() {
    const context = this.context;
    return {
      context: context ? {id: context.id, name: context.id, $type: context.$type} : null,
      search: this.search,
      workTypes: (this.workTypes || []).map(type => type && {id: type.id, name: type.name}),
      withoutWorkType: this.withoutWorkType,
      youTrack: {
        id: this.youTrackId
      }
    }
  }
}

// @ts-ignore
const filter = window.filter = new WorkItemsFilter();

export default filter;
