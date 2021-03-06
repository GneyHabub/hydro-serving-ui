import { Action, createReducer, on } from '@ngrx/store';

import {
  GetDeploymentConfigs,
  GetDeploymentConfigsSuccess,
  DeleteDeploymentConfigSuccess,
  UpdateDeploymentConfig
} from '../actions/deployment-configs.actions';

import { State, initialState } from '../states/deployment-configs.state';

export const deploymentConfigReducer = createReducer(
  initialState,
  on(GetDeploymentConfigs, state => {
    return state;
  }),
  on(GetDeploymentConfigsSuccess, (state, payload) => {
    return { ...state, configs: payload.configs };
  }),
  on(DeleteDeploymentConfigSuccess, (state, payload) => {
    return {
      ...state,
      configs: state.configs.filter(config => config.name !== payload.name),
    };
  }),
  on(UpdateDeploymentConfig, (state, { config }) => {
    const configs = state.configs;
    const configExists = configs.some(cfg => cfg.name === config.name);

    return configExists ? state : { ...state, configs: [...configs, config] };
  })
);

export function reducer(state: State, action: Action): State {
  return deploymentConfigReducer(state, action);
}
