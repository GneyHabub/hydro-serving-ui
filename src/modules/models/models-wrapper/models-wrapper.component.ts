import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { Store } from '@ngrx/store';
import { AppState, Model } from '@shared/models/_index';
import { ModelBuilder } from '@shared/builders/_index';
import * as Actions from '@shared/actions/_index';
import { ModelsService } from '@shared/services/_index';

@Component({
  selector: 'hydro-models-wrapper',
  templateUrl: './models-wrapper.component.html',
  styleUrls: ['./models-wrapper.component.scss']
})
export class ModelsWrapperComponent implements OnDestroy {

  private modelsServiceSubscription: Subscription;

  private data: Model[];
  public sidebarTitle = 'Models';
  public models: Store<Model[]>;


  constructor(
    private modelBuilder: ModelBuilder,
    private store: Store<AppState>,
    private modelsService: ModelsService
  ) {
    this.modelsServiceSubscription = this.modelsService.getModels().first()
      .subscribe(models => {
        this.data = models.map(this.modelBuilder.build, this.modelBuilder);
        this.store.dispatch({ type: Actions.GET_MODELS, payload: this.data });
      });
    this.models = this.store.select('models');
  }

  ngOnDestroy() {
    this.modelsServiceSubscription.unsubscribe();
  }
}
