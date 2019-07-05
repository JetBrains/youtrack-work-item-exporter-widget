import 'babel-polyfill';
import 'hub-dashboard-addons/dashboard.css';

import React from 'react';
import {render} from 'react-dom';
import DashboardAddons from 'hub-dashboard-addons';
import {setLocale} from 'hub-dashboard-addons/dist/localization';
import ConfigWrapper from '@jetbrains/hub-widget-ui/dist/config-wrapper';

import WorkItemsWidget from './work-items-widget';
import TRANSLATIONS from './translations';

const CONFIG_FIELDS = ['filter'];

DashboardAddons.registerWidget(async (dashboardApi, registerWidgetApi) => {
  setLocale(DashboardAddons.locale, TRANSLATIONS);
  const configWrapper = new ConfigWrapper(dashboardApi, CONFIG_FIELDS);

  render(
    <WorkItemsWidget
      dashboardApi={dashboardApi}
      configWrapper={configWrapper}
      registerWidgetApi={registerWidgetApi}
    />,
    document.getElementById('app')
  );
});
