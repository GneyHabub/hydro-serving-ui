import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import {
  ModelsWrapperComponent,
  ModelDetailsComponent,
  ModelVersionDetailsComponent,
  ModelVersionContainerComponent,
  ModelVersionProfilerComponent,
  ModelVersionReplyComponent,
} from '@models/components';

import { ModelDetailsGuard, ModelVersionDetailsGuard } from '@models/services';
import { MetricsComponent, DashboardComponent } from '@monitoring/containers';
import {
  MonitoringPageComponent,
  GraphsComponent,
} from '@monitoring/containers';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        redirectTo: 'models',
        pathMatch: 'full',
      },
      {
        path: 'models',
        component: ModelsWrapperComponent,
        children: [
          {
            path: ':modelId',
            component: ModelDetailsComponent,
            data: { anim: 'modelDetail' },
            canActivate: [ModelDetailsGuard],
          },
          {
            path: ':modelId/:modelVersionId',
            component: ModelVersionContainerComponent,
            data: { anim: 'modelVerDetail' },
            canActivate: [ModelVersionDetailsGuard],
            children: [
              {
                path: '',
                redirectTo: 'details',
                pathMatch: 'full',
              },
              {
                path: 'details',
                component: ModelVersionDetailsComponent,
              },
              {
                path: 'profiler',
                component: ModelVersionProfilerComponent,
                data: { anim: 'modelVerDetail' },
              },
              {
                path: 'monitoring',
                component: MonitoringPageComponent,
                children: [
                  {
                    path: 'metrics',
                    component: MetricsComponent,
                  },
                  {
                    path: 'dashboard',
                    component: DashboardComponent,
                  },
                  {
                    path: 'graphs',
                    component: GraphsComponent,
                  },
                  {
                    path: '',
                    redirectTo: 'dashboard',
                    pathMatch: 'full',
                  },
                ],
              },
              {
                path: 'replay',
                component: ModelVersionReplyComponent,
              },
            ],
          },
        ],
      },
    ]),
  ],
  exports: [RouterModule],
})
export class ModelsRoutingModule {}
